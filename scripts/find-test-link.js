const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("Searching catalog for 'Test Links'...");
    const items = await prisma.catalogItem.findMany({
        where: {
            description: {
                contains: 'Test Links',
            }
        }
    });

    console.log("Found:", items);
}

main().finally(() => prisma.$disconnect());
