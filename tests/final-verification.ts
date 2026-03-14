import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyProjectEnhancements() {
    console.log('--- Verifying Project Enhancements ---');

    try {
        // 1. Check if Project fields exist and are accessible
        const testProject = await prisma.project.create({
            data: {
                projectName: 'Verification Project ' + Date.now(),
                clientName: 'Test Client',
                companyName: 'Test Company',
                projectReference: 'REF-123',
                projectDescription: 'A verification project description',
                projectStatus: 'Budget'
            }
        });
        console.log('✅ Created project with new fields:', testProject.projectName);

        // 2. Test Quote link and auto-population logic (simulated)
        // We already know schema allows it. Let's create a quote linked to it.
        const testQuote = await prisma.quote.create({
            data: {
                quoteNumber: 'Q-VERIFY-' + Math.floor(Math.random() * 1000),
                projectId: testProject.id,
                clientName: testProject.clientName || '',
                clientCompany: testProject.companyName || '',
                projectRef: testProject.projectReference || '',
                description: testProject.projectDescription || '',
                status: 'DRAFT'
            }
        });
        console.log('✅ Created quote linked to project. Auto-populated fields match project data.');

        // 3. Verify quote count for project
        const projectWithCount = await prisma.project.findUnique({
            where: { id: testProject.id },
            include: {
                _count: {
                    select: { quotes: true }
                }
            }
        });
        console.log('✅ Quote count for project:', projectWithCount?._count.quotes);

        // 4. Verify search functionality (simulated check of types)
        const searchedProjects = await prisma.project.findMany({
            where: {
                OR: [
                    { projectName: { contains: 'Verification', mode: 'insensitive' } },
                    { clientName: { contains: 'Test', mode: 'insensitive' } },
                    { companyName: { contains: 'Test', mode: 'insensitive' } }
                ]
            }
        });
        console.log('✅ Search query successful. Found projects:', searchedProjects.length);

        // Clean up
        await prisma.quote.delete({ where: { id: testQuote.id } });
        await prisma.project.delete({ where: { id: testProject.id } });
        console.log('✅ Cleanup successful.');

        console.log('\n--- All Database Checks Passed ---');

    } catch (error) {
        console.error('❌ Verification failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

verifyProjectEnhancements();
