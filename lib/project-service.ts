import prisma from '@/lib/prisma';

export async function searchProjects(params: { query: string }) {
    const { query } = params;
    const search = query.trim();

    if (!search) {
        return [];
    }

    const projects = await (prisma as any).project.findMany({
        where: {
            OR: [
                { projectName: { contains: search, mode: 'insensitive' } },
                { companyName: { contains: search, mode: 'insensitive' } },
                { clientName: { contains: search, mode: 'insensitive' } },
                { projectReference: { contains: search, mode: 'insensitive' } },
            ]
        },
        select: {
            id: true,
            projectName: true,
            companyName: true,
            clientName: true,
            projectReference: true,
            projectStatus: true,
            _count: {
                select: { quotes: true }
            }
        },
        take: 15
    });

    return projects;
}
