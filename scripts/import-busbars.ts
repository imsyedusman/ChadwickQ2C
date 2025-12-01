import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Official Busbars data from user's spreadsheet
const busbarsData = [
    // Main Bars - Custom Busbar
    { category: 'Busbar', subcategory: 'Main Bars - labour and copper > Custom Busbar', partNumber: 'BB-3000A', description: 'Busbar 3000A ( in linear metres) 2x10x160', unitPrice: 2464.00, labourHours: 12.00, defaultQuantity: 1, length: 1, width: 12, height: 112 },
    { category: 'Busbar', subcategory: 'Main Bars - labour and copper > Custom Busbar', partNumber: 'BB-2500A', description: 'Busbar 2500A ( in linear metres) 2x10x125', unitPrice: 1925.00, labourHours: 8.00, defaultQuantity: 2, length: 2, width: 8, height: 87.5 },
    { category: 'Busbar', subcategory: 'Main Bars - labour and copper > Custom Busbar', partNumber: 'BB-2000A', description: 'Busbar 2000A ( in linear metres) 2x10x100', unitPrice: 1540.00, labourHours: 0, defaultQuantity: 1, length: null, width: 8, height: 70 },
    { category: 'Busbar', subcategory: 'Main Bars - labour and copper > Custom Busbar', partNumber: 'BB-1600A', description: 'Busbar 1600A ( in linear metres) 2x6.3x100', unitPrice: 1012.00, labourHours: 0, defaultQuantity: 1, length: null, width: 6, height: 46 },
    { category: 'Busbar', subcategory: 'Main Bars - labour and copper > Custom Busbar', partNumber: 'BB-1250A', description: 'Busbar 1250A ( in linear metres) 10x100', unitPrice: 770.00, labourHours: 0, defaultQuantity: 1, length: null, width: 6, height: 35 },
    { category: 'Busbar', subcategory: 'Main Bars - labour and copper > Custom Busbar', partNumber: 'BB-1000A', description: 'Busbar 1000A ( in linear metres) 6.3x100', unitPrice: 495.00, labourHours: 0, defaultQuantity: 1, length: null, width: 6, height: 22.5 },
    { category: 'Busbar', subcategory: 'Main Bars - labour and copper > Custom Busbar', partNumber: 'BB-800A', description: 'Busbar 800A ( in linear metres) 6.3x80', unitPrice: 396.00, labourHours: 0, defaultQuantity: 1, length: null, width: 4, height: 18 },
    { category: 'Busbar', subcategory: 'Main Bars - labour and copper > Custom Busbar', partNumber: 'BB-630A', description: 'Busbar 630A ( in linear metres) 6.3x50', unitPrice: 242.00, labourHours: 0, defaultQuantity: 1, length: null, width: 4, height: 11 },
    { category: 'Busbar', subcategory: 'Main Bars - labour and copper > Custom Busbar', partNumber: 'BB-400A', description: 'Busbar 400A ( in linear metres) 6.3x31.5', unitPrice: 154.00, labourHours: 0, defaultQuantity: 1, length: null, width: 4, height: 7 },

    // Main Bars - Cubic Busbars
    { category: 'Busbar', subcategory: 'Main Bars - labour and copper > Cubic Busbars', partNumber: 'BBC-4000A', description: 'Busbar 4000A - 2/2 x 10 x 80 (per metre)', unitPrice: 2464.00, labourHours: 0, defaultQuantity: 1, length: null, width: 16, height: 112 },
    { category: 'Busbar', subcategory: 'Main Bars - labour and copper > Cubic Busbars', partNumber: 'BBC-3600A', description: 'Busbar 3600A - 3 x 10 x 100 (per metre)', unitPrice: 2310.00, labourHours: 0, defaultQuantity: 1, length: null, width: 8, height: 105 },
    { category: 'Busbar', subcategory: 'Main Bars - labour and copper > Cubic Busbars', partNumber: 'BBC-2800A', description: 'Busbar 2800A - 2 x 10 x 100 (per metre)', unitPrice: 1540.00, labourHours: 0, defaultQuantity: 1, length: null, width: 8, height: 70 },
    { category: 'Busbar', subcategory: 'Main Bars - labour and copper > Cubic Busbars', partNumber: 'BBC-2250A', description: 'Busbar 2250A - 2 x 10 x 80 (per metre)', unitPrice: 1232.00, labourHours: 0, defaultQuantity: 1, length: null, width: 8, height: 56 },
    { category: 'Busbar', subcategory: 'Main Bars - labour and copper > Cubic Busbars', partNumber: 'BBC-1800A', description: 'Busbar 1800A - 2 x 10 x 60 (per metre)', unitPrice: 924.00, labourHours: 0, defaultQuantity: 1, length: null, width: 8, height: 42 },
    { category: 'Busbar', subcategory: 'Main Bars - labour and copper > Cubic Busbars', partNumber: 'BBC-1600A', description: 'Busbar 1600A - 2 x 10 x 50 (per metre)', unitPrice: 770.00, labourHours: 0, defaultQuantity: 1, length: null, width: 8, height: 35 },
    { category: 'Busbar', subcategory: 'Main Bars - labour and copper > Cubic Busbars', partNumber: 'BBC-1350A', description: 'Busbar 1350A - 2 x 10 x 40 (per metre)', unitPrice: 616.00, labourHours: 0, defaultQuantity: 1, length: null, width: 6, height: 28 },
    { category: 'Busbar', subcategory: 'Main Bars - labour and copper > Cubic Busbars', partNumber: 'BBC-1100A', description: 'Busbar 1100A - 2 x 10 x 30 (per metre)', unitPrice: 462.00, labourHours: 0, defaultQuantity: 1, length: null, width: 6, height: 21 },
    { category: 'Busbar', subcategory: 'Main Bars - labour and copper > Cubic Busbars', partNumber: 'BBC-800A-2', description: 'Busbar 800A - 2 x 10 x 20 (per metre)', unitPrice: 308.00, labourHours: 0, defaultQuantity: 1, length: null, width: 6, height: 14 },
    { category: 'Busbar', subcategory: 'Main Bars - labour and copper > Cubic Busbars', partNumber: 'BBC-400A-2', description: 'Busbar 400A - 2 x 10 x 10 (per metre)', unitPrice: 154.00, labourHours: 0, defaultQuantity: 1, length: null, width: 6, height: 7 },

    // MCCB Tee Off Bars
    { category: 'Busbar', subcategory: 'MCCB Tee Off Bars - labour and copper', partNumber: 'MCCB-250A', description: 'C/B Tee-off - 250A (per c/b)', unitPrice: 66.00, labourHours: 0, defaultQuantity: 1, length: null, width: null, height: 3 },
    { category: 'Busbar', subcategory: 'MCCB Tee Off Bars - labour and copper', partNumber: 'MCCB-400A', description: 'C/B Tee-off - 400A (per c/b)', unitPrice: 88.00, labourHours: 2.00, defaultQuantity: 2, length: 2, width: null, height: 4 },
    { category: 'Busbar', subcategory: 'MCCB Tee Off Bars - labour and copper', partNumber: 'MCCB-630A', description: 'C/B Tee-off - 630A (per c/b)', unitPrice: 176.00, labourHours: 2.00, defaultQuantity: 2, length: 2, width: null, height: 8 },
    { category: 'Busbar', subcategory: 'MCCB Tee Off Bars - labour and copper', partNumber: 'MCCB-800A', description: 'C/B Tee-off - 800A (per c/b)', unitPrice: 308.00, labourHours: 0, defaultQuantity: 1, length: null, width: null, height: 14 },
    { category: 'Busbar', subcategory: 'MCCB Tee Off Bars - labour and copper', partNumber: 'MCCB-1000A', description: 'C/B Tee-off - 1000A (per c/b)', unitPrice: 396.00, labourHours: 0, defaultQuantity: 1, length: null, width: null, height: 18 },
    { category: 'Busbar', subcategory: 'MCCB Tee Off Bars - labour and copper', partNumber: 'MCCB-1250A', description: 'C/B Tee-off - 1250A (per c/b)', unitPrice: 572.00, labourHours: 0, defaultQuantity: 1, length: null, width: null, height: 26 },
    { category: 'Busbar', subcategory: 'MCCB Tee Off Bars - labour and copper', partNumber: 'MCCB-1600A', description: 'C/B Tee-off - 1600A (per c/b)', unitPrice: 792.00, labourHours: 0, defaultQuantity: 1, length: null, width: null, height: 36 },

    // CT Chamber Labour
    { category: 'Busbar', subcategory: 'CT Chamber Labour - copper included above', partNumber: 'CT-400A', description: 'CT Chamber - 400A', unitPrice: 0, labourHours: 6.00, defaultQuantity: 2, length: 2, width: null, height: 6 },
    { category: 'Busbar', subcategory: 'CT Chamber Labour - copper included above', partNumber: 'CT-630A', description: 'CT Chamber - 630A', unitPrice: 0, labourHours: 6.00, defaultQuantity: 3, length: 3, width: null, height: 6 },
    { category: 'Busbar', subcategory: 'CT Chamber Labour - copper included above', partNumber: 'CT-800A', description: 'CT Chamber - 800A', unitPrice: 0, labourHours: 6.00, defaultQuantity: 7, length: 7, width: null, height: 6 },
    { category: 'Busbar', subcategory: 'CT Chamber Labour - copper included above', partNumber: 'CT-1200A', description: 'CT Chamber - 1200A', unitPrice: 0, labourHours: 8.00, defaultQuantity: 1, length: null, width: null, height: 8 },
    { category: 'Busbar', subcategory: 'CT Chamber Labour - copper included above', partNumber: 'CT-1600A', description: 'CT Chamber - 1600A', unitPrice: 0, labourHours: 8.00, defaultQuantity: 1, length: null, width: null, height: 8 },
    { category: 'Busbar', subcategory: 'CT Chamber Labour - copper included above', partNumber: 'CT-2000A', description: 'CT Chamber - 2000A', unitPrice: 0, labourHours: 10.00, defaultQuantity: 1, length: null, width: null, height: 10 },
    { category: 'Busbar', subcategory: 'CT Chamber Labour - copper included above', partNumber: 'CT-2500A', description: 'CT Chamber - 2500A', unitPrice: 0, labourHours: 10.00, defaultQuantity: 1, length: null, width: null, height: 10 },
    { category: 'Busbar', subcategory: 'CT Chamber Labour - copper included above', partNumber: 'CT-3200A', description: 'CT Chamber - 3200A', unitPrice: 0, labourHours: 16.00, defaultQuantity: 1, length: null, width: null, height: 16 },

    // ACB & Isolators Labour
    { category: 'Busbar', subcategory: 'ACB & Isolators Labour - copper included above', partNumber: 'ACB-630A', description: 'ACB & Isolators - Up to 630A', unitPrice: 0, labourHours: 6.00, defaultQuantity: 2, length: 2, width: null, height: 6 },
    { category: 'Busbar', subcategory: 'ACB & Isolators Labour - copper included above', partNumber: 'ACB-800A', description: 'ACB & Isolators - 800A', unitPrice: 0, labourHours: 6.00, defaultQuantity: 3, length: 3, width: null, height: 6 },
    { category: 'Busbar', subcategory: 'ACB & Isolators Labour - copper included above', partNumber: 'ACB-1200A', description: 'ACB & Isolators - 1200A', unitPrice: 0, labourHours: 10.00, defaultQuantity: 2, length: 2, width: null, height: 10 },
    { category: 'Busbar', subcategory: 'ACB & Isolators Labour - copper included above', partNumber: 'ACB-1600A', description: 'ACB & Isolators - 1600A', unitPrice: 0, labourHours: 10.00, defaultQuantity: 1, length: null, width: null, height: 10 },
    { category: 'Busbar', subcategory: 'ACB & Isolators Labour - copper included above', partNumber: 'ACB-2000A', description: 'ACB & Isolators - 2000A', unitPrice: 0, labourHours: 12.00, defaultQuantity: 1, length: null, width: null, height: 12 },
    { category: 'Busbar', subcategory: 'ACB & Isolators Labour - copper included above', partNumber: 'ACB-2500A', description: 'ACB & Isolators - 2500A', unitPrice: 0, labourHours: 14.00, defaultQuantity: 1, length: null, width: null, height: 14 },
    { category: 'Busbar', subcategory: 'ACB & Isolators Labour - copper included above', partNumber: 'ACB-3200A', description: 'ACB & Isolators - 3200A', unitPrice: 0, labourHours: 18.00, defaultQuantity: 1, length: null, width: null, height: 18 },

    // Chassis Tee Off's Labour
    { category: 'Busbar', subcategory: 'Chassis Tee Offs Labour', partNumber: 'CHASSIS-630A', description: 'Chassis Tee-off - 630A', unitPrice: 0, labourHours: 4.00, defaultQuantity: 1, length: null, width: null, height: 4 },
    { category: 'Busbar', subcategory: 'Chassis Tee Offs Labour', partNumber: 'CHASSIS-800A', description: 'Chassis Tee-off - 800A', unitPrice: 0, labourHours: 4.00, defaultQuantity: 1, length: null, width: null, height: 4 },
    { category: 'Busbar', subcategory: 'Chassis Tee Offs Labour', partNumber: 'CHASSIS-1200A', description: 'Chassis Tee-off - 1200A', unitPrice: 0, labourHours: 6.00, defaultQuantity: 6, length: 6, width: null, height: 6 },
    { category: 'Busbar', subcategory: 'Chassis Tee Offs Labour', partNumber: 'CHASSIS-1600A', description: 'Chassis Tee-off - 1600A', unitPrice: 0, labourHours: 8.00, defaultQuantity: 1, length: null, width: null, height: 8 },

    // Miscellaneous
    { category: 'Busbar', subcategory: 'Miscellaneous', partNumber: 'MISC-BUSBAR', description: 'Miscellaneous', unitPrice: 0, labourHours: 1.00, defaultQuantity: 1, length: null, width: null, height: null },
];

async function main() {
    console.log('Starting Busbars data import...');

    try {
        // Clear existing Busbar items
        const deleted = await prisma.catalogItem.deleteMany({
            where: { category: 'Busbar' }
        });
        console.log(`Deleted ${deleted.count} existing Busbar items.`);

        // Import new data
        const result = await prisma.catalogItem.createMany({
            data: busbarsData.map(item => ({
                brand: null, // Busbars are internal items without a vendor brand
                category: item.category,
                subcategory: item.subcategory,
                partNumber: item.partNumber,
                description: item.description,
                unitPrice: item.unitPrice,
                labourHours: item.labourHours,
                defaultQuantity: item.defaultQuantity,
                isAutoAdd: false, // Busbars are never auto-added
                // Note: width, height, length are not in the current schema
                // They would need to be added if required for calculations
            }))
        });

        console.log(`Successfully imported ${result.count} Busbar items.`);
        console.log('\nBusbars are configured to NOT auto-add to new boards.');

    } catch (error) {
        console.error('Import failed:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    });
