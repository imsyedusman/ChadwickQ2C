import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string; itemId: string }> }
) {
    try {
        const { itemId } = await params;
        const body = await request.json();
        const { quantity, notes } = body;

        const updatedItem = await prisma.item.update({
            where: { id: itemId },
            data: {
                quantity: quantity !== undefined ? parseFloat(quantity) : undefined,
                notes: notes !== undefined ? notes : undefined,
            },
        });

        return NextResponse.json(updatedItem);
    } catch (error) {
        console.error('Failed to update item', error);
        return NextResponse.json({ error: 'Failed to update item' }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string; itemId: string }> }
) {
    try {
        const { itemId } = await params;

        await prisma.item.delete({
            where: { id: itemId },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to delete item', error);
        return NextResponse.json({ error: 'Failed to delete item' }, { status: 500 });
    }
}
