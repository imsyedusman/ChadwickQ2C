
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkItem() {
    try {
        const item = await prisma.catalogItem.findFirst({
            where: {
                OR: [
                    { partNumber: 'MISC-SITE-RECONNECTION' },
                    { partNumber: 'misc-site-reconnection' }, // check case insensitive just in case
                    { description: { contains: 'Reconnection' } }
                ]
            }
        });

        if (item) {
            console.log('Found Item:', item);
        } else {
            console.log('Item NOT found.');
        }
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkItem();
