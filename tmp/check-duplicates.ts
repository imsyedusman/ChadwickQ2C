import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

async function checkDuplicates() {
    try {
        const duplicates = await prisma.project.groupBy({
            by: ['projectName', 'clientName'],
            _count: {
                id: true,
            },
            having: {
                id: {
                    _count: {
                        gt: 1,
                    },
                },
            },
        });

        let output = 'Duplicate Projects (projectName + clientName):\n';
        output += JSON.stringify(duplicates, null, 2) + '\n\n';

        if (duplicates.length > 0) {
            for (const dup of duplicates) {
                const projects = await prisma.project.findMany({
                    where: {
                        projectName: dup.projectName,
                        clientName: dup.clientName,
                    },
                    select: {
                        id: true,
                        projectName: true,
                        clientName: true,
                        createdAt: true,
                    },
                });
                output += `Details for ${dup.projectName} / ${dup.clientName}:\n`;
                output += JSON.stringify(projects, null, 2) + '\n\n';
            }
        }
        fs.writeFileSync('tmp/dup-results.txt', output);
        console.log('Results written to tmp/dup-results.txt');
    } catch (error) {
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}

checkDuplicates();
