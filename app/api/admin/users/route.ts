import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import bcrypt from 'bcryptjs';
import { logAction } from '@/lib/audit';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !(await hasPermission('users:manage'))) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const users = await (prisma.user as any).findMany({
            include: {
                role: true,
            },
            orderBy: { createdAt: 'desc' },
        });

        // Remove passwords from response
        const sanitizedUsers = users.map((user: any) => {
            const { password, ...rest } = user;
            return rest;
        });

        return NextResponse.json(sanitizedUsers);
    } catch (error) {
        console.error('Failed to fetch users:', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !(await hasPermission('users:manage'))) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const body = await request.json();
        const { email, password, name, roleId } = body;

        if (!email || !password || !roleId) {
            return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
        }

        const existing = await (prisma.user as any).findUnique({ where: { email } });
        if (existing) {
            return NextResponse.json({ error: 'User already exists' }, { status: 400 });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const newUser = await (prisma.user as any).create({
            data: {
                email,
                name,
                password: hashedPassword,
                roleId,
                status: 'ACTIVE',
            },
            include: { role: true }
        });

        await logAction(session.user?.id, 'USER_CREATE', 'USER', newUser.id, { email });

        const { password: _, ...sanitized } = newUser;
        return NextResponse.json(sanitized);
    } catch (error) {
        console.error('Failed to create user:', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
