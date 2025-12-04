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

        console.log('=== BOARD CREATION ===');
        console.log('Board name:', name);
        console.log('Board type:', type);
        console.log('Config received:', JSON.stringify(config, null, 2));

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

        console.log('Board created:', newBoard.id);

        // Auto-add default items based on Pre-Selection Logic and Admin Settings
        if (config) {
            console.log('Calling syncBoardItems with boardId:', newBoard.id);
            // 1. Run CT Metering Sync Logic
            const { syncBoardItems } = await import('@/lib/board-item-service');
            await syncBoardItems(newBoard.id, config);

            // 2. Other Auto-Add Logic (e.g. Enclosure, SPD) - Keeping existing logic for now but could move to service
            const itemsToAdd = [];

            // Fetch Auto-Add Basics from Catalog (General Basics, not CT/MISC specific)
            // Note: CT items and MISC items (labels, hardware, delivery) are now handled by syncBoardItems
            // MISC-LABELS and MISC-HARDWARE are marked isAutoAdd=true in catalog but should be excluded here
            const autoAddBasics = await prisma.catalogItem.findMany({
                where: {
                    category: 'Basics',
                    isAutoAdd: true,
                    // Exclude MISC items - they're handled by syncBoardItems based on tier count
                    partNumber: {
                        notIn: ['MISC-LABELS', 'MISC-HARDWARE', 'MISC-DELIVERY-HIAB', 'MISC-DELIVERY-UTE']
                    }
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
            // REMOVED as per user request (2025-12-04): Do not auto-add generic enclosure item.
            /*
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
            */

            // SPD (if "Yes")
            // REMOVED as per user request (2025-12-04): SPD flag is story-only.
            /*
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
            */

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
