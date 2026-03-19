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
        const searchInput = searchParams.get('search')?.trim() || '';
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

        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '25');
        const skip = (page - 1) * limit;

        const where = searchInput ? {
            OR: [
                { projectName: { contains: searchInput, mode: 'insensitive' } },
                { clientName: { contains: searchInput, mode: 'insensitive' } },
                { companyName: { contains: searchInput, mode: 'insensitive' } },
                { projectReference: { contains: searchInput, mode: 'insensitive' } },
                {
                    client: {
                        name: { contains: searchInput, mode: 'insensitive' }
                    }
                },
                {
                    contact: {
                        name: { contains: searchInput, mode: 'insensitive' }
                    }
                }
            ]
        } : {};

        // Get total count for filtered results
        const total = await (prisma as any).project.count({ where });

        const projects = await (prisma as any).project.findMany({
            where,
            include: {
                client: {
                    select: { name: true }
                },
                contact: {
                    select: { name: true }
                },
                _count: {
                    select: { quotes: true }
                }
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
        });

        return NextResponse.json({
            projects,
            total,
            page,
            totalPages: Math.ceil(total / limit)
        });
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
