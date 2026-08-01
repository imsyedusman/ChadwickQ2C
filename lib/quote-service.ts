import prisma from '@/lib/prisma';
import { generateNextQuoteNumber } from '@/lib/quote-numbering';
import { getOrCreateDefaultAdminUser } from '@/lib/user-utils';
import { logAction } from '@/lib/audit';
import { ensureQuoteSnapshot } from '@/lib/settings-service';

export async function createQuote(params: { projectId: string }) {
    const { projectId } = params;

    const project = await (prisma as any).project.findUnique({
        where: { id: projectId }
    });

    if (!project) {
        throw new Error(`Project with ID ${projectId} not found.`);
    }

    let dbUser = await (prisma as any).user.findUnique({
        where: { email: 'claude@chadwickswitchboards.com.au' }
    });

    if (!dbUser) {
        dbUser = await getOrCreateDefaultAdminUser();
    }

    if (!dbUser) {
        throw new Error('Quote creation failed: No valid users found in database to assign as quote creator.');
    }
    const userId = dbUser.id;

    const quoteNumber = await generateNextQuoteNumber();

    const newQuote = await (prisma as any).quote.create({
        data: {
            quoteNumber,
            clientName: project.clientName || '',
            clientCompany: project.companyName || '',
            projectRef: project.projectName || '',
            description: project.projectDescription || '',
            status: 'DRAFT',
            createdBy: userId,
            lastModifiedBy: userId,
            projectId: project.id,
        },
    });

    await logAction(userId, 'CREATE_QUOTE', 'QUOTE', newQuote.id, { quoteNumber });
    await ensureQuoteSnapshot(newQuote.id);

    return newQuote;
}
