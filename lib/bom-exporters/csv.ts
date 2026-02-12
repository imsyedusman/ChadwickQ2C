import { CanonicalBOM } from "@/lib/bom-engine";

export interface CSVOptions {
    mode: 'erp' | 'human';
}

/**
 * Generates a CSV string from the canonical BOM model.
 * 
 * Modes:
 * - 'erp': Strict tabular data only. No summary rows.
 * - 'human': Appends summary rows after a blank line.
 */
export function generateCSV(model: CanonicalBOM, options: CSVOptions): string {
    const headers = [
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

    const rows = model.items.map(item => {
        return [
            item.category,
            item.supplier,
            item.partNumber,
            item.description,
            item.quantity,
            item.unitCost.toFixed(4),     // Formatting happens HERE
            item.extendedCost.toFixed(2), // Formatting happens HERE
            item.labourHours.toFixed(2)
        ].map(escapeCsv).join(',');
    });

    let content = [headers.join(','), ...rows].join('\n');

    // Human Mode: Append Summary
    if (options.mode === 'human') {
        const totalMaterial = model.totals.totalMaterialCost.toFixed(2);
        const totalLabour = model.totals.totalLabourHours.toFixed(2);

        content += '\n\n'; // Blank line
        content += `SUMMARY,,,,,,\n`;
        content += `Total Material Cost,,,,,,${totalMaterial},\n`;
        content += `Total Labour Hours,,,,,,,${totalLabour}\n`;
    }

    return content;
}
