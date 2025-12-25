import { ChevronLeft } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useQuote } from '@/context/QuoteContext';

export default function SlimCostingRail() {
    const { grandTotals } = useQuote();

    if (!grandTotals) return null;

    const { sellPriceRounded, profit, totalCost } = grandTotals;
    const marginPercent = totalCost > 0 ? (profit / totalCost) * 100 : 0;

    return (
        <div className="h-full bg-gray-50 border-l border-gray-200 flex flex-col items-center py-2 pt-14 w-16 transition-all">

            {/* Vertical Stacked Totals (Non-rotated) */}
            <div className="flex flex-col gap-6 w-full px-1">
                {/* Sell Price */}
                <div className="flex flex-col items-center gap-1">
                    <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Sell</span>
                    <div className="flex flex-col items-center bg-blue-100/50 rounded p-1 w-full border border-blue-100">
                        <span className="text-xs font-bold text-blue-700 whitespace-nowrap">
                            {formatCurrency(sellPriceRounded, 0)}
                        </span>
                    </div>
                </div>

                {/* Margin */}
                <div className="flex flex-col items-center gap-1">
                    <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Mrgn</span>
                    <div className="flex flex-col items-center bg-green-50 rounded p-1 w-full border border-green-100">
                        <span className="text-xs font-bold text-green-700 whitespace-nowrap">
                            {formatCurrency(profit, 0)}
                        </span>
                        <span className="text-[9px] font-medium text-green-600">
                            {marginPercent.toFixed(1)}%
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
