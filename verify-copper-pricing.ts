import { PrismaClient } from '@prisma/client';
import { calculateBusbarUnitPrice } from './lib/pricing';
import { Prisma } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🔍 Verifying Copper Pricing Logic...');

    // 1. Check Global Settings
    const settings = await prisma.settings.findUnique({ where: { id: 'global' } });
    console.log('Global Settings:', settings);
    if (settings?.copperPricePerKg === undefined) {
        throw new Error('❌ copperPricePerKg missing in Settings');
    }
    console.log(`✅ Global Copper Price: $${settings.copperPricePerKg}/kg`);

    // 2. Check Catalog Item
    const item = await prisma.catalogItem.findFirst({
        where: { partNumber: 'BB-1000A' } // Known copper priced item
    });

    if (!item) throw new Error('❌ BB-1000A not found');
    console.log('Catalog Item:', {
        part: item.partNumber,
        weight: item.totalCopperWeightKgPerMeter,
        isCopperPriced: item.isCopperPriced
    });

    if (!item.isCopperPriced) throw new Error('❌ Item should be copper priced');
    if (!item.totalCopperWeightKgPerMeter) throw new Error('❌ Item missing weight');

    // 3. Simulate Price Calculation
    // Mock Context
    const context = {
        copperPrice: settings.copperPricePerKg,
        labourRate: settings.labourRate,
        overhead: settings.overheadPct,
        engineering: settings.engineeringPct,
        targetMargin: settings.targetMarginPct,
        gst: settings.gstPct,
        rounding: settings.roundingIncrement,
        consumables: settings.consumablesPct
    };

    // Cast as BusbarCatalogItem (simplified for test)
    const busbarItem = item as any;

    try {
        const price = calculateBusbarUnitPrice(busbarItem, context);
        console.log(`✅ Calculated Unit Price: $${price.toString()}`);

        // Manual Calc Check
        const manualPrice = settings.copperPricePerKg * (item.totalCopperWeightKgPerMeter || 0);
        console.log(`   (Manual Check: $${manualPrice})`);

        if (Math.abs(price.toNumber() - manualPrice) > 0.01) {
            console.warn('⚠️ Price Mismatch!');
        } else {
            console.log('✅ Price Calculation Accurate');
        }
    } catch (e) {
        console.error('❌ Calculation Failed:', e);
    }
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
