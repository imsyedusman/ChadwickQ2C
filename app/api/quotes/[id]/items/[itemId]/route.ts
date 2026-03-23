import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string; itemId: string }> }
) {
    try {
        const { itemId } = await params;
        const body = await request.json();
        const { quantity, notes, unitPrice, labourHours, name, description } = body;

        // Get the item before update to check if it's a tier item
        const item = await prisma.item.findUnique({
            where: { id: itemId },
            select: { name: true, boardId: true, quantity: true, category: true, unitPrice: true }
        });

        // Calculate new cost if unitPrice or quantity is provided
        const finalQuantity = quantity !== undefined ? parseFloat(quantity) : (item?.quantity ? Number(item.quantity) : 1);
        const finalUnitPrice = unitPrice !== undefined ? parseFloat(unitPrice) : (item?.unitPrice || 0);
        const newCost = finalQuantity * finalUnitPrice;

        const updatedItem = await prisma.item.update({
            where: { id: itemId },
            data: {
                quantity: quantity !== undefined ? parseFloat(quantity) : undefined,
                notes: notes !== undefined ? notes : undefined,
                unitPrice: unitPrice !== undefined ? parseFloat(unitPrice) : undefined,
                labourHours: labourHours !== undefined ? parseFloat(labourHours) : undefined,
                name: name !== undefined ? name : undefined,
                description: description !== undefined ? description : undefined,
                cost: newCost,
                isSystemManaged: (quantity !== undefined || unitPrice !== undefined) ? false : undefined,
            },
        });

        // Trigger board sync if quantity was updated (required for automations like composite, digital meters, etc.)
        if (quantity !== undefined && item?.boardId) {
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

        // Hook: General Control Automation
        // Fires whenever any Switchboard item qty is updated
        if (freshItem?.boardId) {
            const { AutomationService } = await import('@/lib/automation');
            await AutomationService.applyGeneralControlRules(freshItem.boardId);
            await AutomationService.applyAdditionalControlWiringRules(freshItem.boardId);
        }

        // Hook: MCCB Trip Base Pairing (Update)
        // Run sync if item is Switchboard (covers Trip and Base) to ensure quantity sync
        if (freshItem?.category === 'Switchboard') {
            const { AutomationService } = await import('@/lib/automation');
            await AutomationService.syncMccbTripBasePairs(freshItem.boardId);
        }

        // Return the full updated list of items to ensure frontend is in sync
        // Return the full updated list of items to ensure frontend is in sync
        const boardId = item?.boardId || freshItem?.boardId;

        // Safety check for boardId
        if (!boardId) {
            return NextResponse.json({ error: 'Board ID not found' }, { status: 500 });
        }

        const { fetchEnrichedBoardItems } = await import('@/lib/enrichment');
        const allItems = await fetchEnrichedBoardItems(boardId);

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
            select: { 
                name: true, 
                boardId: true, 
                category: true, 
                productFrame: true, 
                partNumber: true,
                isSystemManaged: true,
                parentItemId: true,
                autoAdded: true
            }
        });

        // Check if it's a handle that needs an override persisted
        const { getAccessoryType, getAccessoryFrame } = await import('@/lib/automation');
        if (!item) {
            return NextResponse.json({ error: 'Item not found' }, { status: 404 });
        }

        const isSwitchboardAuto = (item.category === 'Switchboard' && (item.isSystemManaged || (item as any).autoAdded));
        
        if (isSwitchboardAuto) {
            const boardId = item.boardId;
            const parentItemId = (item as any).parentItemId;
            const accessoryType = getAccessoryType(item.name);

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

                // 1. Existing Handle Logic (Frame-based)
                if (accessoryType === 'HANDLE') {
                    const frame = getAccessoryFrame(item.name);
                    if (frame === 'NSX100-250') {
                        const currentDisabled = settings.mccbOverrides[boardId].disableRotaryHandleFrames || [];
                        if (!currentDisabled.includes('NSX100-250')) {
                            settings.mccbOverrides[boardId].disableRotaryHandleFrames = [...currentDisabled, 'NSX100-250'];
                        }
                    }
                }

                // 2. New Generalized Deletion Tracking (Parent-Item + SKU based)
                // This satisfies the requirement to NOT re-add items if deleted by user.
                if (parentItemId) {
                    if (!settings.mccbOverrides[boardId].deletedAccessories) {
                        settings.mccbOverrides[boardId].deletedAccessories = {};
                    }
                    const deletedItems = settings.mccbOverrides[boardId].deletedAccessories[parentItemId] || [];
                    if (!deletedItems.includes(item.name)) {
                        settings.mccbOverrides[boardId].deletedAccessories[parentItemId] = [...deletedItems, item.name];
                    }
                } else {
                    // Global deletion (for items without specific parents like Fuses, Wiring, or Board-level additions)
                    if (!settings.mccbOverrides[boardId].deletedSkus) {
                        settings.mccbOverrides[boardId].deletedSkus = [];
                    }
                    if (!settings.mccbOverrides[boardId].deletedSkus.includes(item.name)) {
                        settings.mccbOverrides[boardId].deletedSkus.push(item.name);
                    }
                }

                await prisma.quote.update({
                    where: { id: quoteReq.quote.id },
                    data: { settingsSnapshot: JSON.stringify(settings) }
                });
            }
        }

        await prisma.item.delete({
            where: { id: itemId },
        });

        // Trigger general Board Sync Lifecycle (Automations like Composites and Digital Meters)
        // This ensures if a parent item is removed, children adjust properly
        if (item) {
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

        const boardId = item?.boardId;
        if (!boardId) {
            return NextResponse.json({ success: true }); // Fallback if item was missing
        }

        // Hook: MCCB Accessory Automation (Post-Delete)
        // syncBoardAccessories now handles 1:1 and cleanup of orphans
        const { AutomationService } = await import('@/lib/automation');
        await AutomationService.syncBoardAccessories(boardId);

        // Hook: MCCB Trip Base Pairing (Post-Delete)
        if (item?.category === 'Switchboard') {
            await AutomationService.syncMccbTripBasePairs(boardId);

            // Hook: Generic Pairing Automation (MCB Chassis -> Link) - Post Delete
            const mightBeChassis = (item?.name?.startsWith('SAU') || item?.category === 'Switchboard');
            if (mightBeChassis) {
                const { warnings } = await AutomationService.applyPairingRules(boardId, 'MCB_CHASSIS_TO_NE_LINK_165A');
                if (warnings.length > 0) console.warn(`[API] Pairing Warnings (Delete): ${warnings.join(', ')}`);
            }
        }

        // Hook: ATS Accessory Automation (Post-Delete)
        if (item?.category === 'Switchboard' || item?.partNumber) {
            await AutomationService.applyAtsRules(boardId);
        }

        // Hook: General Control Automation (Post-Delete)
        await AutomationService.applyGeneralControlRules(boardId);
        await AutomationService.applyAdditionalControlWiringRules(boardId);

        // Return the full updated list of items to ensure frontend is in sync
        const { fetchEnrichedBoardItems } = await import('@/lib/enrichment');
        const allItems = await fetchEnrichedBoardItems(boardId);

        return NextResponse.json({
            success: true,
            items: allItems
        });
    } catch (error) {
        console.error('Failed to delete item', error);
        return NextResponse.json({ error: 'Failed to delete item' }, { status: 500 });
    }
}
