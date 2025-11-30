import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
    try {
        const items = await prisma.catalogItem.findMany({
            orderBy: { brand: 'asc' }
        });

        const backupData = {
            version: '1.0',
            timestamp: new Date().toISOString(),
            type: 'catalog_backup',
            items
        };

        return new NextResponse(JSON.stringify(backupData, null, 2), {
            headers: {
                'Content-Type': 'application/json',
                'Content-Disposition': `attachment; filename="catalog-backup-${new Date().toISOString().split('T')[0]}.json"`
            }
        });
    } catch (error) {
        console.error('Catalog Export Error:', error);
        return NextResponse.json({ error: 'Failed to export catalog' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { items, type, clearBeforeImport } = body;

        if (type !== 'catalog_backup' || !Array.isArray(items)) {
            return NextResponse.json({ error: 'Invalid backup file format' }, { status: 400 });
        }

        // Transaction to ensure atomicity
        const result = await prisma.$transaction(async (tx) => {
            let deletedCount = 0;

            if (clearBeforeImport) {
                // Delete ALL catalog items
                const deleted = await tx.catalogItem.deleteMany({});
                deletedCount = deleted.count;
            }

            // Create items
            // We use createMany for speed. If not clearing, we might want upsert, 
            // but createMany is safer for "Restore" logic (usually implies a clean state or additive).
            // If we don't clear, we might get duplicates if IDs match? 
            // Actually, if we are restoring from a backup, we probably want to respect IDs if possible,
            // but createMany doesn't support "skipDuplicates" on all DBs easily in Prisma without specific config.
            // For now, let's assume "Clear" is the preferred way for a full restore.
            // If "Merge" is needed, we'd need to loop upsert, which is slower.
            // Let's stick to createMany but strip IDs to let DB generate new ones?
            // NO, for a backup restore we usually WANT the same IDs if we want to link things later?
            // But CatalogItems are referenced by ID in BoardItems? No, BoardItems copy data.
            // So IDs don't matter as much for CatalogItems.
            // Let's strip IDs to avoid collisions if not clearing.

            const itemsToCreate = items.map((item: any) => {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { id, createdAt, updatedAt, ...rest } = item;
                return rest;
            });

            const created = await tx.catalogItem.createMany({
                data: itemsToCreate
            });

            return { deletedCount, createdCount: created.count };
        });

        return NextResponse.json({
            message: 'Catalog restored successfully',
            details: result
        });

    } catch (error) {
        console.error('Catalog Import Error:', error);
        return NextResponse.json({ error: 'Failed to import catalog', details: String(error) }, { status: 500 });
    }
}
