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
            console.log(`[API GET Projects] Duplicate check for: "${checkProjectName}" / "${checkClientName}"`);
            const existing = await (prisma as any).project.findFirst({
                where: {
                    projectName: { equals: checkProjectName, mode: 'insensitive' },
                    clientName: { equals: checkClientName, mode: 'insensitive' }
                }
            });
            return NextResponse.json({ exists: !!existing, project: existing });
        }
        
        console.log(`[API GET Projects] Request started. Input: "${searchInput}"`);

        // Check total in DB for baseline
        const baseCount = await (prisma as any).project.count();
        console.log(`[API GET Projects] Total projects in DB baseline: ${baseCount}`);

        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '25');
        const skip = (page - 1) * limit;

        // Build a robust OR condition using ONLY base fields for Phase 1
        const conditions: any[] = [];
        
        if (searchInput) {
            // Case-sensitive/partial matching on primary strings
            conditions.push({ projectName: { contains: searchInput, mode: 'insensitive' } });
            conditions.push({ clientName: { contains: searchInput, mode: 'insensitive' } });
            conditions.push({ companyName: { contains: searchInput, mode: 'insensitive' } });
            conditions.push({ projectReference: { contains: searchInput, mode: 'insensitive' } });

            // Safe integer search for Pipedrive Deal ID (avoids 500 on string "contains")
            const isNumeric = /^\d+$/.test(searchInput);
            if (isNumeric) {
                const dealId = parseInt(searchInput);
                conditions.push({ pipedrive_deal_id: dealId });
                console.log(`[API GET Projects] Search input is numeric. Including pipedrive_deal_id: ${dealId}`);
            }
        }

        const where = conditions.length > 0 ? { OR: conditions } : {};
        console.log(`[API GET Projects] Search conditions generated:`, JSON.stringify(where, null, 2));

        // Get total count for filtered results
        const total = await (prisma as any).project.count({ where });
        console.log(`[API GET Projects] Filtered total count: ${total}`);

        const projects = await (prisma as any).project.findMany({
            where,
            include: {
                client: {
                    select: { id: true, name: true, source: true, pipedrive_org_id: true }
                },
                contact: {
                    select: { id: true, name: true, source: true, pipedrive_person_id: true }
                },
                _count: {
                    select: { quotes: true }
                }
            },
            orderBy: { updatedAt: 'desc' },
            skip,
            take: limit,
        });

        console.log(`[API GET Projects] Returning ${projects.length} projects on page ${page}`);

        return NextResponse.json({
            projects,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        });
    } catch (error: any) {
        console.error('[API GET Projects] CRITICAL ERROR:', error);
        return NextResponse.json({ 
            error: 'Failed to fetch projects', 
            details: error.message || 'Unknown error',
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }, { status: 500 });
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

export async function DELETE(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { ids } = body;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return NextResponse.json({ error: 'No IDs provided' }, { status: 400 });
        }

        console.log(`[API DELETE Projects] Bulk delete request for ${ids.length} projects`);

        await (prisma as any).project.deleteMany({
            where: {
                id: { in: ids }
            }
        });

        return NextResponse.json({ success: true, count: ids.length });
    } catch (error: any) {
        console.error('[API DELETE Projects] Bulk delete error:', error);
        return NextResponse.json({ 
            error: 'Failed to delete projects', 
            details: error.message 
        }, { status: 500 });
    }
}
