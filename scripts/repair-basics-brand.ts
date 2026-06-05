import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("Starting Basics repair script...");

    // Update all items where category is 'Basics' (or 'Busbar' if they are basics) and brand is currently null
    const result = await prisma.catalogItem.updateMany({
        where: {
            category: 'Basics',
            OR: [
                { brand: null },
                { brand: '' }
            ]
        },
        data: {
            brand: 'Internal'
        }
    });

    console.log(`Repair complete. Successfully updated ${result.count} existing Basics records to use the 'Internal' brand.`);
}

main()
    .catch((e) => {
        console.error("Error during repair:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
