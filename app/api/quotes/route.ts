import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { generateNextQuoteNumber } from '@/lib/quote-numbering';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logAction } from '@/lib/audit';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const search = searchParams.get('search');
        const status = searchParams.get('status');
        const quoteNumber = searchParams.get('quoteNumber');
        const revisionGroupId = searchParams.get('revisionGroupId');
        const showTrash = searchParams.get('showTrash') === 'true';

        const where: any = {};
        if (revisionGroupId) {
            where.revisionGroupId = revisionGroupId;
        }
        if (quoteNumber) {
            where.quoteNumber = quoteNumber;
        }
        if (search) {
            where.OR = [
                { quoteNumber: { contains: search, mode: 'insensitive' } },
                { clientName: { contains: search, mode: 'insensitive' } },
                { projectRef: { contains: search, mode: 'insensitive' } },
            ];
        }

        if (status) {
            where.status = status;
        } else if (showTrash) {
            where.status = 'TRASH';
        } else {
            where.status = { not: 'TRASH' };
        }

        const quotes = await (prisma.quote as any).findMany({
            where,
            include: {
                boards: {
                    include: { items: true }
                },
                creator: { select: { name: true, email: true } },
                modifier: { select: { name: true, email: true } }
            },
            orderBy: { updatedAt: 'desc' },
        });

        return NextResponse.json(quotes);
    } catch (error) {
        console.error('Failed to fetch quotes:', error);
        return NextResponse.json({ error: 'Failed to fetch quotes' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { clientName, projectRef, description } = body;
        
        const session = await getServerSession(authOptions);
        const userId = (session?.user as any)?.id;

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        const quoteNumber = await generateNextQuoteNumber();

        const newQuote = await prisma.quote.create({
            data: {
                quoteNumber,
                clientName,
                projectRef,
                description,
                status: 'DRAFT',
                createdBy: userId,
                lastModifiedBy: userId,
            },
        } as any);

        // Update the quote with its own ID as the revisionGroupId
        const updatedQuote = await (prisma.quote as any).update({
            where: { id: newQuote.id },
            data: { revisionGroupId: newQuote.id }
        });

        await logAction(userId, 'CREATE_QUOTE', 'QUOTE', newQuote.id, { quoteNumber });

        return NextResponse.json(updatedQuote);
    } catch (error) {
        console.error('Failed to create quote:', error);
        return NextResponse.json({ error: 'Failed to create quote' }, { status: 500 });
    }
}
