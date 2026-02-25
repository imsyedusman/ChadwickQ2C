const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("Fixing Test Links part number...");

    // Find the item
    const item = await prisma.catalogItem.findFirst({
        where: {
            description: 'Test Links (per set)',
            brand: 'NHP',
        }
    });

    if (item && !item.partNumber) {
        console.log(`Found item ID ${item.id}. Updating partNumber to 'NHP-TEST-LINK'...`);
        await prisma.catalogItem.update({
            where: { id: item.id },
            data: { partNumber: 'NHP-TEST-LINK' }
        });
        console.log("Update complete.");
    } else if (item) {
        console.log(`Item found but partNumber is already '${item.partNumber}'`);
    } else {
        console.log("Test Links item not found.");
    }
}

main().finally(() => prisma.$disconnect());
