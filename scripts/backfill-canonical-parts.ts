
import { PrismaClient } from '@prisma/client';
import { normalizePartNumber } from '../lib/normalization';

const prisma = new PrismaClient();

async function main() {
    const args = process.argv.slice(2);
    const execute = args.includes('--execute');
    const scope = args.find(a => a.startsWith('--scope='))?.split('=')[1] || 'both'; // catalog, item, both
    const includeManual = args.includes('--include-manual');

    console.log(`--- Canonical Part Number Backfill (Dry Run: ${!execute}) ---`);
    console.log(`Scope: ${scope}, Include Manual Cleanup: ${includeManual}`);

    if (scope === 'catalog' || scope === 'both') {
        await processCatalog(execute);
    }

    if (scope === 'item' || scope === 'both') {
        await processItems(execute, includeManual);
    }
}

async function processCatalog(execute: boolean) {
    console.log('\n--- Processing CatalogItems ---');
    const allItems = await prisma.catalogItem.findMany();
    let updates = 0;

    for (const item of allItems) {
        const canonical = normalizePartNumber(item.partNumber);
        if (item.partNumber !== canonical) {
            console.log(`[Catalog] Needs Update: '${item.partNumber}' -> '${canonical}'`);
            if (execute) {
                // Check if target already exists (collision)
                const exists = await prisma.catalogItem.findFirst({ where: { partNumber: canonical, id: { not: item.id } } });
                if (exists) {
                    console.warn(`[Catalog] COLLISION: Cannot rename '${item.partNumber}' to '${canonical}' because it already exists (ID: ${exists.id}). Skipping.`);
                } else {
                    await prisma.catalogItem.update({
                        where: { id: item.id },
                        data: { partNumber: canonical }
                    });
                    updates++;
                }
            } else {
                updates++;
            }
        }
    }
    console.log(`[Catalog] Total candidates for update: ${updates}`);
}

async function processItems(execute: boolean, includeManual: boolean) {
    console.log('\n--- Processing Board Items ---');
    const allItems = await prisma.item.findMany();
    const actions: { id: string, action: string, detail: string }[] = [];

    // 1. Identify Updates (Casing Only)
    for (const item of allItems) {
        if (!item.partNumber) continue;
        const canonical = normalizePartNumber(item.partNumber);
        if (item.partNumber !== canonical) {
            actions.push({ id: item.id, action: 'UPDATE_CASING', detail: `'${item.partNumber}' -> '${canonical}'` });
        }
    }

    // 2. Identify Duplicates (Canonical Collision on same Board)
    // Map: boardId::canonicalPartNumber -> Item[]
    const groups = new Map<string, any[]>();
    for (const item of allItems) {
        if (!item.partNumber) continue;
        const key = `${item.boardId}::${normalizePartNumber(item.partNumber)}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)?.push(item);
    }

    let consolidationDeletes = 0;

    for (const [key, group] of groups.entries()) {
        if (group.length > 1) {
            // Found duplicates
            // Check if they are system managed
            const isSystemGroup = group.every(i => i.isSystemManaged && i.systemRuleType);
            const isManualGroup = group.some(i => !i.isSystemManaged);

            // Sort by latest update (survivor candidate)
            group.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
            const survivor = group[0];
            const toDelete = group.slice(1);

            if (isSystemGroup) {
                // System: Merge Qty?
                const totalQty = group.reduce((sum: number, i: any) => sum + i.quantity, 0);
                actions.push({
                    id: survivor.id,
                    action: 'CONSOLIDATE_SYSTEM',
                    detail: `Survivior: ${survivor.partNumber} (New Qty: ${totalQty}). Deleting ${toDelete.length} duplicates.`
                });
                for (const d of toDelete) {
                    actions.push({ id: d.id, action: 'DELETE_DUPLICATE_SYSTEM', detail: `Duplicate of ${survivor.id}` });
                    consolidationDeletes++;
                }
            } else {
                // Manual/Mixed
                if (includeManual) {
                    actions.push({
                        id: survivor.id,
                        action: 'CONSOLIDATE_MANUAL',
                        detail: `Survivior: ${survivor.partNumber} (Qty: ${survivor.quantity}). Deleting ${toDelete.length} duplicates.`
                    });
                    for (const d of toDelete) {
                        actions.push({ id: d.id, action: 'DELETE_DUPLICATE_MANUAL', detail: `Duplicate of ${survivor.id}` });
                        consolidationDeletes++;
                    }
                } else {
                    console.log(`[Item] Manual/Mixed Duplicate Detected (${key}) - SKIPPING (Use --include-manual to fix)`);
                }
            }
        }
    }

    // Execute Actions
    console.log(`[Item] Proposed Actions: ${actions.length}`);
    for (const action of actions) {
        console.log(`[ACTION] ${action.action}: ${action.detail}`);
        if (execute) {
            if (action.action === 'UPDATE_CASING') {
                // Check collision risk is low because we handled duplicates above? 
                // Wait, if we update casing we might creates duplicates if not handled in group step?
                // The group step used normalized keys, so it grouped "enb48" and "ENB48" together.
                // So duplicates are already identified.
                // The survivor needs casing update if it wasn't canonical.
                // But we shouldn't update 'updatedAt' if we want to preserve order? 
                // Just partNumber update.
                try {
                    await prisma.item.update({
                        where: { id: action.id },
                        data: { partNumber: normalizePartNumber(action.detail.split('->')[1].trim().replace(/'/g, '')) }
                    });
                } catch (e) {
                    console.error(`Failed to update ${action.id}:`, e);
                }
            } else if (action.action === 'CONSOLIDATE_SYSTEM' && action.detail.includes('New Qty')) {
                const qty = parseInt(action.detail.match(/New Qty: (\d+)/)?.[1] || '0');
                if (qty > 0) {
                    await prisma.item.update({ where: { id: action.id }, data: { quantity: qty } });
                }
            } else if (action.action.startsWith('DELETE')) {
                await prisma.item.delete({ where: { id: action.id } });
            }
        }
    }
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
