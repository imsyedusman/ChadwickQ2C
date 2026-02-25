import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { Item } from '@prisma/client';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string; boardId: string }> }
) {
    try {
        const { boardId } = await params;
        const items = await prisma.item.findMany({
            where: { boardId },
            orderBy: [
                { category: 'asc' }, // BASICS, SWITCHBOARD, BUSBAR (alphabetical isn't right, need custom sort)
                { order: 'asc' },
            ],
        });

        // --- ATTACH COMPOSITE METADATA AT RUNTIME ---
        const partNumbers = Array.from(new Set(items.map(i => i.partNumber).filter(Boolean) as string[]));
        const catalogItems = await prisma.catalogItem.findMany({
            where: { partNumber: { in: partNumbers } }
        });
        const catalogMap = new Map((catalogItems as any[]).map(c => [c.partNumber, c]));

        const enrichedItems = items.map(item => {
            let enriched = { ...item };

            if (item.systemTag === 'COMPOSITE' && item.partNumber) {
                // Find parent who specifies this partNumber in components
                const parent = items.find(p => {
                    if ((p as any).systemTag === 'COMPOSITE' || !p.partNumber) return false;
                    const cItem = catalogMap.get(p.partNumber);
                    if (cItem && (cItem as any).components) {
                        try {
                            const comps = typeof (cItem as any).components === 'string' ? JSON.parse((cItem as any).components) : (cItem as any).components;
                            return Array.isArray(comps) && comps.some((c: any) => c.partNumber === item.partNumber);
                        } catch (e) { return false; }
                    }
                    return false;
                });

                if (parent) {
                    (enriched as any).source = 'composite';
                    (enriched as any).metadata = {
                        autoReason: `Added automatically as component of ${parent.partNumber}`
                    };
                }
            }
            return enriched;
        });

        // Custom sort order
        const categoryOrder = { 'BASICS': 1, 'SWITCHBOARD': 2, 'BUSBAR': 3 };
        const sortedItems = enrichedItems.sort((a: Item, b: Item) => {
            const catA = categoryOrder[a.category as keyof typeof categoryOrder] || 99;
            const catB = categoryOrder[b.category as keyof typeof categoryOrder] || 99;
            return catA - catB;
        });

        return NextResponse.json(sortedItems);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 });
    }
}

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string; boardId: string }> }
) {
    try {
        const { boardId } = await params;
        const body = await request.json();
        const { category, subcategory, name, description, quantity, unitPrice, labourHours, notes, isDefault } = body;

        // Check if an item with the same identifying characteristics already exists
        // Match by: category, subcategory, name, and description (unique identifier for an item)
        const existingItem = await prisma.item.findFirst({
            where: {
                boardId,
                category,
                subcategory: subcategory || null,
                name,
                description: description || null,
            },
        });

        if (existingItem) {
            // Item already exists - increment quantity instead of creating duplicate
            const updatedItem = await prisma.item.update({
                where: { id: existingItem.id },
                data: {
                    quantity: existingItem.quantity + (quantity || 1),
                    cost: (existingItem.quantity + (quantity || 1)) * existingItem.unitPrice,
                },
            });

            return NextResponse.json(updatedItem);
        }

        // Item doesn't exist - create new item
        const count = await prisma.item.count({ where: { boardId } });

        const newItem = await prisma.item.create({
            data: {
                boardId,
                category,
                subcategory,
                name,
                description,
                quantity: quantity || 1,
                unitPrice: unitPrice || 0,
                labourHours: labourHours || 0,
                cost: (unitPrice || 0) * (quantity || 1),
                notes,
                isDefault: isDefault || false,
                order: count,
            },
        });

        // If this is a tier item being added, trigger MISC items sync
        const isTierItem = name === '1A-TIERS' || name === '1B-TIERS-400';
        if (isTierItem) {
            // Fetch board config to pass to syncBoardItems
            const board = await prisma.board.findUnique({
                where: { id: boardId },
                select: { config: true }
            });

            if (board && board.config) {
                const config = typeof board.config === 'string' ? JSON.parse(board.config) : board.config;
                const { syncBoardItems } = await import('@/lib/board-item-service');
                await syncBoardItems(boardId, config);
            }
        }

        return NextResponse.json(newItem);
    } catch (error) {
        console.error('Failed to create/update item:', error);
        return NextResponse.json({ error: 'Failed to create item' }, { status: 500 });
    }
}
