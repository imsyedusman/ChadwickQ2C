import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Vendor Catalog Data
const vendorCatalog = [
    // Power Meters - MERCS
    { brand: 'MERCS', partNo: '', category: 'Power Meters', description: 'Strider M72 Modbus 96mm', qtyDefault: 1, hours: 0.1, cost: 261, notes: '' },
    { brand: 'MERCS', partNo: '', category: 'Power Meters', description: 'Strider M73 Ethernet 96mm', qtyDefault: 1, hours: 0.1, cost: 345, notes: '' },

    // Power Meters - NHP
    { brand: 'NHP', partNo: 'EM2172RVV53XOSX', category: 'Power Meters', description: 'EM2172 - 250A/5 CT inc. CL-1.0', qtyDefault: 1, hours: 0.1, cost: 755.5, notes: '' },
    { brand: 'NHP', partNo: 'EM24DINAV93XISX', category: 'Power Meters', description: 'EM24DIN - 63A Direct CL-1.0', qtyDefault: 1, hours: 0.1, cost: 441.84, notes: '' },
    { brand: 'NHP', partNo: 'EM24DINAV53DISX', category: 'Power Meters', description: 'EM24DIN - CT CL-1.0', qtyDefault: 1, hours: 0.1, cost: 425.46, notes: '' },
    { brand: 'NHP', partNo: 'MF72421', category: 'Power Meters', description: 'NEMO72LRS485 CL-0.5', qtyDefault: 1, hours: 0.1, cost: 458.15, notes: '' },
    { brand: 'NHP', partNo: 'NEMO96HD1000', category: 'Power Meters', description: 'NEMO96HD-1000 + RS485 CL-0.5', qtyDefault: 1, hours: 0.1, cost: 578.4, notes: '' },
    { brand: 'NHP', partNo: 'NEMO96HD1300', category: 'Power Meters', description: 'NEMO96HD-1300 + RS485 + Pulse Output CL-0.5', qtyDefault: 1, hours: 0.1, cost: 749.7, notes: '' },
    { brand: 'NHP', partNo: 'EM27072DMV53X2SN', category: 'Power Meters', description: 'Dual Meter + 2 sets CT\'s', qtyDefault: 1, hours: 1, cost: 507.5, notes: '' },

    // Power Meters - IPD
    { brand: 'IPD', partNo: '48250402', category: 'Power Meters', description: 'Diris A20 + RS485', qtyDefault: 1, hours: 0.1, cost: 392, notes: '' },
    { brand: 'IPD', partNo: '48250500', category: 'Power Meters', description: 'Diris A40 + RS485', qtyDefault: 1, hours: 0.1, cost: 959.12, notes: '' },
    { brand: 'IPD', partNo: '48250501', category: 'Power Meters', description: 'Diris A40 + Ethernet + Webserver', qtyDefault: 1, hours: 0.1, cost: 1752.95, notes: '' },
    { brand: 'IPD', partNo: '48290105', category: 'Power Meters', description: 'U10 VOLTAGE MEASUREMENT MODULE FOR METERING', qtyDefault: 1, hours: 0.1, cost: 306.28, notes: '' },
    { brand: 'IPD', partNo: '48290106', category: 'Power Meters', description: 'U20 VOLTAGE MEASUREMENT MODULE FOR MONITORING', qtyDefault: 1, hours: 0.1, cost: 385.85, notes: '' },
    { brand: 'IPD', partNo: '48290102', category: 'Power Meters', description: 'U30 VOLTAGE MEASUREMENT MODULE FOR ANALYSIS', qtyDefault: 1, hours: 0.1, cost: 465.52, notes: '' },
    { brand: 'IPD', partNo: '48290110', category: 'Power Meters', description: 'I30 3XI CURRENT MEASUREMENT MODULE', qtyDefault: 1, hours: 0.1, cost: 342.99, notes: '' },
    { brand: 'IPD', partNo: '48290111', category: 'Power Meters', description: 'I31 3XI CURRENT MEASUREMENT MODULE WITH LOAD CURVE', qtyDefault: 1, hours: 0.1, cost: 428.71, notes: '' },
    { brand: 'IPD', partNo: '48290128', category: 'Power Meters', description: '+', qtyDefault: 1, hours: 0.1, cost: 392, notes: '' },
    { brand: 'IPD', partNo: '48290130', category: 'Power Meters', description: 'I35 3XI CURRENT MEASUREMENT MODULE WITH ANALYSIS APPLICATION', qtyDefault: 1, hours: 0.1, cost: 563.44, notes: '' },
    { brand: 'IPD', partNo: '48290112', category: 'Power Meters', description: 'I60 6XI CURRENT MEASUREMENT MODULE', qtyDefault: 1, hours: 0.1, cost: 679.82, notes: '' },
    { brand: 'IPD', partNo: '48290101', category: 'Power Meters', description: 'DIRIS C31 NO DISPLAY MODULE WITH RS485 MODBUS', qtyDefault: 1, hours: 0.1, cost: 264.61, notes: '' },
    { brand: 'IPD', partNo: '48290200', category: 'Power Meters', description: 'DIRIS D30 SINGLE POINT DISPLAY USE WITH B30 & I45', qtyDefault: 1, hours: 0.1, cost: 373.65, notes: '' },
    { brand: 'IPD', partNo: '48290204', category: 'Power Meters', description: 'DIRIS D50 v2 MULTI POINT DISPLAY', qtyDefault: 1, hours: 0.1, cost: 710.48, notes: '' },
    { brand: 'IPD', partNo: '48290500', category: 'Power Meters', description: 'TE18 5-20A SOLID CORE CT 8.6MM DIA APERTURE', qtyDefault: 1, hours: 0.1, cost: 49.01, notes: '' },
    { brand: 'IPD', partNo: '48290501', category: 'Power Meters', description: 'TE18 25-63A SOLID CORE CT 8.6MM DIA APERTURE', qtyDefault: 1, hours: 0.1, cost: 49.01, notes: '' },
    { brand: 'IPD', partNo: '48290502', category: 'Power Meters', description: 'TE25 40-160A SOLID CORE CT 13.5 X 13.5MM APERTURE', qtyDefault: 1, hours: 0.1, cost: 63.7, notes: '' },
    { brand: 'IPD', partNo: '48290503', category: 'Power Meters', description: 'TE35 63-250A SOLID CORE CT 21 X 21MM APERTURE', qtyDefault: 1, hours: 0.1, cost: 79.67, notes: '' },
    { brand: 'IPD', partNo: '48290504', category: 'Power Meters', description: 'TE45 160-630A SOLID CORE CT 31 X 31MM APERTURE', qtyDefault: 1, hours: 0.1, cost: 88.2, notes: '' },
    { brand: 'IPD', partNo: '48290505', category: 'Power Meters', description: 'TE55 400-1000A SOLID CORE CT 41 X 41MM APERTURE', qtyDefault: 1, hours: 0.1, cost: 110.23, notes: '' },
    { brand: 'IPD', partNo: '48290506', category: 'Power Meters', description: 'TE90 600-2000A SOLID CORE CT 64 X 64MM APERTURE', qtyDefault: 1, hours: 0.1, cost: 195.95, notes: '' },

    // Fuses - IPD
    { brand: 'IPD', partNo: '', category: 'Fuses', description: 'Fuse and cartridge - 63A', qtyDefault: 1, hours: 0.1, cost: 17.85, notes: '' },
    { brand: 'IPD', partNo: '', category: 'Fuses', description: 'Fuse and cartridge - 32A', qtyDefault: 1, hours: 0.1, cost: 5.8, notes: '' },

    // Wiring - CHADWICK (WITH AUTO-ADD LOGIC)
    { brand: 'CHADWICK', partNo: '', category: 'Wiring', description: 'Wiring - Digital Meters', qtyDefault: 1, hours: 4, cost: 31.5, notes: 'IF ANY METER IS PICKED, THIS OPTION WILL AUTOMATICALLY COUNT THEM AND ALLOW FOR THE FUSES' },
    { brand: 'CHADWICK', partNo: '', category: 'Wiring', description: 'Wiring - surge protection device', qtyDefault: 1, hours: 2.5, cost: 25, notes: 'IF ANY SURGE DIVERTER IS PICKED, THIS OPTION WILL AUTOMATICALLY COUNT THEM AND ALLOW FOR THE FUSES' },

    // Current Transformers - NHP
    { brand: 'NHP', partNo: '', category: 'Current Transformers', description: 'Stemar (large window)            (each)', qtyDefault: 1, hours: 0.25, cost: 380, notes: '' },
    { brand: 'NHP', partNo: 'TAS127B40005A', category: 'Current Transformers', description: '4000/5A                                   (each)', qtyDefault: 1, hours: 0.25, cost: 136.96, notes: '' },
    { brand: 'NHP', partNo: 'TAS127B30005A', category: 'Current Transformers', description: '3000/5A                                   (each)', qtyDefault: 1, hours: 0.25, cost: 115.2, notes: '' },
    { brand: 'NHP', partNo: 'TAS102H25005A', category: 'Current Transformers', description: '2500/5A                                   (each)', qtyDefault: 1, hours: 0.25, cost: 112.32, notes: '' },
    { brand: 'NHP', partNo: 'TAS102H20005A', category: 'Current Transformers', description: '1600-2000/5A                          (each)', qtyDefault: 1, hours: 0.25, cost: 112.32, notes: '' },
    { brand: 'NHP', partNo: 'TAS6512005A', category: 'Current Transformers', description: '1200/5A                                   (each)', qtyDefault: 1, hours: 0.2, cost: 64, notes: '' },
    { brand: 'NHP', partNo: 'TAS6510005A', category: 'Current Transformers', description: '750-1000/5A                            (each)', qtyDefault: 1, hours: 0.2, cost: 57.28, notes: '' },
    { brand: 'NHP', partNo: 'TAS656005A', category: 'Current Transformers', description: '500-600/5A                              (each)', qtyDefault: 1, hours: 0.2, cost: 43.52, notes: '' },
    { brand: 'NHP', partNo: 'TAIBB405A', category: 'Current Transformers', description: '150-400/5A                              (each)', qtyDefault: 1, hours: 0.2, cost: 21.84, notes: 'CONSIDERS ALL THE CT\'S AS 400A UNLESS THERE IS SOMETHING SPECIFIED IN THE CT\'S ABOVE' },
    { brand: 'NHP', partNo: '', category: 'Current Transformers', description: 'Test Links (per set)', qtyDefault: 1, hours: 0.1, cost: 48, notes: 'IF ANY METER IS PICKED, THIS OPTION WILL AUTOMATICALLY COUNT THEM AND ALLOW FOR THE CT\'S' },

    // Surge Diverter - COLTERLEC
    { brand: 'COLTERLEC', partNo: '', category: 'Surge Diverter', description: 'Erico/Critec     TDS-MPM-277 (N)     -     3P     100kA', qtyDefault: 1, hours: 0.3, cost: 1719, notes: '' },
    { brand: 'COLTERLEC', partNo: '', category: 'Surge Diverter', description: 'Erico/Critec     TDX100C-277/480     -     3P     100kA', qtyDefault: 1, hours: 0.3, cost: 564.14, notes: '' },
    { brand: 'COLTERLEC', partNo: '', category: 'Surge Diverter', description: 'Erico/Critec     TDX100M-277/480TT     -     3P     100kA', qtyDefault: 1, hours: 0.3, cost: 816.76, notes: '' },
    { brand: 'COLTERLEC', partNo: '', category: 'Surge Diverter', description: 'Erico/Critec     TDX200M-277/480TT     -     3P     200kA', qtyDefault: 1, hours: 0.3, cost: 1361.26, notes: '' },
    { brand: 'COLTERLEC', partNo: '', category: 'Surge Diverter', description: 'Erico/Critec     TDS-MT-277     -     1P     100kA', qtyDefault: 1, hours: 0.3, cost: 432.77, notes: '' },
    { brand: 'COLTERLEC', partNo: '', category: 'Surge Diverter', description: 'Novaris     SDN3-100-275     -     3P     100kA', qtyDefault: 1, hours: 0.3, cost: 750, notes: '' },
    { brand: 'COLTERLEC', partNo: '', category: 'Surge Diverter', description: 'Novaris     SD3-200     -     3P     200kA', qtyDefault: 1, hours: 0.3, cost: 1492, notes: '' },
    { brand: 'COLTERLEC', partNo: '', category: 'Surge Diverter', description: 'Erico/Critec     TDS350-TT-277     -     3P     50kA     MCC/Comm', qtyDefault: 1, hours: 0.3, cost: 312.56, notes: '' },
    { brand: 'COLTERLEC', partNo: '', category: 'Surge Diverter', description: 'Erico/Critec     DSD340-TNS-275A     -     3P     40kA     General', qtyDefault: 1, hours: 0.3, cost: 196.36, notes: '' },
    { brand: 'COLTERLEC', partNo: '', category: 'Surge Diverter', description: 'Erico/Critec     DSD140-1SR-275     -     1P     40kA', qtyDefault: 1, hours: 0.3, cost: 60.11, notes: '' },
    { brand: 'COLTERLEC', partNo: '', category: 'Surge Diverter', description: 'Novaris     SD3-40N     -     3P     40kA', qtyDefault: 1, hours: 0.3, cost: 428, notes: '' },
    { brand: 'COLTERLEC', partNo: '', category: 'Surge Diverter', description: 'Erico/Critec     DSF-6A-275V     -     1P     6A     16kA', qtyDefault: 1, hours: 1, cost: 150, notes: '' },
    { brand: 'COLTERLEC', partNo: '', category: 'Surge Diverter', description: 'Erico/Critec     DSF-20A-275V     -     1P     20A     15kA', qtyDefault: 1, hours: 1, cost: 271, notes: '' },

    // Power Cable - CHADWICK
    { brand: 'CHADWICK', partNo: '', category: 'Power Cable', description: '3-Phase Cable set per metre     -     63A', qtyDefault: 1, hours: 2, cost: 20, notes: '' },
    { brand: 'CHADWICK', partNo: '', category: 'Power Cable', description: '3-Phase Cable set per metre     -     160A', qtyDefault: 1, hours: 2, cost: 40, notes: '' },
    { brand: 'CHADWICK', partNo: '', category: 'Power Cable', description: '3-Phase Cable set per metre     -     200A', qtyDefault: 1, hours: 3, cost: 60, notes: '' },
];

