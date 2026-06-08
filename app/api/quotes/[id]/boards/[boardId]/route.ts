import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { calculateQuoteTotalsServerSide } from '@/lib/pricing-service';

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string; boardId: string }> }
) {
    try {
        const { boardId } = await params;
        const body = await request.json();
        const { 
            name, 
            type, 
            config, 
            internalNotes, 
            useCustomDescription, 
            hideAutoDescription,
            customDescription, 
            descriptionOptions,
            reviewedCategories
        } = body;

        // Resolve new MCCB Variant if fault rating changed
        let newMccbVariant = undefined;
        if (config && config.faultRating) {
            newMccbVariant = config.faultRating.includes('10kA') ? 'B3' :
                config.faultRating.includes('25kA') ? 'B3' :
                    config.faultRating.includes('36kA') ? 'F3' :
                        config.faultRating.includes('50kA') ? 'N3' :
                            config.faultRating.includes('70kA') ? 'H3' : 'B3';

            // Trace legacy ratings on update
            if (config.currentRating === '4000A' || config.faultRating === '63kA') {
                console.warn(`Legacy rating preserved on update (${config.currentRating || config.faultRating}) for boardId: ${boardId}`);
            }
        }

        // Build data object dynamically to avoid sending undefined fields
        const data: any = {};
        if (name !== undefined) data.name = name;
        if (type !== undefined) data.type = type;
        if (internalNotes !== undefined) data.internalNotes = internalNotes;
        if (useCustomDescription !== undefined) data.useCustomDescription = useCustomDescription;
        if (hideAutoDescription !== undefined) data.hideAutoDescription = hideAutoDescription;
        if (customDescription !== undefined) data.customDescription = customDescription?.trim();
        if (descriptionOptions !== undefined) {
            data.descriptionOptions = typeof descriptionOptions === 'string' 
                ? JSON.parse(descriptionOptions) 
                : descriptionOptions;
        }
        if (reviewedCategories !== undefined) {
            data.reviewedCategories = reviewedCategories;
        }
        if (config !== undefined) {
            data.config = JSON.stringify(config);
            data.mccbVariant = newMccbVariant;
        }

        const updatedBoard = await prisma.board.update({
            where: { id: boardId },
            data,
        });

        if (config) {
            // 1. Sync standard board items (busbars etc)
            const { syncBoardItems } = await import('@/lib/board-item-service');
            await syncBoardItems(boardId, config, { forceTiers: true });

            // 2. Sync MCCB Pairing (Update bases for generic trip units)
            // This ensures if board upgrades (25kA -> 50kA), generic trips get new bases (B3 -> N3)
            const { AutomationService } = await import('@/lib/automation');
            await AutomationService.syncMccbTripBasePairs(boardId);
        }

        // Refetch board with items to ensure UI gets the latest state (including auto-added/released items)
        const freshBoard = await prisma.board.findUnique({
            where: { id: boardId },
            include: { items: true }
        });

        // Calculate updated totals for the entire quote
        const quoteWithBoards = await prisma.quote.findUnique({
            where: { id: (params as any).id || updatedBoard.quoteId },
            include: { boards: { include: { items: true } } }
        });

        const calculatedTotals = await calculateQuoteTotalsServerSide(quoteWithBoards);

        return NextResponse.json({
            ...freshBoard,
            debugConfig: config,
            calculatedTotals
        });
    } catch (error) {
        console.error('Failed to update board', error);
        return NextResponse.json({ error: 'Failed to update board' }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string; boardId: string }> }
) {
    try {
        const { boardId } = await params;

        await prisma.board.delete({
            where: { id: boardId },
        });

        // Calculate updated totals for the entire quote
        const quoteWithBoards = await prisma.quote.findUnique({
            where: { id: (params as any).id }, // We assume 'id' is quoteId from params
            include: { boards: { include: { items: true } } }
        });

        const calculatedTotals = await calculateQuoteTotalsServerSide(quoteWithBoards);

        return NextResponse.json({
            success: true,
            calculatedTotals
        });
    } catch (error) {
        console.error('Failed to delete board', error);
        return NextResponse.json({ error: 'Failed to delete board' }, { status: 500 });
    }
}
