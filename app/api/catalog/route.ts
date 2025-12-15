import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import * as XLSX from 'xlsx';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const mode = searchParams.get('mode');
        const search = searchParams.get('search') || '';
        const category = searchParams.get('category');
        const subcategory = searchParams.get('subcategory');
        const exportMode = searchParams.get('export') === 'true';
        const brand = searchParams.get('brand');
        const take = searchParams.get('take') ? parseInt(searchParams.get('take')!) : 100;

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
            return NextResponse.json(stats.map(s => ({
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
            return NextResponse.json(subcats.map(s => s.subcategory).filter(Boolean));
        }

        // Standard Search with Filters
        const whereClause: any = {
            AND: []
        };

        // 1. Search Query
        if (search) {
            whereClause.AND.push({
                OR: [
                    { partNumber: { contains: search } },
                    { description: { contains: search } },
                    { brand: { contains: search } },
                ]
            });
        }

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
            const worksheet = XLSX.utils.json_to_sheet(items.map(item => ({
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

        // Use createMany for better performance with SQLite/Postgres
        const result = await prisma.catalogItem.createMany({
            data: items.map((item: any) => ({
                brand: item.brand,
                category: item.category,
                subcategory: item.subcategory,
                partNumber: item.partNumber,
                description: item.description,
                unitPrice: typeof item.unitPrice === 'number' ? item.unitPrice : 0,
                labourHours: typeof item.labourHours === 'number' ? item.labourHours : 0,
                notes: item.notes,
                meterType: item.meterType // Persist meterType
            }))
        });

        console.log(`Successfully imported ${result.count} items.`);

        return NextResponse.json({ count: result.count });
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
