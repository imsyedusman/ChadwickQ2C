import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { canEditQuote } from '@/lib/permissions';

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string, tokenId: string }> }
) {
    try {
        const { id, tokenId } = await params;
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

        await (prisma as any).shareLink.update({
            where: { id: tokenId },
            data: { active: false }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to disable share link:', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
