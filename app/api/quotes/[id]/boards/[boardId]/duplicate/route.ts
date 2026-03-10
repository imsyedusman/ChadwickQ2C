import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { AutomationService } from '@/lib/automation';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string; boardId: string }> }
) {
    try {
        const { id: quoteId, boardId } = await params;

        // 1. Fetch Source Board & Items
        const sourceBoard = await prisma.board.findUnique({
            where: { id: boardId },
            include: { items: true }
        });

        if (!sourceBoard) {
            return NextResponse.json({ error: 'Board not found' }, { status: 404 });
        }

        // 2. Calculate New Name (Intelligent Revision Increment)
        let newName = sourceBoard.name;
        const revMatch = newName.match(/\(Rev ([A-Za-z]+)\)$/);

        if (revMatch) {
            const currentRev = revMatch[1];
            const nextRev = incrementRevision(currentRev);
            newName = newName.replace(/\(Rev [A-Za-z]+\)$/, `(Rev ${nextRev})`);
        } else {
            newName = `${newName.trim()} (Rev A)`;
        }

        console.log(`[Duplication] Duplicating "${sourceBoard.name}" -> "${newName}"`);

        // 3. Transactional Cloning
        const newBoard = await prisma.$transaction(async (tx) => {
            // Get max order to append at end
            const maxOrder = await tx.board.aggregate({
                where: { quoteId },
                _max: { order: true }
            });
            const nextOrder = (maxOrder._max.order ?? 0) + 1;

            // Clone Board
            const createdBoard = await tx.board.create({
                data: {
                    quoteId,
                    name: newName,
                    type: sourceBoard.type,
                    order: nextOrder,
                    config: sourceBoard.config,
                    mccbVariant: sourceBoard.mccbVariant,
                    isOptional: sourceBoard.isOptional,
                    // id: auto-generated
                    // createdAt: now
                    // updatedAt: now
                }
            });

            // Clone Items
            if (sourceBoard.items.length > 0) {

                // We need to map items correctly. `createMany` is efficient.
                // Note: We are cloning SYSTEM MANAGED items too.
                // AutomationService will later see them and Reconcile (Update/Delete/Create).
                // Because we clone them with `isSystemManaged: true` and `systemTag`,
                // The AutomationService will identify them as "Existing System Items" and match them to requirements.
                // This prevents double-creation.

                const itemsToCreate = sourceBoard.items.map(item => ({
                    boardId: createdBoard.id,
                    category: item.category,
                    subcategory: item.subcategory,
                    name: item.name,
                    description: item.description,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    labourHours: item.labourHours,
                    cost: item.cost,
                    notes: item.notes,
                    isDefault: item.isDefault,
                    isSheetmetal: item.isSheetmetal,
                    isSystemManaged: item.isSystemManaged,
                    systemTag: item.systemTag,
                    partNumber: item.partNumber,
                    productFrame: item.productFrame,
                    mccbVariant: item.mccbVariant,
                    systemRuleType: item.systemRuleType
                    // order: item.order // If we want to preserve order
                }));

                await tx.item.createMany({
                    data: itemsToCreate
                });
            }

            return createdBoard;
        });

        // 4. Post-Transaction Automation Reconciliation
        // SKIPPED FOR DUPLICATION: The User requested that duplicated boards 
        // are a true exact clone, preserving manual offsets and pricing on items.
        // Reconciliation would overwrite these values.
        /* try {
            await AutomationService.runBoardAutomationReconciliation(newBoard.id);
        } catch (autoError) {
            console.error('[Duplication] Automation Reconciliation Failed (Non-fatal):', autoError);
            // We do NOT fail the request because the board *was* created.
            // Future improvement: Return a warning to the UI.
        } */

        return NextResponse.json({ success: true, board: newBoard });

    } catch (error) {
        console.error('[Duplication] Failed:', error);
        return NextResponse.json({ error: 'Failed to duplicate board' }, { status: 500 });
    }
}

/**
 * Helper: Increment Revision Letter(s)
 * A -> B, Z -> AA, AA -> AB
 */
function incrementRevision(rev: string): string {
    const chars = rev.split('');
    let i = chars.length - 1;

    while (i >= 0) {
        let code = chars[i].charCodeAt(0);

        // Handle Z/z wrapping
        if (chars[i] === 'Z') {
            chars[i] = 'A';
            i--;
        } else if (chars[i] === 'z') {
            chars[i] = 'a';
            i--;
        } else {
            // Just increment char
            chars[i] = String.fromCharCode(code + 1);
            return chars.join('');
        }
    }

    // If we're here, it means we wrapped all Z's (e.g. Z -> AA, ZZ -> AAA)
    // We need to prepend 'A' (or 'a' if strictly lowercase, but engineering usually uppercase).
    // Assuming input rev matches the case of the regex (which allows both, but typically is one).
    // Safe default A.
    return 'A' + chars.join('');
}
