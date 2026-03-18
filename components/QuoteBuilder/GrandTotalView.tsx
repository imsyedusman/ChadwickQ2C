import { useState } from 'react';
import { useQuote } from '@/context/QuoteContext';
import { FileDown, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { ExportService } from '@/lib/export-service';
import { formatCurrency } from '@/lib/utils';
import FinancialsHeroCard from './FinancialsHeroCard';
import SidebarCard from './SidebarCard';

export default function GrandTotalView() {
    const { grandTotals, quoteNumber, clientName, clientCompany, projectRef, description, boards, settings, effectiveSettings, allBoardTotals } = useQuote();
    const [isExporting, setIsExporting] = useState(false);
    const [isDetailed, setIsDetailed] = useState(true);

    if (!grandTotals) return null;

    const {
        labourHours,
        materialCost,
        labourCost,
        consumablesCost,
        overheadAmount,
        engineeringCost,
        totalCost,
        profit,
        sellPriceRounded,
        gst,
        finalSellPrice
    } = grandTotals;

    // Calculate margins & markups
    const marginPercent = sellPriceRounded > 0 ? (profit / sellPriceRounded) * 100 : 0;
    const markupPercent = totalCost > 0 ? (profit / totalCost) * 100 : 0;

    // Manufacturing breakdown
    const materialTotal = materialCost + consumablesCost;
    const getContribution = (val: number) => totalCost > 0 ? (val / totalCost) * 100 : 0;

    const materialPct = getContribution(materialTotal);
    const labourPct = getContribution(labourCost);
    const overheadPct = getContribution(overheadAmount);
    const engineeringPct = getContribution(engineeringCost);

    const handleExport = async () => {
        setIsExporting(true);
        try {
            const quoteData = {
                quoteNumber,
                clientName,
                clientCompany,
                projectRef,
                description,
                boards,
                totals: {
                    sellPrice: sellPriceRounded
                }
            };

            // Fetch default template
            let templatePath = '';
            try {
                const res = await fetch("/api/templates?default=true");
                if (res.ok) {
                    const templateData = await res.json();
                    if (templateData && templateData.filename) {
                        templatePath = `/templates/${templateData.filename}`;
                    }
                }
            } catch (e) {
                console.warn("Failed to fetch default template", e);
            }

            if (!templatePath) {
                alert("No default export template found. Please upload a template in Admin Tools.");
                setIsExporting(false);
                return;
            }

            // Map allBoardTotals securely by boardId
            const mappedBoardTotals = Object.entries(allBoardTotals).map(([boardId, totalsObj]) => ({
                boardId: boardId,
                sellPriceRounded: totalsObj.sellPriceRounded
            }));

            await ExportService.generateQuoteDocument({
                quote: { ...quoteData, templatePath },
                settings: effectiveSettings,
                totals: {
                    boardTotals: mappedBoardTotals,
                    grandTotals
                }
            });
        } catch (error) {
            console.error('Export failed', error);
            alert('Failed to generate document');
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-gray-50/50">
            {/* Sticky Financials Hero Card */}
            <FinancialsHeroCard
                title="Quote Financials"
                sellPrice={sellPriceRounded}
                profit={profit}
                marginPercent={marginPercent}
                markupPercent={markupPercent}
                gst={gst}
            />

            <div className="p-4 space-y-6 pb-12">
                {/* Visual Distribution Bar */}
                <div className="space-y-2">
                    <div className="flex justify-between items-end mb-1">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Distribution</span>
                        <span className="text-[10px] font-medium text-gray-400 italic">Total Cost: {formatCurrency(totalCost, 0)}</span>
                    </div>
                    <div className="h-1 w-full flex rounded-full overflow-hidden bg-white border border-gray-100 shadow-sm">
                        <div style={{ width: `${materialPct}%` }} className="h-full bg-blue-600" title={`Material: ${materialPct.toFixed(1)}%`} />
                        <div style={{ width: `${labourPct}%` }} className="h-full bg-[#f43f5e]" title={`Labour: ${labourPct.toFixed(1)}%`} />
                        <div style={{ width: `${overheadPct}%` }} className="h-full bg-[#eab308]" title={`Overhead: ${overheadPct.toFixed(1)}%`} />
                        <div style={{ width: `${engineeringPct}%` }} className="h-full bg-[#14b8a6]" title={`Engineering: ${engineeringPct.toFixed(1)}%`} />
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                        <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-sm bg-blue-600"></div>
                            <span className="text-[10px] text-gray-400 font-medium">Material</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-sm bg-[#f43f5e]"></div>
                            <span className="text-[10px] text-gray-400 font-medium">Labour</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-sm bg-[#eab308]"></div>
                            <span className="text-[10px] text-gray-400 font-medium">Overhead</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-sm bg-[#14b8a6]"></div>
                            <span className="text-[10px] text-gray-400 font-medium">Eng</span>
                        </div>
                    </div>
                </div>

                {/* Manufacturing Section */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                        <h3 className="text-[11px] font-bold text-gray-900 uppercase tracking-widest">Manufacturing</h3>
                        <button 
                            onClick={() => setIsDetailed(!isDetailed)}
                            className="text-[10px] font-medium text-blue-600 hover:text-blue-700 transition-colors uppercase tracking-wider"
                        >
                            {isDetailed ? 'Less' : 'More'}
                        </button>
                    </div>

                    <div className="space-y-2.5 text-sm">
                        {isDetailed && (
                            <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                                <div className="flex justify-between items-center text-gray-500">
                                    <span className="text-[13px] font-normal">Material Total</span>
                                    <span className="text-[13px] font-medium">{formatCurrency(materialTotal, 0)}</span>
                                </div>
                                <div className="flex justify-between items-center text-gray-500">
                                    <span className="text-[13px] font-normal">Labour Total ({labourHours.toFixed(1)}h)</span>
                                    <span className="text-[13px] font-medium">{formatCurrency(labourCost, 0)}</span>
                                </div>
                            </div>
                        )}
                        <div className="flex justify-between items-center pt-1 border-t border-gray-50">
                            <span className="text-[13px] font-bold text-gray-900 uppercase tracking-tight">Manufacturing Total</span>
                            <span className="text-[13px] font-bold text-gray-900">{formatCurrency(materialTotal + labourCost, 0)}</span>
                        </div>
                    </div>
                </div>

                {/* Costs Breakdown */}
                <div className="space-y-2.5 text-sm pt-4 border-t border-gray-200/50">
                    <div className="flex justify-between items-center text-gray-500">
                        <span className="text-[13px] font-normal">Total Overhead</span>
                        <span className="text-[13px] font-medium">{formatCurrency(overheadAmount, 0)}</span>
                    </div>
                    <div className="flex justify-between items-center text-gray-500">
                        <span className="text-[13px] font-normal">Total Engineering</span>
                        <span className="text-[13px] font-medium">{formatCurrency(engineeringCost, 0)}</span>
                    </div>
                </div>

                {/* Pricing Summary */}
                <div className="space-y-4 pt-6 border-t border-gray-200">
                    <div className="space-y-2 px-0.5 text-gray-400">
                        <div className="flex justify-between items-center">
                            <span className="text-[12px] font-medium">Quote Base Price</span>
                            <span className="text-[12px] font-medium">{formatCurrency(totalCost, 0)}</span>
                        </div>
                        <div className="flex justify-between items-center text-gray-400">
                            <div className="flex items-center gap-2">
                                <span className="text-[12px] font-medium">Average Markup</span>
                                <span className="text-[10px] font-bold text-blue-600/80 bg-blue-50/50 px-1.5 py-0.5 rounded border border-blue-100/50">{markupPercent.toFixed(1)}%</span>
                            </div>
                            <span className="text-[12px] font-medium">+{formatCurrency(profit, 0)}</span>
                        </div>
                    </div>
                    
                    <div className="pt-4 border-t border-dashed border-gray-100 flex justify-between items-end">
                        <div className="flex flex-col">
                            <span className="text-sm font-bold text-blue-600 leading-none mb-1">Selling Price</span>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">ex GST</span>
                        </div>
                        <span className="text-3xl font-black text-gray-900 tracking-tighter leading-none">{formatCurrency(sellPriceRounded, 0)}</span>
                    </div>

                    <div className="flex justify-between items-center pt-2 px-0.5">
                        <span className="text-[11px] font-medium text-gray-400 uppercase tracking-widest">Total Price (inc GST)</span>
                        <span className="text-sm font-medium text-gray-500 tracking-tight">{formatCurrency(finalSellPrice, 0)}</span>
                    </div>
                </div>

                {/* Export Button */}
                <button
                    onClick={handleExport}
                    disabled={isExporting}
                    className="w-full py-4 bg-gray-900 hover:bg-gray-800 text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-gray-200/50 text-sm mt-4 hover:scale-[1.01] active:scale-[0.99] border-t border-white/10"
                >
                    {isExporting ? (
                        <>
                            <Loader2 className="animate-spin" size={18} />
                            Generating...
                        </>
                    ) : (
                        <>
                            <FileDown size={18} />
                            Export Quote
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
