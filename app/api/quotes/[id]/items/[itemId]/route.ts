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

        // Get the item before update to check if it's a tier item
        const item = await prisma.item.findUnique({
            where: { id: itemId },
            select: { name: true, boardId: true, quantity: true }
        });

        const updatedItem = await prisma.item.update({
            where: { id: itemId },
            data: {
                quantity: quantity !== undefined ? parseFloat(quantity) : undefined,
                notes: notes !== undefined ? notes : undefined,
            },
        });

        // Check if item update should trigger a board sync
        // Triggers: Tier Items (affects Base/Misc) OR Sheet Metal Items (affects SS Uplift)
        const isTierItem = item && (item.name === '1A-TIERS' || item.name === '1B-TIERS-400');
        const isSheetMetalItem = item && [
            '1B-COMPARTMENTS',
            '1B-BASE',
            '1B-DOORS',
            '1B-600MM',
            '1B-800MM'
        ].includes(item.name);

        if ((isTierItem || isSheetMetalItem) && quantity !== undefined) {
            // Fetch board config
            const board = await prisma.board.findUnique({
                where: { id: item.boardId },
                select: { config: true }
            });

            if (board && board.config) {
                const config = typeof board.config === 'string' ? JSON.parse(board.config) : board.config;
                const { syncBoardItems } = await import('@/lib/board-item-service');
                // Manual edit: do NOT force tiers from config
                await syncBoardItems(item.boardId, config, { forceTiers: false });
            }
        }

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

        // Get the item before deletion to check if it's a tier item
        const item = await prisma.item.findUnique({
            where: { id: itemId },
            select: { name: true, boardId: true }
        });

        await prisma.item.delete({
            where: { id: itemId },
        });

        // If this was a tier item, trigger MISC items sync to remove delivery/labels/hardware
        const isTierItem = item && (item.name === '1A-TIERS' || item.name === '1B-TIERS-400');
        if (isTierItem) {
            // Fetch board config to pass to syncBoardItems
            const board = await prisma.board.findUnique({
                where: { id: item.boardId },
                select: { config: true }
            });

            if (board && board.config) {
                const config = typeof board.config === 'string' ? JSON.parse(board.config) : board.config;
                const { syncBoardItems } = await import('@/lib/board-item-service');
                await syncBoardItems(item.boardId, config);
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to delete item', error);
        return NextResponse.json({ error: 'Failed to delete item' }, { status: 500 });
    }
}
