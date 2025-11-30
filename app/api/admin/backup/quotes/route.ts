import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
    try {
        const quotes = await prisma.quote.findMany({
            include: {
                boards: {
                    include: {
                        items: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        const backupData = {
            version: '1.0',
            timestamp: new Date().toISOString(),
            type: 'quotes_backup',
            quotes
        };

        return new NextResponse(JSON.stringify(backupData, null, 2), {
            headers: {
                'Content-Type': 'application/json',
                'Content-Disposition': `attachment; filename="quotes-backup-${new Date().toISOString().split('T')[0]}.json"`
            }
        });
    } catch (error) {
        console.error('Quotes Export Error:', error);
        return NextResponse.json({ error: 'Failed to export quotes' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { quotes, type } = body;

        if (type !== 'quotes_backup' || !Array.isArray(quotes)) {
            return NextResponse.json({ error: 'Invalid backup file format' }, { status: 400 });
        }

        const result = await prisma.$transaction(async (tx) => {
            let createdCount = 0;
            let updatedCount = 0;

            for (const quote of quotes) {
                const { boards, ...quoteData } = quote;

                // Check if quote exists by quoteNumber
                const existing = await tx.quote.findUnique({
                    where: { quoteNumber: quoteData.quoteNumber }
                });

                if (existing) {
                    // Update existing quote
                    // First delete existing boards to avoid duplicates/orphans
                    await tx.board.deleteMany({
                        where: { quoteId: existing.id }
                    });

                    // Update quote details
                    await tx.quote.update({
                        where: { id: existing.id },
                        data: {
                            ...quoteData,
                            id: existing.id, // Keep existing ID or overwrite? 
                            // If we overwrite ID, we might break other links if any exist (none currently).
                            // But for a true restore, we probably want to match the backup exactly.
                            // However, Prisma update can't change ID easily if it's referenced.
                            // Let's keep the existing ID but update all other fields.
                            // Actually, if we are moving servers, the ID might not exist.
                            // Strategy: Upsert by quoteNumber.
                        }
                    });

                    // Re-create boards
                    for (const board of boards) {
                        const { items, ...boardData } = board;
                        const newBoard = await tx.board.create({
                            data: {
                                ...boardData,
                                quoteId: existing.id, // Link to existing quote ID
                                id: undefined, // Let DB generate new ID or use backup ID?
                                // If we use backup ID, we might conflict if we didn't delete everything.
                                // Since we deleted boards above, we can try to reuse IDs if we want, 
                                // but it's safer to let DB generate new IDs for sub-items to avoid collisions.
                                // BUT, if we want to preserve links, we should try to keep IDs.
                                // Let's strip IDs for sub-items to be safe.
                            }
                        });

                        if (items && items.length > 0) {
                            await tx.item.createMany({
                                data: items.map((item: any) => {
                                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                                    const { id, boardId, ...rest } = item;
                                    return {
                                        ...rest,
                                        boardId: newBoard.id
                                    };
                                })
                            });
                        }
                    }
                    updatedCount++;
                } else {
                    // Create new quote
                    const newQuote = await tx.quote.create({
                        data: {
                            ...quoteData,
                            // We can try to use the backup ID if it doesn't exist
                            id: quoteData.id
                        }
                    });

                    // Create boards
                    for (const board of boards) {
                        const { items, ...boardData } = board;
                        const newBoard = await tx.board.create({
                            data: {
                                ...boardData,
                                quoteId: newQuote.id,
                                id: boardData.id // Try to keep ID
                            }
                        });

                        if (items && items.length > 0) {
                            await tx.item.createMany({
                                data: items.map((item: any) => {
                                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                                    const { id, boardId, ...rest } = item;
                                    return {
                                        ...rest,
                                        boardId: newBoard.id,
                                        id: item.id // Try to keep ID
                                    };
                                })
                            });
                        }
                    }
                    createdCount++;
                }
            }

            return { createdCount, updatedCount };
        });

        return NextResponse.json({
            message: 'Quotes restored successfully',
            details: result
        });

    } catch (error) {
        console.error('Quotes Import Error:', error);
        return NextResponse.json({ error: 'Failed to import quotes', details: String(error) }, { status: 500 });
    }
}
