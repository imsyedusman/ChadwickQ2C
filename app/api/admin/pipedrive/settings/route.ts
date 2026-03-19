import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        // Ensure user is admin (simplified check - in production use proper role check)
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { token } = await request.json();

        if (!token) {
            return NextResponse.json({ error: 'Token is required' }, { status: 400 });
        }

        const settings = await (prisma as any).settings.upsert({
            where: { id: 'global' },
            update: { pipedriveToken: token },
            create: {
                id: 'global',
                pipedriveToken: token
            }
        });

        return NextResponse.json({ success: true, message: 'Pipedrive token saved successfully' });
    } catch (error) {
        console.error('Failed to save Pipedrive settings:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const settings = await (prisma as any).settings.findUnique({
            where: { id: 'global' },
            select: { pipedriveToken: true }
        });

        const runningBatch = await (prisma as any).importBatch.findFirst({
            where: { 
                status: 'RUNNING',
                source: 'pipedrive'
            },
            orderBy: { startedAt: 'desc' }
        });

        return NextResponse.json({ 
            pipedriveTokenSet: !!settings?.pipedriveToken,
            activeSyncBatchId: runningBatch?.id || null
        });
    } catch (error) {
        console.error('Failed to fetch Pipedrive settings:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
