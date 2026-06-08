import { useState } from 'react';
import { useQuote } from '@/context/QuoteContext';
import { FileDown, Loader2, ChevronDown, ChevronUp, Info, CheckSquare, Square } from 'lucide-react';
import { ExportService } from '@/lib/export-service';
import { formatCurrency } from '@/lib/utils';
import FinancialsHeroCard from './FinancialsHeroCard';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

export default function GrandTotalView() {
    const { 
        grandTotals, 
        quoteNumber, 
        clientName, 
        clientCompany, 
        projectRef, 
        description, 
        boards, 
        effectiveSettings, 
        allBoardTotals, 
        creator,
        isSyncing,
        presentationMode,
        toggleCategoryReview,
        selectedBoardId
    } = useQuote();
    const [isExporting, setIsExporting] = useState(false);
    const [isDetailed, setIsDetailed] = useState(true);

    if (!grandTotals) return null;

    const {
        baseMaterialCost,
        labourHours,
        materialCost,
        labourCost,
        consumablesCost,
        sheetmetalUplift,
        overheadAmount,
        engineeringCost,
        totalCost,
        profit,
        sellPriceRounded,
        gst,
        finalSellPrice
    } = grandTotals;

    // Calculate margin
    const marginPercent = sellPriceRounded > 0 ? (profit / sellPriceRounded) * 100 : 0;
    const targetMarginPercent = effectiveSettings.targetMarginPct;
    const hasDeviation = Math.abs(marginPercent - targetMarginPercent * 100) > 0.1;

    // Manufacturing breakdown
    const consumablesPctLabel = (effectiveSettings.consumablesPct * 100).toFixed(0);
    const getContribution = (val: number) => totalCost > 0 ? (val / totalCost) * 100 : 0;

    const materialPct = getContribution(baseMaterialCost + sheetmetalUplift + consumablesCost);
    const labourPct = getContribution(labourCost);
    const overheadPct = getContribution(overheadAmount);
    const engineeringPct = getContribution(engineeringCost);

    const getBoardCategories = (board: any) => {
        const cats = new Set<string>();
        board.items?.forEach((item: any) => {
            if (item.category === 'Basics') cats.add('Basic');
            else if (item.category === 'Busbar') cats.add('Busbars');
            else if (item.category === 'Other') cats.add('Misc');
            else if (item.category === 'Switchboard') {
                const sub = item.subcategory || '';
                if (sub.includes('Circuit Breakers') || sub.includes('ACB') || sub.includes('ATS')) cats.add('Switchgears');
                else if (sub.includes('Switches')) cats.add('Switches');
                else cats.add('Misc');
            } else {
                cats.add('Misc');
            }
        });
        
        const order = ['Basic', 'Switchgears', 'Switches', 'Busbars', 'Misc'];
        return Array.from(cats).sort((a, b) => order.indexOf(a) - order.indexOf(b));
    };

    let allReviewed = true;
    let totalRequired = 0;

    boards.forEach(board => {
        const requiredCats = getBoardCategories(board);
        const reviewedCats = Array.isArray(board.reviewedCategories) ? board.reviewedCategories : [];
        
        requiredCats.forEach(cat => {
            totalRequired++;
            if (!reviewedCats.includes(cat)) {
                allReviewed = false;
            }
        });
    });

    const selectedBoard = boards.find(b => b.id === selectedBoardId);
    const currentBoardRequired = selectedBoard ? getBoardCategories(selectedBoard) : [];
    const currentBoardReviewed = selectedBoard && Array.isArray(selectedBoard.reviewedCategories) ? selectedBoard.reviewedCategories.filter(c => currentBoardRequired.includes(c)) : [];
    const currentReviewedCount = currentBoardReviewed.length;
    const currentRequiredCount = currentBoardRequired.length;

    const handleExport = async () => {
        setIsExporting(true);
        try {
            const quoteData = {
                quoteNumber,
                clientName,
                clientCompany,
                projectRef,
                description,
                creator,
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
        <TooltipProvider>
            <div className="flex flex-col h-full bg-gray-50/50">
                {/* Sticky Financials Hero Card */}
                <FinancialsHeroCard
                    title="Quote Financials"
                    sellPrice={sellPriceRounded}
                    profit={profit}
                    marginPercent={marginPercent}
                    targetMarginPercent={targetMarginPercent}
                    gst={gst}
                    isSyncing={isSyncing}
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
                            <h3 className="text-[11px] font-bold text-gray-900 uppercase tracking-widest text-blue-600/80">Manufacturing</h3>
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
                                    {/* Material Sub-Calculation Group */}
                                    <div className="bg-gray-50/50 rounded-lg p-2.5 space-y-2 border border-gray-100/50">
                                        <div className="flex justify-between items-end mb-1">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Material Build-up</span>
                                        </div>

                                        {/* Material Total (Raw) */}
                                        <Tooltip delayDuration={100}>
                                            <TooltipTrigger asChild>
                                                <div className="flex justify-between items-center text-gray-500 cursor-help group/item">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-[13px] font-normal group-hover/item:text-blue-600 transition-colors">Material Total (Raw)</span>
                                                        <Info size={11} className="text-gray-300 group-hover/item:text-blue-400" />
                                                    </div>
                                                    <span className="text-[13px] font-medium">{formatCurrency(baseMaterialCost, 0)}</span>
                                                </div>
                                            </TooltipTrigger>
                                            <TooltipContent side="left" className="max-w-[200px] py-1.5 px-2.5">
                                                <p className="text-[11px] leading-relaxed">Sum of all item costs before any adjustments</p>
                                            </TooltipContent>
                                        </Tooltip>

                                        {/* Material Uplift (Sheetmetal) */}
                                        {sheetmetalUplift > 0 && (
                                            <Tooltip delayDuration={100}>
                                                <TooltipTrigger asChild>
                                                    <div className="flex justify-between items-center text-gray-400 pl-3 border-l-2 border-blue-100/50 italic cursor-help group/item">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="text-[12px] font-normal group-hover/item:text-blue-600 transition-colors">+ Material Uplift (Sheetmetal)</span>
                                                            <Info size={10} className="text-gray-300 group-hover/item:text-blue-400" />
                                                        </div>
                                                        <span className="text-[12px] font-medium">{formatCurrency(sheetmetalUplift, 0)}</span>
                                                    </div>
                                                </TooltipTrigger>
                                                <TooltipContent side="left" className="max-w-[200px] py-1.5 px-2.5">
                                                    <p className="text-[11px] leading-relaxed">Additional percentage applied for sheetmetal costs</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        )}

                                        {/* Consumables */}
                                        {consumablesCost > 0 && (
                                            <Tooltip delayDuration={100}>
                                                <TooltipTrigger asChild>
                                                    <div className="flex justify-between items-center text-gray-400 pl-3 border-l-2 border-blue-100/50 italic cursor-help group/item">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="text-[12px] font-normal group-hover/item:text-blue-600 transition-colors">+ Consumables ({consumablesPctLabel}%)</span>
                                                            <Info size={10} className="text-gray-300 group-hover/item:text-blue-400" />
                                                        </div>
                                                        <span className="text-[12px] font-medium">{formatCurrency(consumablesCost, 0)}</span>
                                                    </div>
                                                </TooltipTrigger>
                                                <TooltipContent side="left" className="max-w-[200px] py-1.5 px-2.5">
                                                    <p className="text-[11px] leading-relaxed">Percentage added to cover consumables</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        )}

                                        {/* Final Material Total */}
                                        <Tooltip delayDuration={100}>
                                            <TooltipTrigger asChild>
                                                <div className="flex justify-between items-center pt-1.5 border-t border-gray-200/50 text-gray-700 cursor-help group/item">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-[13px] font-bold group-hover/item:text-blue-600 transition-colors">Final Material Total</span>
                                                        <Info size={12} className="text-gray-300 group-hover/item:text-blue-400" />
                                                    </div>
                                                    <span className="text-[13px] font-bold">{formatCurrency(baseMaterialCost + sheetmetalUplift + consumablesCost, 0)}</span>
                                                </div>
                                            </TooltipTrigger>
                                            <TooltipContent side="left" className="max-w-[200px] py-1.5 px-2.5">
                                                <p className="text-[11px] leading-relaxed">Raw material + uplift + consumables</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </div>

                                    <div className="flex justify-between items-center text-gray-500 pt-1 px-1">
                                        <span className="text-[13px] font-normal">Labour Total ({labourHours.toFixed(1)}h)</span>
                                        <span className="text-[13px] font-medium">{formatCurrency(labourCost, 0)}</span>
                                    </div>
                                </div>
                            )}
                            <div className="flex justify-between items-center pt-2 border-t-2 border-gray-100 px-1">
                                <span className="text-[13px] font-bold text-gray-900 uppercase tracking-tight">Manufacturing Total</span>
                                <span className="text-[13px] font-bold text-gray-900">{formatCurrency(baseMaterialCost + sheetmetalUplift + consumablesCost + labourCost, 0)}</span>
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
                                <span className="text-[12px] font-medium">Margin</span>
                                <span className="text-[10px] font-bold text-blue-600/80 bg-blue-50/50 px-1.5 py-0.5 rounded border border-blue-100/50">
                                    {marginPercent.toFixed(1)}%
                                </span>
                                {hasDeviation && (
                                    <span className="text-[9px] font-bold text-gray-300 uppercase tracking-tighter">
                                        (Target: {(targetMarginPercent * 100).toFixed(1)}%)
                                    </span>
                                )}
                            </div>
                            <span className="text-[12px] font-medium">+{formatCurrency(profit, 0)}</span>
                        </div>
                    </div>
                    
                    <div className="pt-4 border-t border-dashed border-gray-100 flex justify-between items-end relative">
                        {isSyncing && (
                            <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] flex items-center justify-center z-10 rounded-lg animate-pulse">
                                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest flex items-center gap-2">
                                    <Loader2 className="animate-spin" size={10} />
                                    Updating Totals...
                                </span>
                            </div>
                        )}
                        <div className="flex flex-col">
                            <span className="text-sm font-bold text-blue-600 leading-none mb-1">Selling Price</span>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">ex GST</span>
                        </div>
                        <span className={`text-3xl font-black text-gray-900 tracking-tighter leading-none transition-opacity duration-200 ${isSyncing ? 'opacity-30' : 'opacity-100'}`}>
                            {formatCurrency(sellPriceRounded, 0)}
                        </span>
                    </div>

                    <div className="flex justify-between items-center pt-2 px-0.5">
                        <span className="text-[11px] font-medium text-gray-400 uppercase tracking-widest">Total Price (inc GST)</span>
                        <span className="text-sm font-medium text-gray-500 tracking-tight">{formatCurrency(finalSellPrice, 0)}</span>
                    </div>
                </div>

                {/* Review & Export Section */}
                <div className="pt-4 mt-2 border-t border-gray-200">
                    {selectedBoard && currentBoardRequired.length > 0 && (
                        <div className="mb-4">
                            <div className="flex items-center justify-between mb-2 px-1">
                                <h4 className="text-[11px] font-bold text-gray-900 uppercase tracking-widest">
                                    Review Checklist
                                </h4>
                                <span className="text-[10px] font-medium text-gray-500">
                                    {selectedBoard.name}
                                </span>
                            </div>
                            <div className="space-y-1 bg-white rounded-lg border border-gray-200 shadow-sm p-1">
                                {currentBoardRequired.map(cat => {
                                    const isChecked = currentBoardReviewed.includes(cat);
                                    return (
                                        <button
                                            key={cat}
                                            onClick={() => toggleCategoryReview(selectedBoard.id, cat, !isChecked)}
                                            className={`w-full flex items-center justify-between p-2 rounded-md transition-colors text-sm ${
                                                isChecked ? 'bg-green-50/50 hover:bg-green-50 text-gray-900' : 'hover:bg-gray-50 text-gray-700'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                {isChecked ? (
                                                    <CheckSquare size={16} className="text-green-600" />
                                                ) : (
                                                    <Square size={16} className="text-gray-300" />
                                                )}
                                                <span className={isChecked ? 'font-medium' : ''}>{cat}</span>
                                            </div>
                                            {isChecked && <span className="text-[10px] font-bold text-green-600 uppercase tracking-wider">Reviewed</span>}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    <button
                        onClick={handleExport}
                        disabled={isExporting || !allReviewed || totalRequired === 0}
                        className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-xl text-sm ${
                            (!allReviewed || totalRequired === 0)
                                ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none border-t border-gray-100'
                                : 'bg-gray-900 hover:bg-gray-800 text-white shadow-gray-200/50 hover:scale-[1.01] active:scale-[0.99] border-t border-white/10'
                        }`}
                    >
                        {isExporting ? (
                            <>
                                <Loader2 className="animate-spin" size={18} />
                                Generating...
                            </>
                        ) : (
                            <>
                                <FileDown size={18} />
                                {allReviewed 
                                    ? 'Export Tender Document' 
                                    : (currentReviewedCount < currentRequiredCount 
                                        ? `Review Required (${currentReviewedCount}/${currentRequiredCount})` 
                                        : 'Review Other Boards')}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
        </TooltipProvider>
    );
}
