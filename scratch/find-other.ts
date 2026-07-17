import { PrismaClient } from '@prisma/client';
import { resolveWorkshopActivity, WORKSHOP_ACTIVITIES } from '../lib/items/workshop-categorization';

const prisma = new PrismaClient();

async function main() {
    console.log("Fetching all unique items from quotes...");
    
    // Fetch unique items based on part number to avoid duplicates
    const allItems = await prisma.item.findMany({
        distinct: ['partNumber', 'name'],
        select: {
            partNumber: true,
            name: true,
            description: true,
            category: true,
            subcategory: true,
            isSystemManaged: true,
            systemTag: true,
            cost: true,
            labourHours: true,
            unitPrice: true,
            board: {
                select: {
                    quote: {
                        select: {
                            quoteNumber: true
                        }
                    }
                }
            }
        }
    });

    const otherItems = [];

    for (const item of allItems) {
        const activity = resolveWorkshopActivity(item as any);
        if (activity === WORKSHOP_ACTIVITIES.OTHER) {
            otherItems.push(item);
        }
    }

    console.log(`Found ${otherItems.length} unique items categorized as 'Other':\n`);
    
    otherItems.forEach(item => {
        console.log(`- Part Number: ${item.partNumber || 'N/A'}`);
        console.log(`  Name/Desc  : ${item.name} / ${item.description || 'N/A'}`);
        console.log(`  Material   : $${item.unitPrice}`);
        console.log(`  Labour     : ${item.labourHours} hrs`);
        console.log(`  Category   : ${item.category} / ${item.subcategory || 'N/A'}`);
        console.log(`  Quote Ref  : ${item.board?.quote?.quoteNumber || 'N/A'}`);
        console.log('--------------------------------------------------');
    });

}

main().catch(console.error).finally(() => prisma.$disconnect());
