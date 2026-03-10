import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        const quote = await prisma.quote.findFirst();
        if (!quote) return;

        // Force some overrides
        await prisma.quote.update({
            where: { id: quote.id },
            data: {
                overrideTargetMarginPct: 0.25,
                overrideRoundingIncrement: 10
            }
        });

        const res = await fetch(`http://localhost:3000/api/quotes/${quote.id}/duplicate`, {
            method: 'POST'
        });
        const dupQuote = await res.json();

        console.log("Original Margin:", quote.overrideTargetMarginPct);
        console.log("Copied Margin in API Response:", dupQuote.overrideTargetMarginPct);
        console.log("Copied Rounding in API Response:", dupQuote.overrideRoundingIncrement);

        if (dupQuote.overrideTargetMarginPct === undefined) {
            console.log("Wait, the response is returning UNDEFINED? Or does the JSON serializer strip it?");
        }
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
