import { formatCurrency } from '@/lib/utils';

interface FinancialsHeroCardProps {
    title: string; // e.g. "Board Financials" or "Quote Financials"
    sellPrice: number;
    profit: number;
    marginPercent: number;
    targetMarginPercent: number;
    gst?: number; // Optional, for Quote totals
    isSyncing?: boolean;
}

export default function FinancialsHeroCard({ 
    title, 
    sellPrice, 
    profit, 
    marginPercent, 
    targetMarginPercent,
    gst,
    isSyncing = false
}: FinancialsHeroCardProps) {
    const hasDeviation = Math.abs(marginPercent - targetMarginPercent * 100) > 0.1;

    return (
        <div className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
            <div className="p-4 space-y-4">
                <div className="flex justify-between items-center">
                    <h2 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em]">{title}</h2>
                    <span className="text-[9px] font-medium text-gray-400 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-full uppercase tracking-wider">Base (Ex GST)</span>
                </div>

                {/* Main Price Focus - Selling Price (ex GST) */}
                <div className="flex flex-col relative">
                    {isSyncing && (
                        <div className="absolute -left-1 -top-1 -right-1 -bottom-1 bg-white/40 backdrop-blur-[1px] z-10 rounded-lg animate-pulse" />
                    )}
                    <div className="flex items-baseline gap-2">
                        <span className={`text-4xl font-black text-gray-900 tracking-tighter leading-none transition-opacity duration-200 ${isSyncing ? 'opacity-20' : 'opacity-100'}`}>
                            {formatCurrency(sellPrice, 0)}
                        </span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">ex GST</span>
                    </div>
                    
                    {/* Profit & Margin */}
                    <div className="flex items-center gap-2 mt-2.5">
                        <span className="text-[13px] font-medium text-blue-600">
                            Profit {formatCurrency(profit, 0)}
                        </span>
                        <div className="h-3 w-[1px] bg-gray-200"></div>
                        <div className="flex items-center gap-2">
                            <span className="text-[13px] font-medium text-blue-600">
                                {marginPercent.toFixed(1)}% Margin
                            </span>
                            {hasDeviation && (
                                <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100 uppercase tracking-tighter">
                                    Target: {(targetMarginPercent * 100).toFixed(1)}%
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Secondary Pricing & Details */}
                <div className="pt-3.5 border-t border-gray-100 flex justify-between items-center">
                    <div className="flex flex-col">
                        <span className="text-[9px] font-bold text-gray-300 uppercase tracking-widest mb-1">Profit Breakdown</span>
                        <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
                            <span>{marginPercent.toFixed(1)}% Margin</span>
                            <span className="text-gray-200">/</span>
                            <span>+{formatCurrency(profit, 0)}</span>
                        </div>
                    </div>

                    {gst !== undefined && (
                        <div className="text-right">
                            <span className="text-[9px] font-bold text-gray-300 uppercase tracking-widest block mb-1">Total (inc GST)</span>
                            <div className="flex items-center justify-end gap-1.5">
                                <span className="text-[10px] font-medium text-gray-400">+{formatCurrency(gst, 0)} GST</span>
                                <span className="text-sm font-medium text-gray-600">
                                    {formatCurrency(sellPrice + gst, 0)}
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
