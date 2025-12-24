import { formatCurrency } from '@/lib/utils';

interface FinancialsHeroCardProps {
    title: string; // e.g. "Board Financials" or "Quote Financials"
    sellPrice: number;
    margin: number;
    marginPercent?: number; // Optional
    gst?: number; // Optional, for Quote totals
}

export default function FinancialsHeroCard({ title, sellPrice, margin, marginPercent, gst }: FinancialsHeroCardProps) {
    return (
        <div className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
            <div className="p-4 space-y-3">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">{title}</h2>

                {/* Main Sell Price */}
                <div>
                    <div className="flex items-baseline justify-between mb-1">
                        <span className="text-2xl font-bold text-gray-900">{formatCurrency(sellPrice, 0)}</span>
                        <span className="text-xs text-gray-400 font-medium">ex GST</span>
                    </div>
                    {gst !== undefined && (
                        <div className="flex justify-end text-xs text-gray-400">
                            <span>+ {formatCurrency(gst, 0)} GST</span>
                        </div>
                    )}
                </div>

                {/* Margin */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <span className="text-sm text-gray-600 font-medium">Margin</span>
                    <div className="flex items-center gap-2">
                        <span className="text-base font-semibold text-green-600">{formatCurrency(margin, 0)}</span>
                        {marginPercent !== undefined && !isNaN(marginPercent) && (
                            <span className="text-xs font-medium text-green-700 bg-green-50 px-1.5 py-0.5 rounded">
                                {marginPercent.toFixed(1)}%
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
