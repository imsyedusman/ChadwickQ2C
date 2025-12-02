const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function unifyPowerMeters() {
    console.log('=== Power Meter Category Unification ===\n');

    try {
        // Step 1: Find all items that need to be updated
        console.log('Step 1: Finding items to update...\n');

        const schneiderMeters = await prisma.catalogItem.findMany({
            where: {
                subcategory: 'Miscellaneous > Metering > Power Meter'
            },
            select: {
                id: true,
                brand: true,
                partNumber: true,
                description: true,
                subcategory: true,
            }
        });

        const meterAccessories = await prisma.catalogItem.findMany({
            where: {
                subcategory: 'Miscellaneous > Metering > Power Meter Accessories'
            },
            select: {
                id: true,
                brand: true,
                partNumber: true,
                description: true,
                subcategory: true,
            }
        });

        console.log(`Found ${schneiderMeters.length} Schneider Power Meters to update:`);
        schneiderMeters.forEach(item => {
            console.log(`  - ${item.partNumber}: ${item.description.substring(0, 60)}`);
        });

        console.log(`\nFound ${meterAccessories.length} Power Meter Accessories to update:`);
        meterAccessories.forEach(item => {
            console.log(`  - ${item.partNumber}: ${item.description.substring(0, 60)}`);
        });

        // Step 2: Check for potential conflicts
        console.log('\n\nStep 2: Checking for conflicts...\n');

        // Check if any items already exist with the new subcategories and same part numbers
        const existingPowerMeters = await prisma.catalogItem.findMany({
            where: {
                subcategory: 'Power Meters',
                partNumber: {
                    in: schneiderMeters.map(m => m.partNumber).filter(Boolean)
                }
            }
        });

        const existingAccessories = await prisma.catalogItem.findMany({
            where: {
                subcategory: 'Power Meter Accessories',
                partNumber: {
                    in: meterAccessories.map(m => m.partNumber).filter(Boolean)
                }
            }
        });

        if (existingPowerMeters.length > 0 || existingAccessories.length > 0) {
            console.log('⚠️  WARNING: Found potential duplicate items!');
            if (existingPowerMeters.length > 0) {
                console.log(`  ${existingPowerMeters.length} power meters with same part numbers already exist in target category`);
            }
            if (existingAccessories.length > 0) {
                console.log(`  ${existingAccessories.length} accessories with same part numbers already exist in target category`);
            }
            console.log('\nAborting migration. Please investigate duplicates first.');
            return;
        }

        console.log('✓ No conflicts found');

        // Step 3: Perform the migration
        console.log('\n\nStep 3: Performing migration...\n');

        // Update Schneider Power Meters
        const metersResult = await prisma.catalogItem.updateMany({
            where: {
                subcategory: 'Miscellaneous > Metering > Power Meter'
            },
            data: {
                subcategory: 'Power Meters'
            }
        });

        console.log(`✓ Updated ${metersResult.count} power meters to "Power Meters"`);

        // Update Power Meter Accessories
        const accessoriesResult = await prisma.catalogItem.updateMany({
            where: {
                subcategory: 'Miscellaneous > Metering > Power Meter Accessories'
            },
            data: {
                subcategory: 'Power Meter Accessories'
            }
        });

        console.log(`✓ Updated ${accessoriesResult.count} accessories to "Power Meter Accessories"`);

        // Step 4: Verify the changes
        console.log('\n\nStep 4: Verifying changes...\n');

        const allPowerMeters = await prisma.catalogItem.findMany({
            where: {
                OR: [
                    { subcategory: 'Power Meters' },
                    { subcategory: 'Power Meter Accessories' }
                ]
            },
            select: {
                brand: true,
                subcategory: true,
            }
        });

        // Group by brand and subcategory
        const summary = allPowerMeters.reduce((acc, item) => {
            const key = `${item.brand || 'null'} - ${item.subcategory}`;
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {});

        console.log('Final distribution:');
        Object.entries(summary).forEach(([key, count]) => {
            console.log(`  ${key}: ${count} items`);
        });

        // Check for any remaining old categories
        const remainingOld = await prisma.catalogItem.count({
            where: {
                OR: [
                    { subcategory: { contains: 'Miscellaneous > Metering > Power Meter' } }
                ]
            }
        });

        if (remainingOld > 0) {
            console.log(`\n⚠️  WARNING: ${remainingOld} items still have old category paths!`);
        } else {
            console.log('\n✅ SUCCESS: All power meters have been unified!');
        }

        console.log('\n\n=== Migration Complete ===');
        console.log('\nNext steps:');
        console.log('1. Check the Quote Builder UI to verify the unified navigation');
        console.log('2. Test Manage Price Lists for Schneider Electric items');
        console.log('3. Create a catalog backup to preserve the changes');

    } catch (error) {
        console.error('\n❌ Error during migration:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

unifyPowerMeters()
    .catch(console.error);
