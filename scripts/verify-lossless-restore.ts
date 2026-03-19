import * as fs from 'fs';

const API_URL = 'http://localhost:3000/api/admin/backup/catalog';

async function runVerification() {
    console.log('🚀 Starting Nuke and Pave Verification (Fetch Mode)...');

    try {
        // 1. Export current state (Post-Fix)
        console.log('📥 Exporting current state (backup1)...');
        const res1 = await fetch(API_URL);
        if (!res1.ok) throw new Error(`Export failed: ${res1.statusText}`);
        const backup1 = await res1.json();
        fs.writeFileSync('tmp/verification-backup-1.json', JSON.stringify(backup1, null, 2));

        // 2. Restore (with clearBeforeImport)
        console.log('♻️ Restoring backup1 back to DB (Wiping first)...');
        const res2 = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...backup1,
                clearBeforeImport: true
            })
        });
        if (!res2.ok) {
            const errBody = await res2.json();
            throw new Error(`Restore failed: ${JSON.stringify(errBody)}`);
        }
        const restoreResult = await res2.json();
        console.log('✅ Restore Status:', restoreResult.status);

        // 3. Export again
        console.log('📥 Exporting again (backup2)...');
        const res3 = await fetch(API_URL);
        if (!res3.ok) throw new Error(`Second export failed: ${res3.statusText}`);
        const backup2 = await res3.json();
        fs.writeFileSync('tmp/verification-backup-2.json', JSON.stringify(backup2, null, 2));

        // 4. Comparison (Samples)
        const findBusbar = (items: any[]) => items.find(i => i.partNumber === 'BB-3000A');
        
        const item1 = findBusbar(backup1.items);
        const item2 = findBusbar(backup2.items);

        if (!item1 || !item2) {
            console.log('❌ BB-3000A not found in one of the backups.');
            process.exit(1);
        }

        console.log('\n📊 Sample Comparison (BB-3000A):');
        console.log('Field          | Backup 1       | Backup 2');
        console.log('---------------|----------------|----------------');
        const fields = ['isCopperPriced', 'totalCopperWeightKgPerMeter', 'labourHours', 'category'];
        
        let allMatch = true;
        for (const f of fields) {
            const v1 = item1[f];
            const v2 = item2[f];
            const match = v1 === v2;
            if (!match) allMatch = false;
            console.log(`${f.padEnd(14)} | ${String(v1).padEnd(14)} | ${String(v2).padEnd(14)} ${match ? '✅' : '❌'}`);
        }

        if (allMatch) {
            console.log('\n✨ VERIFICATION SUCCESS: Backup/Restore is lossless.');
        } else {
            console.log('\n❌ VERIFICATION FAILED: Data mismatch detected.');
            process.exit(1);
        }

    } catch (e: any) {
        console.error('❌ Verification Error:', e.message);
        process.exit(1);
    }
}

runVerification();
