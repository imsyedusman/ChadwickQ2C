const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Re-implementing the core logic we are testing for the log outputs
async function runLogTest() {
    console.log("Mocking existing items...");

    // We mock existingItems based on what the board-item-service sees
    const existingItems = [
        { name: '1A-TIERS', quantity: 1, systemTag: null },
        { name: 'A9MEM3155', quantity: 1, systemTag: null } // Manually added digital meter
    ];

    const DIGITAL_METER_PARTS = [
        'A9MEM3155', 'A9MEM3355', 'A9MEM3255', 'METSEPM3250', 'METSEPM5110',
        'METSEPM5350', 'METSEPM5560', 'METSEPM8240', 'EM2172RVV53XOSX',
        'EM24DINAV93XISX', 'EM24DINAV53DISX', 'MF72421', 'NEMO96HD1000',
        'NEMO96HD1300', 'EM27072DMV53X2SN', '48250402', '48250500', '48250501'
    ];

    const CT_PARTS = [
        'TAS127B40005A', 'TAS127B30005A', 'TAS102H25005A', 'TAS102H20005A',
        'TAS6512005A', 'TAS6510005A', 'TAS656005A', 'TAIBB405A'
    ];

    console.log('\n--- DIGITAL METER SYNC STARTED ---');
    console.log('DIGITAL_METER_PARTS length:', DIGITAL_METER_PARTS.length);
    console.log('existingItems length:', existingItems.length);
    console.log('existingItems contents:', existingItems.map(i => `${i.name} (sysTag: ${i.systemTag}, qty: ${Number(i.quantity)})`));

    // Extract `totalMeters` strictly excluding composite children
    let totalMeters = 0;
    for (const item of existingItems) {
        if (DIGITAL_METER_PARTS.includes(item.name) && item.systemTag !== 'COMPOSITE') {
            totalMeters += Number(item.quantity) || 0;
            console.log(`Matched meter: ${item.name}`);
        }
    }

    console.log('totalMeters found:', totalMeters);

}

runLogTest().catch(console.error);
