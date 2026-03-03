import React, { useState } from 'react';
import { Item } from '../../context/QuoteContext';
import { cn, formatCurrency } from '@/lib/utils';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface BoardCompositionProps {
    items: Item[];
}

interface Bucket {
    items: Item[];
    labour: number;
    cost: number;
}

const BoardComposition: React.FC<BoardCompositionProps> = ({ items }) => {
    const [isExpanded, setIsExpanded] = useState(false);

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

    let totalBoardLabour = 0;
    let totalBoardCost = 0;

    items.forEach(item => {
        const qty = item.quantity;
        const labour = qty * (item.labourHours || 0);
        const cost = qty * (item.unitPrice || 0);

        totalBoardLabour += labour;
        totalBoardCost += cost;

        const cat = item.category || '';
        // subcategory is typically stored as "Root > Child > Grandchild"
        const subcatSegments = (item.subcategory || '').split('>').map(s => s.trim());
        const rootSub = subcatSegments[0] || '';

        // Prioritize structured hierarchical mapping strictly based on user requirements
        if (cat === 'Switchboard' && rootSub === 'Circuit Breakers') {
            buckets.circuitBreakers.items.push(item);
            buckets.circuitBreakers.labour += labour;
            buckets.circuitBreakers.cost += cost;
        } else if (cat === 'Busbar') {
            if (rootSub === 'Busbar Insulation') {
                buckets.busbarInsulation.items.push(item);
                buckets.busbarInsulation.labour += labour;
                buckets.busbarInsulation.cost += cost;
            } else {
                buckets.busbars.items.push(item);
                buckets.busbars.labour += labour;
                buckets.busbars.cost += cost;
            }
        } else if (cat === 'Switchboard' && ['Power Meters', 'Fuses', 'Current Transformers', 'Miscellaneous'].includes(rootSub)) {
            buckets.miscellaneous.items.push(item);
            buckets.miscellaneous.labour += labour;
            buckets.miscellaneous.cost += cost;
        } else if (cat === 'Switchboard' && rootSub === 'Switches') {
            buckets.isolators.items.push(item);
            buckets.isolators.labour += labour;
            buckets.isolators.cost += cost;
        } else if (item.isSystemManaged && (item.systemTag === 'CT_METERING' || item.subcategory === 'CT Metering')) {
            buckets.ctMetering.items.push(item);
            buckets.ctMetering.labour += labour;
            buckets.ctMetering.cost += cost;
        } else if (cat === 'Basics') {
            buckets.basics.items.push(item);
            buckets.basics.labour += labour;
            buckets.basics.cost += cost;
        } else {
            buckets.other.items.push(item);
            buckets.other.labour += labour;
            buckets.other.cost += cost;
        }
    });

    // -------------------------------------------------------------------------
    // MANDATORY BUCKET ORDERING
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

    // Construct groups explicitly in the order requested, ensuring mandatory ones come first
    const allGroups = [
        ...mandatoryOrderKeys,
        'basics',
        'ctMetering',
        'other'
    ].map(key => ({
        key,
        ...groupMeta[key],
        bucket: buckets[key]
    })).filter(g => g.bucket.items.length > 0 || mandatoryOrderKeys.includes(g.key)); // Ensure mandatory keys exist even if empty to preserve structure visually unless user strictly wants them hidden if empty. Let's assume hidden if empty to save space, but order remains absolute.

    // Better constraint: We filter empty out, but strictly maintain order.
    const displayGroups = allGroups.filter(g => g.bucket.items.length > 0);

    const safePercentNum = (val: number, total: number) => total > 0 ? (val / total) * 100 : 0;

    return (
        <div
            className={cn(
                "bg-white border-b border-gray-100 transition-all duration-300 ease-in-out relative z-10 origin-top overflow-hidden cursor-pointer",
                isExpanded ? "shadow-md pb-4 pt-3" : "py-1.5 hover:bg-gray-50/50"
            )}
            onClick={() => setIsExpanded(!isExpanded)}
        >
            {/* COLLAPSED VIEW (High Signal Strip) */}
            <div className={cn(
                "px-6 flex items-center gap-6 text-[11px] font-medium overflow-hidden h-8 transition-opacity duration-200",
                isExpanded ? "opacity-0 absolute inset-0 pointer-events-none" : "opacity-100"
            )}>
                <div className="text-gray-400 font-mono text-[10px] uppercase tracking-wider mr-2 shrink-0 flex items-center gap-1">
                    Composition
                    <ChevronDown size={12} className="opacity-50" />
                </div>

                {displayGroups.filter(g => mandatoryOrderKeys.includes(g.key)).map(group => (
                    <div key={`compact-${group.key}`} className="flex items-center gap-3 shrink-0 whitespace-nowrap group">
                        <div className="flex items-center gap-1.5">
                            <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", group.color)} />
                            <span className="text-gray-600 font-semibold group-hover:text-gray-900 transition-colors">{group.label}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-500 font-mono text-[10px]">
                            <span title="Labour Hours">{group.bucket.labour.toFixed(1)}h</span>
                            <span className="text-gray-300">|</span>
                            <span title="Material Cost">{formatCurrency(group.bucket.cost)}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* EXPANDED VIEW (Dashboard Layout) */}
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
                                    {/* Material Row */}
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
                                    {/* Visual Bar Material */}
                                    <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
                                        <div className={cn("h-full", group.color)} style={{ width: `${costPct}%` }}></div>
                                    </div>

                                    {/* Labour Row */}
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

                {/* Visual Summary Footer */}
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
