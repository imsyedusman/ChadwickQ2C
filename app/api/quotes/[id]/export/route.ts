import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { Board, Item } from '@prisma/client';
import { ExportService } from '@/lib/export-service';
import { enrichItems } from '@/lib/enrichment';
import { calculateQuoteTotals } from '@/lib/pricing';

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
            // Fallback to system default
            templatePath = '/templates/tender-default.docx';
        }

        // Calculate effective settings
        const q = quote as any; // Cast to any to avoid lint errors until prisma generate runs
        const effectiveSettings = {
            ...settings,
            labourRate: q.overrideLabourRate ?? settings.labourRate,
            overheadPct: q.overrideOverheadPct ?? settings.overheadPct,
            engineeringPct: q.overrideEngineeringPct ?? settings.engineeringPct,
            targetMarginPct: q.overrideTargetMarginPct ?? settings.targetMarginPct,
            consumablesPct: q.overrideConsumablesPct ?? settings.consumablesPct,
            gstPct: q.overrideGstPct ?? settings.gstPct,
            roundingIncrement: q.overrideRoundingIncrement ?? settings.roundingIncrement,
        };

        console.log("=== EXPORT DEBUG ===");
        console.log("Global Settings:", JSON.stringify(settings, null, 2));
        console.log("Quote Overrides:", {
            labourRate: q.overrideLabourRate,
            overheadPct: q.overrideOverheadPct,
            engineeringPct: q.overrideEngineeringPct,
            targetMarginPct: q.overrideTargetMarginPct,
            consumablesPct: q.overrideConsumablesPct,
            gstPct: q.overrideGstPct,
            roundingIncrement: q.overrideRoundingIncrement
        });
        console.log("Effective Settings:", JSON.stringify(effectiveSettings, null, 2));

        // 1. Collect and Enrich all items
        const allItemsRaw = quote.boards.flatMap(b => b.items);
        const allItemsEnriched = await enrichItems(allItemsRaw);

        // 2. Re-distribute enriched items back to boards
        const itemMap = new Map(allItemsEnriched.map(i => [i.id, i]));
        const enrichedBoards = quote.boards.map(board => ({
            ...board,
            items: board.items.map(item => itemMap.get(item.id) || item)
        }));

        // 3. Calculate Totals using shared logic (same as UI)
        const pricingBoards = enrichedBoards.map(b => ({
            id: b.id,
            config: b.config ? (typeof b.config === 'string' ? JSON.parse(b.config) : b.config) : {},
            items: b.items as any[]
        }));

        const quoteTotals = calculateQuoteTotals(pricingBoards, effectiveSettings);

        // Map to format expected by ExportService
        const boardTotalsMap = Object.entries(quoteTotals.boardTotals).map(([boardId, totals]) => ({
            boardId,
            sellPriceRounded: totals.sellPriceRounded
        }));

        const grandTotals = {
            ...quoteTotals.grandTotals,
            gst: quoteTotals.grandTotals.gst,
            finalSellPrice: quoteTotals.grandTotals.finalSellPrice
        };

        const quoteData = {
            quoteNumber: quote.quoteNumber,
            clientName: quote.clientName,
            clientCompany: quote.clientCompany,
            projectRef: quote.projectRef,
            description: quote.description,
            boards: enrichedBoards,
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
