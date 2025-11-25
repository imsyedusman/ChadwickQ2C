import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string; boardId: string }> }
) {
    try {
        const { boardId } = await params;
        const items = await prisma.item.findMany({
            where: { boardId },
            orderBy: [
                { category: 'asc' }, // BASICS, SWITCHBOARD, BUSBAR (alphabetical isn't right, need custom sort)
                { order: 'asc' },
            ],
        });

        // Custom sort order
        const categoryOrder = { 'BASICS': 1, 'SWITCHBOARD': 2, 'BUSBAR': 3 };
        const sortedItems = items.sort((a, b) => {
            const catA = categoryOrder[a.category as keyof typeof categoryOrder] || 99;
            const catB = categoryOrder[b.category as keyof typeof categoryOrder] || 99;
            return catA - catB;
        });

        return NextResponse.json(sortedItems);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 });
    }
}

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string; boardId: string }> }
) {
    try {
        const { boardId } = await params;
        const body = await request.json();
        const { category, name, quantity, unitPrice, labourHours } = body;

        const count = await prisma.item.count({ where: { boardId } });

        const newItem = await prisma.item.create({
            data: {
                boardId,
                category,
                name,
                quantity,
                unitPrice,
                labourHours,
                cost: unitPrice * quantity,
                order: count,
            },
        });

        return NextResponse.json(newItem);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to create item' }, { status: 500 });
    }
}
