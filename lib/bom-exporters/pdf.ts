// eslint-disable-next-line @typescript-eslint/no-var-requires
const PdfPrinterModule = require('pdfmake/js/Printer');
const PdfPrinter = PdfPrinterModule.default || PdfPrinterModule;
import { TDocumentDefinitions, Content, ContextPageSize } from 'pdfmake/interfaces';
import { QuoteBOM, CanonicalBOM } from '../bom-engine';
import { formatCurrency, formatQuantity } from '../utils';
import { resolveCostCategory } from '../items/categorization';
import { getDisplayPartNumber } from '../display-utils';
import path from 'path';

// Define fonts with absolute paths pointing to the 'public' directory
// The 'public' directory is copied over in Next.js standalone mode (unlike 'assets')
const fonts = {
    Roboto: {
        normal: path.join(process.cwd(), 'public', 'fonts', 'Roboto-Regular.ttf'),
        bold: path.join(process.cwd(), 'public', 'fonts', 'Roboto-Medium.ttf'),
        italics: path.join(process.cwd(), 'public', 'fonts', 'Roboto-Italic.ttf'),
        bolditalics: path.join(process.cwd(), 'public', 'fonts', 'Roboto-MediumItalic.ttf')
    }
};

/**
 * Generates a PDF Buffer from a QuoteBOM model using pdfmake.
 * 
 * Supports:
 * - Multi-board sections with headers and subtotals.
 * - Rich header with Quote/Project/Client/Company (dynamic hiding).
 * - 2dp precision everywhere.
 * - Table optimization (wide Description).
 */
