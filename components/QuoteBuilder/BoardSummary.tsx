
'use client';

import { useQuote } from '@/context/QuoteContext';
import { formatCurrency } from '@/lib/utils';
import { Info } from 'lucide-react';

export default function BoardSummary() {
    const { totals, boards, selectedBoardId } = useQuote();
    const selectedBoard = boards.find(b => b.id === selectedBoardId);

    // Parse config safely
    let config: any = {};
    if (selectedBoard?.config) {
        try {
            config = typeof selectedBoard.config === 'string' ? JSON.parse(selectedBoard.config) : selectedBoard.config;
        } catch (e) {
            console.error("Failed to parse board config for summary", e);
        }
    }

    const enclosureType = config?.enclosureType;

    // Custom Board Logic (Sheetmetal)
    if (enclosureType === 'Custom') {
        const totalSheetmetal = totals.sheetmetalSubtotal;
        // Quoted price includes uplift. Uplift is applied to the subtotal.
        // Price = Subtotal + Uplift
        const quotedPrice = totalSheetmetal + totals.sheetmetalUplift;

        return (
            <div className="bg-white border-b border-gray-200 shadow-sm -mt-4 -mx-4 mb-4 px-4 py-2 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-blue-900 font-medium whitespace-nowrap overflow-hidden text-ellipsis">
                    <Info size={14} className="text-blue-700 shrink-0" />
                    <span>Sheetmetal Summary</span>
                    <span className="text-gray-300 mx-1">|</span>
                    <span className="text-gray-600 font-normal">Sheetmetal Base: <span className="font-semibold text-gray-900">{formatCurrency(totalSheetmetal)}</span></span>
                    <span className="text-gray-300 mx-1">|</span>
                    <span className="text-blue-700 font-semibold">Quoted Sheetmetal (includes +4%): {formatCurrency(quotedPrice)}</span>
                </div>
            </div>
        );
    }

    // Cubic Board Logic
    if (enclosureType === 'Cubic') {
        const totalCubic = totals.cubicSubtotal;

        return (
            <div className="bg-white border-b border-gray-200 shadow-sm -mt-4 -mx-4 mb-4 px-4 py-2 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-indigo-900 font-medium whitespace-nowrap overflow-hidden text-ellipsis">
                    <Info size={14} className="text-indigo-700 shrink-0" />
                    <span>Cubic Summary</span>
                    <span className="text-gray-300 mx-1">|</span>
                    <span className="text-gray-600 font-normal">Cubic Enclosure Base: <span className="font-semibold text-indigo-900">{formatCurrency(totalCubic)}</span></span>
                </div>
            </div>
        );
    }

    return null;
}
