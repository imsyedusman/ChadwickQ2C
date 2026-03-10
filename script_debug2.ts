import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        const quotes = await prisma.quote.findMany({ orderBy: { createdAt: 'desc' }, take: 1 });
        if (quotes.length === 0) return console.log("No quotes!");

        const originalQuote = quotes[0];
        console.log(`Duplicating quote: ${originalQuote.id}`);

        // Fetch using the exact logic from the API route to see if it generates NaN or fails
        const q = await prisma.quote.findUnique({
            where: { id: originalQuote.id },
            include: { boards: { include: { items: true } } }
        });

        if (!q) return;

        console.log("Original TargetMarginPct via findUnique:", q.overrideTargetMarginPct);
        console.log("Original Rounding:", q.overrideRoundingIncrement);
        console.log("Original SettingsSnapshot:", q.settingsSnapshot);

        let hasBadItemFields = false;
        q.boards.forEach(b => {
            b.items.forEach(i => {
                if (typeof i.quantity !== 'number' && typeof i.quantity !== 'object') {
                    console.log(`Bad quantity type:`, typeof i.quantity);
                }
            });
        });

        // Test JSON parse
        let parsed = null;
        if (q.settingsSnapshot) {
            parsed = JSON.parse(q.settingsSnapshot);
            console.log("Parsed snapshot:", parsed);
        }

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
