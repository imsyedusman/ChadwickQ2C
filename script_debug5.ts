import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        const quote = await prisma.quote.findFirst();
        if (!quote) return;

        const res = await fetch(`http://localhost:3000/api/quotes/${quote.id}`);
        const data = await res.json();

        console.log("Quotes from API:");
        console.log("Labour:", data.overrideLabourRate);
        console.log("Margin:", data.overrideTargetMarginPct);
        console.log("Settings Snapshot:", data.settingsSnapshot);

        let sumPrices = 0;
        let sumQts = 0;
        data.boards.forEach((b: any) => {
            b.items.forEach((i: any) => {
                sumPrices += i.unitPrice;
                sumQts += Number(i.quantity);
            })
        });
        console.log("Total Base Price:", sumPrices, "Total Qty:", sumQts);

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
