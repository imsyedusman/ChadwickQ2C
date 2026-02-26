import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function sanitize(text: string): string {
    if (!text) return '';
    return text
        .replace(/[^a-zA-Z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .toUpperCase();
}

async function main() {
    console.log('Starting internal part number assignment...');

    const items = await prisma.catalogItem.findMany({
        where: {
            OR: [
                { partNumber: null },
                { partNumber: '' },
                { partNumber: '-' }
            ]
        },
        orderBy: { createdAt: 'asc' }
    });

    if (items.length === 0) {
        console.log('No items need part numbers assigned.');
        return;
    }

    console.log(`Found ${items.length} items without a valid part number. Processing...`);

    // Fetch all existing part numbers to ensure uniqueness globally
    const existingParts = await prisma.catalogItem.findMany({
        where: {
            partNumber: {
                notIn: ['', '-'] // We are ignoring nulls by using 'findMany' where partNumber is defined, but excluding the ones we might replace
            },
            AND: {
                partNumber: { not: null }
            }
        },
        select: { partNumber: true }
    });

    const partNumberSet = new Set(existingParts.map(p => p.partNumber));
    let updatedCount = 0;

    for (const item of items) {
        let newPartNumber = '';

        if (item.description) {
            // 1. Prefer meaningful code based on description
            const sanitized = sanitize(item.description);
            let candidate = `INT-${sanitized}`;

            // 2. Ensure generated part numbers are unique
            let counter = 1;
            while (partNumberSet.has(candidate)) {
                candidate = `INT-${sanitized}-${counter}`;
                counter++;
            }
            newPartNumber = candidate;
        } else {
            // 3. Fallback only if necessary
            newPartNumber = `INT-${item.id.toUpperCase()}`;
        }

        // Add to set to prevent conflicts with subsequent items in this run
        partNumberSet.add(newPartNumber);

        try {
            await prisma.catalogItem.update({
                where: { id: item.id },
                data: { partNumber: newPartNumber }
            });

            console.log(`Updated ID: ${item.id} | Old NP: "${item.partNumber}" -> New NP: "${newPartNumber}"`);
            updatedCount++;
        } catch (error) {
            console.error(`Failed to update ID: ${item.id}`, error);
        }
    }

    console.log(`\n--- Assignment Summary ---`);
    console.log(`Successfully assigned part numbers to ${updatedCount} items.`);
}

main()
    .catch((e) => {
        console.error('Error running script:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
