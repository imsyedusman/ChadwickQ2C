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
            select: { name: true, boardId: true, quantity: true, category: true }
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

        const isBusbarItem = item && ((item.category && item.category.toLowerCase() === 'busbar') || (item.name && (item.name.startsWith('BB-') || item.name.startsWith('BBC-'))));

        if ((isTierItem || isSheetMetalItem || isBusbarItem) && quantity !== undefined) {
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

        // Hook: MCCB Accessory Automation
        // Use 'item' (pre-update) to check if it WAS a breaker, or check DB again?
        // 'item' might lack productFrame if not selected. Let's fetch it or trust the flag.
        // We need productFrame. We can fetch it or if we trust 'item' selection above.
        // The selection above didn't select productFrame. Let's update the selection.
        const freshItem = await prisma.item.findUnique({ where: { id: itemId }, select: { productFrame: true, boardId: true, isSystemManaged: true } });

        // GUARD: Do NOT trigger sync if we are just updating a system-managed item (prevent loops)
        if (freshItem?.productFrame && !freshItem.isSystemManaged && quantity !== undefined) {
            const { AutomationService } = await import('@/lib/automation');
            await AutomationService.syncBoardAccessories(freshItem.boardId);
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

        // Get the item before deletion to check if it's a tier item OR a breaker
        const item = await prisma.item.findUnique({
            where: { id: itemId },
            select: { name: true, boardId: true, category: true, productFrame: true }
        });

        // Enforce MCCB Accessory Rules (Server-Side)
        const { getAccessoryType, getAccessoryFrame } = await import('@/lib/automation');

        const accessoryType = getAccessoryType(item?.name || '');

        if (accessoryType === 'SHIELD') {
            return NextResponse.json({ error: 'Terminal Shields cannot be manually deleted.' }, { status: 400 });
        }

        if (accessoryType === 'HANDLE') {
            const frame = getAccessoryFrame(item?.name || '');

            // Allow delete ONLY for NSX100-250 (LV429338T)
            // Block all others
            if (item?.name !== 'LV429338T') {
                return NextResponse.json({ error: 'This Rotary Handle is system-managed and cannot be deleted.' }, { status: 400 });
            }

            // If it IS LV429338T, we allow delete BUT we must persist an override
            // so automation doesn't add it back.
            // We append 'NSX100-250' to the board's disabled frames list in settings.
            if (frame === 'NSX100-250') {
                const boardId = item.boardId;

                // Fetch current settings
                const quoteReq = await prisma.board.findUnique({
                    where: { id: boardId },
                    select: { quote: { select: { id: true, settingsSnapshot: true } } }
                });

                if (quoteReq?.quote) {
                    let settings: any = {};
                    try {
                        settings = quoteReq.quote.settingsSnapshot ? JSON.parse(quoteReq.quote.settingsSnapshot) : {};
                    } catch (e) { }

                    if (!settings.mccbOverrides) settings.mccbOverrides = {};
                    if (!settings.mccbOverrides[boardId]) settings.mccbOverrides[boardId] = {};

                    const currentDisabled = settings.mccbOverrides[boardId].disableRotaryHandleFrames || [];

                    if (!currentDisabled.includes('NSX100-250')) {
                        settings.mccbOverrides[boardId].disableRotaryHandleFrames = [...currentDisabled, 'NSX100-250'];

                        // Save back to Quote
                        await prisma.quote.update({
                            where: { id: quoteReq.quote.id },
                            data: { settingsSnapshot: JSON.stringify(settings) }
                        });
                    }
                }
            }
        }

        await prisma.item.delete({
            where: { id: itemId },
        });

        // If this was a tier item, trigger MISC items sync to remove delivery/labels/hardware
        const isTierItem = item && (item.name === '1A-TIERS' || item.name === '1B-TIERS-400');
        const isBusbarItem = item && ((item.category && item.category.toLowerCase() === 'busbar') || (item.name && (item.name.startsWith('BB-') || item.name.startsWith('BBC-'))));

        if (isTierItem || isBusbarItem) {
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

        // Hook: MCCB Accessory Automation (Post-Delete)
        // If we just deleted a breaker, we need to sync.
        // If we deleted an accessory (only allowed for NSX100 handle), we do NOT sync immediately to avoid re-creation loop logic? 
        // actually syncBoardAccessories respects overrides now, so it's safe to run.
        if (item?.productFrame || (item?.name && ['LV429338T', 'LV432598T', '33873'].includes(item.name))) {
            const { AutomationService } = await import('@/lib/automation');
            await AutomationService.syncBoardAccessories(item.boardId);
        }


        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to delete item', error);
        return NextResponse.json({ error: 'Failed to delete item' }, { status: 500 });
    }
}
