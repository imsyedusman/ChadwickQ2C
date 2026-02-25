const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("Seeding CHD-WIRING-DIGITAL...");

    // Check if it exists
    const existing = await prisma.catalogItem.findFirst({
        where: { partNumber: 'CHD-WIRING-DIGITAL' }
    });

    if (!existing) {
        await prisma.catalogItem.create({
            data: {
                brand: 'Generic',
                category: 'Switchboard',
                subcategory: 'Wiring',
                partNumber: 'CHD-WIRING-DIGITAL',
                description: 'Digital Meter Wiring Allowance',
                defaultQuantity: 1,
                labourHours: 0.5,
                unitPrice: 15.00
            }
        });
        console.log("Successfully seeded CHD-WIRING-DIGITAL");
    } else {
        console.log("Already exists.");
    }
}

main().finally(() => prisma.$disconnect());
