import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';

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
        const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
            let deletedCount = 0;
            let createdCount = 0;
            let updatedCount = 0;

            if (clearBeforeImport) {
                // Delete ALL catalog items
                const deleted = await tx.catalogItem.deleteMany({});
                deletedCount = deleted.count;
                
                // createMany is efficient for fresh start
                const itemsToCreate = items.map((item: any) => {
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    const { id, createdAt, updatedAt, ...rest } = item;
                    return rest;
                });
                const created = await tx.catalogItem.createMany({ data: itemsToCreate });
                createdCount = created.count;
            } else {
                // Merge logic with duplicate prevention
                // For each item, we check if partNumber + brand exists
                for (const item of items) {
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    const { id, createdAt, updatedAt, ...rest } = item;
                    
                    if (!rest.partNumber || !rest.brand) {
                        // Skip items without unique key info
                        continue;
                    }

                    const existing = await tx.catalogItem.findFirst({
                        where: {
                            partNumber: rest.partNumber,
                            brand: rest.brand
                        }
                    });

                    if (existing) {
                        // Update existing item
                        await tx.catalogItem.update({
                            where: { id: existing.id },
                            data: rest
                        });
                        updatedCount++;
                    } else {
                        // Create new item
                        await tx.catalogItem.create({
                            data: rest
                        });
                        createdCount++;
                    }
                }
            }

            return { deletedCount, createdCount, updatedCount };
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
