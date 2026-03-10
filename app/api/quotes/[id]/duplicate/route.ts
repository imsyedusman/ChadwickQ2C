import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { Board, Item } from '@prisma/client';
import { generateRevisionNumber } from '@/lib/quote-numbering';

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

        const newQuoteNumber = await generateRevisionNumber(originalQuote.quoteNumber);

        // Create the new quote with all boards and items
        const newQuote = await prisma.quote.create({
            data: {
                quoteNumber: newQuoteNumber,
                clientName: originalQuote.clientName,
                clientCompany: originalQuote.clientCompany,
                projectRef: `${originalQuote.projectRef} (Copy)`,
                description: originalQuote.description,
                status: 'DRAFT',
                settingsSnapshot: originalQuote.settingsSnapshot,
                globalDiscount: originalQuote.globalDiscount,
                globalContingency: originalQuote.globalContingency,
                boards: {
                    create: originalQuote.boards.map((board: Board & { items: Item[] }) => ({
                        name: board.name,
                        type: board.type,
                        order: board.order,
                        isOptional: board.isOptional,
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
                            }))
                        }
                    }))
                }
            },
            include: {
                boards: {
                    include: {
                        items: true,
                    }
                }
            }
        });

        return NextResponse.json(newQuote);
    } catch (error) {
        console.error('Failed to duplicate quote:', error);
        return NextResponse.json({ error: 'Failed to duplicate quote' }, { status: 500 });
    }
}
