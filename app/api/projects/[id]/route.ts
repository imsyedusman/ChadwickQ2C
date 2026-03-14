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
            'projectName', 'clientName', 'companyName', 
            'projectReference', 'projectDescription', 'projectStatus'
        ];

        const updates: any = {};
        Object.keys(body).forEach(key => {
            if (VALID_PROJECT_FIELDS.includes(key)) {
                updates[key] = body[key];
            }
        });

        if (Object.keys(updates).length === 0) {
            return NextResponse.json({ error: 'No valid fields provided' }, { status: 400 });
        }

        const updatedProject = await (prisma as any).project.update({
            where: { id },
            data: updates
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

        const project = await (prisma as any).project.findUnique({
            where: { id },
            include: {
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
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }

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
                total: grandTotals.sellPriceRounded,
                totalIncGst: grandTotals.finalSellPrice
            };
        });

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
