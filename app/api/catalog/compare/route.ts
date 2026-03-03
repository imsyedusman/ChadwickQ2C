import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { items } = body;

        if (!Array.isArray(items) || items.length === 0) {
            return NextResponse.json({ error: 'No items provided' }, { status: 400 });
        }

        // 1. Strict Brand Isolation
        // Extract unique brands from the upload to ensure brand-safe comparison
        const uploadedBrands = Array.from(new Set(items.map(item => item.brand).filter(Boolean))) as string[];

        if (uploadedBrands.length === 0) {
            return NextResponse.json({ error: 'No valid brands found in upload' }, { status: 400 });
        }

        // Fetch existing catalog items for ONLY these brands
        const existingItems = await prisma.catalogItem.findMany({
            where: {
                brand: { in: uploadedBrands }
            }
        });

        // 2. Fetch automation rules for deterministic high-impact flags
        const [tripBaseRules, pairingRules] = await Promise.all([
            prisma.mccbTripBaseRule.findMany({ select: { tripPartNumber: true, basePartNumber: true } }),
            prisma.pairingRule.findMany({ select: { inputPartNumber: true, outputPartNumber: true } })
        ]);

        const automationPartNumbers = new Set<string>();
        tripBaseRules.forEach(r => {
            automationPartNumbers.add(r.tripPartNumber);
            automationPartNumbers.add(r.basePartNumber);
        });
        pairingRules.forEach(r => {
            automationPartNumbers.add(r.inputPartNumber);
            automationPartNumbers.add(r.outputPartNumber);
        });

        // 3. Build O(1) lookup map for existing items by partNumber
        const existingMap = new Map<string, typeof existingItems[0]>();
        existingItems.forEach(item => {
            if (item.partNumber) {
                existingMap.set(item.partNumber, item);
            }
        });

        const updatedItems: any[] = [];
        const newItems: any[] = [];
        const highImpactChanges: any[] = [];
        let unchangedCount = 0;

        // Keep track of which existing items were seen in the upload
        const seenPartNumbers = new Set<string>();

        for (const uploadItem of items) {
            if (!uploadItem.partNumber) continue;

            seenPartNumbers.add(uploadItem.partNumber);
            const existingItem = existingMap.get(uploadItem.partNumber);

            if (!existingItem) {
                newItems.push({
                    partNumber: uploadItem.partNumber,
                    description: uploadItem.description,
                    category: uploadItem.category,
                    unitPrice: uploadItem.unitPrice
                });
                continue;
            }

            // 4. Numeric Strict Comparison
            // (Round to 2 decimal places to avoid float precision issues)
            const oldPrice = Math.round((existingItem.unitPrice || 0) * 100);
            const newPrice = Math.round((uploadItem.unitPrice || 0) * 100);

            if (oldPrice !== newPrice) {
                const oldPriceFloat = oldPrice / 100;
                const newPriceFloat = newPrice / 100;
                const delta = Math.abs(newPriceFloat - oldPriceFloat);
                const percentChange = oldPriceFloat > 0 ? (delta / oldPriceFloat) * 100 : (newPriceFloat > 0 ? 100 : 0);

                const changeRecord = {
                    partNumber: uploadItem.partNumber,
                    description: uploadItem.description,
                    oldPrice: oldPriceFloat,
                    newPrice: newPriceFloat,
                    delta: delta,
                    percentChange: percentChange,
                    isIncrease: newPrice > oldPrice
                };

                updatedItems.push(changeRecord);

                // 5. Deterministic High-Impact Detection
                const isHighImpact =
                    existingItem.isCopperPriced ||
                    existingItem.isSheetmetal ||
                    existingItem.mccbRole ||
                    automationPartNumbers.has(uploadItem.partNumber) ||
                    Boolean(existingItem.components && typeof existingItem.components === 'object' && Object.keys(existingItem.components).length > 0);

                if (isHighImpact) {
                    let impactReason = "This item is used in automated board calculations.";
                    if (existingItem.isCopperPriced) {
                        impactReason = "This item's price affects dynamic copper calculations.";
                    } else if (existingItem.isSheetmetal) {
                        impactReason = "This item's price affects total sheetmetal calculations.";
                    }

                    highImpactChanges.push({
                        ...changeRecord,
                        impactReason
                    });
                }
            } else {
                unchangedCount++;
            }
        }

        // 6. Non-Destructive Missing Item Logic
        // Find missing items (present in DB for these brands, but not in upload)
        const missingItems: any[] = [];
        existingMap.forEach((existingItem, partNumber) => {
            if (!seenPartNumbers.has(partNumber)) {
                missingItems.push({
                    partNumber: existingItem.partNumber,
                    description: existingItem.description,
                    currentPrice: existingItem.unitPrice,
                    status: "Not found in upload"
                });
            }
        });

        // 7. Sort rules
        // Updated and High Impact items: largest % change descending
        updatedItems.sort((a, b) => b.percentChange - a.percentChange);
        highImpactChanges.sort((a, b) => b.percentChange - a.percentChange);

        return NextResponse.json({
            summary: {
                updatedItems,
                newItems,
                missingItems,
                unchangedCount,
                highImpactChanges,
                totalUploaded: items.length
            }
        });

    } catch (error) {
        console.error('Catalog Compare Error:', error);
        return NextResponse.json({ error: 'Failed to compare catalog' }, { status: 500 });
    }
}
