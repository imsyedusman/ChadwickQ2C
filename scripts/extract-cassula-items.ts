import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
    const quote = await prisma.quote.findFirst({
        where: { quoteNumber: 'Q-1015' },
        include: {
            boards: {
                include: { items: true }
            }
        }
    });

    if (!quote) {
        console.error('Quote Q-1015 not found.');
        return;
    }

    console.log(`\nQuote: ${quote.projectRef || quote.quoteNumber}`);

    quote.boards.forEach(board => {
        console.log(`\nBoard: ${board.name}`);
        console.log(`| Category | Subcategory | Item | Qty | Labour Hours | Material Cost |`);
        console.log(`|----------|-------------|------|-----|--------------|---------------|`);

        board.items.sort((a, b) => (a.category || '').localeCompare(b.category || '')).forEach(item => {
            const qty = Number(item.quantity) || 0;
            const labour = (item.labourHours || 0) * qty;
            const cost = (item.unitPrice || 0) * qty;

            console.log(`| ${item.category} | ${item.subcategory || ''} | ${item.name} | ${qty} | ${labour.toFixed(2)} | $${cost.toFixed(2)} |`);
        });
    });
}

run()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
