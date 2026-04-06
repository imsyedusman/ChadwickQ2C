const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Ensuring Global Settings Exist ---');
  
  try {
    const defaultSettings = {
      id: 'global',
      labourRate: 100,
      consumablesPct: 0.03,
      overheadPct: 0.20,
      engineeringPct: 0.20,
      targetMarginPct: 0.18,
      gstPct: 0.10,
      roundingIncrement: 100,
      copperPricePerKg: 15.0,
      companyName: 'Chadwick',
    };

    const settings = await prisma.settings.upsert({
      where: { id: 'global' },
      update: {}, // Don't overwrite if it exists
      create: defaultSettings,
    });

    console.log('Global settings verified/created:', settings.id);
    console.log('Current Settings:', JSON.stringify(settings, null, 2));
    
  } catch (error) {
    console.error('Error ensuring settings:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