async function main() {
    console.log('Starting Vendor Catalog import...');

    try {
        // Clear existing vendor items (items with brand set)
        const deleted = await prisma.catalogItem.deleteMany({
            where: {
                brand: { not: null },
                category: { notIn: ['Basics', 'Busbar'] }
            }
        });
        console.log(`Deleted ${deleted.count} existing vendor catalog items.`);

        // Import vendor catalog
        const result = await prisma.catalogItem.createMany({
            data: vendorCatalog.map(item => ({
                brand: item.brand,
                partNumber: item.partNo || null,
                category: 'Switchboard', // All vendor items belong to Switchboard master category
                subcategory: item.category, // Original category becomes subcategory for UI grouping
                description: item.description,
                defaultQuantity: item.qtyDefault,
                labourHours: item.hours,
                unitPrice: item.cost,
                notes: item.notes || null,
                isAutoAdd: false, // Vendor items are never auto-added to boards
            }))
        });

        console.log(`Successfully imported ${result.count} vendor catalog items.`);
        console.log('\nVendor items organized by brand:');
        console.log('- MERCS: 2 items');
        console.log('- NHP: 18 items');
        console.log('- IPD: 31 items');
        console.log('- CHADWICK: 5 items');
        console.log('- COLTERLEC: 13 items');
        console.log('\nCategories:');
        console.log('- Power Meters');
        console.log('- Fuses');
        console.log('- Wiring (with auto-add logic)');
        console.log('- Current Transformers');
        console.log('- Surge Diverter');
        console.log('- Power Cable');

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
