// eslint-disable-next-line @typescript-eslint/no-var-requires
// eslint-disable-next-line @typescript-eslint/no-var-requires
const PdfPrinterModule = require('pdfmake/js/Printer');
const PdfPrinter = PdfPrinterModule.default || PdfPrinterModule;
import { TDocumentDefinitions, StyleDictionary, Content } from 'pdfmake/interfaces';
import { CanonicalBOM } from '../bom-engine';
import { formatCurrency, formatQuantity } from '../utils';
import path from 'path';

// Define fonts with absolute paths for Node runtime consistency
const fonts = {
    Roboto: {
        normal: path.join(process.cwd(), 'assets', 'fonts', 'Roboto-Regular.ttf'),
        bold: path.join(process.cwd(), 'assets', 'fonts', 'Roboto-Medium.ttf'),
        italics: path.join(process.cwd(), 'assets', 'fonts', 'Roboto-Italic.ttf'),
        bolditalics: path.join(process.cwd(), 'assets', 'fonts', 'Roboto-MediumItalic.ttf')
    }
};

/**
 * Generates a PDF Buffer from the canonical BOM model using pdfmake.
 * 
 * Layout:
 * - A4 Portrait
 * - Fixed Columns
 * - Grouped by Category
 * - Subtotals & Grand Totals
 * - Strict Formatting (4dp Unit, 2dp Extended)
 */
export function generatePDF(model: CanonicalBOM): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const printer = new PdfPrinter(fonts);

        // Group Items by Category for PDF Layout
        const grouped: Record<string, typeof model.items> = {};
        const categories: string[] = [];

        // We can rely on the model being sorted by Category already,
        // but explicit grouping ensures the PDF structure is robust.
        for (const item of model.items) {
            const cat = item.category || 'Uncategorized';
            if (!grouped[cat]) {
                grouped[cat] = [];
                categories.push(cat);
            }
            grouped[cat].push(item);
        }

        // Build Table Body
        const tableBody: any[] = [];

        // Header Row
        const headerRow = [
            { text: 'Supplier', style: 'tableHeader' },
            { text: 'Part', style: 'tableHeader' },
            { text: 'Description', style: 'tableHeader' },
            { text: 'Qty', style: 'tableHeader', alignment: 'right' },
            { text: 'Unit', style: 'tableHeader', alignment: 'right' },
            { text: 'Ext ($)', style: 'tableHeader', alignment: 'right' },
            { text: 'Hrs', style: 'tableHeader', alignment: 'right' }
        ];

        // We will create one big table or separate tables?
        // One big table handles page breaks better with repeated headers.
        tableBody.push(headerRow);

        categories.forEach(cat => {
            // Category Header Row
            tableBody.push([
                { text: cat.toUpperCase(), style: 'categoryHeader', colSpan: 7, fillColor: '#f3f4f6' },
                {}, {}, {}, {}, {}, {}
            ]);

            let catTotalCost = 0;
            let catTotalHrs = 0;

            // Items
            grouped[cat].forEach(item => {
                tableBody.push([
                    item.supplier || '',
                    item.partNumber,
                    item.description,
                    { text: formatQuantity(item.quantity), alignment: 'right' },
                    { text: formatCurrency(item.unitCost, 4), alignment: 'right' },
                    { text: formatCurrency(item.extendedCost), alignment: 'right' },
                    { text: item.labourHours.toFixed(2), alignment: 'right' }
                ]);
                catTotalCost += item.extendedCost;
                catTotalHrs += item.labourHours;
            });

            // Subtotal Row
            tableBody.push([
                { text: 'Subtotal', colSpan: 5, alignment: 'right', bold: true, italics: true },
                {}, {}, {}, {},
                { text: formatCurrency(catTotalCost), alignment: 'right', bold: true, italics: true },
                { text: catTotalHrs.toFixed(2), alignment: 'right', bold: true, italics: true }
            ]);
        });

        // Grand Total Row
        tableBody.push([
            { text: 'GRAND TOTAL', colSpan: 5, alignment: 'right', bold: true, fillColor: '#e5e7eb' },
            {}, {}, {}, {},
            { text: formatCurrency(model.totals.totalMaterialCost), alignment: 'right', bold: true, fillColor: '#e5e7eb' },
            { text: model.totals.totalLabourHours.toFixed(2), alignment: 'right', bold: true, fillColor: '#e5e7eb' }
        ]);

        const docDefinition: TDocumentDefinitions = {
            pageSize: 'A4',
            pageOrientation: 'portrait',
            pageMargins: [40, 60, 40, 40],
            header: {
                margin: [40, 20, 40, 0],
                columns: [
                    { text: 'Bill of Materials', bold: true, fontSize: 14 },
                    { text: model.meta.boardName, alignment: 'right', fontSize: 10, color: 'gray' }
                ]
            },
            content: [
                {
                    text: `Generated: ${new Date().toLocaleString()}`,
                    fontSize: 8,
                    color: 'gray',
                    margin: [0, 0, 0, 10]
                },
                {
                    table: {
                        headerRows: 1,
                        widths: ['auto', '15%', '30%', 'auto', 'auto', 'auto', 'auto'], // Fixed-ish widths, can optimize
                        // Optimization: 
                        // Supplier: auto (fit content or wrap)
                        // Part: 15%
                        // Desc: * (star - takes remaining space)
                        // Qty: auto
                        // Unit: auto
                        // Ext: auto
                        // Hrs: auto
                        // Let's rely on auto for most but force desc to take space
                        // Actually pdfmake 'star' width is standard.
                        // Let's try: ['15%', '15%', '*', 'auto', 'auto', 'auto', 'auto']
                        body: tableBody
                    },
                    layout: {
                        hLineWidth: (i: number, node: any) => (i === 0 || i === node.table.body.length) ? 1 : 0.5,
                        vLineWidth: (i: number, node: any) => 0, // No vertical lines
                        hLineColor: (i: number, node: any) => '#e5e7eb',
                        paddingLeft: (i: number) => 4,
                        paddingRight: (i: number) => 4,
                        paddingTop: (i: number) => 2,
                        paddingBottom: (i: number) => 2,
                    }
                }
            ],
            styles: {
                tableHeader: {
                    bold: true,
                    fontSize: 9,
                    color: 'black',
                    fillColor: '#f3f4f6'
                },
                categoryHeader: {
                    bold: true,
                    fontSize: 10,
                    margin: [0, 5, 0, 2]
                },
                defaultStyle: {
                    fontSize: 8
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
