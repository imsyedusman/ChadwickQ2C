
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();

async function main() {
    const items = await prisma.catalogItem.findMany({ take: 5 });

    // Search for anything resembling 'NSX'
    const nsxLike = await prisma.catalogItem.findMany({
        where: {
            OR: [
                { partNumber: { contains: 'NSX', mode: 'insensitive' } },
                { description: { contains: 'NSX', mode: 'insensitive' } },
                { description: { contains: 'circuit breaker', mode: 'insensitive' } }
            ]
        },
        take: 10
    });

    const output = `Sample Items:\n${JSON.stringify(items, null, 2)}\n\nNSX Like Items:\n${JSON.stringify(nsxLike, null, 2)}`;
    fs.writeFileSync('debug_output.txt', output);
    console.log('Written to debug_output.txt');
}

main().finally(() => prisma.$disconnect());
export { };
