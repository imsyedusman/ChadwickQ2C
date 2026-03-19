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
            const importBatchesCount = await tx.importBatch.deleteMany({});
            const shareLinksCount = await tx.shareLink.deleteMany({});
            const itemsCount = await tx.item.deleteMany({});
            const boardsCount = await tx.board.deleteMany({});
            const quotesCount = await tx.quote.deleteMany({});
            const projectsCount = await tx.project.deleteMany({});
            const contactsCount = await tx.contact.deleteMany({});
            const clientsCount = await tx.client.deleteMany({});
        });

        await logAction(userId, 'RESET_PROJECTS_FULL', 'PROJECT', null, {
            description: 'Admin performed full reset of all projects, clients, contacts, and related data'
        });

        return NextResponse.json({ success: true, message: 'All projects and related data have been reset' });
    } catch (error: any) {
        console.error('Reset Projects Error:', error);
        return NextResponse.json({ 
            error: 'Failed to reset projects', 
            details: error.message 
        }, { status: 500 });
    }
}
