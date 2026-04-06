import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { triggerSequenceSync } from '@/lib/quote-numbering';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { canEditQuote } from '@/lib/permissions';
import { logAction } from '@/lib/audit';
import { getResolvedUserId } from '@/lib/user-utils';
import { enrichItems } from '@/lib/enrichment';
import { upsertPipedriveOrganization, upsertPipedrivePerson } from '@/lib/pipedrive-sync-utils';
import { calculateQuoteTotalsServerSide } from '@/lib/pricing-service';
import { ensureQuoteSnapshot } from '@/lib/settings-service';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const quote: any = await prisma.quote.findUnique({
            where: { id },
            include: {
                boards: {
                    include: {
                        items: true,
                    },
                    orderBy: { order: 'asc' },
                },
                project: true,
                ...({
                    creator: { select: { name: true, email: true } },
                    modifier: { select: { name: true, email: true } }
                } as any)
            },
        } as any);

        if (!quote) {
            return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
        }

        // 1. Collect and Enrich all items from all boards in one batch
        const allItemsRaw = quote.boards.flatMap((b: any) => b.items);
        const allItemsEnriched = await enrichItems(allItemsRaw);

        // 2. Map enriched items back to their respective boards
        const itemMap = new Map(allItemsEnriched.map((i: any) => [i.id, i]));
        const enrichedBoards = quote.boards.map((board: any) => ({
            ...board,
            items: board.items.map((item: any) => itemMap.get(item.id) || item)
        }));

        // 3. Calculate Totals using the definitive source of truth
        const calculatedTotals = await calculateQuoteTotalsServerSide({
            ...quote,
            boards: enrichedBoards
        });

        return NextResponse.json({
            ...quote,
            boards: enrichedBoards,
            calculatedTotals
        });

    } catch (error) {
        console.error('Failed to fetch quote:', error);
        return NextResponse.json({ error: 'Failed to fetch quote' }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const { searchParams } = new URL(request.url);
        const permanent = searchParams.get('permanent') === 'true';

        const quote: any = await prisma.quote.findUnique({
            where: { id },
            select: { quoteNumber: true, createdBy: true }
        } as any);

        if (!quote) {
            return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
        }

        if (!(await canEditQuote(quote.createdBy))) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const session = await getServerSession(authOptions);
        const resolvedUserId = await getResolvedUserId(session);

        if (permanent) {
            await prisma.quote.delete({
                where: { id },
            });
            await triggerSequenceSync(quote.quoteNumber, true);
            await logAction(resolvedUserId, 'DELETE_QUOTE', 'QUOTE', id, { quoteNumber: quote.quoteNumber, permanent: true });
            return NextResponse.json({ success: true, permanent: true });
        } else {
            await prisma.quote.update({
                where: { id },
                data: { status: 'TRASH' }
            });
            await logAction(resolvedUserId, 'TRASH_QUOTE', 'QUOTE', id, { quoteNumber: quote.quoteNumber });
            return NextResponse.json({ success: true, trashed: true });
        }
    } catch (error) {
        console.error('Failed to delete quote:', error);
        return NextResponse.json({ error: 'Failed to delete quote' }, { status: 500 });
    }
}

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json() as any;
        
        const existingQuote: any = await prisma.quote.findUnique({
            where: { id },
            select: { quoteNumber: true, createdBy: true, settingsSnapshot: true } // Include snapshot check
        } as any);

        if (!existingQuote) {
            return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
        }

        if (!(await canEditQuote(existingQuote.createdBy))) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const session = await getServerSession(authOptions);
        const resolvedUserId = await getResolvedUserId(session);

        // Handle Pipedrive Upserts if IDs provided
        const updateData: any = {
            ...Object.fromEntries(
                Object.entries(body).filter(([key]) => ![ 'id', 'createdAt', 'updatedAt', 'boards', 'creator', 'modifier', 'pipedrive_org_id', 'pipedrive_person_id', 'settingsSnapshot' ].includes(key))
            ),
            lastModifiedBy: resolvedUserId,
        };

        // Snapshot Freezing Constraint: Never overwrite an existing snapshot via manual PUT
        if (!existingQuote.settingsSnapshot && body.settingsSnapshot) {
            updateData.settingsSnapshot = body.settingsSnapshot;
        }

        if (body.pipedrive_org_id) {
            const client = await upsertPipedriveOrganization(body.pipedrive_org_id);
            if (client) updateData.clientId = client.id;
        }

        if (body.pipedrive_person_id) {
            const contact = await upsertPipedrivePerson(body.pipedrive_person_id, updateData.clientId || existingQuote.clientId);
            if (contact) updateData.contactId = contact.id;
        }

        console.log(`[API PUT Quote] Updating quote ${id} with data:`, JSON.stringify(updateData));

        const updatedQuote = await prisma.quote.update({
            where: { id },
            data: updateData,
            include: {
                modifier: { select: { name: true } },
                creator: { select: { name: true } },
                boards: {
                    include: { items: true }
                }
            }
        } as any);

        // 1. Ensure Snapshot is frozen (Phase 1 logic)
        await ensureQuoteSnapshot(id);

        // 2. Perform a fresh calculation with frozen settings using the definitive source of truth
        const calculatedTotals = await calculateQuoteTotalsServerSide(updatedQuote);

        return NextResponse.json({
            ...updatedQuote,
            calculatedTotals
        });
    } catch (error: any) {
        console.error('Failed to update quote:', error);
        return NextResponse.json({ 
            error: 'Failed to update quote', 
            details: error.message,
            success: false 
        }, { status: 500 });
    }
}
