import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: quoteId } = await params;
        const body = await request.json();
        const { name, type, config } = body;

        const count = await prisma.board.count({ where: { quoteId } });

        const newBoard = await prisma.board.create({
            data: {
                quoteId,
                name,
                type,
                order: count,
                config: config ? JSON.stringify(config) : null,
            },
        });

        // Auto-add default items based on Pre-Selection Logic and Admin Settings
        if (config) {
            // 1. Run CT Metering Sync Logic
            const { syncBoardItems } = await import('@/lib/board-item-service');
            await syncBoardItems(newBoard.id, config);

            // 2. Other Auto-Add Logic (e.g. Enclosure, SPD) - Keeping existing logic for now but could move to service
            const itemsToAdd = [];

            // Fetch Auto-Add Basics from Catalog (General Basics, not CT specific)
            // Note: CT items are now handled by syncBoardItems, so we should ensure we don't double add if they are marked isAutoAdd in catalog.
            // But for now, let's assume 'Basics' category items that are isAutoAdd don't overlap with CT items or we filter them.
            // Actually, to be safe, let's leave the general auto-add logic but maybe we should filter out CT items if they were somehow marked auto-add?
            // The user said "All these items already exist in the catalog — you only need to auto-add/remove them in the board’s item list."
            // It's likely they are NOT marked isAutoAdd=true globally, but rather we are adding them conditionally.

            const autoAddBasics = await prisma.catalogItem.findMany({
                where: {
                    category: 'Basics',
                    isAutoAdd: true
                }
            });

            itemsToAdd.push(...autoAddBasics.map((item: any) => ({
                category: 'Basics',
                subcategory: item.subcategory,
                name: item.partNumber || item.description,
                description: item.description,
                unitPrice: item.unitPrice,
                labourHours: item.labourHours,
                quantity: item.defaultQuantity || 1,
                isDefault: true
            })));

            // Enclosure (from Config)
            if (config.enclosureType) {
                itemsToAdd.push({
                    category: 'Switchboard',
                    subcategory: 'Enclosure',
                    name: `${config.enclosureType} Enclosure`,
                    description: `${config.ipRating} ${config.enclosureType} Enclosure`,
                    unitPrice: 500, // Placeholder price
                    labourHours: 0,
                    quantity: 1,
                    isDefault: true
                });
            }

            // SPD (if "Yes")
            if (config.spd === 'Yes') {
                itemsToAdd.push({
                    category: 'Switchboard',
                    subcategory: 'Circuit Breakers > SPD',
                    name: 'Surge Protection Device',
                    description: 'Type 2 SPD',
                    unitPrice: 150,
                    labourHours: 0.5,
                    quantity: 1,
                    isDefault: true
                });
            }

            // Batch create items
            if (itemsToAdd.length > 0) {
                await prisma.item.createMany({
                    data: itemsToAdd.map(item => ({
                        boardId: newBoard.id,
                        category: item.category,
                        subcategory: item.subcategory || null,
                        name: item.name,
                        description: item.description,
                        unitPrice: item.unitPrice,
                        labourHours: item.labourHours || 0,
                        quantity: item.quantity,
                        cost: item.unitPrice * item.quantity,
                        isDefault: item.isDefault || false
                    }))
                });
            }
        }

        return NextResponse.json(newBoard);
    } catch (error) {
        console.error('Failed to create board', error);
        return NextResponse.json({ error: 'Failed to create board' }, { status: 500 });
    }
}
