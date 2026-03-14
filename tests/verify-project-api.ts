import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Starting Project API Verification ---');

    // 1. Create a Project
    console.log('\n1. Creating a new test project...');
    const project = await prisma.project.create({
        data: {
            projectName: 'Verification Project',
            clientName: 'Test Client',
            projectStatus: 'Budget',
        }
    });
    console.log('Created project:', project);

    // 2. Create multiple Quotes linked to the same Project
    console.log('\n2. Creating multiple quotes linked to the same project...');
    const quote1 = await prisma.quote.create({
        data: {
            quoteNumber: `QVER-${Math.floor(Math.random() * 9000) + 1000}`,
            description: 'Revision A',
            clientName: 'Test Client',
            projectRef: 'Verification Project',
            projectId: project.id,
            revision: 0,
        }
    });
    const quote2 = await prisma.quote.create({
        data: {
            quoteNumber: quote1.quoteNumber,
            description: 'Revision B',
            clientName: 'Test Client',
            projectRef: 'Verification Project',
            projectId: project.id,
            revision: 1,
        }
    });
    console.log('Created quote 1:', { id: quote1.id, num: quote1.quoteNumber, rev: quote1.revision });
    console.log('Created quote 2:', { id: quote2.id, num: quote2.quoteNumber, rev: quote2.revision });

    // 3. Create another Quote with a new project
    console.log('\n3. Creating a quote with another new project...');
    const project2 = await prisma.project.create({
        data: {
            projectName: 'Direct New Project',
            clientName: 'New Client',
            projectStatus: 'Tender',
        }
    });
    const quote3 = await prisma.quote.create({
        data: {
            quoteNumber: `QVER-${Math.floor(Math.random() * 9000) + 1000}`,
            description: 'New Project Quote',
            clientName: 'New Client',
            projectRef: 'Direct New Project',
            projectId: project2.id,
        }
    });
    console.log('Created quote 3 linked to project 2:', { id: quote3.id, num: quote3.quoteNumber });

    // 4. Verify relations and retrieval
    console.log('\n4. Verifying relations via findMany with include...');
    const quotes = await prisma.quote.findMany({
        where: {
            projectId: { in: [project.id, project2.id] }
        },
        include: {
            project: true
        }
    });

    console.log(`Found ${quotes.length} test quotes.`);
    quotes.forEach(q => {
        console.log(`- Quote ${q.quoteNumber} (Rev ${q.revision}): Project = ${q.project?.projectName}, Project Status = ${q.project?.projectStatus}`);
    });

    // Validations
    const q1Matches = quotes.filter(q => q.projectId === project.id);
    const q2Matches = quotes.filter(q => q.projectId === project2.id);

    if (q1Matches.length === 2 && q2Matches.length === 1) {
        console.log('\n✅ Verification successful! Multiple quotes correctly linked to projects.');
    } else {
        console.error('\n❌ Verification failed! Linkages not as expected.');
        process.exit(1);
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
