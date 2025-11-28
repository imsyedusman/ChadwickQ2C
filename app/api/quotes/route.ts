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
        // Find the max quote number by fetching all and parsing (safe for SQLite/low volume)
        const allQuotes = await prisma.quote.findMany({
            select: { quoteNumber: true }
        });

        let maxNum = 1000;
        for (const q of allQuotes) {
            if (q.quoteNumber && q.quoteNumber.startsWith('Q-')) {
                const parts = q.quoteNumber.split('-');
                if (parts.length === 2) {
                    const num = parseInt(parts[1]);
                    if (!isNaN(num) && num > maxNum) {
                        maxNum = num;
                    }
                }
            }
        }

        const quoteNumber = `Q-${maxNum + 1}`;

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
