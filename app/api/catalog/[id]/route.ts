import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();

        const updatedItem = await prisma.catalogItem.update({
            where: { id },
            data: body,
        });

        return NextResponse.json(updatedItem);
    } catch (error) {
        console.error('Failed to update catalog item', error);
        return NextResponse.json({ error: 'Failed to update catalog item' }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        await prisma.catalogItem.delete({
            where: { id }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to delete catalog item', error);
        return NextResponse.json({ error: 'Failed to delete catalog item' }, { status: 500 });
    }
}
