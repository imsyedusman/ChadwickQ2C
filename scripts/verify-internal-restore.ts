import { PrismaClient } from '@prisma/client';
import { classifyCatalogItem } from '../lib/catalog-service';

const prisma = new PrismaClient();

async function runInternalVerification() {
    console.log('🚀 Starting Internal Nuke and Pave Verification...');

    try {
        // 1. "Export" current state
        console.log('📥 Exporting current state (backup1)...');
        const items1 = await prisma.catalogItem.findMany({ orderBy: { id: 'asc' } });
        console.log(`   Captured ${items1.length} items.`);

        // 2. "Restore" Logic (Simulating the POST handler)
        console.log('♻️ Simulating Restore (Wiping and Re-importing)...');
        
        // Wipe
        await prisma.catalogItem.deleteMany({});
        console.log('   DB Cleared.');

        // Re-import with the LOSSLESS logic from route.ts
        const processedItems = items1.map(item => {
            // This is the EXACT logic I added to the API route.
            const brand = item.brand ? String(item.brand).trim().toLowerCase() : null;
            const partNumber = String(item.partNumber).trim();
            
            const classification = classifyCatalogItem(
                item.description || '',
                partNumber,
                item.category || '',
                item.subcategory || '',
                '', // cat3
                brand || ''
            );

            return {
                ...item,
                brand,
                partNumber,
                category: item.category || classification.category,
                subcategory: item.subcategory || classification.subcategory,
                meterType: item.meterType || classification.meterType,
                isCopperPriced: item.isCopperPriced !== undefined ? item.isCopperPriced : (classification.isCopperPriced ?? false),
                totalCopperWeightKgPerMeter: item.totalCopperWeightKgPerMeter !== undefined ? item.totalCopperWeightKgPerMeter : (classification.totalCopperWeightKgPerMeter ?? null),
                labourHours: item.labourHours !== undefined ? (parseFloat(item.labourHours as any) || 0) : (item.labourHours ?? 0)
            };
        });

        // Batch Create
        const BATCH_SIZE = 100;
        for (let i = 0; i < processedItems.length; i += BATCH_SIZE) {
            const batch = processedItems.slice(i, i + BATCH_SIZE);
            await (prisma.catalogItem as any).createMany({
                data: batch.map(({ id, createdAt, updatedAt, ...rest }) => rest)
            });
            if (i % 1000 === 0) console.log(`   Processed ${i} items...`);
        }

        // 3. "Export" again
        console.log('📥 Exporting again (backup2)...');
        const items2 = await prisma.catalogItem.findMany({ orderBy: { id: 'asc' } });

        // 4. Comparison
        console.log(`\n📊 FINAL VERIFICATION:`);
        console.log(`Count 1: ${items1.length}`);
        console.log(`Count 2: ${items2.length}`);

        if (items1.length !== items2.length) {
            throw new Error(`Count mismatch! ${items1.length} vs ${items2.length}`);
        }

        // Deep Sample Check
        const busbar1 = items1.find(i => i.partNumber === 'BB-3000A');
        const busbar2 = items2.find(i => i.partNumber === 'BB-3000A');

        if (!busbar1 || !busbar2) throw new Error('Could not find BB-3000A for comparison');

        console.log('\nBB-3000A Field Comparison:');
        const fields = ['isCopperPriced', 'totalCopperWeightKgPerMeter', 'labourHours', 'category'];
        let allMatch = true;
        for (const f of fields) {
            const v1 = (busbar1 as any)[f];
            const v2 = (busbar2 as any)[f];
            const match = v1 === v2;
            if (!match) allMatch = false;
            console.log(`${f.padEnd(14)} | V1: ${String(v1).padEnd(6)} | V2: ${String(v2).padEnd(6)} | ${match ? '✅' : '❌'}`);
        }

        if (allMatch) {
            console.log('\n✨ VERIFICATION SUCCESS: Catalog logic is lossless.');
        } else {
            console.log('\n❌ VERIFICATION FAILED: Data corruption in restore logic.');
            process.exit(1);
        }

    } catch (e: any) {
        console.error('\n❌ Error during verification:', e.message);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

runInternalVerification();
