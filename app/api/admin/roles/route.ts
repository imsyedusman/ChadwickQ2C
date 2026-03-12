import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !(await hasPermission('users:manage'))) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const roles = await (prisma.role as any).findMany({
            orderBy: { name: 'asc' },
        });

        return NextResponse.json(roles);
    } catch (error) {
        console.error('Failed to fetch roles:', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
