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
        const checkProjectName = searchParams.get('checkName');
        const checkClientName = searchParams.get('checkClient');

        if (checkProjectName && checkClientName) {
            const existing = await (prisma as any).project.findFirst({
                where: {
                    projectName: { equals: checkProjectName, mode: 'insensitive' },
                    clientName: { equals: checkClientName, mode: 'insensitive' }
                }
            });
            return NextResponse.json({ exists: !!existing, project: existing });
        }

        const where = search ? {
            OR: [
                { projectName: { contains: search, mode: 'insensitive' } },
                { clientName: { contains: search, mode: 'insensitive' } },
                { companyName: { contains: search, mode: 'insensitive' } },
            ]
        } : {};

        const projects = await (prisma as any).project.findMany({
            where,
            select: {
                id: true,
                projectName: true,
                clientName: true,
                companyName: true,
                projectReference: true,
                projectDescription: true,
                projectStatus: true,
                createdAt: true,
                _count: {
                    select: { quotes: true }
                }
            },
            orderBy: { projectName: 'asc' },
            take: 20,
        });

        return NextResponse.json(projects);
    } catch (error) {
        console.error('Failed to fetch projects:', error);
        return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { projectName, clientName, companyName, projectReference, projectDescription, projectStatus } = body;

        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!projectName) {
            return NextResponse.json({ error: 'Project Name is required' }, { status: 400 });
        }

        const newProject = await (prisma as any).project.create({
            data: {
                projectName,
                clientName,
                companyName,
                projectReference,
                projectDescription,
                projectStatus: projectStatus || 'Budget',
            },
        });

        return NextResponse.json(newProject);
    } catch (error) {
        console.error('Failed to create project:', error);
        return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
    }
}
