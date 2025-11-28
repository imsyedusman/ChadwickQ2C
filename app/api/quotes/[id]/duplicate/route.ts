import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

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

        // Generate a new quote number
        const allQuotes = await prisma.quote.findMany({
            select: { quoteNumber: true }
        });

        let maxNum = 1000;
        for (const q of allQuotes) {
            if (q.quoteNumber && q.quoteNumber.startsWith('Q-')) {
                const parts = q.quoteNumber.split('-');
                if (parts.length === 2) {
                    const num = parseInt(parts[1]);
                    if (!isNaN(num) && num > maxNum) {
                        maxNum = num;
                    }
                }
            }
        }

        const newQuoteNumber = `Q-${maxNum + 1}`;

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
                    create: originalQuote.boards.map(board => ({
                        name: board.name,
                        type: board.type,
                        order: board.order,
                        isOptional: board.isOptional,
                        config: board.config,
                        items: {
                            create: board.items.map(item => ({
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
