import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const miscellaneousItems = [
    // Fuses
    {
        partNumber: 'CHD-FUSE-20A-DIN',
        description: 'Fuse and cartridge - 20A (DIN)',
        labourHours: 0.1,
        unitPrice: 3.70,
        subcategory: 'Miscellaneous > Fuses'
    },
    // General Control
    {
        partNumber: 'CHD-GC-EM-LIGHT-KIT',
        description: 'Emergency lighting test kit',
        labourHours: 0.35,
        unitPrice: 160.00,
        subcategory: 'Miscellaneous > General Control'
    },
    {
        partNumber: 'CHD-GC-4NC-CONTACTOR',
        description: 'Additional 4NC Contactors',
        labourHours: 0.75,
        unitPrice: 45.00,
        subcategory: 'Miscellaneous > General Control'
    },
    {
        partNumber: 'CHD-GC-LIGHT-CONTACTOR-23A',
        description: 'Lighting contactor - 23A AC3',
        labourHours: 0.75,
        unitPrice: 45.00,
        subcategory: 'Miscellaneous > General Control'
    },
    {
        partNumber: 'CHD-GC-TIME-1CH',
        description: 'Time switch - 1 channel',
        labourHours: 0.5,
        unitPrice: 65.00,
        subcategory: 'Miscellaneous > General Control'
    },
    {
        partNumber: 'CHD-GC-TIME-2CH',
        description: 'Time switch - 2 channel',
        labourHours: 0.75,
        unitPrice: 65.00,
        subcategory: 'Miscellaneous > General Control'
    },
    {
        partNumber: 'CHD-GC-TIME-4CH',
        description: 'Time switch - 4 channel',
        labourHours: 1,
        unitPrice: 520.00,
        subcategory: 'Miscellaneous > General Control'
    },
    {
        partNumber: 'CHD-GC-PE-PROVISION',
        description: 'Provision for P.E. cell',
        labourHours: 0.5,
        unitPrice: 7.50,
        subcategory: 'Miscellaneous > General Control'
    },
    {
        partNumber: 'CHD-GC-BYPASS',
        description: 'By-pass switch',
        labourHours: 0.5,
        unitPrice: 25.00,
        subcategory: 'Miscellaneous > General Control'
    },
    {
        partNumber: 'CHD-GC-RELAY-4P',
        description: 'Relay - four pole',
        labourHours: 0.1,
        unitPrice: 10.50,
        subcategory: 'Miscellaneous > General Control'
    },
    {
        partNumber: 'CHD-GC-PFR',
        description: 'PFR',
        labourHours: 0.75,
        unitPrice: 110.00,
        subcategory: 'Miscellaneous > General Control'
    },
    {
        partNumber: 'CHD-GC-LED-IND',
        description: 'LED indicating lights (each)',
        labourHours: 0.3,
        unitPrice: 16.60,
        subcategory: 'Miscellaneous > General Control'
    },
    // Wiring
    {
        partNumber: 'CHD-WIRING-CONTROL',
        description: 'Additional Control wiring (per wire)',
        labourHours: 0.125,
        unitPrice: 1.50,
        subcategory: 'Miscellaneous > Wiring'
    },
    // Power Cable
    {
        partNumber: 'CHD-CABLE-3P-63A',
        description: '3-Phase Cable set per metre - 63A',
        labourHours: 2,
        unitPrice: 20.00,
        subcategory: 'Miscellaneous > Power Cable'
    },
    {
        partNumber: 'CHD-CABLE-3P-160A',
        description: '3-Phase Cable set per metre - 160A',
        labourHours: 2,
        unitPrice: 40.00,
        subcategory: 'Miscellaneous > Power Cable'
    },
    {
        partNumber: 'CHD-CABLE-3P-200A',
        description: '3-Phase Cable set per metre - 200A',
        labourHours: 3,
        unitPrice: 60.00,
        subcategory: 'Miscellaneous > Power Cable'
    },
    // Fault Current Limiters
    {
        partNumber: 'CHD-FCL-160A',
        description: '160A FCL\'s + Line / Load cables',
        labourHours: 3,
        unitPrice: 115.00,
        subcategory: 'Miscellaneous > Fault Current Limiters'
    },
    {
        partNumber: 'CHD-FCL-200A',
        description: '200A FCL\'s + Line / Load cables',
        labourHours: 3,
        unitPrice: 175.00,
        subcategory: 'Miscellaneous > Fault Current Limiters'
    },
    // General Control > Temperature
    {
        partNumber: 'CHD-TEMP-THERMO-NC-60',
        description: 'Thermostat, Heater, N/C, 0-60C',
        labourHours: 0.75,
        unitPrice: 40.48,
        subcategory: 'Miscellaneous > General Control > Temperature'
    },
    {
        partNumber: 'CHD-TEMP-THERMO-NO-60',
        description: 'Thermostat, Fan/Alarm, N/O, 0-60C',
        labourHours: 0.75,
        unitPrice: 48.13,
        subcategory: 'Miscellaneous > General Control > Temperature'
    },
    {
        partNumber: 'CHD-TEMP-THERMO-DUAL-60',
        description: 'Thermostat, Dual Control, N/C + N/O, 0-60C',
        labourHours: 0.75,
        unitPrice: 75.05,
        subcategory: 'Miscellaneous > General Control > Temperature'
    },
    {
        partNumber: 'CHD-TEMP-HEATER-55W',
        description: 'Heater, 240VAC, 55W',
        labourHours: 0.75,
        unitPrice: 93.07,
        subcategory: 'Miscellaneous > General Control > Temperature'
    },
    {
        partNumber: 'CHD-TEMP-HEATER-100W',
        description: 'Heater, 240VAC, 100W',
        labourHours: 0.75,
        unitPrice: 130.52,
        subcategory: 'Miscellaneous > General Control > Temperature'
    },
    {
        partNumber: 'CHD-TEMP-HEATER-147W',
        description: 'Heater, 240VAC, 147W',
        labourHours: 0.75,
        unitPrice: 167.15,
        subcategory: 'Miscellaneous > General Control > Temperature'
    }
];

