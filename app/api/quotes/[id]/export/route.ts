import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { Board, Item } from '@prisma/client';
import { ExportService } from '@/lib/export-service';
import { enrichItems } from '@/lib/enrichment';
import { calculateQuoteTotals } from '@/lib/pricing';
import { calculateQuoteTotalsServerSide } from '@/lib/pricing-service';

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
                },
                creator: true
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
            // Fallback to absolute standard system default
            templatePath = '/templates/Estimating Standard Tender Template (2026).docx';
        }

        // 3. Calculate Totals using the definitive source of truth
        const { grandTotals: pricingGrandTotals, boardTotals, effectiveSettings } = await calculateQuoteTotalsServerSide(quote);

        console.log("=== EXPORT DEBUG ===");
        console.log("Effective Settings:", JSON.stringify(effectiveSettings, null, 2));

        // Map to format expected by ExportService
        const boardTotalsMap = Object.entries(boardTotals).map(([boardId, totals]) => ({
            boardId,
            sellPriceRounded: totals.sellPriceRounded
        }));

        const grandTotals = {
            ...pricingGrandTotals,
            gst: pricingGrandTotals.gst,
            finalSellPrice: pricingGrandTotals.finalSellPrice
        };

        const quoteData = {
            quoteNumber: quote.quoteNumber,
            clientName: quote.clientName,
            clientCompany: quote.clientCompany,
            projectRef: quote.projectRef,
            description: quote.description,
            boards: quote.boards,
            totals: {
                sellPrice: grandTotals.sellPrice
            },
            creator: quote.creator,
            templatePath
        };

        // Generate the DOCX file
        await ExportService.generateQuoteDocument({
            quote: quoteData,
            settings: effectiveSettings,
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
