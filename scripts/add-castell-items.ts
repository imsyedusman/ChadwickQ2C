const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const castellItems = [
    {
        brand: 'Internal',
        category: 'Switchboard',
        subcategory: 'Switches > Isolators',
        partNumber: 'CHD-KEYBOX-3-1',
        description: '3+1 Key Exchange Box',
        unitPrice: 1380.00,
        labourHours: 0.25,
        defaultQuantity: 1,
        isAutoAdd: false
    },
    {
        brand: 'Internal',
        category: 'Switchboard',
        subcategory: 'Switches > Isolators',
        partNumber: 'CHD-KEYBOX-2-1',
        description: '2+1 Key Exchange Box',
        unitPrice: 890.00,
        labourHours: 0.25,
        defaultQuantity: 1,
        isAutoAdd: false
    },
    {
        brand: 'Internal',
        category: 'Switchboard',
        subcategory: 'Switches > Isolators',
        partNumber: 'CHD-CASTELL-IL',
        description: 'Castell Key Interlock',
        unitPrice: 490.00,
        labourHours: 1.00,
        defaultQuantity: 1,
        isAutoAdd: false
    },
    {
        brand: 'Internal',
        category: 'Switchboard',
        subcategory: 'Switches > Isolators',
        partNumber: 'CHD-CASTELL-KEY',
        description: 'Castell Key',
        unitPrice: 65.00,
        labourHours: 0.00,
        defaultQuantity: 1,
        isAutoAdd: false
    }
];

async function main() {
    console.log('Starting Castell / Key Exchange items sync...');
    
    let upsertedCount = 0;

    for (const item of castellItems) {
        // Use Prisma's upsert matching on the unique [partNumber, brand] compound key
        const upserted = await prisma.catalogItem.upsert({
            where: {
                partNumber_brand: {
                    partNumber: item.partNumber,
                    brand: item.brand
                }
            },
            update: {
                category: item.category,
                subcategory: item.subcategory,
                description: item.description,
                unitPrice: item.unitPrice,
                labourHours: item.labourHours,
                defaultQuantity: item.defaultQuantity,
                isAutoAdd: item.isAutoAdd
            },
            create: {
                brand: item.brand,
                category: item.category,
                subcategory: item.subcategory,
                partNumber: item.partNumber,
                description: item.description,
                unitPrice: item.unitPrice,
                labourHours: item.labourHours,
                defaultQuantity: item.defaultQuantity,
                isAutoAdd: item.isAutoAdd
            }
        });
        console.log(`Upserted: ${upserted.partNumber} (${upserted.description})`);
        upsertedCount++;
    }

    console.log(`\nSync complete. Successfully processed ${upsertedCount} items.`);
}

main()
    .catch((e) => {
        console.error('Failed to sync Castell items:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
