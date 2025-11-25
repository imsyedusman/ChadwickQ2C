import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
    try {
        const quotes = await prisma.quote.findMany({
            orderBy: { updatedAt: 'desc' },
            include: {
                boards: true,
            }
        });
        return NextResponse.json(quotes);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch quotes' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { clientName, projectRef, description } = body;

        // Generate a simple quote number (in a real app, this would be more robust)
        const count = await prisma.quote.count();
        const quoteNumber = `Q-${1000 + count + 1}`;

        const newQuote = await prisma.quote.create({
            data: {
                quoteNumber,
                clientName,
                projectRef,
                description,
                status: 'DRAFT',
            },
        });

        return NextResponse.json(newQuote);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to create quote' }, { status: 500 });
    }
}
