import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { AutomationService } from '@/lib/automation';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string; boardId: string }> }
) {
    try {
        const { boardId } = await params;

        // 1. Fetch current settings
        const board = await prisma.board.findUnique({
            where: { id: boardId },
            include: { quote: true }
        });

        if (!board || !board.quote) {
            return NextResponse.json({ error: 'Board or Quote not found' }, { status: 404 });
        }

        let settings: any = {};
        try {
            settings = board.quote.settingsSnapshot ? JSON.parse(board.quote.settingsSnapshot) : {};
        } catch (e) {
            console.error('Failed to parse settings', e);
        }

        if (settings.mccbOverrides && settings.mccbOverrides[boardId]) {
            // clear the overrides for this board
            delete settings.mccbOverrides[boardId];

            await prisma.quote.update({
                where: { id: board.quote.id },
                data: { settingsSnapshot: JSON.stringify(settings) }
            });

            // Trigger Sync
            await AutomationService.syncBoardAccessories(boardId);
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Failed to restore accessories', error);
        return NextResponse.json({ error: 'Failed to restore accessories' }, { status: 500 });
    }
}
