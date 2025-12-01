import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const updates = [
    { description: 'Busbar 3000A ( in linear metres) 2x10x160', unitPrice: 2464.00, labourHours: 12.00 },
    { description: 'Busbar 2500A ( in linear metres) 2x10x125', unitPrice: 1925.00, labourHours: 8.00 },
    { description: 'Busbar 2000A ( in linear metres) 2x10x100', unitPrice: 1540.00, labourHours: 8.00 },
    { description: 'Busbar 1600A ( in linear metres) 2x6.3x100', unitPrice: 1012.00, labourHours: 6.00 },
    { description: 'Busbar 1250A ( in linear metres) 10x100', unitPrice: 770.00, labourHours: 6.00 },
    { description: 'Busbar 1000A ( in linear metres) 6.3x100', unitPrice: 495.00, labourHours: 6.00 },
    { description: 'Busbar 800A ( in linear metres) 6.3x80', unitPrice: 396.00, labourHours: 4.00 },
    { description: 'Busbar 630A ( in linear metres) 6.3x50', unitPrice: 242.00, labourHours: 4.00 },
    { description: 'Busbar 400A ( in linear metres) 6.3x31.5', unitPrice: 154.00, labourHours: 4.00 },
    { description: 'Busbar 4000A - 2/2 x 10 x 80 (per metre)', unitPrice: 2464.00, labourHours: 16.00 },
    { description: 'Busbar 3600A - 3 x 10 x 100 (per metre)', unitPrice: 2310.00, labourHours: 8.00 },
    { description: 'Busbar 2800A - 2 x 10 x 100 (per metre)', unitPrice: 1540.00, labourHours: 8.00 },
    { description: 'Busbar 2250A - 2 x 10 x 80 (per metre)', unitPrice: 1232.00, labourHours: 8.00 },
    { description: 'Busbar 1800A - 2 x 10 x 60 (per metre)', unitPrice: 924.00, labourHours: 8.00 },
    { description: 'Busbar 1600A - 2 x 10 x 50 (per metre)', unitPrice: 770.00, labourHours: 8.00 },
    { description: 'Busbar 1350A - 2 x 10 x 40 (per metre)', unitPrice: 616.00, labourHours: 6.00 },
    { description: 'Busbar 1100A - 2 x 10 x 30 (per metre)', unitPrice: 462.00, labourHours: 6.00 },
    { description: 'Busbar 800A - 2 x 10 x 20 (per metre)', unitPrice: 308.00, labourHours: 6.00 },
];

async function main() {
    console.log('Updating Main Bars items...');

    for (const item of updates) {
        const result = await prisma.catalogItem.updateMany({
            where: {
                description: item.description,
                category: 'Busbar'
            },
            data: {
                unitPrice: item.unitPrice,
                labourHours: item.labourHours
            }
        });
        console.log(`Updated ${result.count} items for ${item.description}`);
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
