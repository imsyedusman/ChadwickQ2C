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

        // Check if item addition should trigger a board sync (e.g. Busbar items affect Insulation Cost)
        const isBusbarItem = (category && category.toLowerCase() === 'busbar') ||
            (name && (name.startsWith('BB-') || name.startsWith('BBC-')));

        if (isBusbarItem) {
            const board = await prisma.board.findUnique({
                where: { id: boardId },
                select: { config: true }
            });

            if (board && board.config) {
                const config = typeof board.config === 'string' ? JSON.parse(board.config) : board.config;
                // Dynamically import to avoid circular dep if any (though unlikely here)
                const { syncBoardItems } = await import('@/lib/board-item-service');
                await syncBoardItems(boardId, config);
            }
        }

        return NextResponse.json(newItem);
    } catch (error) {
        console.error('Failed to create/update item:', error);
        return NextResponse.json({ error: 'Failed to create item' }, { status: 500 });
    }
}
