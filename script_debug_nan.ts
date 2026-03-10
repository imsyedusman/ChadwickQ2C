import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        const quotes = await prisma.quote.findMany({ orderBy: { createdAt: 'desc' }, take: 2 });
        if (quotes.length < 1) {
            console.log("No quotes to test");
            return;
        }

        const originalQuote = quotes.find(q => q.revision === 0) || quotes[0];
        console.log("\n--- ORIGINAL QUOTE COSTING SETTINGS ---");
        console.log(`id: ${originalQuote.id}, revision: ${originalQuote.revision}`);
        console.log("LabourRate:", originalQuote.overrideLabourRate);
        console.log("TargetMarginPct:", originalQuote.overrideTargetMarginPct);
        console.log("RoundingIncrement:", originalQuote.overrideRoundingIncrement);
        console.log("Settings Snapshot:", originalQuote.settingsSnapshot);

        // Fetch duplicated quote if exists
        const duplicateQuote = quotes.find(q => q.quoteNumber === originalQuote.quoteNumber && q.revision > 0) || quotes[0];
        if (duplicateQuote && duplicateQuote.id !== originalQuote.id) {
            console.log("\n--- DUPLICATE QUOTE COSTING SETTINGS ---");
            console.log(`id: ${duplicateQuote.id}, revision: ${duplicateQuote.revision}`);
            console.log("LabourRate:", duplicateQuote.overrideLabourRate);
            console.log("TargetMarginPct:", duplicateQuote.overrideTargetMarginPct);
            console.log("RoundingIncrement:", duplicateQuote.overrideRoundingIncrement);
        } else {
            console.log("No duplicate exists for comparison");
        }
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
