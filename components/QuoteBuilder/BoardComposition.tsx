import React, { useState } from 'react';
import { Item, useQuote } from '../../context/QuoteContext';
import { cn, formatCurrency } from '@/lib/utils';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { resolveCostCategory } from '@/lib/items/categorization';

interface BoardCompositionProps {
    items: Item[];
    leftHeaderContent?: React.ReactNode;
}

interface Bucket {
    items: Item[];
    labour: number;
    cost: number;
}

const BoardComposition: React.FC<BoardCompositionProps> = ({ items, leftHeaderContent }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const { totals } = useQuote();

    // AUTHORITATIVE TOTALS FROM SINGLE SOURCE OF TRUTH
    const totalBoardLabour = totals.labourHours;
    const totalBoardCost = totals.baseMaterialCost;

    // -------------------------------------------------------------------------
    // HIERARCHY-SAFE DETERMINISTIC AGGREGATION
    // -------------------------------------------------------------------------

    const buckets: Record<string, Bucket> = {
        circuitBreakers: { items: [], labour: 0, cost: 0 },
        busbars: { items: [], labour: 0, cost: 0 },
        busbarInsulation: { items: [], labour: 0, cost: 0 },
        miscellaneous: { items: [], labour: 0, cost: 0 },
        isolators: { items: [], labour: 0, cost: 0 },
        basics: { items: [], labour: 0, cost: 0 },
        ctMetering: { items: [], labour: 0, cost: 0 },
        other: { items: [], labour: 0, cost: 0 }
    };

    // -------------------------------------------------------------------------
    // MANDATORY BUCKET ORDERING & META
    // -------------------------------------------------------------------------
    const mandatoryOrderKeys = [
        'circuitBreakers',
        'busbars',
        'miscellaneous',
        'busbarInsulation',
        'isolators'
    ];

    const groupMeta: Record<string, any> = {
        circuitBreakers: { label: 'Circuit Breakers', color: 'bg-blue-500', desc: 'All MCCB, MCB, etc.' },
        busbars: { label: 'Busbars', color: 'bg-orange-500', desc: 'Main bars & distro (excl insulation)' },
        busbarInsulation: { label: 'Busbar Insulation', color: 'bg-purple-500', desc: 'Heatshrink & covers' },
        miscellaneous: { label: 'Miscellaneous', color: 'bg-gray-500', desc: 'Meters, Fuses, CTs, Wiring, Misc' },
        isolators: { label: 'Isolators & Switches', color: 'bg-amber-500', desc: 'Main switches & changeovers' },
        basics: { label: 'Basics / Enclosure', color: 'bg-indigo-500', desc: 'Steelwork & core basics' },
        ctMetering: { label: 'CT Metering (System)', color: 'bg-teal-500', desc: 'Automated CT components' },
        other: { label: 'Other', color: 'bg-slate-400', desc: 'Uncategorized items' }
    };

    items.forEach(item => {
        const qty = Number(item.quantity) || 0;
        const labour = qty * (item.labourHours || 0);
        const cost = qty * (item.unitPrice || 0);

        // ---------------------------------------------------------------------
        // CENTRALIZED CATEGORIZATION (Single Source of Truth)
        // ---------------------------------------------------------------------
        const bucketLabel = resolveCostCategory(item);
        
        // Find bucket key by label matching
        const bucketKey = Object.keys(groupMeta).find(key => groupMeta[key].label === bucketLabel) || 'other';

        if (buckets[bucketKey]) {
            buckets[bucketKey].items.push(item);
            buckets[bucketKey].labour += labour;
            buckets[bucketKey].cost += cost;
        }
    });

    const allGroups = [
        ...mandatoryOrderKeys,
        'basics',
        'ctMetering',
        'other'
    ].map(key => ({
        key,
        ...groupMeta[key],
        bucket: buckets[key]
    })).filter(g => g.bucket.items.length > 0 || mandatoryOrderKeys.includes(g.key));

    const displayGroups = allGroups.filter(g => g.bucket.items.length > 0);

    const safePercentNum = (val: number, total: number) => total > 0 ? (val / total) * 100 : 0;

    return (
        <div
            className={cn(
                "bg-white border-b border-gray-100 transition-all duration-300 ease-in-out relative z-10 origin-top overflow-hidden",
                isExpanded ? "shadow-md pb-4" : "hover:bg-gray-50/50 cursor-pointer"
            )}
            onClick={() => !isExpanded && setIsExpanded(true)}
        >
            <div className={cn(
                "px-6 flex items-center justify-between transition-all duration-200",
                isExpanded ? "py-3" : "py-2.5 h-12"
            )}>
                {/* Left side: Injected Header Content (e.g. Board Summary) */}
                <div 
                    className="flex-1 overflow-hidden" 
                    onClick={isExpanded ? undefined : e => e.stopPropagation()} 
                >
                    {leftHeaderContent}
                </div>
                {/* Right side: Toggle */}
                <div 
                    className="flex items-center gap-6 text-[11px] font-medium shrink-0 ml-4 cursor-pointer"
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsExpanded(!isExpanded);
                    }}
                >
                    <div className="text-gray-400 font-mono text-[10px] uppercase tracking-wider flex items-center gap-1 hover:text-gray-600 transition-colors">
                        <span className="hidden sm:inline">Composition</span>
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </div>
                </div>
            </div>

            <div className={cn(
                "px-6 transition-opacity duration-300 delay-100",
                isExpanded ? "opacity-100" : "opacity-0 h-0 absolute overflow-hidden pointer-events-none"
            )}>
                <div className="mb-4 text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center justify-between border-b border-gray-100 pb-2">
                    <div className="flex items-center gap-2">
                        Composition Details
                        <span className="text-gray-400 font-mono text-[10px] normal-case bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
                            Total Items: {items.length}
                        </span>
                    </div>
                </div>

                <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {displayGroups.map((group) => {
                        const costPct = safePercentNum(group.bucket.cost, totalBoardCost);
                        const labPct = safePercentNum(group.bucket.labour, totalBoardLabour);

                        return (
                            <div key={`expanded-${group.key}`} className="bg-white p-3 rounded-lg border border-gray-100 hover:border-blue-200/60 transition-colors shadow-sm">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className={cn("w-2 h-2 rounded-full", group.color)}></div>
                                        <span className="font-semibold text-gray-800 text-xs">{group.label}</span>
                                    </div>
                                    <span className="text-[10px] text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">
                                        {group.bucket.items.length} items
                                    </span>
                                </div>

                                <div className="space-y-2 mt-3">
                                    <div className="flex items-center justify-between text-[11px]">
                                        <span className="text-gray-500">Material</span>
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono text-gray-900 font-medium">{formatCurrency(group.bucket.cost)}</span>
                                            <span className={cn(
                                                "font-mono text-[10px] w-9 text-right",
                                                costPct > 30 ? "text-red-600 font-bold" : costPct > 10 ? "text-amber-600" : "text-gray-400"
                                            )}>{costPct.toFixed(1)}%</span>
                                        </div>
                                    </div>
                                    <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
                                        <div className={cn("h-full", group.color)} style={{ width: `${costPct}%` }}></div>
                                    </div>

                                    <div className="flex items-center justify-between text-[11px] pt-1.5">
                                        <span className="text-gray-500">Labour</span>
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono text-gray-900 font-medium">{group.bucket.labour.toFixed(1)} hrs</span>
                                            <span className={cn(
                                                "font-mono text-[10px] w-9 text-right",
                                                labPct > 30 ? "text-red-600 font-bold" : labPct > 10 ? "text-amber-600" : "text-gray-400"
                                            )}>{labPct.toFixed(1)}%</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                    <div className="text-[11px] text-gray-400 flex items-center gap-1.5 transition-colors hover:text-gray-600">
                        <ChevronUp size={14} className="opacity-60" />
                        Click anywhere to collapse
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                            <span className="text-[11px] text-gray-500 uppercase tracking-wide">Total Labour:</span>
                            <span className="font-mono text-xs font-bold text-gray-800">{totalBoardLabour.toFixed(1)} hrs</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[11px] text-gray-500 uppercase tracking-wide">Total Material:</span>
                            <span className="font-mono text-xs font-bold text-gray-800">{formatCurrency(totalBoardCost)}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BoardComposition;
