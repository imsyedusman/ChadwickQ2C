import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const items = await prisma.catalogItem.findMany({
        where: { category: 'Busbar' }
    });

    const grouped: Record<string, typeof items> = {};
    for (const item of items) {
        if (!item.partNumber) continue;
        if (!grouped[item.partNumber]) grouped[item.partNumber] = [];
        grouped[item.partNumber].push(item);
    }

    let deletedCount = 0;
    for (const pn in grouped) {
        const group = grouped[pn];
        if (group.length > 1) {
            // Sort by labourHours DESC (so the one with hours comes first), then by createdAt DESC (newest first)
            group.sort((a, b) => {
                if (b.labourHours !== a.labourHours) {
                    return b.labourHours - a.labourHours;
                }
                return b.createdAt.getTime() - a.createdAt.getTime();
            });

            // Keep the first one (highest labour, newest), delete the rest
            for (let i = 1; i < group.length; i++) {
                await prisma.catalogItem.delete({
                    where: { id: group[i].id }
                });
                deletedCount++;
                console.log(`Deleted duplicate ${pn} with labour ${group[i].labourHours}`);
            }
        }
    }

    console.log(`Finished. Deleted ${deletedCount} duplicate busbars.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
