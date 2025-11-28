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
        const { category, subcategory, name, description, quantity, unitPrice, labourHours, notes, isDefault } = body;

        // Check if an item with the same identifying characteristics already exists
        // Match by: category, subcategory, name, and description (unique identifier for an item)
        const existingItem = await prisma.item.findFirst({
            where: {
                boardId,
                category,
                subcategory: subcategory || null,
                name,
                description: description || null,
            },
        });

        if (existingItem) {
            // Item already exists - increment quantity instead of creating duplicate
            const updatedItem = await prisma.item.update({
                where: { id: existingItem.id },
                data: {
                    quantity: existingItem.quantity + (quantity || 1),
                    cost: (existingItem.quantity + (quantity || 1)) * existingItem.unitPrice,
                },
            });

            return NextResponse.json(updatedItem);
        }

        // Item doesn't exist - create new item
        const count = await prisma.item.count({ where: { boardId } });

        const newItem = await prisma.item.create({
            data: {
                boardId,
                category,
                subcategory,
                name,
                description,
                quantity: quantity || 1,
                unitPrice: unitPrice || 0,
                labourHours: labourHours || 0,
                cost: (unitPrice || 0) * (quantity || 1),
                notes,
                isDefault: isDefault || false,
                order: count,
            },
        });

        return NextResponse.json(newItem);
    } catch (error) {
        console.error('Failed to create/update item:', error);
        return NextResponse.json({ error: 'Failed to create item' }, { status: 500 });
    }
}
