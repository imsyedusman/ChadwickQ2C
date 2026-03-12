import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { generateNextQuoteNumber } from '@/lib/quote-numbering';


export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const quoteNumber = searchParams.get('quoteNumber');
        const showTrash = searchParams.get('showTrash') === 'true';

        const where: any = {};
        if (quoteNumber) {
            // If the provided quoteNumber has a suffix, extract the base
            const baseMatch = quoteNumber.match(/^(Q\d{2}-\d{4})/);
            const baseNumber = baseMatch ? baseMatch[1] : quoteNumber;

            where.quoteNumber = {
                startsWith: baseNumber
            };
        }

        // Filter out Trash quotes by default
        if (!showTrash) {
            where.status = { not: 'TRASH' };
        } else {
            where.status = 'TRASH';
        }

        const quotes = await prisma.quote.findMany({
            where,
            include: {
                boards: {
                    include: {
                        items: true,
                    }
                },
            }
        });

        // Sort by quoteNumber desc, revision desc in JS because Prisma client might be out of sync
        const sortedQuotes = (quotes as any[]).sort((a, b) => {
            if (a.quoteNumber !== b.quoteNumber) {
                return b.quoteNumber.localeCompare(a.quoteNumber);
            }
            return (b.revision || 0) - (a.revision || 0);
        });

        return NextResponse.json(sortedQuotes);
    } catch (error) {
        console.error('Error fetching quotes:', error);
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
