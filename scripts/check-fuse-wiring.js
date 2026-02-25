const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("Checking DB for CHD-FUSE-20A-DIN & CHD-WIRING-DIGITAL");
    const items = await prisma.catalogItem.findMany({
        where: {
            partNumber: { in: ['CHD-FUSE-20A-DIN', 'CHD-WIRING-DIGITAL'] }
        }
    });
    console.log("Found:", items.map(i => i.partNumber));
}

main().finally(() => prisma.$disconnect());
