const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verify() {
    const oldPath = await prisma.catalogItem.count({
        where: { subcategory: { contains: 'Miscellaneous > Metering > Power Meter' } }
    });

    const newPowerMeters = await prisma.catalogItem.count({
        where: { subcategory: 'Power Meters' }
    });

    const newAccessories = await prisma.catalogItem.count({
        where: { subcategory: 'Power Meter Accessories' }
    });

    console.log(`Old path items remaining: ${oldPath}`);
    console.log(`New "Power Meters": ${newPowerMeters} items`);
    console.log(`New "Power Meter Accessories": ${newAccessories} items`);
    console.log(`Total: ${newPowerMeters + newAccessories} items`);

    if (oldPath === 0) {
        console.log('\n✅ Migration successful!');
    } else {
        console.log('\n⚠️ Some items still have old paths');
    }

    await prisma.$disconnect();
}

verify();
