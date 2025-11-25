import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const mode = searchParams.get('mode');
        const search = searchParams.get('search') || '';
        const category = searchParams.get('category');
        const subcategory = searchParams.get('subcategory');
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
                    // Include both Schneider (switchboard/switchgear) AND vendor items (brand != null)
                    treeWhere.OR = [
                        { category: { contains: 'switchboard' } },
                        { category: { contains: 'switchgear' } },
                        { brand: { not: null }, category: { notIn: ['Basics', 'Busbar'] } }
                    ];
                } else {
                    treeWhere.category = category;
                }
            } else {
                // Default to Switchboard/Switchgear + vendor items if no category specified
                treeWhere.OR = [
                    { category: { contains: 'switchboard' } },
                    { category: { contains: 'switchgear' } },
                    { brand: { not: null }, category: { notIn: ['Basics', 'Busbar'] } }
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
                // Include both Schneider items AND vendor catalog items
                whereClause.AND.push({
                    OR: [
                        { category: { contains: 'switchboard' } },
                        { category: { contains: 'switchgear' } },
                        { brand: { not: null }, category: { notIn: ['Basics', 'Busbar'] } }
                    ]
                });
            } else {
                // Exact match for Basics, Busbar, etc.
                whereClause.AND.push({ category: category });
            }
        }

        // 3. Subcategory Filter (Exact match for drill-down)
        if (subcategory) {
            // If subcategory is provided, we want items that START with this path or match exactly
            // Actually, for L1/L2 selection, we might want to show all children?
            // But the UI logic selects specific L3 usually. 
            // Let's support "starts with" for L1/L2 browsing if needed, but for now exact match or "contains" is safer?
            // The UI sends the specific subcategory string from the item.
            // Let's use 'contains' to be safe, or exact match if we are confident.
            // Given the concatenation ' > ', exact match is best for L3, but for L1/L2 we need 'startsWith'.
            // However, the current UI logic only fetches items when fully drilled down OR searching.
            // Let's support a 'subcategory_starts_with' param if we want to show items at L1/L2.
            // For now, let's assume exact match if 'subcategory' is passed.
            whereClause.AND.push({ subcategory: subcategory });
        }

        const items = await prisma.catalogItem.findMany({
            where: whereClause,
            take: take,
            orderBy: { brand: 'asc' },
        });

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
            }))
        });

        console.log(`Successfully imported ${result.count} items.`);

        return NextResponse.json({ count: result.count });
    } catch (error) {
        console.error('Catalog Import Error:', error);
        return NextResponse.json({ error: 'Failed to import catalog', details: String(error) }, { status: 500 });
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
