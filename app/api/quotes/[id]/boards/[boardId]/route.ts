import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string; boardId: string }> }
) {
    try {
        const { boardId } = await params;
        const body = await request.json();
        const { name, type, config } = body;

        // Resolve new MCCB Variant if fault rating changed
        let newMccbVariant = undefined;
        if (config && config.faultRating) {
            newMccbVariant = config.faultRating.includes('25kA') ? 'B3' :
                config.faultRating.includes('36kA') ? 'F3' :
                    config.faultRating.includes('50kA') ? 'N3' :
                        config.faultRating.includes('70kA') ? 'H3' : 'B3';
        }

        const updatedBoard = await prisma.board.update({
            where: { id: boardId },
            data: {
                name,
                type,
                config: config ? JSON.stringify(config) : undefined,
                mccbVariant: newMccbVariant // Update column
            } as any, // Cast for mccbVariant
        });

        if (config) {
            // 1. Sync standard board items (busbars etc)
            const { syncBoardItems } = await import('@/lib/board-item-service');
            await syncBoardItems(boardId, config, { forceTiers: true });

            // 2. Sync MCCB Pairing (Update bases for generic trip units)
            // This ensures if board upgrades (25kA -> 50kA), generic trips get new bases (B3 -> N3)
            const { AutomationService } = await import('@/lib/automation');
            await AutomationService.syncMccbTripBasePairs(boardId);
        }

        return NextResponse.json({ ...updatedBoard, debugConfig: config });
    } catch (error) {
        console.error('Failed to update board', error);
        return NextResponse.json({ error: 'Failed to update board' }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string; boardId: string }> }
) {
    try {
        const { boardId } = await params;

        await prisma.board.delete({
            where: { id: boardId },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to delete board', error);
        return NextResponse.json({ error: 'Failed to delete board' }, { status: 500 });
    }
}
