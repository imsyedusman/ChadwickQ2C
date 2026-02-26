import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const res = await prisma.catalogItem.updateMany({
        where: { partNumber: '' },
        data: { partNumber: null }
    });
    console.log('Updated empty string part numbers to null. Count:', res.count);
}
main().finally(() => prisma.$disconnect());
