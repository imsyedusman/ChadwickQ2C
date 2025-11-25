import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        // We don't strictly need quoteId here since boardId is unique, but it's good for validation if needed
        const { id: quoteId } = await params;
        const body = await request.json();
        const { boardId, category, subcategory, name, description, quantity, unitPrice, labourHours } = body;

        if (!boardId || !name) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Calculate cost
        const cost = (unitPrice || 0) * (quantity || 1);

        const newItem = await prisma.item.create({
            data: {
                boardId,
                category: category || 'Switchboard',
                subcategory,
                name,
                description,
                quantity: quantity || 1,
                unitPrice: unitPrice || 0,
                labourHours: labourHours || 0,
                cost,
            },
        });

        return NextResponse.json(newItem);
    } catch (error) {
        console.error('Failed to create item:', error);
        return NextResponse.json({ error: 'Failed to create item' }, { status: 500 });
    }
}
