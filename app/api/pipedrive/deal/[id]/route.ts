import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { fetchDeal } from '@/lib/pipedrive';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const deal = await fetchDeal(id);

        if (!deal) {
            return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
        }

        // Pipedrive deal object usually contains org and person names/ids
        // But for consistency with user request, we return a structured object
        return NextResponse.json({
            id: deal.id,
            title: deal.title,
            organization: deal.org_id ? {
                id: deal.org_id.value,
                name: deal.org_id.name
            } : null,
            person: deal.person_id ? {
                id: deal.person_id.value,
                name: deal.person_id.name
            } : null
        });
    } catch (error) {
        console.error('Pipedrive deal fetch error:', error);
        return NextResponse.json({ error: 'Failed to fetch deal details' }, { status: 500 });
    }
}
