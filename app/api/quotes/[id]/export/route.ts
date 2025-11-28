import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { ExportService } from '@/lib/export-service';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        // Fetch the quote with all boards and items
        const quote = await prisma.quote.findUnique({
            where: { id },
            include: {
                boards: {
                    include: {
                        items: true,
                    }
                }
            }
        });

        if (!quote) {
            return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
        }

        // Fetch settings
        const settings = await prisma.settings.findUnique({
            where: { id: 'global' }
        });

        if (!settings) {
            return NextResponse.json({ error: 'Settings not found' }, { status: 404 });
        }

        // Calculate totals using the same logic as ExportService
        const calculateBoardTotal = (items: any[]): number => {
            let materialCost = 0;
            let labourHours = 0;

            items.forEach(item => {
                materialCost += (item.unitPrice || 0) * (item.quantity || 0);
                labourHours += (item.labourHours || 0) * (item.quantity || 0);
            });

            const labourCost = labourHours * settings.labourRate;
            const consumablesCost = materialCost * settings.consumablesPct;
            const costBase = materialCost + labourCost + consumablesCost;
            const overheadAmount = costBase * settings.overheadPct;
            const engineeringCost = costBase * settings.engineeringPct;
            const totalCost = costBase + overheadAmount + engineeringCost;
            const marginFactor = 1 - settings.targetMarginPct;
            const sellPrice = marginFactor > 0 ? totalCost / marginFactor : totalCost;
            const sellPriceRounded = Math.round(sellPrice / settings.roundingIncrement) * settings.roundingIncrement;

            return sellPriceRounded;
        };

        // Calculate grand total
        let grandTotal = 0;
        quote.boards.forEach(board => {
            grandTotal += calculateBoardTotal(board.items);
        });

        const totals = {
            grandTotals: {
                sellPriceRounded: grandTotal
            }
        };

        // Generate the DOCX file
        await ExportService.generateQuoteDocument({ quote, settings, totals });

        return NextResponse.json({
            success: true,
            message: 'Export initiated. The file will be downloaded shortly.'
        });
    } catch (error) {
        console.error('Failed to export quote:', error);
        return NextResponse.json({ error: 'Failed to export quote' }, { status: 500 });
    }
}
