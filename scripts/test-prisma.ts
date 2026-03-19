
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Prisma Diagnostic ---');
    try {
        const projectCount = await prisma.project.count();
        console.log('Project Count:', projectCount);

        const project = await prisma.project.findFirst({
            include: {
                quotes: true,
                // Check if new relations exist in the client
                client: true,
                contact: true
            } as any
        });

        if (project) {
            console.log('First Project found:', project.id, project.projectName);
            console.log('Client Relation:', project.client ? 'Exists' : 'Null');
            console.log('Contact Relation:', project.contact ? 'Exists' : 'Null');
            console.log('Quotes count:', project.quotes?.length || 0);
        } else {
            console.log('No projects found');
        }

    } catch (error) {
        console.error('Prisma Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
