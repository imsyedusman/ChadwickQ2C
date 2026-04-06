import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { logItemMutation } from '@/lib/telemetry';
import { isPermanentManualCategory } from '@/lib/system-definitions';
import { calculateQuoteTotalsServerSide } from '@/lib/pricing-service';
import { fetchEnrichedBoardItems } from '@/lib/enrichment';

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
            // Item already exists - update to the user's requested quantity (set, not increment)
            const newQuantity = quantity || 1;
            await prisma.item.update({
                where: { id: existingItem.id },
                data: {
                    quantity: newQuantity,
                    cost: newQuantity * existingItem.unitPrice,
                    isSheetmetal: isSheetmetal,
                    // Ensure partNumber is backfilled if found in catalog
                    partNumber: existingItem.partNumber || catalogItem?.partNumber || null
                },
            });

            // Hook: General Control Automation (must run even on update path)
            const { AutomationService } = await import('@/lib/automation');
            await AutomationService.applyGeneralControlRules(boardId);

            // Return full enriched item list and updated totals
            const [allItems, quoteWithBoards] = await Promise.all([
                fetchEnrichedBoardItems(boardId),
                prisma.quote.findUnique({
                    where: { id: quoteId },
                    include: { boards: { include: { items: true } } }
                })
            ]);
            
            const calculatedTotals = await calculateQuoteTotalsServerSide(quoteWithBoards);
            
            return NextResponse.json({
                items: allItems,
                calculatedTotals
            });
        }

        if (catalogItem) {
            // Ensure we use the exact part number from catalog if available
            // This satisfies "Item.partNumber = CatalogItem.partNumber"
            // (assuming 'name' is the field for part number)
        }

        // Force Manual for specific categories (Cleats)
        const isPermanentlyManual = isPermanentManualCategory(category, subcategory) || 
                                   (catalogItem && isPermanentManualCategory(catalogItem.category, catalogItem.subcategory));
        
        const finalIsSystemManaged = isPermanentlyManual ? false : (isDefault || false);
        const cost = (unitPrice || 0) * (quantity || 1);

        const newItem = await prisma.item.create({
            data: {
                boardId,
                category: category || 'Switchboard',
                subcategory,
                name: catalogItem?.partNumber || name,
                description,
                quantity: quantity || 1,
                unitPrice: unitPrice || 0,
                labourHours: labourHours || 0,
                cost,
                notes,
                isSystemManaged: finalIsSystemManaged,
                partNumber: (body.partNumber || (catalogItem as any)?.partNumber || (name && !name.includes(' ') ? name : null)),
                isSheetmetal: isSheetmetal,
                productFrame: (catalogItem as any)?.productFrame,
                mccbVariant: (catalogItem as any)?.mccbVariant || null
            } as any,
        });

        logItemMutation({
            itemId: newItem.id,
            boardId,
            category: newItem.category,
            subcategory: newItem.subcategory,
            name: newItem.name,
            action: 'CREATE',
            result: isPermanentlyManual && isDefault ? 'INTERCEPTED' : 'SUCCESS',
            reason: isPermanentlyManual ? 'FORCED_MANUAL_CATEGORY' : undefined,
            requestedState: { isSystemManaged: isDefault },
            finalState: { isSystemManaged: newItem.isSystemManaged },
            timestamp: new Date().toISOString()
        });

        // Debug / Validation Logging for Trip Units
        if (catalogItem && (catalogItem as any).mccbRole === 'TRIP_UNIT') {
            if (!(catalogItem as any).mccbVariant) {
                console.warn(`[API] Creating Trip Unit Item ${name} but CatalogItem ${catalogItem.id} has NO mccbVariant! Pairing will fail.`);
            } else {
                console.log(`[API] Created Trip Unit Item ${name} with Variant ${(catalogItem as any).mccbVariant}`);
            }
        }

        // Trigger general Board Sync Lifecycle (Automations like Composites and Digital Meters)
        const board = await prisma.board.findUnique({
            where: { id: boardId },
            select: { config: true }
        });

        if (board && board.config) {
            const config = typeof board.config === 'string' ? JSON.parse(board.config) : board.config;
            const { syncBoardItems } = await import('@/lib/board-item-service');
            await syncBoardItems(boardId, config);

            // Clear Deletion Record if this item was previously "User Deleted"
            // (Relevant for Switchgear accessories)
            const parentItemId = (body as any).parentItemId || newItem.parentItemId;
            if (parentItemId) {
                const quoteReq = await prisma.board.findUnique({
                    where: { id: boardId },
                    select: { quote: { select: { id: true, settingsSnapshot: true } } }
                });

                if (quoteReq?.quote?.settingsSnapshot) {
                    let settings: any = {};
                    try {
                        settings = JSON.parse(quoteReq.quote.settingsSnapshot);
                    } catch (e) { }

                    if (settings.mccbOverrides?.[boardId]?.deletedAccessories?.[parentItemId]) {
                        const deletedList: string[] = settings.mccbOverrides[boardId].deletedAccessories[parentItemId];
                        const newList = deletedList.filter(sku => sku !== newItem.name && sku !== newItem.partNumber);
                        
                        if (newList.length !== deletedList.length) {
                            settings.mccbOverrides[boardId].deletedAccessories[parentItemId] = newList;
                            await prisma.quote.update({
                                where: { id: quoteReq.quote.id },
                                data: { settingsSnapshot: JSON.stringify(settings) }
                            });
                            console.log(`[API] Cleared deletion record for ${newItem.name} on parent ${parentItemId}`);
                        }
                    }
                }
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

        // Hook: General Control Automation
        if (boardId) {
            const { AutomationService } = await import('@/lib/automation');
            await AutomationService.applyGeneralControlRules(boardId);
            await AutomationService.applyAdditionalControlWiringRules(boardId);
        }

        // Return full enriched item list and updated totals
        const [allItems, quoteWithBoards] = await Promise.all([
            fetchEnrichedBoardItems(boardId),
            prisma.quote.findUnique({
                where: { id: quoteId },
                include: { boards: { include: { items: true } } }
            })
        ]);
        
        const calculatedTotals = await calculateQuoteTotalsServerSide(quoteWithBoards);

        return NextResponse.json({
            items: allItems,
            calculatedTotals
        });
    } catch (error) {
        console.error('Failed to create/update item:', error);
        return NextResponse.json({ error: 'Failed to create item' }, { status: 500 });
    }
}
