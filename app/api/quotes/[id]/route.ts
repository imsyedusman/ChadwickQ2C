import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { triggerSequenceSync } from '@/lib/quote-numbering';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const quote = await prisma.quote.findUnique({
            where: { id },
            include: {
                boards: {
                    include: {
                        items: true,
                        // No direct relation to CatalogItem, so we can't include it here.
                    },
                    orderBy: { order: 'asc' },
                },
            },
        });

        if (!quote) {
            return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
        }

        // --- ENRICHMENT STEP: Fetch and Merge Catalog Data (Copper Weights) ---

        // 1. Collect all Part Numbers
        const partNumbers = new Set<string>();
        quote.boards.forEach(board => {
            board.items.forEach(item => {
                if (item.partNumber) partNumbers.add(item.partNumber);
            });
        });

        // 2. Fetch Catalog Details
        const catalogItems = await prisma.catalogItem.findMany({
            where: {
                partNumber: { in: Array.from(partNumbers) }
            },
            select: {
                partNumber: true,
                totalCopperWeightKgPerMeter: true,
                isCopperPriced: true
            }
        });

        // 3. Create Map
        const catalogMap = new Map<string, { totalCopperWeightKgPerMeter: number | null, isCopperPriced: boolean }>();
        catalogItems.forEach(ci => {
            if (ci.partNumber) {
                catalogMap.set(ci.partNumber, {
                    totalCopperWeightKgPerMeter: ci.totalCopperWeightKgPerMeter,
                    isCopperPriced: ci.isCopperPriced
                });
            }
        });

        // 4. Merge into Response
        const enrichedBoards = quote.boards.map(board => ({
            ...board,
            items: board.items.map(item => {
                const catalogData = item.partNumber ? catalogMap.get(item.partNumber) : null;
                return {
                    ...item,
                    totalCopperWeightKgPerMeter: catalogData?.totalCopperWeightKgPerMeter ?? null, // Default to null if missing
                    isCopperPriced: catalogData?.isCopperPriced ?? false
                };
            })
        }));

        // Return modified quote object
        return NextResponse.json({
            ...quote,
            boards: enrichedBoards
        });

    } catch (error) {
        console.error('Failed to fetch quote:', error);
        return NextResponse.json({ error: 'Failed to fetch quote' }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const { searchParams } = new URL(request.url);
        const permanent = searchParams.get('permanent') === 'true';

        if (permanent) {
            // Fetch quote first to get its number for synchronization
            const quote = await prisma.quote.findUnique({
                where: { id },
                select: { quoteNumber: true }
            });

            if (!quote) {
                return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
            }

            await prisma.quote.delete({
                where: { id },
            });

            // Synchronize sequence after permanent deletion
            await triggerSequenceSync(quote.quoteNumber, true);

            return NextResponse.json({ success: true, permanent: true });
        } else {
            // Soft delete: move to TRASH
            await prisma.quote.update({
                where: { id },
                data: { status: 'TRASH' }
            });

            return NextResponse.json({ success: true, trashed: true });
        }
    } catch (error) {
        console.error('Failed to delete quote:', error);
        return NextResponse.json({ error: 'Failed to delete quote' }, { status: 500 });
    }
}

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json() as any;
        const {
            clientName,
            clientCompany,
            projectRef,
            description,
            status,
            settingsSnapshot,
            // Overrides
            overrideLabourRate,
            overrideOverheadPct,
            overrideEngineeringPct,
            overrideTargetMarginPct,
            overrideConsumablesPct,
            overrideGstPct,
            overrideRoundingIncrement,
            quoteNumber
        } = body;

        // Fetch existing quote to check if quoteNumber is changing
        const existingQuote = await prisma.quote.findUnique({
            where: { id },
            select: { quoteNumber: true }
        });

        const updatedQuote = await prisma.quote.update({
            where: { id },
            data: {
                clientName,
                clientCompany,
                projectRef,
                description,
                status,
                settingsSnapshot,
                // Overrides
                overrideLabourRate,
                overrideOverheadPct,
                overrideEngineeringPct,
                overrideTargetMarginPct,
                overrideConsumablesPct,
                overrideGstPct,
                overrideRoundingIncrement,
                quoteNumber
            },
        });

        // If quote number was manually changed, trigger sequence sync
        if (quoteNumber && existingQuote && quoteNumber !== existingQuote.quoteNumber) {
            await triggerSequenceSync(quoteNumber);
        }

        return NextResponse.json(updatedQuote);
    } catch (error) {
        console.error('Failed to update quote:', error);
        return NextResponse.json({ error: 'Failed to update quote' }, { status: 500 });
    }
}
