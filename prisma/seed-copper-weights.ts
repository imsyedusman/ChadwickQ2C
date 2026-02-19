import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// EXACT Mapping: Part Number -> Total Copper Weight (kg/m)
const copperWeights: Record<string, number> = {
    // Custom Busbars (BB-)
    "BB-3000A": 112,
    "BB-2500A": 87.5,
    "BB-2000A": 70,
    "BB-1600A": 46,
    "BB-1250A": 35,
    "BB-1000A": 22.5,
    "BB-800A": 18,
    "BB-630A": 11,
    "BB-400A": 7,

    // Cubic Busbars (BBC-)
    "BBC-4000A": 112,
    "BBC-3600A": 105,
    "BBC-2800A": 70,
    "BBC-2250A": 56,
    "BBC-1800A": 42,
    "BBC-1600A": 35,
    "BBC-1350A": 28,
    "BBC-1100A": 21,
    "BBC-800A-2": 14,
    "BBC-400A-2": 7,

    // MCCB Tee Off Bars
    "MCCB-250A": 3,
    "MCCB-400A": 4,
    "MCCB-630A": 8,
    "MCCB-800A": 14,
    "MCCB-1000A": 18,
    "MCCB-1250A": 26,
    "MCCB-1600A": 36
};

async function main() {
    console.log('🌱 Seeding Copper Weights (Strict Mode)...');

    // 1. Validate Mapping Exists in DB
    const updates = Object.entries(copperWeights);
    const missingParts: string[] = [];

    // Pre-fetch all catalog items to check existence efficiently
    const allCatalogItems = await prisma.catalogItem.findMany({
        select: { id: true, partNumber: true, isCopperPriced: true }
    });

    // Create lookup
    const catalogMap = new Map<string, { id: string, isCopperPriced: boolean }>();
    allCatalogItems.forEach(item => {
        if (item.partNumber) catalogMap.set(item.partNumber, item);
    });

    // Check for missing items in DB corresponding to our map
    for (const [partNumber] of updates) {
        if (!catalogMap.has(partNumber)) {
            missingParts.push(partNumber);
        }
    }

    if (missingParts.length > 0) {
        console.error(`❌ CRITICAL ERROR: The following required busbars are missing in the Catalog DB:`);
        missingParts.forEach(p => console.error(`   - ${p}`));
        throw new Error('Seed Aborted: Missing required parts in database.');
    }

    // 2. Execute Updates
    console.log(`Processing ${updates.length} items...`);

    for (const [partNumber, weight] of updates) {
        await prisma.catalogItem.updateMany({
            where: { partNumber },
            data: {
                totalCopperWeightKgPerMeter: weight,
                isCopperPriced: true
            }
        });
    }

    // 3. Reverse Check: Ensure no items are isCopperPriced but NOT in our map
    // (Cleanup of potential previous bad seeds or drift)
    const validPartNumbers = new Set(Object.keys(copperWeights));

    // Re-fetch or check logic? We need to find items where isCopperPriced=true but partNumber NOT IN keys
    const invalidItems = await prisma.catalogItem.findMany({
        where: {
            isCopperPriced: true,
            partNumber: { notIn: Array.from(validPartNumbers) }
        }
    });

    if (invalidItems.length > 0) {
        console.error(`❌ CRITICAL ERROR: Found ${invalidItems.length} items marked as 'isCopperPriced' but NOT in the authorized mapping.`);
        invalidItems.forEach(i => console.error(`   - ${i.partNumber} (${i.description})`));
        throw new Error('Seed Aborted: Database contains unmapped copper-priced items. Please review/cleanup manually or update mapping.');
    }

    console.log(`✅ Update Complete.`);
    console.log(`   - Verified & Updated: ${updates.length} items`);
    console.log(`   - Verified Strict Consistency: OK`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
