
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

import { isFormulaPriced } from '@/lib/system-definitions';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ boardId: string }> }
) {
    try {
        const { boardId } = await params;

        // 1. Fetch Board & Quote Status Guardrail
        const board = await prisma.board.findUnique({
            where: { id: boardId },
            include: { quote: true, items: true }
        });

        if (!board) {
            return NextResponse.json({ error: 'Board not found' }, { status: 404 });
        }

        const lockedStatuses = ['SENT', 'APPROVED', 'REJECTED'];
        if (lockedStatuses.includes(board.quote.status)) {
            return NextResponse.json({ error: `Cannot refresh items. Quote is ${board.quote.status}.` }, { status: 403 });
        }

        // 3. Identify items to process
        // Skip formula items
        // We want to process CUSTOM/MANUAL items primarily, but we can also catch any drift in managed items that aren't formulaic (like hardware)
        const itemsToProcess = board.items.filter(item => !isFormulaPriced(item.name));

        if (itemsToProcess.length === 0) {
            return NextResponse.json({ message: 'No eligible items to refresh.', updatedCount: 0 });
        }

        // 3. Build Lookup Map from Item Identity
        // Strategy: 
        // A) PartNumber match (Item Name or Description matching Catalog PN?)
        //    Actually, our Item model has `name` (often PN) and `description`.
        //    Manual items usually have `name` = PartNumber.
        //    But sometimes `name` is description? Convention: manual items added via `addItemToBoard` usually set `name` = PN or Desc.

        // Let's collect potential PartNumbers to fetch
        const potentialPartNumbers = new Set<string>();
        const potentialDescriptions = new Set<string>(); // Heuristic backup

        itemsToProcess.forEach(item => {
            potentialPartNumbers.add(item.name);
            // also maybe item.description? Catalog lookup is confusing if inconsistent.
            // Requirement: "Match by partNumber when present... fall back to matching by name when it equals the code"
            // In our system, `item.name` IS the code (part number) usually.
        });

        // 4. Fetch Candidate Catalog Items
        const catalogCandidates = await prisma.catalogItem.findMany({
            where: {
                OR: [
                    { partNumber: { in: Array.from(potentialPartNumbers) } },
                    // { description: ... } // Too risky for exact price match? User said "name equals code". 
                ]
            }
        });

        // 5. Match & Diff
        // We need to detect "Ambiguity" (duplicates).
        const catalogMap = new Map<string, typeof catalogCandidates[0]>();
        const ambiguousPartNumbers = new Set<string>();

        // Pre-scan for duplicates in catalog
        const pnCounts = new Map<string, number>();
        catalogCandidates.forEach(c => {
            if (c.partNumber) {
                pnCounts.set(c.partNumber, (pnCounts.get(c.partNumber) || 0) + 1);
            }
        });

        catalogCandidates.forEach(c => {
            if (c.partNumber) {
                if (pnCounts.get(c.partNumber)! > 1) {
                    ambiguousPartNumbers.add(c.partNumber);
                } else {
                    catalogMap.set(c.partNumber, c);
                }
            }
        });

        let updatedCount = 0;
        const updates = [];

        for (const item of itemsToProcess) {
            // Identity: item.name is assumed to be Part Number
            const partNumber = item.name;

            // Check ambiguity
            if (ambiguousPartNumbers.has(partNumber)) {
                console.warn(`Skipping refresh for ${partNumber} (Ambiguous/Duplicate Catalog Entries)`);
                continue;
            }

            const match = catalogMap.get(partNumber);

            if (match) {
                // Check if meaningful change
                const priceChanged = Math.abs(item.unitPrice - match.unitPrice) > 0.001;
                const labourChanged = Math.abs(item.labourHours - match.labourHours) > 0.001;

                // Also Metadata sync (Description, Category, Notes?) 
                // User said: "Formula-managed... sync metadata... Manual items... update when explicitly triggered"
                // This block is for NON-Formula items. So we update ALL.

                const descChanged = item.description !== match.description;
                // Category sync might be dangerous if we move it to a hidden category? 
                // Safe to sync Subcategory, maybe master category if clear mismatch.

                if (priceChanged || labourChanged || descChanged) {
                    updates.push(prisma.item.update({
                        where: { id: item.id },
                        data: {
                            unitPrice: match.unitPrice,
                            labourHours: match.labourHours,
                            cost: match.unitPrice * item.quantity, // Recalc cost
                            description: match.description,
                            subcategory: match.subcategory,
                            // category: match.category // Optional: Decide if we overwrite category. Probably safe for manual items.
                        }
                    }));
                    updatedCount++;
                }
            }
        }

        // 6. Execute Updates
        if (updates.length > 0) {
            await Promise.all(updates);
        }

        // Also sync Metadata for Formula Items (as per requirement)
        // "Formula-managed... keep computed PRICE/LABOUR, but sync metadata"
        const formulaItemsOnBoard = board.items.filter(item => isFormulaPriced(item.name));
        let metaUpdatesCount = 0;

        // We need to fetch catalog for these too
        const formulaPNs = formulaItemsOnBoard.map(i => i.name);
        const formulaCatalogItems = await prisma.catalogItem.findMany({
            where: { partNumber: { in: formulaPNs } }
        });

        const formulaCatalogMap = new Map<string, typeof formulaCatalogItems[0]>();
        formulaCatalogItems.forEach(c => {
            if (c.partNumber) formulaCatalogMap.set(c.partNumber, c);
        });

        const metaUpdates = [];
        for (const item of formulaItemsOnBoard) {
            const match = formulaCatalogMap.get(item.name);
            if (match) {
                if (item.description !== match.description || item.subcategory !== match.subcategory) {
                    metaUpdates.push(prisma.item.update({
                        where: { id: item.id },
                        data: {
                            description: match.description,
                            subcategory: match.subcategory
                            // category: match.category
                        }
                    }));
                    metaUpdatesCount++;
                }
            }
        }

        if (metaUpdates.length > 0) {
            await Promise.all(metaUpdates);
        }

        return NextResponse.json({
            success: true,
            message: `Refreshed ${updatedCount} items. Synced metadata for ${metaUpdatesCount} formula items.`,
            updatedCount,
            metaUpdatesCount
        });

    } catch (error) {
        console.error('Refresh Catalog Error:', error);
        return NextResponse.json({ error: 'Failed to refresh items' }, { status: 500 });
    }
}
