import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logAction } from '@/lib/audit';

export async function POST() {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user as any).role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const userId = (session.user as any)?.id;

        await prisma.$transaction(async (tx) => {
            const shareLinksCount = await tx.shareLink.deleteMany({});
            const boardsCount = await tx.board.deleteMany({});
            const itemsCount = await tx.item.deleteMany({});
            const quotesCount = await tx.quote.deleteMany({});
        });

        await logAction(userId, 'RESET_QUOTES', 'QUOTE', null, {
            description: 'Admin performed full reset of all quotes and related data'
        });

        return NextResponse.json({ success: true, message: 'All quotes and related data have been reset' });
    } catch (error: any) {
        console.error('Reset Quotes Error:', error);
        return NextResponse.json({ 
            error: 'Failed to reset quotes', 
            details: error.message 
        }, { status: 500 });
    }
}
