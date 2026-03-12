import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { Board, Item } from '@prisma/client';
import { generateRevisionNumber } from '@/lib/quote-numbering';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logAction } from '@/lib/audit';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        // Fetch the original quote with all boards and items
        const originalQuote = await prisma.quote.findUnique({
            where: { id },
            include: {
                boards: {
                    include: {
                        items: true,
                    }
                }
            }
        });

        if (!originalQuote) {
            return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
        }

        // We run the revision lookup and insertion in a Transaction
        // to prevent race conditions during simultaneous duplication.
        const newQuote = await prisma.$transaction(async (tx) => {
            // Use the utility to generate the next full quote number (relative to base)
            const newFullQuoteNumber = await generateRevisionNumber(originalQuote.quoteNumber);

            // Get the base number to correctly increment the internal revision field
            const baseMatch = newFullQuoteNumber.match(/^(Q\d{2}-\d{4})/);
            const baseNumber = baseMatch ? baseMatch[1] : newFullQuoteNumber;

            // For the numeric revision field, we can either keep it as 0 (since suffix is in string)
            // or increment it for internal sorting. Let's increment it so we maintain original order.
            const maxRevisionResult = await tx.quote.aggregate({
                where: {
                    quoteNumber: {
                        startsWith: baseNumber
                    }
                },
                _max: { revision: true }
            });
            const newRevision = (maxRevisionResult._max.revision ?? 0) + 1;

            const session = await getServerSession(authOptions);
            const userId = session?.user?.id;

            // Create the new quote with all boards and items
            return await tx.quote.create({
                data: {
                    quoteNumber: newFullQuoteNumber,
                    revision: newRevision,
                    clientName: originalQuote.clientName,
                    clientCompany: originalQuote.clientCompany,
                    projectRef: `${originalQuote.projectRef} (Copy)`,
                    description: originalQuote.description,
                    status: 'DRAFT',
                    settingsSnapshot: originalQuote.settingsSnapshot,
                    globalDiscount: originalQuote.globalDiscount,
                    globalContingency: originalQuote.globalContingency,
                    // Copy exact Financial Overrides
                    overrideLabourRate: originalQuote.overrideLabourRate,
                    overrideOverheadPct: originalQuote.overrideOverheadPct,
                    overrideEngineeringPct: originalQuote.overrideEngineeringPct,
                    overrideTargetMarginPct: originalQuote.overrideTargetMarginPct,
                    overrideConsumablesPct: originalQuote.overrideConsumablesPct,
                    overrideGstPct: originalQuote.overrideGstPct,
                    overrideRoundingIncrement: originalQuote.overrideRoundingIncrement,
                    overrideCopperPricePerKg: originalQuote.overrideCopperPricePerKg,
                    
                    // Ownership
                    createdBy: userId as string,
                    lastModifiedBy: userId as string,

                    boards: {
                        create: originalQuote.boards.map((board: Board & { items: Item[] }) => ({
                            name: board.name,
                            type: board.type,
                            order: board.order,
                            isOptional: board.isOptional,
                            mccbVariant: board.mccbVariant,
                            config: board.config,
                            items: {
                                create: board.items.map((item: Item) => ({
                                    category: item.category,
                                    subcategory: item.subcategory,
                                    name: item.name,
                                    description: item.description,
                                    quantity: item.quantity,
                                    unitPrice: item.unitPrice,
                                    labourHours: item.labourHours,
                                    cost: item.cost,
                                    notes: item.notes,
                                    isDefault: item.isDefault,
                                    order: item.order,
                                    isSheetmetal: item.isSheetmetal,
                                    isSystemManaged: item.isSystemManaged,
                                    systemTag: item.systemTag,
                                    partNumber: item.partNumber,
                                    productFrame: item.productFrame,
                                    mccbVariant: item.mccbVariant,
                                    systemRuleType: item.systemRuleType
                                }))
                            }
                        }))
                    }
                },
                include: {
                    boards: {
                        include: { items: true }
                    }
                }
            } as any);
        });

        await logAction((newQuote as any).createdBy, 'DUPLICATE_QUOTE', 'QUOTE', newQuote.id, { 
            originalId: id, 
            newQuoteNumber: newQuote.quoteNumber 
        });

        return NextResponse.json(newQuote);
    } catch (error) {
        console.error('Failed to duplicate quote:', error);
        return NextResponse.json({ error: 'Failed to duplicate quote' }, { status: 500 });
    }
}
