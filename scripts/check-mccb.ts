import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
    const catalogItems = await prisma.catalogItem.findMany({
        where: {
            OR: [
                { category: { contains: "MCCB Accessories" } },
                { subcategory: { contains: "MCCB Accessories" } },
            ]
        }
    });
    
    const catCounts: Record<string, number> = {};
    catalogItems.forEach(i => {
        const path = `${i.category} -> ${i.subcategory}`;
        catCounts[path] = (catCounts[path] || 0) + 1;
    });
    console.log("CatalogItem counts for MCCB Accessories:");
    console.log(JSON.stringify(catCounts, null, 2));

    const quoteItems = await prisma.item.findMany({
        where: {
            OR: [
                { category: { contains: "MCCB Accessories" } },
                { subcategory: { contains: "MCCB Accessories" } },
            ]
        }
    });
    
    const quoteCounts: Record<string, number> = {};
    quoteItems.forEach(i => {
        const path = `${i.category} -> ${i.subcategory}`;
        quoteCounts[path] = (quoteCounts[path] || 0) + 1;
    });
    console.log("Quote Item counts for MCCB Accessories:");
    console.log(JSON.stringify(quoteCounts, null, 2));
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
