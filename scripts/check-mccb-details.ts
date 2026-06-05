import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
    const quoteItems = await prisma.item.findMany({
        where: {
            subcategory: "MCCB Accessories"
        },
        select: {
            id: true,
            partNumber: true,
            name: true,
            isSystemManaged: true,
            autoAdded: true
        }
    });
    
    console.log(JSON.stringify(quoteItems, null, 2));
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
