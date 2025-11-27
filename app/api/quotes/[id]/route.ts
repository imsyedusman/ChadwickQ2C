import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const quote = await prisma.quote.findUnique({
            where: { id },
            include: {
                boards: {
                    include: {
                        items: true,
                    },
                    orderBy: { order: 'asc' },
                },
            },
        });

        if (!quote) {
            return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
        }

        return NextResponse.json(quote);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch quote' }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        await prisma.quote.delete({
            where: { id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete quote' }, { status: 500 });
    }
}

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { clientName, clientCompany, projectRef, description, status, settingsSnapshot } = body;

        const updatedQuote = await prisma.quote.update({
            where: { id },
            data: {
                clientName,
                clientCompany,
                projectRef,
                description,
                status,
                settingsSnapshot,
            },
        });

        return NextResponse.json(updatedQuote);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update quote' }, { status: 500 });
    }
}
