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
            const itemsToAdd = [];

            // 1. Fetch Auto-Add Basics from Catalog
            const autoAddBasics = await prisma.catalogItem.findMany({
                where: {
                    category: 'Basics',
                    isAutoAdd: true
                }
            });

            itemsToAdd.push(...autoAddBasics.map(item => ({
                category: 'Basics',
                subcategory: item.subcategory,
                name: item.partNumber || item.description, // Use partNumber as name if available
                description: item.description,
                unitPrice: item.unitPrice,
                labourHours: item.labourHours,
                quantity: item.defaultQuantity || 1, // Use defaultQuantity from catalog
                isDefault: true
            })));

            // 2. Enclosure (from Config) - Keep as placeholder logic for now
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

            // 3. SPD (if "Yes")
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

            // 4. Busbars - Manual selection only (removed auto-add)

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
