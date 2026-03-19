import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const batchId = searchParams.get('batchId');

        let batch;
        if (batchId) {
            batch = await (prisma as any).importBatch.findUnique({
                where: { id: batchId }
            });
        } else {
            // Get the most recent batch
            batch = await (prisma as any).importBatch.findFirst({
                where: { source: 'pipedrive' },
                orderBy: { startedAt: 'desc' }
            });
        }

        if (!batch) {
            return NextResponse.json({ error: 'No sync batch found' }, { status: 404 });
        }

        const now = new Date();
        const minutesSinceActivity = Math.round((now.getTime() - batch.lastHeartbeatAt.getTime()) / 60000);

        return NextResponse.json({
            id: batch.id,
            status: batch.status,
            totalAttempted: batch.totalProjectsAttempted,
            totalCommitted: batch.totalProjectsCommitted,
            startedAt: batch.startedAt,
            completedAt: batch.completedAt,
            lastHeartbeat: batch.lastHeartbeatAt,
            minutesSinceActivity,
            errorLog: batch.errorLog
        });
    } catch (error: any) {
        console.error('[Pipedrive Sync Status] Error:', error);
        return NextResponse.json({ error: 'Failed to fetch sync status' }, { status: 500 });
    }
}
