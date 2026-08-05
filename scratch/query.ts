import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const pairs = [
    ['TRV00121', 'LV434201'],
    ['LV434128', 'LV434201'],
    ['48250500', '48250082'],
    ['48250501', '48250082'],
    ['EM27072DMV53X2SN', 'TCD3X630150CMX'],
  ];

  for (const pair of pairs) {
    console.log(`\n--- Pair: ${pair[0]} & ${pair[1]} ---`);
    const rules1 = await prisma.mccbTripBaseRule.findMany({
      where: { tripPartNumber: pair[0], basePartNumber: pair[1] }
    });
    const rules2 = await prisma.mccbTripBaseRule.findMany({
      where: { tripPartNumber: pair[1], basePartNumber: pair[0] }
    });

    if (rules1.length > 0) {
      console.log(`FOUND in mccbTripBaseRule: Trip=${pair[0]}, Base=${pair[1]}`);
    } else if (rules2.length > 0) {
      console.log(`FOUND in mccbTripBaseRule: Trip=${pair[1]}, Base=${pair[0]}`);
    } else {
      console.log('NOT FOUND in mccbTripBaseRule.');
      const ruleTables = ['MccbTripBaseRule', 'PairingRule'];
      for (const p of pair) {
        for (const t of ruleTables) {
          if (t === 'MccbTripBaseRule') {
            const rules = await prisma.mccbTripBaseRule.findMany({
              where: {
                OR: [
                  { tripPartNumber: { equals: p, mode: 'insensitive' } },
                  { basePartNumber: { equals: p, mode: 'insensitive' } }
                ]
              }
            });
            if (rules.length > 0) {
              console.log(`Part ${p} FOUND individually in MccbTripBaseRule.`);
            }
          } else if (t === 'PairingRule') {
            const rules = await prisma.pairingRule.findMany({
              where: {
                OR: [
                  { inputPartNumber: { equals: p, mode: 'insensitive' } },
                  { outputPartNumber: { equals: p, mode: 'insensitive' } }
                ]
              }
            });
            if (rules.length > 0) {
              console.log(`Part ${p} FOUND individually in PairingRule.`);
            }
          }
        }
      }
      console.log(`NOT FOUND together. (FLAG: NEITHER PART APPEARS IN RULES TOGETHER)`);
    }
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
