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

        const contacts = await (prisma as any).contact.findMany({
            where: {
                name: { contains: search, mode: 'insensitive' }
            },
            take: 10,
            orderBy: { name: 'asc' }
        });

        return NextResponse.json({ contacts });
    } catch (error) {
        console.error('Failed to fetch contacts:', error);
        return NextResponse.json({ error: 'Failed to fetch contacts' }, { status: 500 });
    }
}
