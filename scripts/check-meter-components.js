const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const item = await prisma.catalogItem.findUnique({ where: { partNumber: 'METSEPM3250' } });
    console.log(`METSEPM3250 Components: ${JSON.stringify(item.components, null, 2)}`);
}
main().catch(console.error).finally(() => prisma.$disconnect());
