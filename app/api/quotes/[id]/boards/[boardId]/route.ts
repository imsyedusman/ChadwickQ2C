import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string; boardId: string }> }
) {
    try {
        const { boardId } = await params;
        const body = await request.json();
        const { name, type, config } = body;

        const updatedBoard = await prisma.board.update({
            where: { id: boardId },
            data: {
                name,
                type,
                config: config ? JSON.stringify(config) : undefined,
            },
        });

        return NextResponse.json(updatedBoard);
    } catch (error) {
        console.error('Failed to update board', error);
        return NextResponse.json({ error: 'Failed to update board' }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string; boardId: string }> }
) {
    try {
        const { boardId } = await params;

        await prisma.board.delete({
            where: { id: boardId },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to delete board', error);
        return NextResponse.json({ error: 'Failed to delete board' }, { status: 500 });
    }
}
