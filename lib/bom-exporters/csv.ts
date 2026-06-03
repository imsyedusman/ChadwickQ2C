import { QuoteBOM } from "@/lib/bom-engine";
import { formatCurrency, formatQuantity } from "../utils";
import { getDisplayPartNumber } from "../display-utils";

export interface CSVOptions {
    mode: 'erp' | 'human';
}

/**
 * Generates a CSV string from a QuoteBOM model.
 * 
 * Flattened structure with a 'Board' column for machine readability.
 */
export function generateCSV(model: QuoteBOM, options: CSVOptions): string {
    const headers = [
        'Board',
        'Category',
        'Supplier',
        'Part Number',
        'Description',
        'Quantity',
        'Unit Cost',
        'Extended Cost',
        'Labour Hours'
    ];

    const escapeCsv = (val: any) => {
        if (val === null || val === undefined) return '';
        const str = String(val);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    };

    const rows: string[] = [];

    model.boards.forEach(board => {
        board.items.forEach(item => {
            rows.push([
                board.meta.boardName,
                item.category === 'Switchboard' ? 'Switchgear' : item.category,
                item.supplier,
                getDisplayPartNumber(item.partNumber),
                item.description,
                formatQuantity(item.quantity),
                formatCurrency(item.unitCost, 2).replace('$', ''), // Remove $ for raw CSV data if needed, or keep for consistency. 
                // Wait, formatCurrency usually adds $. The user didn't specify removing it, but CSVs often prefer numbers.
                // However, the previous code used formatCurrency. I'll stick to it but use 2dp.
                formatCurrency(item.extendedCost, 2).replace('$', ''),
                item.labourHours.toFixed(2)
            ].map(escapeCsv).join(','));
        });
    });

    let content = [headers.join(','), ...rows].join('\n');

    // Human Mode: Append Summary
    if (options.mode === 'human') {
        const totalMaterial = formatCurrency(model.grandTotals.totalMaterialCost, 2).replace('$', '');
        const totalLabour = Math.round(model.grandTotals.totalLabourHours).toString();
        const totalLabourCost = formatCurrency(Math.round(model.grandTotals.totalLabourCost || 0), 2).replace('$', '');
        const totalSellingPrice = formatCurrency(model.grandTotals.totalSellingPrice || 0, 2).replace('$', '');

        content += '\n\n'; // Blank line
        content += `SUMMARY,,,,,,,,\n`;
        content += `Total Material Cost,,,,,,,,${escapeCsv(totalMaterial)}\n`;
        content += `Total Labour Hours,,,,,,,,${escapeCsv(totalLabour)}\n`;
        content += `Total Labour Cost,,,,,,,,${escapeCsv(totalLabourCost)}\n`;
        content += `Total Selling Price,,,,,,,,${escapeCsv(totalSellingPrice)}\n`;
    }

    return content;
}
