import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType } from "docx";
import { saveAs } from "file-saver";

interface ExportData {
    quote: any;
    settings: any;
    totals: any;
}

export class ExportService {
    static async generateQuoteDocument({ quote, settings, totals }: ExportData) {
        const doc = new Document({
            sections: [
                {
                    properties: {},
                    children: [
                        // Header
                        new Paragraph({
                            text: "CHADWICK SWITCHBOARDS",
                            heading: "Heading1",
                            alignment: AlignmentType.CENTER,
                        }),
                        new Paragraph({
                            text: "Quotation / Tender",
                            heading: "Heading2",
                            alignment: AlignmentType.CENTER,
                            spacing: { after: 400 },
                        }),

                        // Client Details
                        new Paragraph({
                            children: [
                                new TextRun({ text: "To: ", bold: true }),
                                new TextRun(quote.clientName || "Valued Client"),
                            ],
                        }),
                        new Paragraph({
                            children: [
                                new TextRun({ text: "Project: ", bold: true }),
                                new TextRun(quote.projectRef || "Untitled Project"),
                            ],
                        }),
                        new Paragraph({
                            children: [
                                new TextRun({ text: "Date: ", bold: true }),
                                new TextRun(new Date().toLocaleDateString()),
                            ],
                            spacing: { after: 400 },
                        }),

                        // Description
                        new Paragraph({
                            text: "Scope of Works",
                            heading: "Heading3",
                        }),
                        new Paragraph({
                            text: quote.description || "Supply and manufacture of switchboards as per schedule below.",
                            spacing: { after: 400 },
                        }),

                        // Schedule of Boards
                        ...quote.boards.flatMap((board: any) => [
                            new Paragraph({
                                text: `${board.name} (${board.type || 'General'})`,
                                heading: "Heading4",
                                spacing: { before: 200, after: 100 },
                            }),
                            this.createItemTable(board.items),
                        ]),

                        // Pricing Summary
                        new Paragraph({
                            text: "Pricing Summary",
                            heading: "Heading3",
                            spacing: { before: 400, after: 200 },
                        }),
                        new Table({
                            width: { size: 100, type: WidthType.PERCENTAGE },
                            rows: [
                                new TableRow({
                                    children: [
                                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Description", bold: true })] })] }),
                                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Amount (ex GST)", bold: true })], alignment: AlignmentType.RIGHT })] }),
                                    ],
                                }),
                                new TableRow({
                                    children: [
                                        new TableCell({ children: [new Paragraph("Total Price")] }),
                                        new TableCell({ children: [new Paragraph({ text: `$${totals.sellPrice.toFixed(2)}`, alignment: AlignmentType.RIGHT })] }),
                                    ],
                                }),
                            ],
                        }),

                        // Terms
                        new Paragraph({
                            text: "Terms & Conditions",
                            heading: "Heading3",
                            spacing: { before: 400 },
                        }),
                        new Paragraph({
                            children: [new TextRun("1. Validity: This quote is valid for 30 days.")],
                            bullet: { level: 0 },
                        }),
                        new Paragraph({
                            children: [new TextRun("2. Delivery: Ex-works unless stated otherwise.")],
                            bullet: { level: 0 },
                        }),
                        new Paragraph({
                            children: [new TextRun("3. Payment: 30 days from invoice.")],
                            bullet: { level: 0 },
                        }),
                    ],
                },
            ],
        });

        const blob = await Packer.toBlob(doc);
        saveAs(blob, `Quote_${quote.quoteNumber || 'Draft'}_${quote.projectRef || 'Project'}.docx`);
    }

    private static createItemTable(items: any[]) {
        if (!items || items.length === 0) {
            return new Paragraph({ children: [new TextRun({ text: "No items specified.", italics: true })] });
        }

        return new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
                // Header
                new TableRow({
                    children: [
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Item", bold: true })] })], width: { size: 60, type: WidthType.PERCENTAGE } }),
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Qty", bold: true })], alignment: AlignmentType.CENTER })], width: { size: 10, type: WidthType.PERCENTAGE } }),
                    ],
                }),
                // Rows
                ...items.map((item: any) =>
                    new TableRow({
                        children: [
                            new TableCell({ children: [new Paragraph(item.name)] }),
                            new TableCell({ children: [new Paragraph({ text: item.quantity.toString(), alignment: AlignmentType.CENTER })] }),
                        ],
                    })
                ),
            ],
        });
    }
}
