import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { 
    upsertPipedriveDealAsProject, 
    upsertPipedriveOrganization, 
    upsertPipedrivePerson 
} from '@/lib/pipedrive-sync-utils';

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const searchInput = searchParams.get('search')?.trim() || '';
        const checkProjectName = searchParams.get('checkName');
        const checkClientName = searchParams.get('checkClient');

        if (checkProjectName && checkClientName) {
            console.log(`[API GET Projects] Duplicate check for: "${checkProjectName}" / "${checkClientName}"`);
            const existing = await (prisma as any).project.findFirst({
                where: {
                    projectName: { equals: checkProjectName, mode: 'insensitive' },
                    clientName: { equals: checkClientName, mode: 'insensitive' }
                }
            });
            return NextResponse.json({ exists: !!existing, project: existing });
        }
        
        console.log(`[API GET Projects] Request started. Input: "${searchInput}"`);

        // Check total in DB for baseline
        const baseCount = await (prisma as any).project.count();
        console.log(`[API GET Projects] Total projects in DB baseline: ${baseCount}`);

        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '27');
        const estimatorId = searchParams.get('estimatorId');
        const dealOwner = searchParams.get('dealOwner');
        const closeDateFilter = searchParams.get('closeDateFilter');
        const sortBy = searchParams.get('sortBy') || 'createdAt';
        const sortOrder = (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc';
        const skip = (page - 1) * limit;

        // Build a robust OR condition using ONLY base fields for Phase 1
        const conditions: any[] = [];
        
        if (searchInput) {
            // Case-insensitive/partial matching on primary strings
            conditions.push({ projectName: { contains: searchInput, mode: 'insensitive' } });
            conditions.push({ clientName: { contains: searchInput, mode: 'insensitive' } });
            conditions.push({ companyName: { contains: searchInput, mode: 'insensitive' } });
            conditions.push({ projectReference: { contains: searchInput, mode: 'insensitive' } });
            conditions.push({ pipedriveOwnerName: { contains: searchInput, mode: 'insensitive' } });

            // Safe integer search for Pipedrive Deal ID (avoids 500 on string "contains")
            const isNumeric = /^\d+$/.test(searchInput);
            if (isNumeric) {
                const dealId = parseInt(searchInput);
                conditions.push({ pipedrive_deal_id: dealId });
                console.log(`[API GET Projects] Search input is numeric. Including pipedrive_deal_id: ${dealId}`);
            }
        }

        let where: any = conditions.length > 0 ? { OR: conditions } : {};

        // Add estimator filtering
        if (estimatorId && estimatorId !== 'all') {
            where = {
                ...where,
                quotes: {
                    some: {
                        createdBy: estimatorId
                    }
                }
            };
        }

        // Add deal owner filtering
        if (dealOwner && dealOwner !== 'all') {
            if (dealOwner === 'unassigned') {
                where = {
                    ...where,
                    pipedriveOwnerName: null
                };
            } else {
                where = {
                    ...where,
                    pipedriveOwnerName: dealOwner
                };
            }
        }

        // Add Expected Close Date filtering
        if (closeDateFilter && closeDateFilter !== 'all') {
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const tomorrow = new Date(today.getTime() + 86400000);
            
            if (closeDateFilter === 'overdue') {
                where.expectedCloseDate = { lt: today };
            } else if (closeDateFilter === 'today') {
                where.expectedCloseDate = {
                    gte: today,
                    lt: tomorrow
                };
            } else if (closeDateFilter === 'this_week') {
                // End of current week (Saturday night/Sunday morning)
                const endOfWeek = new Date(today.getTime() + (7 - today.getDay()) * 86400000);
                where.expectedCloseDate = { gte: today, lt: endOfWeek };
            } else if (closeDateFilter === 'next_30_days') {
                where.expectedCloseDate = { gte: today, lt: new Date(today.getTime() + 30 * 86400000) };
            } else if (closeDateFilter === 'future') {
                where.expectedCloseDate = { gte: tomorrow };
            }
        }

        console.log(`[API GET Projects] FINAL WHERE:`, JSON.stringify(where, null, 2));

        // Get total count for filtered results
        const total = await (prisma as any).project.count({ where });
        console.log(`[API GET Projects] Filtered total count: ${total}`);

        // Prepare ordering
        let orderBy: any = {};
        if (sortBy === 'expectedCloseDate') {
            orderBy = { expectedCloseDate: { sort: sortOrder, nulls: 'last' } };
        } else {
            orderBy = { [sortBy]: sortOrder };
        }

        const projects = await (prisma as any).project.findMany({
            where,
            include: {
                client: {
                    select: { id: true, name: true, source: true, pipedrive_org_id: true }
                },
                contact: {
                    select: { id: true, name: true, source: true, pipedrive_person_id: true }
                },
                quotes: {
                    select: {
                        creator: {
                            select: { id: true, name: true, email: true }
                        }
                    }
                },
                _count: {
                    select: { quotes: true }
                }
            },
            orderBy,
            skip,
            take: limit,
        });

        // To populate the filter, we need a list of all users who have created quotes.
        const estimators = await (prisma as any).user.findMany({
            where: {
                createdQuotes: {
                    some: {}
                }
            },
            select: {
                id: true,
                name: true,
                email: true
            },
            orderBy: { name: 'asc' }
        });

        // Fetch unique Pipedrive owners for the filter
        const ownersResults = await (prisma as any).project.findMany({
            where: {
                pipedriveOwnerName: { not: null }
            },
            distinct: ['pipedriveOwnerName'],
            select: {
                pipedriveOwnerName: true
            },
            orderBy: {
                pipedriveOwnerName: 'asc'
            }
        });
        const owners = ownersResults.map((r: any) => r.pipedriveOwnerName);

        console.log(`[API GET Projects] Returning ${projects.length} projects, ${estimators.length} estimators, and ${owners.length} owners`);

        return NextResponse.json({
            projects,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
            estimators,
            owners
        });
    } catch (error: any) {
        console.error('[API GET Projects] CRITICAL ERROR:', error);
        return NextResponse.json({ 
            error: 'Failed to fetch projects', 
            details: error.message || 'Unknown error',
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { 
            projectName, 
            clientName, 
            companyName, 
            projectReference, 
            projectDescription, 
            projectStatus,
            pipedrive_deal_id,
            pipedrive_person_id,
            pipedrive_org_id
        } = body;

        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!projectName && !pipedrive_deal_id) {
            return NextResponse.json({ error: 'Project Name or Pipedrive Deal ID is required' }, { status: 400 });
        }

        if (pipedrive_deal_id) {
            const project = await upsertPipedriveDealAsProject(pipedrive_deal_id);
            return NextResponse.json(project);
        }

        // Determine linked entities if IDs provided but no Deal ID
        let linkedClientId = undefined;
        let linkedContactId = undefined;

        if (pipedrive_org_id) {
            const client = await upsertPipedriveOrganization(pipedrive_org_id);
            if (client) linkedClientId = client.id;
        }

        if (pipedrive_person_id) {
            const contact = await upsertPipedrivePerson(pipedrive_person_id, linkedClientId);
            if (contact) linkedContactId = contact.id;
        }

        const newProject = await (prisma as any).project.create({
            data: {
                projectName,
                clientName,
                companyName,
                projectReference,
                projectDescription,
                projectStatus: projectStatus || 'Budget',
                clientId: linkedClientId,
                contactId: linkedContactId
            },
        });

        return NextResponse.json(newProject);
    } catch (error) {
        console.error('Failed to create project:', error);
        return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
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

        console.log(`[API DELETE Projects] Bulk delete request for ${ids.length} projects`);

        await (prisma as any).project.deleteMany({
            where: {
                id: { in: ids }
            }
        });

        return NextResponse.json({ success: true, count: ids.length });
    } catch (error: any) {
        console.error('[API DELETE Projects] Bulk delete error:', error);
        return NextResponse.json({ 
            error: 'Failed to delete projects', 
            details: error.message 
        }, { status: 500 });
    }
}
