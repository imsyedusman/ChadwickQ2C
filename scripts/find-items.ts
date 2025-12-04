
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Searching for CT Type items...');
    const ctTypes = await prisma.catalogItem.findMany({
        where: {
            partNumber: { in: ['CT-S-TYPE', 'CT-T-TYPE', 'CT-W-TYPE', 'CT-U-TYPE'] }
        }
    });

    console.log('\nCT Type Items:');
    ctTypes.forEach(item => {
        console.log(`${item.partNumber}: ${item.description}`);
    });

    console.log('\n\nSearching for all BB- busbars...');
    const customBusbars = await prisma.catalogItem.findMany({
        where: {
            partNumber: { startsWith: 'BB-' }
        },
        orderBy: { partNumber: 'asc' }
    });

    console.log('\nCustom Busbars (BB-):');
    customBusbars.forEach(item => {
        console.log(`${item.partNumber}`);
    });

    console.log('\n\nSearching for all BBC- busbars...');
    const cubicBusbars = await prisma.catalogItem.findMany({
        where: {
            partNumber: { startsWith: 'BBC-' }
        },
        orderBy: { partNumber: 'asc' }
    });

    console.log('\nCubic Busbars (BBC-):');
    cubicBusbars.forEach(item => {
        console.log(`${item.partNumber}`);
    });

    console.log('\n\nSearching for CT Chamber Labour items...');
    const ctLabour = await prisma.catalogItem.findMany({
        where: {
            partNumber: { startsWith: 'CT-' },
            description: { contains: 'Chamber' }
        },
        orderBy: { partNumber: 'asc' }
    });

    console.log('\nCT Labour Items:');
    ctLabour.forEach(item => {
        console.log(`${item.partNumber}: ${item.description}`);
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
