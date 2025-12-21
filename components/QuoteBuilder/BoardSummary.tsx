
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
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4 text-sm shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                    <Info size={16} className="text-blue-700" />
                    <h4 className="font-semibold text-blue-900">Custom Board Summary</h4>
                </div>
                <div className="space-y-1">
                    <div className="flex justify-between">
                        <span className="text-blue-800">Total Sheetmetal (Base):</span>
                        <span className="font-medium text-blue-900">{formatCurrency(totalSheetmetal)}</span>
                    </div>
                    <div className="flex justify-between border-t border-blue-200/50 pt-1 mt-1">
                        <span className="text-blue-800 font-medium">Quoted Sheetmetal Price (+4%):</span>
                        <span className="font-bold text-blue-900">{formatCurrency(quotedPrice)}</span>
                    </div>
                </div>
            </div>
        );
    }

    // Cubic Board Logic
    if (enclosureType === 'Cubic') {
        const totalCubic = totals.cubicSubtotal;

        return (
            <div className="bg-indigo-50 border border-indigo-200 rounded-md p-3 mb-4 text-sm shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                    <Info size={16} className="text-indigo-700" />
                    <h4 className="font-semibold text-indigo-900">Cubic Board Summary</h4>
                </div>
                <div className="space-y-1">
                    <div className="flex justify-between">
                        <span className="text-indigo-800">Total Cubic (Base):</span>
                        <span className="font-medium text-indigo-900">{formatCurrency(totalCubic)}</span>
                    </div>
                </div>
                {totalCubic === 0 && (
                    <div className="text-[10px] text-indigo-600/70 mt-1 italic">
                        No cubic enclosure items detected.
                    </div>
                )}
            </div>
        );
    }

    return null;
}
