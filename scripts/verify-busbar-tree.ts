import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Fetching Busbar category tree...');

    const subcats = await prisma.catalogItem.findMany({
        where: {
            category: 'Busbar',
            subcategory: { not: null }
        },
        select: {
            subcategory: true
        },
        distinct: ['subcategory'],
        orderBy: {
            subcategory: 'asc'
        }
    });

    const subcategoryStrings = subcats.map(s => s.subcategory).filter(Boolean) as string[];
    console.log('Raw Subcategories:', subcategoryStrings);

    // Simulate UI logic
    const l1 = new Set<string>();
    const l2 = new Set<string>();

    const selectedL1 = "Main Bars - labour and copper";

    subcategoryStrings.forEach(sub => {
        const parts = sub.split(' > ').map(s => s.trim()).filter(Boolean);
        if (parts.length > 0) l1.add(parts[0]);

        if (parts[0] === selectedL1 && parts.length > 1) {
            l2.add(parts[1]);
        }
    });

    console.log('L1 Categories:', Array.from(l1));
    console.log(`L2 Categories for "${selectedL1}":`, Array.from(l2));

    if (l2.has('Custom Busbar') && l2.has('Cubic Busbars')) {
        console.log('SUCCESS: Expected subcategories found.');
    } else {
        console.error('FAILURE: Missing expected subcategories.');
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
