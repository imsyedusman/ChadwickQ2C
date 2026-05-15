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
                    description: uploadItem.description || '',
                    category: uploadItem.category,
                    unitPrice: uploadItem.unitPrice,
                    missingDescription: !uploadItem.description || String(uploadItem.description).trim() === ''
                });
                continue;
            }

            // 4. Detailed Field Comparison
            const changes: string[] = [];
            const preserved: string[] = [];
            
            // Numeric validation & comparison
            const compareNumeric = (field: string, incoming: any, existing: any) => {
                const newVal = typeof incoming === 'number' ? incoming : parseFloat(String(incoming || ''));
                const oldVal = existing || 0;
                
                if (isNaN(newVal) || incoming === null || incoming === undefined || incoming === '') {
                    preserved.push(field);
                    return { changed: false, value: oldVal };
                }
                
                if (Math.round(newVal * 100) !== Math.round(oldVal * 100)) {
                    changes.push(field);
                    return { changed: true, value: newVal, old: oldVal };
                }
                return { changed: false, value: oldVal };
            };

            // String validation & comparison
            const compareString = (field: string, incoming: any, existing: any) => {
                const newVal = String(incoming || '').trim();
                const oldVal = String(existing || '').trim();
                
                if (!newVal) {
                    preserved.push(field);
                    return { changed: false, value: oldVal };
                }
                
                if (newVal !== oldVal) {
                    changes.push(field);
                    return { changed: true, value: newVal, old: oldVal };
                }
                return { changed: false, value: oldVal };
            };

            const priceRes = compareNumeric('unitPrice', uploadItem.unitPrice, existingItem.unitPrice);
            const labourRes = compareNumeric('labourHours', uploadItem.labourHours, existingItem.labourHours);
            const descRes = compareString('description', uploadItem.description, existingItem.description);
            const subcatRes = compareString('subcategory', uploadItem.subcategory, existingItem.subcategory);

            if (changes.length > 0) {
                const changeRecord = {
                    partNumber: uploadItem.partNumber,
                    description: uploadItem.description,
                    oldDescription: existingItem.description,
                    changedFields: changes,
                    preservedFields: preserved,
                    oldPrice: existingItem.unitPrice,
                    newPrice: priceRes.value,
                    percentChange: priceRes.changed ? (existingItem.unitPrice > 0 ? (Math.abs(priceRes.value - existingItem.unitPrice) / existingItem.unitPrice) * 100 : 100) : 0,
                    isIncrease: priceRes.value > existingItem.unitPrice
                };

                updatedItems.push(changeRecord);

                // 5. Deterministic High-Impact Detection
                const isHighImpact =
                    existingItem.isCopperPriced ||
                    existingItem.isSheetmetal ||
                    existingItem.mccbRole ||
                    automationPartNumbers.has(uploadItem.partNumber) ||
                    Boolean(existingItem.components && typeof existingItem.components === 'object' && Object.keys(existingItem.components).length > 0);

                if (isHighImpact && changes.includes('unitPrice')) {
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
        updatedItems.sort((a, b) => (b.percentChange || 0) - (a.percentChange || 0));
        highImpactChanges.sort((a, b) => (b.percentChange || 0) - (a.percentChange || 0));

        return NextResponse.json({
            summary: {
                updatedItems,
                descriptionChanges: updatedItems.filter(i => i.changedFields.includes('description')),
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
