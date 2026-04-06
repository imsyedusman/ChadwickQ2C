import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  try {
    const settingsCount = await (prisma as any).settings.count();
    const globalSettings = await (prisma as any).settings.findUnique({ where: { id: 'global' } });
    console.log('Settings count:', settingsCount);
    console.log('Global settings found:', !!globalSettings);

    const quote = await (prisma as any).quote.findFirst();
    if (quote) {
      console.log('Quote fields:', Object.keys(quote));
      if ('gridInternalNotes' in quote) {
          console.log('gridInternalNotes field EXISTS on Quote');
      } else {
          console.log('gridInternalNotes field MISSING from Quote');
      }
    } else {
      console.log('No quotes found to inspect.');
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
