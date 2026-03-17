const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const p = 'IPD-WIRING-DIGITAL';
    const item = await prisma.catalogItem.findUnique({ where: { partNumber: p } });
    if (item) {
        console.log(`[FOUND] ${p}: ${item.description} ($${item.unitPrice})`);
    } else {
        console.log(`[MISSING] ${p}. Seeding now...`);
        await prisma.catalogItem.create({
            data: {
                brand: 'IPD',
                category: 'Switchboard',
                subcategory: 'Wiring',
                partNumber: p,
                description: 'Digital Meter Wiring Allowance',
                unitPrice: 31.50,
                labourHours: 0.5,
                isAutoAdd: false
            }
        });
        console.log(`[SEEDED] ${p}`);
    }
}
main().catch(console.error).finally(() => prisma.$disconnect());
