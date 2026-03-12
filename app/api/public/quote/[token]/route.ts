import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { calculateQuoteTotals, PricingSettings } from '@/lib/pricing';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ token: string }> }
) {
    try {
        const { token } = await params;
        
        const shareLink = await (prisma as any).shareLink.findUnique({
            where: { token, active: true },
            include: {
                quote: {
                    include: {
                        boards: {
                            include: { items: true },
                            orderBy: { order: 'asc' }
                        }
                    }
                }
            }
        });

        if (!shareLink || !shareLink.quote) {
            return NextResponse.json({ error: 'Link invalid or expired' }, { status: 404 });
        }

        if (shareLink.expiresAt && new Date() > shareLink.expiresAt) {
            return NextResponse.json({ error: 'Link expired' }, { status: 410 });
        }

        const quote = shareLink.quote;

        // Apply default settings or quote overrides for pricing
        const settingsRes = await prisma.settings.findUnique({ where: { id: 'global' } });
        const settings: PricingSettings = {
            labourRate: quote.overrideLabourRate ?? settingsRes?.labourRate ?? 100,
            overheadPct: quote.overrideOverheadPct ?? settingsRes?.overheadPct ?? 0.20,
            engineeringPct: quote.overrideEngineeringPct ?? settingsRes?.engineeringPct ?? 0.20,
            targetMarginPct: quote.overrideTargetMarginPct ?? settingsRes?.targetMarginPct ?? 0.18,
            consumablesPct: quote.overrideConsumablesPct ?? settingsRes?.consumablesPct ?? 0.03,
            gstPct: quote.overrideGstPct ?? settingsRes?.gstPct ?? 0.10,
            roundingIncrement: quote.overrideRoundingIncrement ?? settingsRes?.roundingIncrement ?? 100,
            copperPricePerKg: quote.overrideCopperPricePerKg ?? settingsRes?.copperPricePerKg ?? 15.0,
        };

        const { grandTotals, boardTotals } = calculateQuoteTotals(quote.boards, settings);

        // Sanitize quote for public view (remove internal notes etc if needed)
        // For now we'll just return enough for a read-only view.
        return NextResponse.json({
            quote: {
                quoteNumber: quote.quoteNumber,
                revision: quote.revision,
                clientName: quote.clientName,
                clientCompany: quote.clientCompany,
                projectRef: quote.projectRef,
                description: quote.description,
                updatedAt: quote.updatedAt,
            },
            boardTotals,
            grandTotals
        });

    } catch (error) {
        console.error('Failed to fetch shared quote:', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
