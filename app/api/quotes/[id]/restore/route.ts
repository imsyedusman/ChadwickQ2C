import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        // 1. Fetch the quote to be restored
        const quoteToRestore = await prisma.quote.findUnique({
            where: { id },
            select: { id: true, quoteNumber: true }
        });

        if (!quoteToRestore) {
            return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
        }

        // 2. Check for collisions across the entire Quote table
        const collision = await prisma.quote.findFirst({
            where: {
                quoteNumber: quoteToRestore.quoteNumber,
                id: { not: quoteToRestore.id }
            }
        });

        if (collision) {
            return NextResponse.json({ 
                error: 'Quote number already exists. Please rename the quote before restoring it.' 
            }, { status: 409 });
        }

        // 3. Restore status to DRAFT
        const restoredQuote = await prisma.quote.update({
            where: { id },
            data: { status: 'DRAFT' }
        });

        return NextResponse.json(restoredQuote);
    } catch (error) {
        console.error('Failed to restore quote:', error);
        return NextResponse.json({ error: 'Failed to restore quote' }, { status: 500 });
    }
}
