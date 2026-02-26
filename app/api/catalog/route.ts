import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { CatalogItem } from '@prisma/client';
import * as XLSX from 'xlsx';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const mode = searchParams.get('mode');
        const search = searchParams.get('search')?.trim() || '';
        const category = searchParams.get('category');
        const subcategory = searchParams.get('subcategory');
        const exportMode = searchParams.get('export') === 'true';
        const brand = searchParams.get('brand');
        const take = searchParams.get('take') ? parseInt(searchParams.get('take')!) : 200; // Default limit for performance

        console.log('[API/Catalog] Request:', { mode, search, category, subcategory, take });

        // Mode: Stats (Get unique brands and counts)
        if (mode === 'stats') {
            const stats = await prisma.catalogItem.groupBy({
                by: ['brand'],
                _count: {
                    id: true
                },
                orderBy: {
                    brand: 'asc'
                }
            });

            // Format for frontend
            return NextResponse.json(stats.map((s: { brand: string | null, _count: { id: number } }) => ({
                brand: s.brand || 'Unknown / No Brand',
                originalBrand: s.brand, // Keep original for deletion
                count: s._count.id
            })));
        }

        // Mode: Tree (Get distinct subcategories for navigation)
        if (mode === 'tree') {
            const treeWhere: any = {
                subcategory: { not: null }
            };

            if (category) {
                if (category.toLowerCase() === 'switchboard') {
                    // Include Schneider Electric items AND all vendor catalog items
                    // Brand-based filtering is more reliable than category-based
                    treeWhere.OR = [
                        { brand: 'Schneider Electric' },  // Schneider items
                        { brand: { not: null, notIn: ['Schneider Electric'] } }  // All vendor items
                    ];
                } else {
                    treeWhere.category = category;
                }
            } else {
                // Default to Schneider + all vendor items if no category specified
                treeWhere.OR = [
                    { brand: 'Schneider Electric' },
                    { brand: { not: null, notIn: ['Schneider Electric'] } }
                ];
            }

            const subcats = await prisma.catalogItem.findMany({
                where: treeWhere,
                select: {
                    subcategory: true
                },
                distinct: ['subcategory'],
                orderBy: {
                    subcategory: 'asc'
                }
            });

            // Return just the strings
            const response = NextResponse.json(subcats.map((s: { subcategory: string | null }) => s.subcategory).filter(Boolean));
            response.headers.set('X-Debug-Count', subcats.length.toString());
            return response;
        }

        // Standard Search with Filters

        // If searching, we skip standard filtering logic and prioritize relevance
        if (search) {
            // 1. Exact Match / Prefix Query (High Priority)
            // We want to guarantee these show up, so we query them specifically
            const exactMatches = await prisma.catalogItem.findMany({
                where: {
                    partNumber: { equals: search, mode: 'insensitive' }
                },
                take: 50
            });

            // 2. Broad Query (Contains)
            const broadMatches = await prisma.catalogItem.findMany({
                where: {
                    OR: [
                        { partNumber: { contains: search, mode: 'insensitive' } },
                        { description: { contains: search, mode: 'insensitive' } },
                        { subcategory: { contains: search, mode: 'insensitive' } },
                        { category: { contains: search, mode: 'insensitive' } }
                    ],
                    // Exclude IDs we already found in exactMatches to avoid fetching duplicates (optional optimization, but easy enough to dedup in memory)
                    // NOT doing NOT IN for simplicity and because exactMatches is small.
                },
                take: take // Limit broad results
            });

            // Merge and Deduplicate
            const allDocs = [...exactMatches, ...broadMatches];
            const uniqueDocs = Array.from(new Map(allDocs.map(item => [item.id, item])).values());

            // Rank Results
            const rankedDocs = uniqueDocs.map(item => {
                let score = 0;
                const partNo = (item.partNumber || '').toUpperCase();
                const q = search.toUpperCase();

                if (partNo === q) {
                    score = 100; // Exact Part Number
                } else if (partNo.startsWith(q)) {
                    score = 80; // Prefix Part Number
                } else if (partNo.includes(q)) {
                    score = 60; // Contains Part Number
                } else if ((item.description || '').toUpperCase().includes(q)) {
                    score = 40; // Description
                } else {
                    score = 20; // Category/Subcategory
                }

                return { item, score };
            });

            // Sort by Score DESC, then PartNumber ASC, then ID ASC
            rankedDocs.sort((a, b) => {
                if (b.score !== a.score) return b.score - a.score;
                // Tie-breaker: Part Number
                const pA = (a.item.partNumber || '').toUpperCase();
                const pB = (b.item.partNumber || '').toUpperCase();
                if (pA < pB) return -1;
                if (pA > pB) return 1;
                return 0; // Stable
            });

            return NextResponse.json(rankedDocs.map(r => r.item));
        }

        // Non-Search Filtering (Browser Mode)
        const whereClause: any = {
            AND: []
        };

        // 2. Category Filter
        if (category) {
            if (category.toLowerCase() === 'switchboard') {
                // Include Schneider Electric items AND all vendor catalog items
                // Brand-based filtering is more reliable than category-based
                whereClause.AND.push({
                    OR: [
                        { brand: 'Schneider Electric' },  // Schneider items
                        { brand: { not: null, notIn: ['Schneider Electric'] } }  // All vendor items
                    ]
                });
            } else {
                // Exact match for Basics, Busbar, etc.
                whereClause.AND.push({ category: category });
            }
        }

        // 3. Subcategory Filter (Exact match for drill-down)
        if (subcategory) {
            whereClause.AND.push({
                subcategory: {
                    startsWith: subcategory
                }
            });
        }

        // 4. Brand Filter (Explicitly for Export or Filtering)
        if (brand) {
            whereClause.AND.push({ brand: brand });
        }



        const items = await prisma.catalogItem.findMany({
            where: whereClause,
            take: exportMode ? undefined : take, // No limit for export
            orderBy: { brand: 'asc' },
        });

        if (exportMode) {
            // Generate Excel
            const worksheet = XLSX.utils.json_to_sheet(items.map((item: CatalogItem) => ({
                'Brand': item.brand,
                'Part Number': item.partNumber,
                'Description': item.description,
                'Category': item.category, // Master Category
                'Subcategory': item.subcategory, // Original Category
                'Price': item.unitPrice,
                'Labour': item.labourHours,
                'Notes': item.notes
            })));

            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Catalog');

            // Write to buffer
            const buf = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

            return new NextResponse(buf, {
                headers: {
                    'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    'Content-Disposition': `attachment; filename="catalog_export_${brand || 'all'}.xlsx"`
                }
            });
        }

        return NextResponse.json(items);
    } catch (error) {
        console.error('Catalog API Error:', error);
        return NextResponse.json({ error: 'Failed to fetch catalog' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { items } = body;

        if (!Array.isArray(items)) {
            return NextResponse.json({ error: 'Invalid data format' }, { status: 400 });
        }

        console.log(`Attempting to import ${items.length} items...`);

        let createdCount = 0;
        let updatedCount = 0;

        await prisma.$transaction(async (tx) => {
            for (const item of items) {
                if (!item.partNumber) {
                    await tx.catalogItem.create({
                        data: {
                            brand: item.brand,
                            category: item.category,
                            subcategory: item.subcategory,
                            description: item.description,
                            unitPrice: typeof item.unitPrice === 'number' ? item.unitPrice : 0,
                            labourHours: typeof item.labourHours === 'number' ? item.labourHours : 0,
                            notes: item.notes,
                            meterType: item.meterType,
                        }
                    });
                    createdCount++;
                    continue;
                }

                const existing = await tx.catalogItem.findUnique({
                    where: { partNumber: item.partNumber }
                });

                if (existing) {
                    await tx.catalogItem.update({
                        where: { id: existing.id },
                        data: {
                            unitPrice: typeof item.unitPrice === 'number' ? item.unitPrice : 0,
                            labourHours: typeof item.labourHours === 'number' ? item.labourHours : 0,
                            description: item.description, // Allow description updates
                        }
                    });
                    updatedCount++;
                } else {
                    await tx.catalogItem.create({
                        data: {
                            brand: item.brand,
                            category: item.category,
                            subcategory: item.subcategory,
                            partNumber: item.partNumber,
                            description: item.description,
                            unitPrice: typeof item.unitPrice === 'number' ? item.unitPrice : 0,
                            labourHours: typeof item.labourHours === 'number' ? item.labourHours : 0,
                            notes: item.notes,
                            meterType: item.meterType
                        }
                    });
                    createdCount++;
                }
            }
        });

        console.log(`Successfully imported. Created: ${createdCount}, Updated: ${updatedCount}.`);

        return NextResponse.json({ count: createdCount + updatedCount, created: createdCount, updated: updatedCount });
    } catch (error) {
        console.error('Catalog Import Error:', error);
        return NextResponse.json({ error: 'Failed to import catalog', details: String(error) }, { status: 500 });
    }
}

import { classifyCatalogItem } from '@/lib/catalog-service';

export async function PATCH(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const action = searchParams.get('action');

        if (action === 'reclassify') {
            console.log("Starting full catalog re-classification...");
            // Fetch all items that might be Power Meters
            const potentialMeters = await prisma.catalogItem.findMany({
                where: {
                    OR: [
                        { subcategory: { contains: 'Power Meter', mode: 'insensitive' } },
                        { description: { contains: 'meter', mode: 'insensitive' } },
                        { category: 'Switchboard' }
                    ]
                }
            });

            let updatedCount = 0;

            for (const item of potentialMeters) {
                // Re-run heuristics
                const classification = classifyCatalogItem(
                    item.description,
                    item.partNumber || '',
                    item.category || '',
                    item.subcategory || '',
                    '', // No original vendor cats available in DB, relies on current state
                    ''
                );

                // Only update if something changed (improves perf)
                if (classification.meterType && classification.meterType !== item.meterType) {
                    await prisma.catalogItem.update({
                        where: { id: item.id },
                        data: {
                            meterType: classification.meterType,
                            // Optionally update brand/subcat if we want to enforce consistency
                            brand: classification.brand !== 'Unknown' ? classification.brand : item.brand
                        }
                    });
                    updatedCount++;
                }
            }

            return NextResponse.json({ message: `Re-classified ${updatedCount} items.`, count: updatedCount });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

    } catch (error) {
        console.error('Re-classification Error:', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}




export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const brand = searchParams.get('brand');

        // Allow deletion of "Unknown" brands (where brand is null or empty)
        // We'll use a special flag or check for the string "null" if passed from client
        const isUnknown = brand === 'null' || brand === '' || brand === 'Unknown / No Brand';

        if (!brand && !isUnknown) {
            return NextResponse.json({ error: 'Brand is required' }, { status: 400 });
        }

        const whereClause = isUnknown
            ? { OR: [{ brand: null }, { brand: '' }] }
            : { brand: brand };

        const result = await prisma.catalogItem.deleteMany({
            where: whereClause,
        });

        return NextResponse.json({ count: result.count });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to delete brand' }, { status: 500 });
    }
}
