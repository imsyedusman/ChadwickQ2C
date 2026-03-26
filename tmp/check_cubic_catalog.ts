import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const items = await prisma.catalogItem.findMany({
        where: {
            partNumber: {
                in: ['1A-TIERS', '1A-COMPARTMENTS', '1A-50KA', '1A-COLOUR']
            }
        }
    });
    console.log(JSON.stringify(items, null, 2));
}
main();
