import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { generateCanonicalBOM } from '@/lib/bom-engine';
import { generateCSV } from '@/lib/bom-exporters/csv';
import { generatePDF } from '@/lib/bom-exporters/pdf';

export const runtime = 'nodejs'; // Required for pdfmake

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string; boardId: string }> }
) {
    try {
        const { id, boardId } = await params;
        const { searchParams } = new URL(request.url);
        const format = searchParams.get('format') || 'human'; // 'erp' | 'human' | 'pdf'

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

        // 4. Build Brand Lookup
        const brandLookup: Record<string, string> = {};
        for (const item of catalogItems) {
            if (item.partNumber && item.brand) {
                brandLookup[item.partNumber] = item.brand;
            }
        }

        // 5. Generate Canonical Model (The Source of Truth)
        // Note: Casting board.items to any because Prisma/Item types might differ slightly but compatible props exist
        const canonicalModel = generateCanonicalBOM(board.items as any, brandLookup, board.name);

        // 6. Generate Requested Format
        const sanitizedName = board.name.replace(/[^a-zA-Z0-9-_]/g, '_');

        if (format === 'pdf') {
            const pdfBuffer = await generatePDF(canonicalModel);
            const filename = `${sanitizedName}_BOM.pdf`;

            return new NextResponse(pdfBuffer as any, {
                status: 200,
                headers: {
                    'Content-Type': 'application/pdf',
                    'Content-Disposition': `attachment; filename="${filename}"`
                }
            });
        }
        else {
            // CSV (erp or human)
            const mode = format === 'erp' ? 'erp' : 'human';
            const csvContent = generateCSV(canonicalModel, { mode });
            const suffix = format === 'erp' ? '_BOM_ERP.csv' : '_BOM.csv';
            const filename = `${sanitizedName}${suffix}`;

            return new NextResponse(csvContent, {
                status: 200,
                headers: {
                    'Content-Type': 'text/csv; charset=utf-8',
                    'Content-Disposition': `attachment; filename="${filename}"`
                }
            });
        }

    } catch (error) {
        console.error('Failed to export BOM', error);
        return new NextResponse('Failed to export BOM', { status: 500 });
    }
}
