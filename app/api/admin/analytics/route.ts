import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { calculateQuoteTotals, PricingSettings } from '@/lib/pricing';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !(await hasPermission('admin:view_analytics'))) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        // Fetch settings for pricing calculations
        const settingsRes = await prisma.settings.findUnique({ where: { id: 'global' } });
        const settings: PricingSettings = {
            labourRate: settingsRes?.labourRate ?? 100,
            overheadPct: settingsRes?.overheadPct ?? 0.20,
            engineeringPct: settingsRes?.engineeringPct ?? 0.20,
            targetMarginPct: settingsRes?.targetMarginPct ?? 0.18,
            consumablesPct: settingsRes?.consumablesPct ?? 0.03,
            gstPct: settingsRes?.gstPct ?? 0.10,
            roundingIncrement: settingsRes?.roundingIncrement ?? 100,
            copperPricePerKg: settingsRes?.copperPricePerKg ?? 15.0,
        };

        // Fetch all quotes (not in trash)
        const quotes = await (prisma.quote as any).findMany({
            where: { status: { not: 'TRASH' } },
            include: {
                boards: {
                    include: { items: true }
                },
                creator: { select: { name: true, email: true } }
            },
        });

        const stats = {
            total: quotes.length,
            sent: quotes.filter((q: any) => q.status === 'SENT').length,
            won: quotes.filter((q: any) => q.status === 'WON').length,
            lost: quotes.filter((q: any) => q.status === 'LOST').length,
            draft: quotes.filter((q: any) => q.status === 'DRAFT').length,
            createdToday: 0,
            createdThisWeek: 0,
            winRate: 0,
            totalValueWon: 0,
            monthlyWon: {} as Record<string, number>,
            estimatorStats: {} as Record<string, { sent: number, won: number, lost: number, value: number, name: string }>
        };

        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
        weekStart.setHours(0, 0, 0, 0);

        if (stats.sent + stats.won + stats.lost > 0) {
            stats.winRate = (stats.won / (stats.won + stats.lost)) * 100;
        }

        quotes.forEach((quote: any) => {
            const createdDate = new Date(quote.createdAt);
            if (createdDate >= todayStart) stats.createdToday++;
            if (createdDate >= weekStart) stats.createdThisWeek++;

            // Apply overrides if present
            const quoteSettings = { ...settings };
            if (quote.overrideLabourRate) quoteSettings.labourRate = quote.overrideLabourRate;
            if (quote.overrideOverheadPct) quoteSettings.overheadPct = quote.overrideOverheadPct;
            if (quote.overrideEngineeringPct) quoteSettings.engineeringPct = quote.overrideEngineeringPct;
            if (quote.overrideTargetMarginPct) quoteSettings.targetMarginPct = quote.overrideTargetMarginPct;
            if (quote.overrideConsumablesPct) quoteSettings.consumablesPct = quote.overrideConsumablesPct;
            if (quote.overrideGstPct) quoteSettings.gstPct = quote.overrideGstPct;
            if (quote.overrideRoundingIncrement) quoteSettings.roundingIncrement = quote.overrideRoundingIncrement;
            if (quote.overrideCopperPricePerKg) quoteSettings.copperPricePerKg = quote.overrideCopperPricePerKg;

            const { grandTotals } = calculateQuoteTotals(quote.boards, quoteSettings);
            const value = grandTotals.sellPriceRounded;

            const estimatorEmail = quote.creator?.email || 'Unknown';
            const estimatorName = quote.creator?.name || estimatorEmail;

            if (!stats.estimatorStats[estimatorEmail]) {
                stats.estimatorStats[estimatorEmail] = { sent: 0, won: 0, lost: 0, value: 0, name: estimatorName };
            }

            if (quote.status === 'SENT') stats.estimatorStats[estimatorEmail].sent++;
            if (quote.status === 'LOST') stats.estimatorStats[estimatorEmail].lost++;
            if (quote.status === 'WON') {
                stats.estimatorStats[estimatorEmail].won++;
                stats.estimatorStats[estimatorEmail].value += value;
                stats.totalValueWon += value;

                const month = new Date(quote.updatedAt).toLocaleString('default', { month: 'short', year: 'numeric' });
                stats.monthlyWon[month] = (stats.monthlyWon[month] || 0) + value;
            }
        });

        return NextResponse.json(stats);
    } catch (error) {
        console.error('Failed to fetch analytics:', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
