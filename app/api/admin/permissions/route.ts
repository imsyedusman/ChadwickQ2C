import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !(await hasPermission('admin:permissions_view'))) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const roles = await (prisma as any).role.findMany({
            include: {
                permissions: true,
            }
        });

        // Group permissions by category for the UI
        const categories = {
            'Quotes': ['quotes:view', 'quotes:create', 'quotes:edit', 'quotes:delete', 'quotes:share'],
            'Catalog': ['catalog:view', 'catalog:edit'],
            'User Management': ['users:manage'],
            'Administration': ['admin:view_analytics', 'admin:audit_view', 'admin:permissions_view'],
            'System': ['settings:manage']
        };

        return NextResponse.json({
            roles,
            categories
        });
    } catch (error) {
        console.error('Failed to fetch permissions:', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
