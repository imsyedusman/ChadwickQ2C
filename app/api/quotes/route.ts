import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { generateNextQuoteNumber } from '@/lib/quote-numbering';


export async function GET() {
    try {
        const quotes = await prisma.quote.findMany({
            orderBy: { updatedAt: 'desc' },
            include: {
                boards: {
                    include: {
                        items: true,
                    }
                },
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

        const quoteNumber = await generateNextQuoteNumber();

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
