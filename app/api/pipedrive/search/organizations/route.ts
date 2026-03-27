import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { searchOrganizations } from '@/lib/pipedrive';

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const term = searchParams.get('term');
        if (!term) {
            return NextResponse.json({ items: [] });
        }

        const items = await searchOrganizations(term);
        return NextResponse.json({ items });
    } catch (error) {
        console.error('Pipedrive organization search error:', error);
        return NextResponse.json({ error: 'Failed to search organizations' }, { status: 500 });
    }
}
