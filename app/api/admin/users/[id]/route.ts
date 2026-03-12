import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import bcrypt from 'bcryptjs';
import { logAction } from '@/lib/audit';

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const session = await getServerSession(authOptions);
        if (!session || !(await hasPermission('users:manage'))) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const body = await request.json();
        const { name, email, password, roleId, status } = body;

        const updateData: any = {};
        if (name !== undefined) updateData.name = name;
        if (email !== undefined) updateData.email = email;
        if (roleId !== undefined) updateData.roleId = roleId;
        if (status !== undefined) updateData.status = status;
        if (password) {
            updateData.password = await bcrypt.hash(password, 12);
        }

        const updatedUser = await (prisma.user as any).update({
            where: { id },
            data: updateData,
            include: { role: true }
        });

        await logAction(session.user?.id, 'USER_UPDATE', 'USER', id, { updatedFields: Object.keys(updateData) });

        const { password: _, ...sanitized } = updatedUser;
        return NextResponse.json(sanitized);
    } catch (error) {
        console.error('Failed to update user:', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const session = await getServerSession(authOptions);
        if (!session || !(await hasPermission('users:manage'))) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        // We usually don't delete users, we DISABLE them.
        // But if explicitly requested:
        await (prisma.user as any).update({
            where: { id },
            data: { status: 'DISABLED' }
        });

        await logAction(session.user?.id, 'USER_DISABLE', 'USER', id);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to disable user:', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
