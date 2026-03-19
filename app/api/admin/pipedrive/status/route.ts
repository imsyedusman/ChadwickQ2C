import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getPipedriveToken } from '@/lib/pipedrive';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = await getPipedriveToken();
        
        return NextResponse.json({
            isConfigured: !!token,
        });
    } catch (error: any) {
        console.error('[Pipedrive Status API] Error:', error);
        return NextResponse.json({ error: 'Failed to fetch Pipedrive status' }, { status: 500 });
    }
}
