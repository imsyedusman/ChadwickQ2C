import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { startOfMonth, subMonths } from 'date-fns';
import { calculateQuoteTotalsServerSide } from '@/lib/pricing-service';

export async function GET() {
    try {
        const now = new Date();
        const thisMonthStart = startOfMonth(now);
        const lastMonthStart = startOfMonth(subMonths(now, 1));

        // Get all active quotes for value calculation
        // NOTE: In a very large DB, we might want to cache this or store totals in the DB
        const activeQuotes = await (prisma as any).quote.findMany({
            where: {
                status: { not: 'TRASH' }
            },
            include: {
                boards: {
                    include: {
                        items: true
                    }
                }
            }
        });

        let totalValue = 0;
        let pendingValue = 0;
        let wonCount = 0;
        let totalTurnaroundDays = 0;
        
        const thisMonthQuotes = activeQuotes.filter((q: any) => new Date(q.createdAt) >= thisMonthStart);
        const lastMonthQuotesCount = await (prisma as any).quote.count({
            where: {
                createdAt: {
                    gte: lastMonthStart,
                    lt: thisMonthStart
                },
                status: { not: 'TRASH' }
            }
        });

        // Calculate totals and turnaround
        for (const quote of activeQuotes) {
            const { grandTotals } = await calculateQuoteTotalsServerSide(quote);
            const val = grandTotals.sellPriceRounded; // EX-GST Sell Price
            totalValue += val;
            
            if (quote.status === 'WON') {
                const created = new Date(quote.createdAt);
                const updated = new Date(quote.updatedAt);
                const diffTime = Math.abs(updated.getTime() - created.getTime());
                const diffDays = diffTime / (1000 * 60 * 60 * 24);
                totalTurnaroundDays += diffDays;

                if (updated >= thisMonthStart) {
                    wonCount++;
                }
            } else if (quote.status === 'DRAFT' || quote.status === 'SENT') {
                pendingValue += val;
            }
        }

        const wonTotalCount = activeQuotes.filter((q: any) => q.status === 'WON').length;
        const avgTurnaround = wonTotalCount > 0 ? (totalTurnaroundDays / wonTotalCount).toFixed(1) : 0;

        // Trends (simple comparison)
        const activeTrend = lastMonthQuotesCount > 0 
            ? Math.round(((thisMonthQuotes.length - lastMonthQuotesCount) / lastMonthQuotesCount) * 100)
            : 0;

        return NextResponse.json({
            activeQuotes: activeQuotes.length,
            totalValue,
            wonCount,
            pendingValue,
            avgTurnaround: Number(avgTurnaround),
            trends: {
                activeQuotes: activeTrend,
                totalValue: 0 // Could calculate this too if needed
            }
        });
    } catch (error) {
        console.error('Dashboard stats API error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
