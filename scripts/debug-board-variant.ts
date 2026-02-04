import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Board Variant Debug ---');

    // 1. Check last 5 Boards
    console.log('\n[1] Last 5 Boards:');
    const boards = await prisma.board.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' }
    });

    boards.forEach(b => {
        let config = {};
        try { config = b.config ? JSON.parse(b.config) : {}; } catch { }
        console.log(`- Board: ${b.name} (ID: ${b.id})`);
        console.log(`  mccbVariant (Column): ${(b as any).mccbVariant}`);
        console.log(`  Fault Rating (Config): ${(config as any).faultRating}`);
        console.log('---');
    });

    // 2. Check Items on latest board
    if (boards.length > 0) {
        const latestBoard = boards[0];
        console.log(`\n[2] Items on Latest Board: ${latestBoard.name}`);
        const items = await prisma.item.findMany({
            where: { boardId: latestBoard.id },
            orderBy: { createdAt: 'desc' },
            take: 10
        });

        items.forEach(i => {
            console.log(`- Item: ${i.name} (Qty: ${i.quantity})`);
            console.log(`  Part: ${(i as any).partNumber} | Variant: ${(i as any).mccbVariant}`);
            console.log(`  SystemTag: ${(i as any).systemTag} | Role: ${(i as any).mccbRole}`);
            console.log('---');
        });
    }

    // 3. Check Rules for generic trip
    const GENERIC_TRIP = 'C1035E100';
    const rules = await (prisma as any).mccbTripBaseRule.findMany({ where: { tripPartNumber: GENERIC_TRIP } });
    console.log(`\n[3] Rules for ${GENERIC_TRIP}:`);
    rules.forEach((r: any) => console.log(`  ${r.variant} -> ${r.basePartNumber}`));
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
