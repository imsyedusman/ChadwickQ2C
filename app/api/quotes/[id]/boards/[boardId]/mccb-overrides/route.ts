import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { AutomationService } from '@/lib/automation';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string; boardId: string }> }
) {
    try {
        const { boardId } = await params;
        const { disableNSX100250RotaryHandle } = await request.json();

        // 1. Fetch current settings from Board -> Quote
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

        if (!settings.mccbOverrides) settings.mccbOverrides = {};
        if (!settings.mccbOverrides[boardId]) settings.mccbOverrides[boardId] = {};

        const currentDisabled = settings.mccbOverrides[boardId].disableRotaryHandleFrames || [];
        const isCurrentlyDisabled = currentDisabled.includes('NSX100-250');

        let hasChanged = false;

        if (disableNSX100250RotaryHandle && !isCurrentlyDisabled) {
            // Add to disabled list
            settings.mccbOverrides[boardId].disableRotaryHandleFrames = [...currentDisabled, 'NSX100-250'];
            hasChanged = true;
        } else if (!disableNSX100250RotaryHandle && isCurrentlyDisabled) {
            // Remove from disabled list
            settings.mccbOverrides[boardId].disableRotaryHandleFrames = currentDisabled.filter((f: string) => f !== 'NSX100-250');
            hasChanged = true;
        }

        if (hasChanged) {
            // Update Quote
            await prisma.quote.update({
                where: { id: board.quote.id },
                data: { settingsSnapshot: JSON.stringify(settings) }
            });

            // Trigger Sync (creates or deletes the item based on new override)
            await AutomationService.syncBoardAccessories(boardId);
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to update MCCB overrides', error);
        return NextResponse.json({ error: 'Failed to update overrides' }, { status: 500 });
    }
}
