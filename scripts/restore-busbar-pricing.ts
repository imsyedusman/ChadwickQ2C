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
    console.log('🔄 Restoring Busbar Copper Pricing Metadata...');

    let updatedCount = 0;
    const entries = Object.entries(copperWeights);

    for (const [partNumber, weight] of entries) {
        const result = await prisma.catalogItem.updateMany({
            where: {
                partNumber: { equals: partNumber, mode: 'insensitive' }
            },
            data: {
                isCopperPriced: true,
                totalCopperWeightKgPerMeter: weight
            }
        });
        if (result.count > 0) {
            console.log(`✅ Updated ${partNumber}: ${result.count} items`);
            updatedCount += result.count;
        }
    }

    console.log(`\n✨ Finished. Total items updated: ${updatedCount}`);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
