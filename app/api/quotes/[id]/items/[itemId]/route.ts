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
        const isCleat = item && item.name && item.name.startsWith('1B1-CLEAT');

        if ((isTierItem || isSheetMetalItem || (isBusbarItem && !isCleat)) && quantity !== undefined) {
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
        // We fetch fresh item data to ensure we have the latest state (productFrame, system flags)
        const freshItem = await prisma.item.findUnique({
            where: { id: itemId },
            select: { productFrame: true, boardId: true, isSystemManaged: true, partNumber: true, category: true }
        });

        // GUARD: Do NOT trigger sync if we are just updating a system-managed item (prevent loops)
        if (freshItem?.productFrame && !freshItem.isSystemManaged) {
            const { AutomationService } = await import('@/lib/automation');
            await AutomationService.syncBoardAccessories(freshItem.boardId);
        }

        // Hook: Generic Pairing Automation (MCB Chassis -> Link)
        // Trigger if item is Switchboard/Chassis and NOT system managed (manual update of chassis)
        const isChassis = freshItem && (freshItem.isSystemManaged === false) &&
            freshItem.partNumber &&
            (freshItem.partNumber.startsWith('SAU') || freshItem.category === 'Switchboard');

        if (isChassis && freshItem) {
            const { AutomationService } = await import('@/lib/automation');
            const { warnings } = await AutomationService.applyPairingRules(freshItem.boardId, 'MCB_CHASSIS_TO_NE_LINK_165A');
            if (warnings.length > 0) {
                console.warn(`[API] Pairing Warnings: ${warnings.join(', ')}`);
            }
        }

        // Hook: ATS Accessory Automation
        if (freshItem?.category === 'Switchboard' || freshItem?.partNumber) {
            const { AutomationService } = await import('@/lib/automation');
            await AutomationService.applyAtsRules(freshItem.boardId);
        }

        // Hook: MCCB Trip Base Pairing (Update)
        // Run sync if item is Switchboard (covers Trip and Base) to ensure quantity sync
        if (freshItem?.category === 'Switchboard') {
            const { AutomationService } = await import('@/lib/automation');
            await AutomationService.syncMccbTripBasePairs(freshItem.boardId);
        }

        // Return the full updated list of items to ensure frontend is in sync
        const boardId = item?.boardId || freshItem?.boardId;
        const allItems = await prisma.item.findMany({
            where: { boardId },
            orderBy: { createdAt: 'asc' }
        });

        return NextResponse.json(allItems);
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
            select: { name: true, boardId: true, category: true, productFrame: true, partNumber: true }
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

        // Hook: MCCB Trip Base Pairing (Post-Delete)
        if (item?.category === 'Switchboard') {
            const { AutomationService } = await import('@/lib/automation');
            await AutomationService.syncMccbTripBasePairs(item.boardId);

            // Hook: Generic Pairing Automation (MCB Chassis -> Link) - Post Delete
            // If we deleted a chassis, we must recalc links.
            // Check if name/partNumber started with SAU or category is Switchboard
            const mightBeChassis = (item?.name?.startsWith('SAU') || item?.category === 'Switchboard');
            if (mightBeChassis) {
                const { warnings } = await AutomationService.applyPairingRules(item.boardId, 'MCB_CHASSIS_TO_NE_LINK_165A');
                if (warnings.length > 0) console.warn(`[API] Pairing Warnings (Delete): ${warnings.join(', ')}`);
            }
        }

        // Hook: ATS Accessory Automation (Post-Delete)
        if (item?.category === 'Switchboard' || item?.partNumber) {
            const { AutomationService } = await import('@/lib/automation');
            await AutomationService.applyAtsRules(item.boardId);
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to delete item', error);
        return NextResponse.json({ error: 'Failed to delete item' }, { status: 500 });
    }
}
