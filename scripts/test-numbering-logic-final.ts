import { PrismaClient } from '@prisma/client';
import { generateNextQuoteNumber, triggerSequenceSync, syncQuoteSequence } from '../lib/quote-numbering';
import prisma from '../lib/prisma';

async function test() {
    console.log('--- STARTING VERIFICATION ---');
    
    const year = new Date().getFullYear();
    const shortYear = year.toString().slice(-2);

    // 1. Cleanup existing test data for this year (CAUTION: using a high number to avoid real data)
    await prisma.quote.deleteMany({
        where: {
            quoteNumber: {
                startsWith: `Q${shortYear}-9` // High range for testing
            }
        }
    });

    // 2. Mock a sequence state
    await prisma.quoteSequence.upsert({
        where: { year },
        update: { lastNumber: 9000 },
        create: { year, lastNumber: 9000 }
    });

    console.log('Sequence set to 9000');

    // 3. Generate Q9001
    const n1 = await generateNextQuoteNumber();
    console.log('Generated:', n1); // Should be QYY-9001
    
    await prisma.quote.create({
        data: {
            quoteNumber: n1,
            clientName: 'Test Client',
            status: 'DRAFT'
        }
    });

    // 4. Manual rename to Q9010 (Forward Sync)
    console.log('Renaming Q9001 to Q9010...');
    await prisma.quote.update({
        where: { quoteNumber_revision: { quoteNumber: n1, revision: 0 } },
        data: { quoteNumber: `Q${shortYear}-9010` }
    });
    await triggerSequenceSync(`Q${shortYear}-9010`);

    const seqAfterRename = await prisma.quoteSequence.findUnique({ where: { year } });
    console.log('Sequence after rename:', seqAfterRename?.lastNumber); // Should be 9010

    const n2 = await generateNextQuoteNumber();
    console.log('Next generated after rename:', n2); // Should be QYY-9011
    
    await prisma.quote.create({
        data: {
            quoteNumber: n2,
            clientName: 'Test Client',
            status: 'DRAFT'
        }
    });

    // 5. Permanent Delete of Q9011 (Tail Deletion)
    console.log('Deleting Q9011 (Tail)...');
    await prisma.quote.delete({
        where: { quoteNumber_revision: { quoteNumber: n2, revision: 0 } }
    });
    await triggerSequenceSync(n2, true);

    const seqAfterDeleteTail = await prisma.quoteSequence.findUnique({ where: { year } });
    console.log('Sequence after tail delete:', seqAfterDeleteTail?.lastNumber); // Should be 9010 (wound back)

    const n3 = await generateNextQuoteNumber();
    console.log('Next generated after tail delete:', n3); // Should be QYY-9011 AGAIN
    
    await prisma.quote.create({
        data: {
            quoteNumber: n3,
            clientName: 'Test Client',
            status: 'DRAFT'
        }
    });

    // 6. Permanent Delete of Q9010 (Middle Deletion - although only 1 quote left, it's the tail)
    // Let's create another one first to have a "middle"
    const n4 = await generateNextQuoteNumber(); // QYY-9012
    console.log('Generated:', n4);
    await prisma.quote.create({ data: { quoteNumber: n4, clientName: 'Test', status: 'DRAFT' } });

    console.log('Deleting Q9011 (Middle)...');
    await prisma.quote.delete({
        where: { quoteNumber_revision: { quoteNumber: n3, revision: 0 } }
    });
    await triggerSequenceSync(n3, true);

    const seqAfterDeleteMiddle = await prisma.quoteSequence.findUnique({ where: { year } });
    console.log('Sequence after middle delete:', seqAfterDeleteMiddle?.lastNumber); // Should STILL be 9012

    const n5 = await generateNextQuoteNumber();
    console.log('Next generated after middle delete:', n5); // Should be QYY-9013

    // 7. Cleanup
    await prisma.quote.deleteMany({
        where: {
            quoteNumber: {
                startsWith: `Q${shortYear}-9`
            }
        }
    });
    
    // Restore sequence to something reasonable or leave it (it's test data)
    
    console.log('--- VERIFICATION COMPLETE ---');
}

test()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
