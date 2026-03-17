const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const parts = ['CHD-WIRING-DIGITAL', 'IPD-WIRING-DIGITAL'];
    for (const p of parts) {
        const item = await prisma.catalogItem.findUnique({ where: { partNumber: p } });
        console.log(`${p}: ${item ? 'EXISTS' : 'MISSING'}`);
        if (item) console.log(`  Desc: ${item.description}`);
    }
}
main().catch(console.error).finally(() => prisma.$disconnect());
