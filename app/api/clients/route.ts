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
        const search = searchParams.get('search') || '';

        const clients = await (prisma as any).client.findMany({
            where: {
                name: { contains: search, mode: 'insensitive' }
            },
            take: 10,
            orderBy: { name: 'asc' }
        });

        return NextResponse.json({ clients });
    } catch (error) {
        console.error('Failed to fetch clients:', error);
        return NextResponse.json({ error: 'Failed to fetch clients' }, { status: 500 });
    }
}
