import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { generateBoardBom, toCSV } from '@/lib/bom-generator';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string; boardId: string }> }
) {
    try {
        const { id, boardId } = await params;

        // 1. Fetch Board & Items
        const board = await prisma.board.findUnique({
            where: { id: boardId },
            include: {
                items: true
            }
        });

        if (!board) {
            return NextResponse.json({ error: 'Board not found' }, { status: 404 });
        }

        // 2. Extract Unique Part Numbers
        // We only care about items that have a part number (or name acting as one)
        const uniquePartNumbers = Array.from(new Set(
            board.items
                .map(i => i.partNumber || i.name)
                .filter(Boolean)
        ));

        // 3. Bulk Fetch Brands from Catalog
        const catalogItems = await prisma.catalogItem.findMany({
            where: {
                partNumber: { in: uniquePartNumbers as string[] }
            },
            select: {
                partNumber: true,
                brand: true
            }
        });

        // 4. Build Lookup Map (PartNumber -> Brand)
        const brandLookup: Record<string, string> = {};
        for (const item of catalogItems) {
            if (item.partNumber && item.brand) {
                brandLookup[item.partNumber] = item.brand;
            }
        }

        // 5. Generate BOM
        // Note: We cast board.items to any because Prisma types might slightly differ from our internal Item interface
        // if context types are different, but structure is compatible.
        const bomItems = generateBoardBom(board.items as any, brandLookup);

        // 6. Convert to CSV
        const csvContent = toCSV(bomItems);
        const filename = `${board.name.replace(/[^a-zA-Z0-9-_]/g, '_')}_BOM.csv`;

        // 7. Return ID/Stream/Download
        return new NextResponse(csvContent, {
            status: 200,
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename="${filename}"`
            }
        });

    } catch (error) {
        console.error('Failed to export BOM', error);
        return NextResponse.json({ error: 'Failed to export BOM' }, { status: 500 });
    }
}
