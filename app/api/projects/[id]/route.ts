import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { calculateQuoteTotals } from '@/lib/pricing';

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const body = await request.json();

        // Valid Project model fields
        const VALID_PROJECT_FIELDS = [
            'projectName', 'projectReference', 'projectDescription', 'projectStatus',
            'pipedrive_deal_id', 'dealValue', 'currency', 'dealCreatedAt', 
            'expectedCloseDate', 'quoteFolder', 'pipedriveDealUrl'
        ];

        const updates: any = {};
        Object.keys(body).forEach(key => {
            if (VALID_PROJECT_FIELDS.includes(key)) {
                updates[key] = body[key];
            }
        });

        // Handle Client (Organization) Linking
        if (body.client) {
            updates.client = {
                connectOrCreate: {
                    where: { pipedrive_org_id: body.client.pipedrive_org_id },
                    create: {
                        name: body.client.name,
                        pipedrive_org_id: body.client.pipedrive_org_id,
                        source: 'pipedrive'
                    }
                }
            };
            // Also update the organization name if it already exists but changed
            if (body.client.pipedrive_org_id) {
                await (prisma as any).client.updateMany({
                   where: { pipedrive_org_id: body.client.pipedrive_org_id },
                   data: { name: body.client.name }
                });
            }
        }

        // Handle Contact (Person) Linking
        if (body.contact) {
            updates.contact = {
                connectOrCreate: {
                    where: { pipedrive_person_id: body.contact.pipedrive_person_id },
                    create: {
                        name: body.contact.name,
                        pipedrive_person_id: body.contact.pipedrive_person_id,
                        source: 'pipedrive'
                    }
                }
            };
            // Also update the person name if it already exists but changed
            if (body.contact.pipedrive_person_id) {
                await (prisma as any).contact.updateMany({
                    where: { pipedrive_person_id: body.contact.pipedrive_person_id },
                    data: { name: body.contact.name }
                });
            }
        }

        if (Object.keys(updates).length === 0) {
            return NextResponse.json({ error: 'No valid fields provided' }, { status: 400 });
        }

        const updatedProject = await (prisma as any).project.update({
            where: { id },
            data: updates,
            include: {
                client: true,
                contact: true
            }
        });

        return NextResponse.json(updatedProject);
    } catch (error) {
        console.error('Failed to update project:', error);
        return NextResponse.json({ error: 'Failed to update project' }, { status: 500 });
    }
}

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const { id } = await params;
        
        console.log(`[API GET Project] Incoming ID: "${id}" (type: ${typeof id})`);

        const project = await (prisma as any).project.findUnique({
            where: { id: String(id) },
            include: {
                client: true,
                contact: true,
                quotes: {
                    include: {
                        boards: {
                            include: {
                                items: true
                            }
                        },
                        modifier: { select: { name: true } }
                    },
                    orderBy: { updatedAt: 'desc' }
                }
            }
        });

        if (!project) {
            console.log(`[API GET Project] NOT FOUND: "${id}"`);
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }

        console.log(`[API GET Project] Found: "${project.projectName}" with ${project.quotes.length} quotes`);

        // Get global settings for calculation
        const settings = await prisma.settings.findUnique({ where: { id: 'global' } });

        const quotesWithTotal = project.quotes.map((quote: any) => {
            if (!settings) return { ...quote, total: 0, totalIncGst: 0, boards: undefined };

            const effectiveSettings = {
                labourRate: quote.overrideLabourRate ?? settings.labourRate,
                consumablesPct: quote.overrideConsumablesPct ?? settings.consumablesPct,
                overheadPct: quote.overrideOverheadPct ?? settings.overheadPct,
                engineeringPct: quote.overrideEngineeringPct ?? settings.engineeringPct,
                targetMarginPct: quote.overrideTargetMarginPct ?? settings.targetMarginPct,
                gstPct: quote.overrideGstPct ?? settings.gstPct,
                roundingIncrement: quote.overrideRoundingIncrement ?? settings.roundingIncrement,
                copperPricePerKg: quote.overrideCopperPricePerKg ?? settings.copperPricePerKg,
            };

            const { grandTotals } = calculateQuoteTotals(quote.boards || [], effectiveSettings);
            
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
        });

        console.log(`[API GET Project] SUCCESS: Returning project and ${quotesWithTotal.length} calculated quotes`);
        return NextResponse.json({
            project: { ...project, quotes: undefined },
            quotes: quotesWithTotal
        });
    } catch (error: any) {
        console.error('Failed to fetch project:', error);
        return NextResponse.json({ error: 'Failed to fetch project' }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;

        // Delete all associated quotes first
        await (prisma as any).quote.deleteMany({
            where: { projectId: id }
        });

        // Delete the project
        await (prisma as any).project.delete({
            where: { id }
        });

        return NextResponse.json({ message: 'Project and associated quotes deleted successfully' });
    } catch (error) {
        console.error('Failed to delete project:', error);
        return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 });
    }
}
