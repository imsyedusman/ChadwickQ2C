import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
    try {
        const counts = {
            catalogItem: await (prisma as any).catalogItem.count(),
            item: await (prisma as any).item.count(),
            quote: await (prisma as any).quote.count(),
            board: await (prisma as any).board.count(),
            project: await (prisma as any).project.count(),
        };

        const categories = await (prisma as any).catalogItem.groupBy({
            by: ['category'],
            _count: { id: true }
        });

        const samples = await (prisma as any).catalogItem.findMany({
            take: 10
        });

        const distinctBrands = await (prisma as any).catalogItem.findMany({
            select: { brand: true },
            distinct: ['brand']
        });

        return NextResponse.json({
            counts,
            categories,
            distinctBrands,
            samples
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
