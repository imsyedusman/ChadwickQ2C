const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const parts = ['CHD-FUSE-20A-DIN', 'IPD-WIRING-DIGITAL', 'CHD-WIRING-DIGITAL'];
    for (const p of parts) {
        const item = await prisma.catalogItem.findUnique({ where: { partNumber: p } });
        console.log(`${p}: ${item ? 'EXISTS' : 'MISSING'}`);
    }
}
main().catch(console.error).finally(() => prisma.$disconnect());
