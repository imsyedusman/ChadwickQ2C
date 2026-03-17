const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const items = await prisma.catalogItem.findMany({
        where: { partNumber: { in: ['CHD-WIRING-DIGITAL', 'IPD-WIRING-DIGITAL'] } }
    });
    console.log(JSON.stringify(items, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
