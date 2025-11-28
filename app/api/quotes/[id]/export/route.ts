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

        // Fetch default template
        let templatePath = '';
        try {
            const templates = await prisma.template.findMany({
                where: { isDefault: true }
            });
            if (templates.length > 0 && templates[0].filename) {
                templatePath = `/templates/${templates[0].filename}`;
            }
        } catch (e) {
            console.warn("Failed to fetch default template", e);
        }

        if (!templatePath) {
            return NextResponse.json({
                error: 'No default export template found. Please upload a template in Admin Tools.'
            }, { status: 400 });
        }

        // Calculate board totals using the same logic as ExportService
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

        // Calculate board totals map
        const boardTotalsMap = quote.boards.map(board => ({
            boardId: board.id,
            sellPriceRounded: calculateBoardTotal(board.items)
        }));

        // Calculate grand totals
        let grandTotal = 0;
        let totalLabourHours = 0;
        let totalMaterialCost = 0;
        let totalLabourCost = 0;
        let totalConsumablesCost = 0;
        let totalCostBase = 0;
        let totalOverheadAmount = 0;
        let totalEngineeringCost = 0;
        let totalCost = 0;

        quote.boards.forEach(board => {
            let materialCost = 0;
            let labourHours = 0;

            board.items.forEach(item => {
                materialCost += (item.unitPrice || 0) * (item.quantity || 0);
                labourHours += (item.labourHours || 0) * (item.quantity || 0);
            });

            const labourCost = labourHours * settings.labourRate;
            const consumablesCost = materialCost * settings.consumablesPct;
            const costBase = materialCost + labourCost + consumablesCost;
            const overheadAmount = costBase * settings.overheadPct;
            const engineeringCost = costBase * settings.engineeringPct;
            const boardTotalCost = costBase + overheadAmount + engineeringCost;
            const marginFactor = 1 - settings.targetMarginPct;
            const sellPrice = marginFactor > 0 ? boardTotalCost / marginFactor : boardTotalCost;
            const sellPriceRounded = Math.round(sellPrice / settings.roundingIncrement) * settings.roundingIncrement;

            totalLabourHours += labourHours;
            totalMaterialCost += materialCost;
            totalLabourCost += labourCost;
            totalConsumablesCost += consumablesCost;
            totalCostBase += costBase;
            totalOverheadAmount += overheadAmount;
            totalEngineeringCost += engineeringCost;
            totalCost += boardTotalCost;
            grandTotal += sellPriceRounded;
        });

        const profit = grandTotal - totalCost;
        const gst = grandTotal * settings.gstPct;
        const finalSellPrice = grandTotal + gst;

        const grandTotals = {
            labourHours: totalLabourHours,
            materialCost: totalMaterialCost,
            labourCost: totalLabourCost,
            consumablesCost: totalConsumablesCost,
            costBase: totalCostBase,
            overheadAmount: totalOverheadAmount,
            engineeringCost: totalEngineeringCost,
            totalCost: totalCost,
            profit: profit,
            sellPrice: grandTotal,
            sellPriceRounded: grandTotal,
            gst: gst,
            finalSellPrice: finalSellPrice
        };

        const quoteData = {
            quoteNumber: quote.quoteNumber,
            clientName: quote.clientName,
            clientCompany: quote.clientCompany,
            projectRef: quote.projectRef,
            description: quote.description,
            boards: quote.boards,
            totals: {
                sellPrice: grandTotal
            },
            templatePath
        };

        // Generate the DOCX file
        await ExportService.generateQuoteDocument({
            quote: quoteData,
            settings,
            totals: {
                boardTotals: boardTotalsMap,
                grandTotals
            }
        });

        return NextResponse.json({
            success: true,
            message: 'Export completed successfully.'
        });
    } catch (error) {
        console.error('Failed to export quote:', error);
        return NextResponse.json({ error: 'Failed to export quote' }, { status: 500 });
    }
}
