import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { generateCanonicalBOM, QuoteBOM, CanonicalBOM } from '@/lib/bom-engine';
import { generateCSV } from '@/lib/bom-exporters/csv';
import { generatePDF } from '@/lib/bom-exporters/pdf';

export const runtime = 'nodejs';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: quoteId } = await params;
        const { searchParams } = new URL(request.url);
        const format = searchParams.get('format') || 'pdf'; // Default to pdf for full quote

        // 1. Fetch Quote with ALL Boards and Items
        const quote = await prisma.quote.findUnique({
            where: { id: quoteId },
            include: {
                project: true,
                client: true,
                boards: {
                    orderBy: { order: 'asc' },
                    include: {
                        items: true
                    }
                }
            }
        });

        if (!quote) {
            return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
        }

        // 2. Collect all unique part numbers across all boards
        const allPartNumbers = new Set<string>();
        quote.boards.forEach(board => {
            board.items.forEach(item => {
                if (item.partNumber || item.name) {
                    allPartNumbers.add(item.partNumber || item.name);
                }
            });
        });

        // 3. Bulk fetch brands from catalog
        const catalogItems = await prisma.catalogItem.findMany({
            where: {
                partNumber: { in: Array.from(allPartNumbers) }
            },
            select: {
                partNumber: true,
                brand: true
            }
        });

        const brandLookup: Record<string, string> = {};
        catalogItems.forEach(item => {
            if (item.partNumber && item.brand) {
                brandLookup[item.partNumber] = item.brand;
            }
        });

        // 4. Generate CanonicalBOM for each board
        const canonicalBoards: CanonicalBOM[] = quote.boards.map(board => 
            generateCanonicalBOM(board.items as any, brandLookup, board.name)
        );

        // 5. Calculate Grand Totals
        let totalMaterialCost = 0;
        let totalLabourHours = 0;
        canonicalBoards.forEach(b => {
            totalMaterialCost += b.totals.totalMaterialCost;
            totalLabourHours += b.totals.totalLabourHours;
        });

        // 6. Construct QuoteBOM
        const quoteBOM: QuoteBOM = {
            quoteNumber: quote.quoteNumber,
            clientName: quote.clientName || quote.client?.name || null,
            companyName: quote.clientCompany || quote.project?.companyName || null,
            projectName: quote.projectRef || quote.project?.projectName || null,
            boards: canonicalBoards,
            grandTotals: {
                totalMaterialCost,
                totalLabourHours
            },
            timestamp: new Date().toISOString()
        };

        // 7. Generate Response
        const sanitizedNum = quote.quoteNumber.replace(/[^a-zA-Z0-9-_]/g, '_');

        if (format === 'pdf') {
            const pdfBuffer = await generatePDF(quoteBOM);
            const filename = `Quote_${sanitizedNum}_Full_BOM.pdf`;

            return new NextResponse(pdfBuffer as any, {
                status: 200,
                headers: {
                    'Content-Type': 'application/pdf',
                    'Content-Disposition': `attachment; filename="${filename}"`
                }
            });
        } else {
            const mode = (format === 'erp' || format === 'csv_erp') ? 'erp' : 'human';
            const csvContent = generateCSV(quoteBOM, { mode });
            const filename = `Quote_${sanitizedNum}_Full_BOM.csv`;

            return new NextResponse(csvContent, {
                status: 200,
                headers: {
                    'Content-Type': 'text/csv; charset=utf-8',
                    'Content-Disposition': `attachment; filename="${filename}"`
                }
            });
        }

    } catch (error) {
        console.error('Failed to export full Quote BOM', error);
        return new NextResponse('Failed to export BOM', { status: 500 });
    }
}
