import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { items } = body;

        if (!Array.isArray(items) || items.length === 0) {
            return NextResponse.json({ error: 'No items provided' }, { status: 400 });
        }

        // 1. Strict Brand Isolation (Case-Insensitive)
        const uploadedBrands = Array.from(new Set(items.map(item => item.brand?.toLowerCase()).filter(Boolean))) as string[];

        if (uploadedBrands.length === 0) {
            return NextResponse.json({ error: 'No valid brands found in upload' }, { status: 400 });
        }

        // Fetch existing catalog items for ONLY these brands
        // We fetch with insensitive OR just fetch all and filter in memory if the list is small.
        // Given 28k items, we'll try to be specific.
        const existingItems = await prisma.catalogItem.findMany({
            where: {
                brand: { in: uploadedBrands, mode: 'insensitive' }
            }
        });

        // 2. Fetch automation rules
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

        // 3. Build O(1) lookup map (Normalize key to UpperPartNumber_LowerBrand)
        const existingMap = new Map<string, typeof existingItems[0]>();
        existingItems.forEach(item => {
            if (item.partNumber) {
                const key = `${item.partNumber.toUpperCase()}_${item.brand?.toLowerCase() || 'none'}`;
                existingMap.set(key, item);
            }
        });

        const updatedItems: any[] = [];
        const descriptionChanges: any[] = [];
        const newItems: any[] = [];
        const duplicates: any[] = [];
        const highImpactChanges: any[] = [];
        let unchangedCount = 0;

        // Keep track of seen part numbers in THIS upload to detect duplicates
        const seenInUpload = new Map<string, any>();

        for (const uploadItem of items) {
            if (!uploadItem.partNumber) continue;

            const partNoUpper = uploadItem.partNumber.toUpperCase();
            const brandLower = uploadItem.brand?.toLowerCase() || 'none';
            const lookupKey = `${partNoUpper}_${brandLower}`;

            // Check for duplicates in the upload file itself
            if (seenInUpload.has(lookupKey)) {
                const firstSeen = seenInUpload.get(lookupKey);
                if (firstSeen.unitPrice !== uploadItem.unitPrice || firstSeen.description !== uploadItem.description) {
                    duplicates.push({
                        partNumber: uploadItem.partNumber,
                        brand: uploadItem.brand,
                        firstValue: { price: firstSeen.unitPrice, desc: firstSeen.description },
                        duplicateValue: { price: uploadItem.unitPrice, desc: uploadItem.description }
                    });
                }
                continue; // Skip duplicate to avoid double counting
            }
            seenInUpload.set(lookupKey, uploadItem);

            const existingItem = existingMap.get(lookupKey);

            if (!existingItem) {
                newItems.push({
                    partNumber: uploadItem.partNumber,
                    description: uploadItem.description,
                    category: uploadItem.category,
                    unitPrice: uploadItem.unitPrice
                });
                continue;
            }

            // 4. Comparison
            const oldPrice = Math.round((existingItem.unitPrice || 0) * 100);
            const newPrice = Math.round((uploadItem.unitPrice || 0) * 100);
            const isDescChanged = existingItem.description !== uploadItem.description;

            if (oldPrice !== newPrice) {
                const oldPriceFloat = oldPrice / 100;
                const newPriceFloat = newPrice / 100;
                const delta = Math.abs(newPriceFloat - oldPriceFloat);
                const percentChange = oldPriceFloat > 0 ? (delta / oldPriceFloat) * 100 : (newPriceFloat > 0 ? 100 : 0);

                const changeRecord = {
                    partNumber: uploadItem.partNumber,
                    description: uploadItem.description,
                    oldDescription: existingItem.description,
                    isDescChanged,
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
            } else if (isDescChanged) {
                descriptionChanges.push({
                    partNumber: uploadItem.partNumber,
                    oldDescription: existingItem.description,
                    newDescription: uploadItem.description,
                    price: uploadItem.unitPrice
                });
            } else {
                unchangedCount++;
            }
        }

        // 6. Non-Destructive Missing Item Logic
        const missingItems: any[] = [];
        existingMap.forEach((existingItem, key) => {
            if (!seenInUpload.has(key)) {
                missingItems.push({
                    partNumber: existingItem.partNumber,
                    description: existingItem.description,
                    currentPrice: existingItem.unitPrice,
                    status: "Not found in upload"
                });
            }
        });

        // 7. Sort rules
        updatedItems.sort((a, b) => b.percentChange - a.percentChange);
        highImpactChanges.sort((a, b) => b.percentChange - a.percentChange);

        // 7. Sort rules
        updatedItems.sort((a, b) => b.percentChange - a.percentChange);
        highImpactChanges.sort((a, b) => b.percentChange - a.percentChange);

        return NextResponse.json({
            summary: {
                updatedItems,
                descriptionChanges,
                newItems,
                missingItems,
                duplicates,
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
