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

        console.log(`[API/Items] POST received for Board ${boardId}`, { category, subcategory, name });

        if (!boardId || !name) {
            console.warn('[API/Items] Missing required fields');
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Lookup catalog item to check isSheetmetal (if not explicit in future)
        // We do this efficiently - only if needed or generic. 
        // For accurate pricing logic, we trust the catalog source of truth.
        const catalogItem = await prisma.catalogItem.findFirst({
            where: { partNumber: name }
        });
        const isSheetmetal = catalogItem?.isSheetmetal || false;

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
                    isSheetmetal: isSheetmetal // Update flag in case it changed in catalog
                },
            });

            return NextResponse.json(updatedItem);
        }

        if (catalogItem) {
            // Ensure we use the exact part number from catalog if available
            // This satisfies "Item.partNumber = CatalogItem.partNumber"
            // (assuming 'name' is the field for part number)
        }

        // Item doesn't exist - create new item
        const cost = (unitPrice || 0) * (quantity || 1);

        const newItem = await prisma.item.create({
            data: {
                boardId,
                category: category || 'Switchboard',
                subcategory,
                name: catalogItem?.partNumber || name, // Prefer Catalog PartNumber
                description,
                quantity: quantity || 1,
                unitPrice: unitPrice || 0,
                labourHours: labourHours || 0,
                cost,
                notes,
                isSystemManaged: isDefault || false,
                partNumber: (body.partNumber || (catalogItem as any)?.partNumber || (name && !name.includes(' ') ? name : null)), // Robust Part Number resolution
                isSheetmetal: isSheetmetal,
                productFrame: (catalogItem as any)?.productFrame,
                // Strict Logic: Only copy variant if it exists in Catalog.
                // Do NOT stamp board fallback here. Let sync logic handle dynamic resolution for generic items.
                mccbVariant: (catalogItem as any)?.mccbVariant || null
            } as any,
        });

        console.log(`[API/Items] Created Item ID: ${newItem.id}, SystemManaged: ${newItem.isSystemManaged}`);

        // Debug / Validation Logging for Trip Units
        if (catalogItem && (catalogItem as any).mccbRole === 'TRIP_UNIT') {
            if (!(catalogItem as any).mccbVariant) {
                console.warn(`[API] Creating Trip Unit Item ${name} but CatalogItem ${catalogItem.id} has NO mccbVariant! Pairing will fail.`);
            } else {
                console.log(`[API] Created Trip Unit Item ${name} with Variant ${(catalogItem as any).mccbVariant}`);
            }
        }

        // Check if item addition should trigger a board sync (e.g. Busbar items affect Insulation Cost)
        const isBusbarItem = (category && category.toLowerCase() === 'busbar') ||
            (name && (name.startsWith('BB-') || name.startsWith('BBC-')));

        if (isBusbarItem) {
            console.log('[API/Items] Triggering Busbar Sync...');
            const board = await prisma.board.findUnique({
                where: { id: boardId },
                select: { config: true }
            });

            if (board && board.config) {
                const config = typeof board.config === 'string' ? JSON.parse(board.config) : board.config;
                // Dynamically import to avoid circular dep if any (though unlikely here)
                const { syncBoardItems } = await import('@/lib/board-item-service');
                await syncBoardItems(boardId, config);
                console.log('[API/Items] Busbar Sync Completed.');
            } else {
                console.log('[API/Items] Busbar Sync Skipped (No board/config).');
            }
        }

        // Hook: MCCB Accessory Automation
        // Trigger only if it has a frame AND is not likely an accessory itself
        const isMccbAccessory = subcategory === 'MCCB Accessories';
        if (newItem.productFrame && !isMccbAccessory) {
            const { AutomationService } = await import('@/lib/automation');
            await AutomationService.syncBoardAccessories(boardId);
        }

        // Hook: MCCB Trip Base Pairing Automation
        // Trigger for Trip Units (check via rule table would be expensive here, but sync is safe)
        // Or if we just added a Trip Unit.
        // syncMccbTripBasePairs checks rule table internally.
        // We trigger it if it MIGHT be a trip unit (Safe to trigger always? It fetches items & rules).
        // To be safe, trigger if category is Switchboard?
        const isSwitchboard = category === 'Switchboard' || newItem.category === 'Switchboard';
        if (isSwitchboard) {
            console.log(`[API] Before Sync: Checking items for Board ${boardId}`);
            // Count items before
            const countBefore = await prisma.item.count({ where: { boardId } });
            console.log(`[API] Item Count Before: ${countBefore}`);

            const { AutomationService } = await import('@/lib/automation');
            await AutomationService.syncMccbTripBasePairs(boardId);

            // Count items after
            const countAfter = await prisma.item.count({ where: { boardId } });
            console.log(`[API] Item Count After: ${countAfter}`);

            // List generated bases
            if (countAfter > countBefore) {
                const newBases = await prisma.item.findMany({
                    where: {
                        boardId,
                        systemTag: 'MCCB_TRIP_BASE',
                        createdAt: { gte: newItem.createdAt } // Roughly new
                    }
                });
                console.log(`[API] Created ${newBases.length} System Bases:`, newBases.map(b => `${b.partNumber} (${b.mccbVariant})`));
            }
        }

        // Hook: Generic Pairing Automation (MCB Chassis -> Link)
        // Trigger for any item that might be a chassis (SAU...) or generally Switchboard items
        if (newItem.partNumber && (newItem.partNumber.startsWith('SAU') || newItem.category === 'Switchboard')) {
            const { AutomationService } = await import('@/lib/automation');
            // We can fire-and-forget strictly speaking IF we didn't need the frontend to update immediately.
            // But we DO need immediate update.
            const { warnings } = await AutomationService.applyPairingRules(boardId, 'MCB_CHASSIS_TO_NE_LINK_165A');

            if (warnings.length > 0) {
                console.warn(`[API] Pairing Warnings: ${warnings.join(', ')}`);
            }
        }

        // Hook: ATS Accessory Automation
        // Trigger for Switchboard items or if part number looks relevant
        if (newItem.category === 'Switchboard' || newItem.partNumber) {
            const { AutomationService } = await import('@/lib/automation');
            await AutomationService.applyAtsRules(boardId);
        }

        // Return the full updated list of items for the board to ensure frontend is in sync
        const allItems = await prisma.item.findMany({
            where: { boardId },
            orderBy: { createdAt: 'asc' } // Or order by 'order' if implemented
        });

        return NextResponse.json(allItems);
    } catch (error) {
        console.error('Failed to create/update item:', error);
        return NextResponse.json({ error: 'Failed to create item' }, { status: 500 });
    }
}