export function generatePDF(model: QuoteBOM): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const printer = new PdfPrinter(fonts);

        const content: Content[] = [];

        // Build content for each board
        model.boards.forEach((board, boardIdx) => {
            // 1. Board Section Title
            content.push({
                text: `BOARD: ${board.meta.boardName.toUpperCase()}`,
                style: 'boardHeader',
                margin: [0, boardIdx === 0 ? 0 : 25, 0, 10]
            });

            // 2. Group Items by Resolved Cost Category
            const grouped: Record<string, typeof board.items> = {};
            const categories: string[] = [];
            for (const item of board.items) {
                // Use centralized logic as Single Source of Truth
                const cat = resolveCostCategory(item as any);
                
                if (!grouped[cat]) {
                    grouped[cat] = [];
                    categories.push(cat);
                }
                grouped[cat].push(item);
            }
            
            // Sort categories for consistency (Basics first if present)
            categories.sort((a, b) => {
                if (a.startsWith('Basics')) return -1;
                if (b.startsWith('Basics')) return 1;
                return a.localeCompare(b);
            });

            // 3. Build Table Body
            const tableBody: any[] = [];
            tableBody.push([
                { text: 'Supplier', style: 'tableHeader' },
                { text: 'Part', style: 'tableHeader' },
                { text: 'Description', style: 'tableHeader' },
                { text: 'Qty', style: 'tableHeader', alignment: 'right' },
                { text: 'Unit ($)', style: 'tableHeader', alignment: 'right' },
                { text: 'Ext ($)', style: 'tableHeader', alignment: 'right' },
                { text: 'Hrs', style: 'tableHeader', alignment: 'right' }
            ]);

            categories.forEach(cat => {
                tableBody.push([
                    { text: cat.toUpperCase(), style: 'categoryRow', colSpan: 7, fillColor: '#f9fafb' },
                    {}, {}, {}, {}, {}, {}
                ]);

                grouped[cat].forEach(item => {
                    tableBody.push([
                        { text: item.supplier || '', fontSize: 7 },
                        { text: getDisplayPartNumber(item.partNumber), fontSize: 8 },
                        { text: item.description, fontSize: 8 },
                        { text: formatQuantity(item.quantity), alignment: 'right', fontSize: 8 },
                        { text: formatCurrency(item.unitCost, 2), alignment: 'right', fontSize: 8 },
                        { text: formatCurrency(item.extendedCost, 2), alignment: 'right', fontSize: 8 },
                        { text: item.labourHours.toFixed(2), alignment: 'right', fontSize: 8 }
                    ]);
                });
            });

            // 4. Add the Table
            content.push({
                table: {
                    headerRows: 1,
                    widths: ['auto', '12%', '*', 'auto', 'auto', 'auto', 'auto'],
                    body: tableBody
                },
                layout: {
                    hLineWidth: (i: number, node: any) => (i === 0 || i === node.table.body.length) ? 1 : 0.5,
                    vLineWidth: () => 0,
                    hLineColor: () => '#e5e7eb',
                    paddingLeft: () => 4,
                    paddingRight: () => 4,
                    paddingTop: () => 2,
                    paddingBottom: () => 2,
                }
            });

            // 5. Board Subtotal
            content.push({
                stack: [
                    {
                        columns: [
                            { text: '', width: '*' },
                            {
                                width: 'auto',
                                table: {
                                    widths: ['auto', 'auto'],
                                    body: [
                                        [
                                            { text: `Material Subtotal (Board: ${board.meta.boardName}):`, bold: true, fontSize: 9 },
                                            { text: formatCurrency(board.totals.totalMaterialCost, 2), bold: true, fontSize: 9, alignment: 'right' }
                                        ],
                                        [
                                            { text: 'Total Labour Hours:', italics: true, fontSize: 8, color: '#6b7280' },
                                            { text: `${board.totals.totalLabourHours.toFixed(2)} hrs`, italics: true, fontSize: 8, alignment: 'right', color: '#6b7280' }
                                        ]
                                    ]
                                },
                                layout: 'noBorders'
                            }
                        ]
                    }
                ],
                margin: [0, 8, 0, 0]
            });
        });

        // Grand Total Section (If more than 1 board)
        if (model.boards.length > 1) {
            content.push({
                margin: [0, 20, 0, 0],
                canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: '#9ca3af' }]
            });
            content.push({
                columns: [
                    { text: '', width: '*' },
                    {
                        width: 'auto',
                        margin: [0, 10, 0, 0],
                        table: {
                            body: [[
                                { text: 'Total Material Cost (All Boards)', bold: true, fontSize: 11, fillColor: '#f3f4f6', margin: [5, 5, 5, 5] },
                                { text: formatCurrency(model.grandTotals.totalMaterialCost, 2), bold: true, fontSize: 11, alignment: 'right', fillColor: '#f3f4f6', margin: [5, 5, 5, 5] }
                            ]]
                        },
                        layout: 'noBorders'
                    }
                ]
            });
        }

        const docDefinition: TDocumentDefinitions = {
            pageSize: 'A4',
            pageOrientation: 'portrait',
            pageMargins: [40, 80, 40, 60],
            header: (currentPage: number) => {
                const headerLines: any[] = [];
                
                // Row 1: Quote No & Project Name (Hiding empty robustly)
                const row1Cols: any[] = [];
                if (model.quoteNumber && model.projectName) {
                    row1Cols.push({ text: `QUOTE: ${model.quoteNumber}`, bold: true, fontSize: 12, width: '*' });
                    row1Cols.push({ text: model.projectName.toUpperCase(), bold: true, fontSize: 12, alignment: 'right', width: 'auto' });
                } else if (model.quoteNumber) {
                    row1Cols.push({ text: `QUOTE: ${model.quoteNumber}`, bold: true, fontSize: 12, width: '*' });
                } else if (model.projectName) {
                    row1Cols.push({ text: model.projectName.toUpperCase(), bold: true, fontSize: 12, alignment: 'right', width: '*' });
                }

                if (row1Cols.length > 0) headerLines.push({ columns: row1Cols });

                // Row 2: Client & Company (Hiding empty robustly)
                const row2Cols: any[] = [];
                if (model.clientName && model.companyName) {
                    row2Cols.push({ text: `Client: ${model.clientName}`, fontSize: 9, color: '#4b5563', width: '*' });
                    row2Cols.push({ text: `Company: ${model.companyName}`, fontSize: 9, color: '#4b5563', alignment: 'right', width: 'auto' });
                } else if (model.clientName) {
                    row2Cols.push({ text: `Client: ${model.clientName}`, fontSize: 9, color: '#4b5563', width: '*' });
                } else if (model.companyName) {
                    row2Cols.push({ text: `Company: ${model.companyName}`, fontSize: 9, color: '#4b5563', alignment: 'right', width: '*' });
                }

                if (row2Cols.length > 0) headerLines.push({ columns: row2Cols, margin: [0, 2, 0, 0] });

                return {
                    stack: [
                        ...headerLines,
                        {
                            margin: [0, 5, 0, 0],
                            canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: '#e5e7eb' }]
                        }
                    ],
                    margin: [40, 30, 40, 0]
                };
            },
            footer: (currentPage: number, pageCount: number) => {
                return {
                    columns: [
                        { text: `Generated: ${new Date().toLocaleString()}`, fontSize: 7, color: '#9ca3af' },
                        { text: `Page ${currentPage} of ${pageCount}`, alignment: 'right', fontSize: 8, color: '#9ca3af' }
                    ],
                    margin: [40, 20, 40, 0]
                };
            },
            content: content,
            styles: {
                boardHeader: {
                    fontSize: 12,
                    bold: true,
                    color: '#1e40af', // Indigo-800
                    background: '#eff6ff', // Blue-50
                    margin: [0, 0, 0, 5]
                },
                tableHeader: {
                    bold: true,
                    fontSize: 8,
                    color: '#374151',
                    fillColor: '#f3f4f6'
                },
                categoryRow: {
                    bold: true,
                    fontSize: 9,
                    color: '#1f2937'
                }
            },
            defaultStyle: {
                fontSize: 8,
                font: 'Roboto'
            }
        };

        printer.createPdfKitDocument(docDefinition).then((doc: any) => {
            const chunks: Buffer[] = [];
            doc.on('data', (chunk: any) => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', (err: any) => reject(err));
            doc.end();
        }).catch((err: any) => reject(err));
    });
}
