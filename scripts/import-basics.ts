import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Basics data from Excel sheet
const basicsData = [
    // 1A - Cubic Switchboard Enclosures
    {
        brand: null, // Basics are internal items without a vendor brand
        category: 'Basics',
        subcategory: 'Cubic Switchboard Enclosures (includes busbar supports)',
        partNumber: '1A-TIERS',
        description: 'Total No. of Tiers (includes cable zones)',
        unitPrice: 1500.00,
        labourHours: 6,
        defaultQuantity: 1,
        isAutoAdd: false
    },
    {
        brand: null,
        category: 'Basics',
        subcategory: 'Cubic Switchboard Enclosures (includes busbar supports)',
        partNumber: '1A-COMPARTMENTS',
        description: 'Total No. of compartments',
        unitPrice: 300.00,
        labourHours: 1.2,
        defaultQuantity: 1,
        isAutoAdd: false
    },
    {
        brand: null,
        category: 'Basics',
        subcategory: 'Cubic Switchboard Enclosures (includes busbar supports)',
        partNumber: '1A-50KA',
        description: 'Is switchboard over 50kA (Yes = 1)',
        unitPrice: 0.00,
        labourHours: 0,
        defaultQuantity: 1,
        isAutoAdd: false
    },
    {
        brand: null,
        category: 'Basics',
        subcategory: 'Cubic Switchboard Enclosures (includes busbar supports)',
        partNumber: '1A-COLOUR',
        description: 'Non Standard Colour (Yes = 1)',
        unitPrice: 0.00,
        labourHours: 0,
        defaultQuantity: 1,
        isAutoAdd: false
    },

    // 1B - Outdoor & Custom Switchboard Enclosures
    {
        brand: null,
        category: 'Basics',
        subcategory: 'Outdoor & Custom Switchboard Enclosures',
        partNumber: '1B-TIERS-400',
        description: 'Total No. of Tiers (includes cable zones) 400 deep',
        unitPrice: 1400.00,
        labourHours: 1,
        defaultQuantity: 1,
        isAutoAdd: false
    },
    {
        brand: null,
        category: 'Basics',
        subcategory: 'Outdoor & Custom Switchboard Enclosures',
        partNumber: '1B-COMPARTMENTS',
        description: 'Total No. of compartments',
        unitPrice: 350.00,
        labourHours: 0,
        defaultQuantity: 1,
        isAutoAdd: false
    },
    {
        brand: null,
        category: 'Basics',
        subcategory: 'Outdoor & Custom Switchboard Enclosures',
        partNumber: '1B-BASE',
        description: 'Base Required (Yes = 1)',
        unitPrice: 0.00,
        labourHours: 0,
        defaultQuantity: 1,
        isAutoAdd: false
    },
    {
        brand: null,
        category: 'Basics',
        subcategory: 'Outdoor & Custom Switchboard Enclosures',
        partNumber: '1B-DOORS',
        description: 'Extra for Doors Over (Yes = 1)',
        unitPrice: 1200.00,
        labourHours: 0,
        defaultQuantity: 1,
        isAutoAdd: false
    },
    {
        brand: null,
        category: 'Basics',
        subcategory: 'Outdoor & Custom Switchboard Enclosures',
        partNumber: '1B-600MM',
        description: 'Extra for 600mm deep enclosure (Yes = 1)',
        unitPrice: 1000.00,
        labourHours: 0,
        defaultQuantity: 1,
        isAutoAdd: false
    },
    {
        brand: null,
        category: 'Basics',
        subcategory: 'Outdoor & Custom Switchboard Enclosures',
        partNumber: '1B-800MM',
        description: 'Extra for 800mm deep enclosure (Yes = 1)',
        unitPrice: 2000.00,
        labourHours: 0,
        defaultQuantity: 1,
        isAutoAdd: false
    },
    {
        brand: null,
        category: 'Basics',
        subcategory: 'Outdoor & Custom Switchboard Enclosures',
        partNumber: '1B-SS-2B',
        description: 'Extra for Stainless Steel 2B or Painted (Yes = 1)',
        unitPrice: 3835.00,
        labourHours: 0,
        defaultQuantity: 1,
        isAutoAdd: false
    },
    {
        brand: null,
        category: 'Basics',
        subcategory: 'Outdoor & Custom Switchboard Enclosures',
        partNumber: '1B-SS-NO4',
        description: 'Extra for Stainless Steel No.4 Polish (Yes = 1)',
        unitPrice: 4425.00,
        labourHours: 0,
        defaultQuantity: 1,
        isAutoAdd: false
    },
    {
        brand: null,
        category: 'Basics',
        subcategory: 'Outdoor & Custom Switchboard Enclosures',
        partNumber: '1B-ABLOY',
        description: 'Abloy Locks or  E-Lock (Enter Quantity)',
        unitPrice: 400.00,
        labourHours: 0,
        defaultQuantity: 1,
        isAutoAdd: false
    },
    {
        brand: null,
        category: 'Basics',
        subcategory: 'Outdoor & Custom Switchboard Enclosures',
        partNumber: '1B-DUAL-LOCK',
        description: 'Dual Lock - Abloy / PWD E-Lock',
        unitPrice: 750.00,
        labourHours: 0,
        defaultQuantity: 1,
        isAutoAdd: false
    },
    {
        brand: null,
        category: 'Basics',
        subcategory: 'Outdoor & Custom Switchboard Enclosures',
        partNumber: '1B-QUOTED',
        description: 'Quoted Sheetmetal Price - Use this option if Supplier has quoted a sheet metal price',
        unitPrice: 0.00,
        labourHours: 0,
        defaultQuantity: 1,
        isAutoAdd: false
    },

    // 1B1 - Busbar Supports
    {
        brand: null,
        category: 'Basics',
        subcategory: 'Busbar Supports - Required for Custom Boards Only',
        partNumber: '1B1-CLEAT-SMALL-1',
        description: 'Cleats - Permali (small-one bar/phase)',
        unitPrice: 65.00,
        labourHours: 0.3,
        defaultQuantity: 1,
        isAutoAdd: false
    },
    {
        brand: null,
        category: 'Basics',
        subcategory: 'Busbar Supports - Required for Custom Boards Only',
        partNumber: '1B1-CLEAT-SMALL-2',
        description: 'Cleats - Permali (small-two bar/phase)',
        unitPrice: 80.00,
        labourHours: 0.3,
        defaultQuantity: 1,
        isAutoAdd: false
    },
    {
        brand: null,
        category: 'Basics',
        subcategory: 'Busbar Supports - Required for Custom Boards Only',
        partNumber: '1B1-CLEAT-LARGE-2',
        description: 'Cleats - Permali (large-two bar/phase)',
        unitPrice: 115.00,
        labourHours: 0.3,
        defaultQuantity: 1,
        isAutoAdd: false
    },
    {
        brand: null,
        category: 'Basics',
        subcategory: 'Busbar Supports - Required for Custom Boards Only',
        partNumber: '1B1-CLEAT-LARGE-3',
        description: 'Cleats - Permali (large-three bar/phase)',
        unitPrice: 135.00,
        labourHours: 0.3,
        defaultQuantity: 1,
        isAutoAdd: false
    },

    // CT Metering
    {
        brand: null,
        category: 'Basics',
        subcategory: 'CT Metering',
        partNumber: 'CT-COMPARTMENTS',
        description: 'No. of CT Compartments',
        unitPrice: 120.00,
        labourHours: 2.5,
        defaultQuantity: 1,
        isAutoAdd: false
    },
    {
        brand: null,
        category: 'Basics',
        subcategory: 'CT Metering',
        partNumber: 'CT-S-TYPE',
        description: "S' type metering CT (100 - 200A) (per set)",
        unitPrice: 450.00,
        labourHours: 0.7,
        defaultQuantity: 1,
        isAutoAdd: false
    },
    {
        brand: null,
        category: 'Basics',
        subcategory: 'CT Metering',
        partNumber: 'CT-T-TYPE',
        description: "T' type metering CT (200 - 800A) (per set)",
        unitPrice: 690.00,
        labourHours: 0.7,
        defaultQuantity: 1,
        isAutoAdd: false
    },
    {
        brand: null,
        category: 'Basics',
        subcategory: 'CT Metering',
        partNumber: 'CT-W-TYPE',
        description: "W' type metering CT (800 - 1600A) (per set)",
        unitPrice: 750.00,
        labourHours: 1,
        defaultQuantity: 1,
        isAutoAdd: false
    },
    {
        brand: null,
        category: 'Basics',
        subcategory: 'CT Metering',
        partNumber: 'CT-U-TYPE',
        description: "U' type metering CT (>1600A) (per set)",
        unitPrice: 1575.00,
        labourHours: 1,
        defaultQuantity: 1,
        isAutoAdd: false
    },
    {
        brand: null,
        category: 'Basics',
        subcategory: 'CT Metering',
        partNumber: 'CT-TEST-BLOCK',
        description: 'Meter test block',
        unitPrice: 50.00,
        labourHours: 0.2,
        defaultQuantity: 1,
        isAutoAdd: false
    },
    {
        brand: null,
        category: 'Basics',
        subcategory: 'CT Metering',
        partNumber: 'CT-PANEL',
        description: 'Meter panel - 600mm x 600mm',
        unitPrice: 80.00,
        labourHours: 1,
        defaultQuantity: 1,
        isAutoAdd: false
    },
    {
        brand: null,
        category: 'Basics',
        subcategory: 'CT Metering',
        partNumber: 'CT-WIRING',
        description: 'CT Meter wiring',
        unitPrice: 45.00,
        labourHours: 3.5,
        defaultQuantity: 1,
        isAutoAdd: false
    },
    {
        brand: null,
        category: 'Basics',
        subcategory: 'CT Metering',
        partNumber: 'CT-CTC400',
        description: 'CTC400',
        unitPrice: 490.00,
        labourHours: 1,
        defaultQuantity: 1,
        isAutoAdd: false
    },

    // 100A Series Metering
    {
        brand: null,
        category: 'Basics',
        subcategory: '100A Series Metering',
        partNumber: '100A-PANEL',
        description: 'Meter panel - 600mm x 600mm',
        unitPrice: 60.00,
        labourHours: 1,
        defaultQuantity: 1,
        isAutoAdd: false
    },
    {
        brand: null,
        category: 'Basics',
        subcategory: '100A Series Metering',
        partNumber: '100A-FUSE',
        description: 'Meter protection fuse - 100A',
        unitPrice: 15.50,
        labourHours: 0.1,
        defaultQuantity: 1,
        isAutoAdd: false
    },
    {
        brand: null,
        category: 'Basics',
        subcategory: '100A Series Metering',
        partNumber: '100A-WIRING-1PH',
        description: 'Series meter wiring - 1 phase',
        unitPrice: 10.00,
        labourHours: 1,
        defaultQuantity: 1,
        isAutoAdd: false
    },
    {
        brand: null,
        category: 'Basics',
        subcategory: '100A Series Metering',
        partNumber: '100A-WIRING-3PH',
        description: 'Series meter wiring - 3 phase',
        unitPrice: 30.00,
        labourHours: 2.5,
        defaultQuantity: 1,
        isAutoAdd: false
    },
    {
        brand: null,
        category: 'Basics',
        subcategory: '100A Series Metering',
        partNumber: '100A-NEUTRAL-LINK',
        description: 'Meter neutral link',
        unitPrice: 12.00,
        labourHours: 0.2,
        defaultQuantity: 1,
        isAutoAdd: false
    },
    {
        brand: null,
        category: 'Basics',
        subcategory: '100A Series Metering',
        partNumber: '100A-MCB-1PH',
        description: '1ph 63A MCB',
        unitPrice: 8.00,
        labourHours: 0.1,
        defaultQuantity: 1,
        isAutoAdd: false
    },
    {
        brand: null,
        category: 'Basics',
        subcategory: '100A Series Metering',
        partNumber: '100A-MCB-3PH',
        description: '3ph 80A MCB',
        unitPrice: 90.00,
        labourHours: 0.1,
        defaultQuantity: 1,
        isAutoAdd: false
    },
    {
        brand: null,
        category: 'Basics',
        subcategory: '100A Series Metering',
        partNumber: '100A-CHASSIS-18',
        description: 'Meter Protection Fuse Chassis - 18-way',
        unitPrice: 407.00,
        labourHours: 1,
        defaultQuantity: 1,
        isAutoAdd: false
    },
    {
        brand: null,
        category: 'Basics',
        subcategory: '100A Series Metering',
        partNumber: '100A-CHASSIS-24',
        description: 'Meter Protection Fuse Chassis - 24-way',
        unitPrice: 497.00,
        labourHours: 1,
        defaultQuantity: 1,
        isAutoAdd: false
    },
    {
        brand: null,
        category: 'Basics',
        subcategory: '100A Series Metering',
        partNumber: '100A-CHASSIS-30',
        description: 'Meter Protection Fuse Chassis - 30-way',
        unitPrice: 720.00,
        labourHours: 1,
        defaultQuantity: 1,
        isAutoAdd: false
    },

    // Miscellaneous
    {
        brand: null,
        category: 'Basics',
        subcategory: 'Miscellaneous',
        partNumber: 'MISC-CABLE-TRAY',
        description: 'Cable tray - (per cable zone)',
        unitPrice: 25.00,
        labourHours: 0.3,
        defaultQuantity: 1,
        isAutoAdd: false
    },
    {
        brand: null,
        category: 'Basics',
        subcategory: 'Miscellaneous',
        partNumber: 'MISC-LABELS',
        description: 'Labels - per tier',
        unitPrice: 30.00,
        labourHours: 0.3,
        defaultQuantity: 1,
        isAutoAdd: true // Common default item
    },
    {
        brand: null,
        category: 'Basics',
        subcategory: 'Miscellaneous',
        partNumber: 'MISC-HARDWARE',
        description: 'Hardware - per tier',
        unitPrice: 50.00,
        labourHours: 0.1,
        defaultQuantity: 1,
        isAutoAdd: true // Common default item
    },
    {
        brand: null,
        category: 'Basics',
        subcategory: 'Miscellaneous',
        partNumber: 'MISC-DELIVERY-HIAB',
        description: 'Delivery - Hiab (Sydney CBD)',
        unitPrice: 800.00,
        labourHours: 1,
        defaultQuantity: 1,
        isAutoAdd: false
    },
    {
        brand: null,
        category: 'Basics',
        subcategory: 'Miscellaneous',
        partNumber: 'MISC-DELIVERY-UTE',
        description: 'Delivery - Ute (Sydney CBD)',
        unitPrice: 200.00,
        labourHours: 1,
        defaultQuantity: 1,
        isAutoAdd: false
    },
    {
        brand: null,
        category: 'Basics',
        subcategory: 'Miscellaneous',
        partNumber: 'MISC-SITE-RECONNECTION',
        description: 'Site Reconnection (no. shipping sections)',
        unitPrice: 40.00,
        labourHours: 8,
        defaultQuantity: 1,
        isAutoAdd: false
    },
    {
        brand: null,
        category: 'Basics',
        subcategory: 'Miscellaneous',
        partNumber: 'MISC-MISC',
        description: 'Miscellaneous',
        unitPrice: 100.00,
        labourHours: 1,
        defaultQuantity: 1,
        isAutoAdd: false
    }
];

async function main() {
    console.log('Starting Basics data import...');

    try {
        // Clear existing Basics items
        const deleted = await prisma.catalogItem.deleteMany({
            where: { category: 'Basics' }
        });
        console.log(`Deleted ${deleted.count} existing Basics items.`);

        // Import new data
        const result = await prisma.catalogItem.createMany({
            data: basicsData
        });

        console.log(`Successfully imported ${result.count} Basics items.`);
        console.log('\nItems with auto-add enabled:');
        const autoAddItems = basicsData.filter(item => item.isAutoAdd);
        autoAddItems.forEach(item => {
            console.log(`  - ${item.partNumber}: ${item.description}`);
        });

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
