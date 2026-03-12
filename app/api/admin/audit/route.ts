import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !(await hasPermission('admin:audit_view'))) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const logs = await (prisma as any).auditLog.findMany({
            take: 100,
            orderBy: { createdAt: 'desc' },
            include: {
                user: {
                    select: {
                        name: true,
                        email: true,
                        role: { select: { name: true } }
                    }
                }
            }
        });

        return NextResponse.json(logs);
    } catch (error) {
        console.error('Failed to fetch audit logs:', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
