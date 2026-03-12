import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { canEditQuote } from '@/lib/permissions';
import crypto from 'crypto';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const session = await getServerSession(authOptions);
        
        const quote = await prisma.quote.findUnique({
            where: { id },
            select: { createdBy: true }
        } as any);

        if (!quote) {
            return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
        }

        if (!(await canEditQuote((quote as any).createdBy))) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        // Generate a random token
        const token = crypto.randomBytes(32).toString('hex');

        const shareLink = await (prisma as any).shareLink.create({
            data: {
                quoteId: id,
                token,
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
            }
        });

        return NextResponse.json({ token: shareLink.token });
    } catch (error) {
        console.error('Failed to create share link:', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const links = await (prisma as any).shareLink.findMany({
            where: { quoteId: id, active: true },
            orderBy: { createdAt: 'desc' }
        });
        return NextResponse.json(links);
    } catch (error) {
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
