import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { testConnection } from '@/lib/pipedrive';

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user as any).role === 'VIEWER') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const { token } = await request.json();
        if (!token) {
            return NextResponse.json({ error: 'Token is required' }, { status: 400 });
        }

        const success = await testConnection(token);
        return NextResponse.json({ success });
    } catch (error) {
        console.error('Pipedrive connection test error:', error);
        return NextResponse.json({ error: 'Failed to test connection' }, { status: 500 });
    }
}
