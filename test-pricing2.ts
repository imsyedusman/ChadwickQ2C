import { calculateBoardTotals } from './lib/pricing';
import * as fs from 'fs';
const items2 = [
    {
        unitPrice: 4000,
        labourHours: 0,
        quantity: 1,
        subcategory: 'Switchboard',
        isSheetmetal: false
    },
    {
        unitPrice: -1000,
        labourHours: 0,
        quantity: 1,
        subcategory: 'Price Adjustment',
        isSheetmetal: false
    }
];
const settings = {
    labourRate: 100,
    consumablesPct: 0.03, // 4000 * 0.03 = 120
    overheadPct: 0.20, // 4120 * 0.20 = 824
    engineeringPct: 0.20, // 824
    targetMarginPct: 0.18, // 4120 + 824 + 824 = 5768 / 0.82 = 7034.14
    gstPct: 0.10,
    roundingIncrement: 100, // 7000
    copperPricePerKg: 15
};
fs.writeFileSync('out2.json', JSON.stringify(calculateBoardTotals(items2 as any, settings, false), null, 2));