async function main() {
    console.log('Starting deterministic SKU creation & subcategory alignment...');
    let totalCreated = 0;
    let totalUpdated = 0;
    let totalSkipped = 0;

    try {
        for (const itemDef of miscellaneousItems) {
            // Prisma findFirst is used because partNumber is not strictly @unique in schema
            const existingItems = await prisma.catalogItem.findMany({
                where: { partNumber: itemDef.partNumber }
            });

            if (existingItems.length === 0) {
                // Determine inferred brand or leave default empty if appropriate
                // For internal SKUs, we define it as 'Internal' or leave brand null
                await prisma.catalogItem.create({
                    data: {
                        partNumber: itemDef.partNumber,
                        description: itemDef.description,
                        category: 'Switchboard',
                        subcategory: itemDef.subcategory,
                        labourHours: itemDef.labourHours,
                        unitPrice: itemDef.unitPrice,
                        defaultQuantity: 1,
                        isAutoAdd: false,
                        brand: 'Internal'
                    }
                });
                console.log(`[CREATED] ${itemDef.partNumber} -> '${itemDef.subcategory}'`);
                totalCreated++;
            } else {
                let updated = false;
                for (const existing of existingItems) {
                    if (existing.subcategory === itemDef.subcategory) {
                        console.log(`[SKIPPED] ${existing.partNumber} is already correctly categorized in '${itemDef.subcategory}'`);
                        totalSkipped++;
                        continue;
                    }

                    // Update subcategory if it differs
                    await prisma.catalogItem.update({
                        where: { id: existing.id },
                        data: { subcategory: itemDef.subcategory }
                    });

                    const oldSubcat = existing.subcategory || '(uncategorized)';
                    console.log(`[UPDATED] ${existing.partNumber} from '${oldSubcat}' -> '${itemDef.subcategory}'`);
                    updated = true;
                }
                if (updated) totalUpdated++;
            }
        }

        console.log('\n--- Alignment Summary ---');
        console.log(`Total SKUs Created: ${totalCreated}`);
        console.log(`Total SKUs Updated: ${totalUpdated}`);
        console.log(`Total SKUs Skipped: ${totalSkipped}`);

    } catch (error) {
        console.error('Error during assignment:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
