const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    const parts = [
        'METSEPM3250',
        'TAIBB405A',
        'CHD-FUSE-20A-DIN',
        'IPD-WIRING-DIGITAL',
        'CHD-WIRING-DIGITAL',
        'NHP-TEST-LINK'
    ];

    console.log('--- Catalog Check ---');
    for (const part of parts) {
        const item = await prisma.catalogItem.findUnique({
            where: { partNumber: part }
        });
        if (item) {
            console.log(`[FOUND] ${part}: ${item.description} (Category: ${item.category}, Subcategory: ${item.subcategory})`);
            if (item.components) {
                console.log(`  Components: ${JSON.stringify(item.components, null, 2)}`);
            }
        } else {
            console.log(`[MISSING] ${part}`);
        }
    }

    console.log('\n--- Digital Meter Components (Searching for any Digital Meter) ---');
    const dmParts = [
        'A9MEM3155', 'A9MEM3355', 'A9MEM3255', 'METSEPM3250', 'METSEPM5110',
        'METSEPM5350', 'METSEPM5560', 'METSEPM8240', 'EM2172RVV53XOSX',
        'EM24DINAV93XISX', 'EM24DINAV53DISX', 'MF72421', 'NEMO96HD1000',
        'NEMO96HD1300', 'EM27072DMV53X2SN', '48250402', '48250403', '48250500', '48250501'
    ];
    
    for (const dm of dmParts) {
         const item = await prisma.catalogItem.findUnique({
            where: { partNumber: dm }
        });
        if (item && item.components) {
             console.log(`[DM] ${dm} has components: ${JSON.stringify(item.components, null, 2)}`);
        }
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
