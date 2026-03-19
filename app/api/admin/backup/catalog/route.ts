import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { classifyCatalogItem } from '@/lib/catalog-service';

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
    const startTime = Date.now();
    let createdCount = 0;
    let updatedCount = 0;
    let deletedCount = 0;
    let completedBatches = 0;

    try {
        const body = await request.json();
        const { items: rawItems, type, clearBeforeImport, allOrNothing = false } = body;

        if (type !== 'catalog_backup' || !Array.isArray(rawItems)) {
            return NextResponse.json({ 
                status: 'FAILURE',
                error: 'Invalid backup file format',
                type: 'VALIDATION'
            }, { status: 400 });
        }

        console.log(`[IMPORT] Starting catalog import of ${rawItems.length} items. clearBeforeImport=${clearBeforeImport}`);

        // 1. Normalization & Deterministic Sorting
        const items = rawItems
            .filter(item => item.partNumber)
            .map(item => {
                const brand = item.brand ? String(item.brand).trim().toLowerCase() : null;
                const partNumber = String(item.partNumber).trim();
                
                // Get classification defaults (respecting preserved categories)
                const classification = classifyCatalogItem(
                    item.description || '',
                    partNumber,
                    item.category || '', // Use incoming category if available
                    item.subcategory || '',
                    '',
                    brand || ''
                );

                // Lossless Merge: 
                // 1. Start with schema defaults (via classification)
                // 2. Override with backup values if they exist and are NOT null/undefined
                // 3. Special handling for labourHours and copper flags

                return {
                    ...item, // Keep all raw fields from backup
                    brand,
                    partNumber,
                    // Ensure core derived fields are at least what classification says if missing in backup
                    category: item.category || classification.category,
                    subcategory: item.subcategory || classification.subcategory,
                    meterType: item.meterType || classification.meterType,
                    isCopperPriced: item.isCopperPriced !== undefined ? item.isCopperPriced : (classification.isCopperPriced ?? false),
                    totalCopperWeightKgPerMeter: item.totalCopperWeightKgPerMeter !== undefined ? item.totalCopperWeightKgPerMeter : (classification.totalCopperWeightKgPerMeter ?? null),
                    labourHours: item.labourHours !== undefined ? (parseFloat(item.labourHours) || 0) : (item.labourHours ?? 0)
                };
            })
            .sort((a, b) => {
                const brandA = a.brand || '';
                const brandB = b.brand || '';
                const brandCompare = brandA.localeCompare(brandB);
                if (brandCompare !== 0) return brandCompare;
                return String(a.partNumber).localeCompare(String(b.partNumber));
            });

        // 2. Cross-Batch Dedup: Ensure no duplicates within the request itself
        const seenInRequest = new Set<string>();
        const uniqueItems = [];
        for (const item of items) {
            const key = `${item.brand}:${item.partNumber}`;
            if (!seenInRequest.has(key)) {
                seenInRequest.add(key);
                uniqueItems.push(item);
            }
        }

        if (clearBeforeImport) {
            // Full clear is a single operation
            const deleted = await prisma.catalogItem.deleteMany({});
            deletedCount = deleted.count;
            console.log(`[IMPORT] Cleared ${deletedCount} existing items.`);
        }

        // 3. Pre-fetch existing items for matching (optimized memory)
        const existingItems = await prisma.catalogItem.findMany({
            select: { id: true, partNumber: true, brand: true }
        });
        const existingLookup = new Map(
            existingItems.map(item => {
                const b = item.brand ? item.brand.toLowerCase() : '';
                const p = item.partNumber ? item.partNumber.toLowerCase() : '';
                return [`${b}:${p}`, item.id];
            })
        );

        // 4. Batch Processing
        const BATCH_SIZE = 100;
        const totalBatches = Math.ceil(uniqueItems.length / BATCH_SIZE);

        for (let i = 0; i < uniqueItems.length; i += BATCH_SIZE) {
            const batchIndex = Math.floor(i / BATCH_SIZE);
            const batchItems = uniqueItems.slice(i, i + BATCH_SIZE);
            const batchStartTime = Date.now();

            try {
                await prisma.$transaction(async (tx) => {
                    for (const item of batchItems) {
                        // eslint-disable-next-line @typescript-eslint/no-unused-vars
                        const { id, createdAt, updatedAt, ...rest } = item;
                        const key = `${rest.brand}:${rest.partNumber}`;
                        const existingId = existingLookup.get(key);

                        if (existingId) {
                            await tx.catalogItem.update({
                                where: { id: existingId },
                                data: rest
                            });
                            updatedCount++;
                        } else {
                            await tx.catalogItem.create({
                                data: rest
                            });
                            createdCount++;
                        }
                    }
                }, {
                    timeout: 30000 // 30s safety as backup
                });

                completedBatches++;
                const batchDuration = Date.now() - batchStartTime;
                if (batchDuration > 2000) {
                    console.warn(`[IMPORT] Batch ${batchIndex + 1}/${totalBatches} SLOW: ${batchDuration}ms`);
                } else {
                    console.log(`[IMPORT] Batch ${batchIndex + 1}/${totalBatches} completed in ${batchDuration}ms`);
                }
            } catch (batchError: any) {
                console.error(`[IMPORT] Batch ${batchIndex + 1} FAILED:`, batchError);
                
                return NextResponse.json({
                    status: 'PARTIAL_SUCCESS',
                    error: `Failed to process batch ${batchIndex + 1}`,
                    type: 'BATCH_ERROR',
                    details: String(batchError),
                    processedCounts: { created: createdCount, updated: updatedCount, deleted: deletedCount },
                    batchProgress: { totalBatches, completedBatches, failedBatchIndex: batchIndex }
                }, { status: 500 });
            }
        }

        const totalDuration = Date.now() - startTime;
        console.log(`[IMPORT] Full success. Processed ${uniqueItems.length} items in ${totalDuration}ms.`);

        return NextResponse.json({
            status: 'FULL_SUCCESS',
            message: 'Catalog restored successfully',
            processedCounts: { created: createdCount, updated: updatedCount, deleted: deletedCount },
            batchProgress: { totalBatches, completedBatches }
        });

    } catch (error) {
        console.error('Catalog Import Error:', error);
        return NextResponse.json({ 
            status: 'FAILURE',
            error: 'Failed to import catalog', 
            type: 'DB_ERROR',
            details: String(error),
            processedCounts: { created: createdCount, updated: updatedCount, deleted: deletedCount },
            batchProgress: { totalBatches: 0, completedBatches }
        }, { status: 500 });
    }
}
