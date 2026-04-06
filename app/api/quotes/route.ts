import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { generateNextQuoteNumber } from '@/lib/quote-numbering';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logAction } from '@/lib/audit';
import { getGlobalSettings, getEffectiveSettingsForQuote, ensureQuoteSnapshot } from '@/lib/settings-service';
import { calculateQuoteTotalsServerSide } from '@/lib/pricing-service';
import { getOrCreateDefaultAdminUser } from '@/lib/user-utils';
import { 
    upsertPipedriveDealAsProject, 
    upsertPipedriveOrganization, 
    upsertPipedrivePerson 
} from '@/lib/pipedrive-sync-utils';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const search = searchParams.get('search');
        const quoteStatus = searchParams.get('status');
        const projectStatus = searchParams.get('projectStatus');
        const quoteNumber = searchParams.get('quoteNumber');
        const revisionGroupId = searchParams.get('revisionGroupId');
        const showTrash = searchParams.get('showTrash') === 'true';

        console.log('[API GET Quotes] Fetching quotes...', { showTrash, search, quoteStatus, projectStatus });

        // Pagination
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '25');
        const skip = (page - 1) * limit;

        const where: any = {};
        if (revisionGroupId) where.revisionGroupId = revisionGroupId;
        if (quoteNumber) where.quoteNumber = quoteNumber;

        if (search) {
            where.OR = [
                { quoteNumber: { contains: search, mode: 'insensitive' } },
                { clientName: { contains: search, mode: 'insensitive' } },
                { clientCompany: { contains: search, mode: 'insensitive' } },
                { projectRef: { contains: search, mode: 'insensitive' } },
                // Recursive project search
                {
                    project: {
                        projectName: { contains: search, mode: 'insensitive' }
                    }
                },
                {
                    project: {
                        clientName: { contains: search, mode: 'insensitive' }
                    }
                },
                {
                    project: {
                        companyName: { contains: search, mode: 'insensitive' }
                    }
                }
            ];
        }

        if (quoteStatus && quoteStatus !== 'ALL') {
            where.status = quoteStatus;
        } else if (showTrash) {
            where.status = 'TRASH';
        } else {
            where.status = { not: 'TRASH' };
        }

        if (projectStatus && projectStatus !== 'ALL') {
            where.project = { projectStatus };
        }

        console.log(`[API GET Quotes] Request started. Search: "${search}", Status: ${quoteStatus}`);

        // Baseline count
        const baseCount = await (prisma as any).quote.count();
        console.log(`[API GET Quotes] Total quotes in DB baseline: ${baseCount}`);

        const [quotes, totalCount] = await Promise.all([
            (prisma as any).quote.findMany({
                where,
                include: {
                    project: {
                        include: {
                            client: true,
                            contact: true
                        }
                    },
                    boards: {
                        include: {
                            items: true
                        }
                    },
                    modifier: { select: { name: true } },
                    creator: { select: { name: true } }
                },
                orderBy: { updatedAt: 'desc' },
                skip,
                take: limit,
            }),
            (prisma as any).quote.count({ where })
        ]);

        console.log(`[API GET Quotes] Filtered total count: ${totalCount}, Returning ${quotes.length} on page ${page}`);

        // 4. Calculate totals for each quote using the definitive source of truth
        const quotesWithTotals = await Promise.all(quotes.map(async (quote: any) => {
            try {
                const { grandTotals } = await calculateQuoteTotalsServerSide(quote);

                const { boards, ...quoteWithoutBoards } = quote;
                return {
                    ...quoteWithoutBoards,
                    totalExGST: grandTotals.sellPriceRounded,
                    totalIncGST: grandTotals.finalSellPrice,
                    gstAmount: grandTotals.gst,
                    // Legacy support
                    total: grandTotals.sellPriceRounded,
                    totalIncGst: grandTotals.finalSellPrice
                };
            } catch (calcError) {
                console.error(`Failed to calculate totals for quote ${quote.id}:`, calcError);
                const { boards, ...quoteWithoutBoards } = quote;
                return {
                    ...quoteWithoutBoards,
                    totalExGST: 0,
                    totalIncGST: 0,
                    gstAmount: 0,
                    // Legacy support
                    total: 0,
                    totalIncGst: 0,
                    calcError: true
                };
            }
        }));

        const totalPages = Math.ceil(totalCount / limit);

        console.log(`[API GET Quotes] SUCCESS: Found ${totalCount} quotes, returning ${quotesWithTotals.length} on page ${page}`);

        return NextResponse.json({
            data: quotesWithTotals,
            page,
            limit,
            total: totalCount,
            totalPages
        });
    } catch (error: any) {
        console.error('Failed to fetch quotes:', error);
        return NextResponse.json({ error: 'Failed to fetch quotes' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { clientName, projectRef, description, projectId, newProject } = body;

        const session = await getServerSession(authOptions);
        let userId = (session?.user as any)?.id;
        const userEmail = (session?.user as any)?.email;

        // --- Robust User Resolution Chain ---
        let dbUser = null;
        
        // 1. Resolve by Session ID
        if (userId) {
            dbUser = await (prisma as any).user.findUnique({ where: { id: userId } });
        }

        // 2. Resolve by Email if ID resolution failed
        if (!dbUser && userEmail) {
            console.log(`[Quote Creation] User ID ${userId} not found. Attempting resolution by email: ${userEmail}`);
            dbUser = await (prisma as any).user.findUnique({ where: { email: userEmail } });
            if (dbUser) userId = dbUser.id;
        }

        // 3. Fallback: Resolve to first available active user (prioritize ADMIN)
        if (!dbUser) {
            console.warn(`[Quote Creation] Session user ${userId || userEmail || 'Unknown'} not in DB. Searching for fallback user.`);
            dbUser = await getOrCreateDefaultAdminUser();

            if (dbUser) {
                userId = dbUser.id;
                console.log(`[Quote Creation] Using fallback user: ${dbUser.name} (${userId})`);
            }
        }

        // 4. Critical Block: No Users available
        if (!dbUser || !userId) {
            console.error('[Quote Creation] CRITICAL FAILURE: No users found in database.');
            return NextResponse.json({ 
                error: 'Quote creation failed: No valid users found in database.',
                details: 'A user record is required to assign quote ownership. Please ensure at least one active user exists.'
            }, { status: 400 });
        }

        const quoteNumber = await generateNextQuoteNumber();

        // Handle Project creation or fetching for auto-population
        let finalProjectId = projectId;
        let finalClientName = clientName;
        let finalClientCompany = body.clientCompany;
        let finalProjectRef = projectRef;
        let finalDescription = description;

        if (newProject && !projectId) {
            // Check for Pipedrive IDs
            if (newProject.pipedrive_deal_id) {
                const project = await upsertPipedriveDealAsProject(newProject.pipedrive_deal_id);
                if (project) {
                    finalProjectId = project.id;
                    finalClientName = project.clientName || clientName;
                    finalClientCompany = project.companyName || body.clientCompany;
                    finalProjectRef = project.projectName || projectRef;
                }
            } else {
                // Determine linked entities if IDs provided but no Deal ID
                let linkedClientId = undefined;
                let linkedContactId = undefined;

                if (newProject.pipedrive_org_id) {
                    const client = await upsertPipedriveOrganization(newProject.pipedrive_org_id);
                    if (client) linkedClientId = client.id;
                }

                if (newProject.pipedrive_person_id) {
                    const contact = await upsertPipedrivePerson(newProject.pipedrive_person_id, linkedClientId);
                    if (contact) linkedContactId = contact.id;
                }

                const createdProject = await (prisma as any).project.create({
                    data: {
                        projectName: newProject.projectName,
                        clientName: newProject.clientName || clientName,
                        companyName: newProject.companyName || body.clientCompany,
                        projectReference: newProject.projectReference || projectRef,
                        projectDescription: newProject.projectDescription || description,
                        projectStatus: newProject.projectStatus || 'Budget',
                        clientId: linkedClientId,
                        contactId: linkedContactId
                    },
                });
                finalProjectId = createdProject.id;
                // Auto-populate from new project
                if (!finalClientName) finalClientName = createdProject.clientName;
                if (!finalClientCompany) finalClientCompany = createdProject.companyName;
                if (!finalProjectRef) finalProjectRef = createdProject.projectName;
                if (!finalDescription) finalDescription = createdProject.projectDescription;
            }
        }
 else if (projectId) {
            const project = await (prisma as any).project.findUnique({
                where: { id: projectId }
            });
            if (project) {
                // Auto-populate from existing project - SNAPSHOT
                // Prioritize related models (Client/Contact) over legacy string fields
                if (!finalClientName) finalClientName = project.clientName;
                if (!finalClientCompany) finalClientCompany = project.companyName;
                if (!finalProjectRef) finalProjectRef = project.projectName;
                if (!finalDescription) finalDescription = project.projectDescription;
            }
        }

        const newQuote = await prisma.quote.create({
            data: {
                quoteNumber,
                clientName: finalClientName,
                clientCompany: finalClientCompany,
                projectRef: finalProjectRef,
                description: finalDescription,
                status: 'DRAFT',
                createdBy: userId,
                lastModifiedBy: userId,
                projectId: finalProjectId,
            },
        } as any);

        // Update the quote with its own ID as the revisionGroupId
        /*
        const updatedQuote = await (prisma.quote as any).update({
            where: { id: newQuote.id },
            data: { revisionGroupId: newQuote.id }
        });
        */

        await logAction(userId, 'CREATE_QUOTE', 'QUOTE', newQuote.id, { quoteNumber });

        // Ensure the new quote has a settings snapshot immediately
        await ensureQuoteSnapshot(newQuote.id);

        return NextResponse.json(newQuote);
    } catch (error: any) {
        console.error('Failed to create quote:', error);
        
        // Check for Prisma Foreign Key violation (P2003)
        if (error.code === 'P2003') {
            return NextResponse.json({ 
                error: 'Quote creation failed due to inconsistent data state.',
                details: 'The assigned creator or project could not be found. This often happens after a database reset.'
            }, { status: 400 });
        }

        return NextResponse.json({ 
            error: 'Failed to create quote', 
            details: error.message || 'An unexpected error occurred'
        }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { ids } = body;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return NextResponse.json({ error: 'No IDs provided' }, { status: 400 });
        }

        console.log(`[API DELETE Quotes] Bulk delete request for ${ids.length} quotes`);

        await (prisma as any).quote.deleteMany({
            where: {
                id: { in: ids }
            }
        });

        return NextResponse.json({ success: true, count: ids.length });
    } catch (error: any) {
        console.error('[API DELETE Quotes] Bulk delete error:', error);
        return NextResponse.json({ 
            error: 'Failed to delete quotes', 
            details: error.message 
        }, { status: 500 });
    }
}
