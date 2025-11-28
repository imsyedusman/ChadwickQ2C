import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: quoteId } = await params;
        const body = await request.json();
        const { boardId, category, subcategory, name, description, quantity, unitPrice, labourHours, notes, isDefault } = body;

        if (!boardId || !name) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Check if an item with the same identifying characteristics already exists
        // Match by: category, subcategory, name, and description (unique identifier for an item)
        const existingItem = await prisma.item.findFirst({
            where: {
                boardId,
                category: category || 'Switchboard',
                subcategory: subcategory || null,
                name,
                description: description || null,
            },
        });

        if (existingItem) {
            // Item already exists - increment quantity instead of creating duplicate
            const newQuantity = existingItem.quantity + (quantity || 1);
            const updatedItem = await prisma.item.update({
                where: { id: existingItem.id },
                data: {
                    quantity: newQuantity,
                    cost: newQuantity * existingItem.unitPrice,
                },
            });

            return NextResponse.json(updatedItem);
        }

        // Item doesn't exist - create new item
        const cost = (unitPrice || 0) * (quantity || 1);

        const newItem = await prisma.item.create({
            data: {
                boardId,
                category: category || 'Switchboard',
                subcategory,
                name,
                description,
                quantity: quantity || 1,
                unitPrice: unitPrice || 0,
                labourHours: labourHours || 0,
                cost,
                notes,
                isDefault: isDefault || false,
            },
        });

        return NextResponse.json(newItem);
    } catch (error) {
        console.error('Failed to create/update item:', error);
        return NextResponse.json({ error: 'Failed to create item' }, { status: 500 });
    }
}
