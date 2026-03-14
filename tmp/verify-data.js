const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const statuses = await prisma.quote.groupBy({
            by: ['status'],
            _count: true
        });
        console.log('Quote Statuses:', JSON.stringify(statuses, null, 2));

        const projectStatuses = await prisma.project.groupBy({
            by: ['projectStatus'],
            _count: true
        });
        console.log('Project Statuses:', JSON.stringify(projectStatuses, null, 2));

    } catch (e) {
        console.error('Error in debug script:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
