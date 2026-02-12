import React, { useMemo, useState } from 'react';
import { X, ArrowRight, AlertCircle, ArrowLeftRight, ChevronDown, ChevronRight, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { aggregateBoardItems, compareAggregations, ComparisonRow } from '@/lib/board-comparison';
import { Item } from '@prisma/client';

interface BoardData {
    id: string;
    name: string;
    items: Item[];
}

interface BoardComparisonModalProps {
    isOpen: boolean;
    onClose: () => void;
    boards: BoardData[];
    initialBoardId?: string | null;
}

export default function BoardComparisonModal({ isOpen, onClose, boards, initialBoardId }: BoardComparisonModalProps) {
    const [baseBoardId, setBaseBoardId] = useState<string>(initialBoardId || (boards[0]?.id || ''));
    const [compBoardId, setCompBoardId] = useState<string>(boards.length > 1 ? boards[1].id : (boards[0]?.id || ''));

    // Section State
    const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

    // Memoize comparison
    const comparison = useMemo(() => {
        const baseBoard = boards.find(b => b.id === baseBoardId);
        const compBoard = boards.find(b => b.id === compBoardId);

        if (!baseBoard || !compBoard) return null;

        const baseAgg = aggregateBoardItems(baseBoard.items);
        const compAgg = aggregateBoardItems(compBoard.items);

        return compareAggregations(baseAgg, compAgg);
    }, [baseBoardId, compBoardId, boards]);

    // Formatters
    const currency = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' });
    const decimal = new Intl.NumberFormat('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const percent = new Intl.NumberFormat('en-AU', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 });

    const toggleSection = (category: string) => {
        const newSet = new Set(collapsedSections);
        if (newSet.has(category)) {
            newSet.delete(category);
        } else {
            newSet.add(category);
        }
        setCollapsedSections(newSet);
    };

    // Calculate Percent Change
    const getPercentChange = (delta: number, baseline: number) => {
        if (baseline === 0) {
            return delta === 0 ? "0%" : "New";
        }
        return percent.format(delta / baseline);
    };

    // Grouping Logic
    const groupedRows = useMemo(() => {
        if (!comparison) return {};
        const groups: Record<string, ComparisonRow[]> = {};
        for (const row of comparison.rows) {
            const cat = row.category || 'Uncategorized';
            if (!groups[cat]) groups[cat] = [];
            groups[cat].push(row);
        }
        return groups;
    }, [comparison]);

    const categories = Object.keys(groupedRows).sort();

    if (!isOpen) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-7xl max-h-[90vh] flex flex-col p-0 gap-0 bg-white">
                {/* Header */}
                <DialogHeader className="p-4 border-b border-gray-100 flex-shrink-0">
                    <div className="flex items-center justify-between">
                        <DialogTitle className="text-lg font-bold text-gray-800 flex items-center gap-2">
                            <ArrowLeftRight size={20} className="text-blue-600" />
                            Board Comparison
                        </DialogTitle>
                    </div>

                    <p className="text-xs text-gray-500 mt-1">
                        This view shows how the comparison board differs from the baseline board.
                    </p>

                    {/* Controls */}
                    <div className="flex items-center gap-4 mt-4 bg-gray-50 p-3 rounded-lg border border-gray-200">
                        <div className="flex-1">
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Baseline (Board A)</label>
                            <select
                                className="w-full p-2 bg-white border border-gray-300 rounded text-sm font-medium"
                                value={baseBoardId}
                                onChange={e => setBaseBoardId(e.target.value)}
                            >
                                {boards.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>
                        </div>

                        <div className="flex items-center justify-center pt-5 text-gray-400">
                            <ArrowRight size={20} />
                        </div>

                        <div className="flex-1">
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Comparison (Board B)</label>
                            <select
                                className="w-full p-2 bg-white border border-gray-300 rounded text-sm font-medium"
                                value={compBoardId}
                                onChange={e => setCompBoardId(e.target.value)}
                            >
                                {boards.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>
                        </div>
                    </div>
                </DialogHeader>

                {/* Summary Banner */}
                {comparison && (
                    <div className="p-3 bg-blue-50 border-b border-blue-100 flex items-center justify-between flex-shrink-0 px-6">
                        <div className="flex items-center gap-2 text-xs text-blue-700 font-medium">
                            <AlertCircle size={14} />
                            <span>Delta = Comparison − Baseline</span>
                        </div>

                        <div className="flex gap-8">
                            <div className="text-right">
                                <span className="block text-[10px] text-blue-600 uppercase font-bold tracking-wider">Material Change</span>
                                <div className="flex items-baseline gap-2 justify-end">
                                    <span className={`text-lg font-bold ${comparison.summary.deltaMaterialCost > 0 ? 'text-red-600' : (comparison.summary.deltaMaterialCost < 0 ? 'text-green-600' : 'text-gray-700')}`}>
                                        {comparison.summary.deltaMaterialCost > 0 ? '+' : ''}{currency.format(comparison.summary.deltaMaterialCost)}
                                    </span>
                                    <span className={`text-xs font-medium ${comparison.summary.deltaMaterialCost > 0 ? 'text-red-600' : (comparison.summary.deltaMaterialCost < 0 ? 'text-green-600' : 'text-gray-500')}`}>
                                        ({comparison.summary.deltaMaterialCost > 0 ? '+' : ''}{getPercentChange(comparison.summary.deltaMaterialCost, comparison.summary.baselineMaterialTotal)})
                                    </span>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="block text-[10px] text-blue-600 uppercase font-bold tracking-wider">Labour Change</span>
                                <div className="flex items-baseline gap-2 justify-end">
                                    <span className={`text-lg font-bold ${comparison.summary.deltaLabourHours > 0 ? 'text-red-600' : (comparison.summary.deltaLabourHours < 0 ? 'text-green-600' : 'text-gray-700')}`}>
                                        {comparison.summary.deltaLabourHours > 0 ? '+' : ''}{decimal.format(comparison.summary.deltaLabourHours)} hrs
                                    </span>
                                    <span className={`text-xs font-medium ${comparison.summary.deltaLabourHours > 0 ? 'text-red-600' : (comparison.summary.deltaLabourHours < 0 ? 'text-green-600' : 'text-gray-500')}`}>
                                        ({comparison.summary.deltaLabourHours > 0 ? '+' : ''}{getPercentChange(comparison.summary.deltaLabourHours, comparison.summary.baselineLabourTotal)})
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-4 bg-gray-50/50">
                    {comparison?.summary.diffCount === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full py-20 text-gray-400">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                <ArrowLeftRight size={32} className="opacity-20" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-600">No differences detected</h3>
                            <p className="text-sm">The selected boards are identical in terms of content.</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Top Drivers */}
                            {comparison && comparison.summary.topDrivers.length > 0 && (
                                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                                    <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                                        <TrendingUp size={16} className="text-gray-400" />
                                        Biggest Cost Drivers
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                                        {comparison.summary.topDrivers.map((row) => (
                                            <div key={row.key} className="bg-gray-50 rounded p-2 border border-gray-100">
                                                <div className="text-xs font-medium text-gray-900 truncate" title={row.description}>
                                                    {row.description || row.partNumber}
                                                </div>
                                                <div className={`text-sm font-bold mt-1 ${row.deltaCost > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                    {row.deltaCost > 0 ? '+' : ''}{currency.format(row.deltaCost)}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Grouped Table */}
                            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                                <div className="grid grid-cols-[150px_1fr_80px_80px_80px_120px_100px] gap-0 bg-gray-100 border-b border-gray-200 text-xs text-gray-500 uppercase font-bold sticky top-0 z-10">
                                    <div className="px-4 py-3">Part Number</div>
                                    <div className="px-4 py-3">Description</div>
                                    <div className="px-4 py-3 text-center">Qty A</div>
                                    <div className="px-4 py-3 text-center">Qty B</div>
                                    <div className="px-4 py-3 text-center">Change</div>
                                    <div className="px-4 py-3 text-right">Material $$</div>
                                    <div className="px-4 py-3 text-right">Labour Change</div>
                                </div>

                                {categories.map(category => {
                                    const rows = groupedRows[category];
                                    const isCollapsed = collapsedSections.has(category);

                                    // Calculate Section Subtotals
                                    const subDeltaCost = rows.reduce((sum, r) => sum + r.deltaCost, 0);
                                    const subDeltaLabour = rows.reduce((sum, r) => sum + r.deltaLabour, 0);

                                    return (
                                        <div key={category} className="border-b border-gray-100 last:border-0">
                                            {/* Section Header */}
                                            <button
                                                className="w-full flex items-center justify-between px-4 py-2 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                                                onClick={() => toggleSection(category)}
                                            >
                                                <div className="flex items-center gap-2 font-bold text-sm text-gray-700">
                                                    {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                                                    {category}
                                                    <span className="text-xs font-normal text-gray-400">({rows.length} items)</span>
                                                </div>
                                                <div className="flex gap-8 text-xs font-medium">
                                                    <div className={`w-[120px] text-right ${subDeltaCost !== 0 ? (subDeltaCost > 0 ? 'text-red-600' : 'text-green-600') : 'text-gray-400'}`}>
                                                        {subDeltaCost !== 0 ? (subDeltaCost > 0 ? '+' : '') + currency.format(subDeltaCost) : '-'}
                                                    </div>
                                                    <div className={`w-[100px] text-right ${subDeltaLabour !== 0 ? (subDeltaLabour > 0 ? 'text-red-600' : 'text-green-600') : 'text-gray-400'}`}>
                                                        {subDeltaLabour !== 0 ? (subDeltaLabour > 0 ? '+' : '') + decimal.format(subDeltaLabour) : '-'}
                                                    </div>
                                                </div>
                                            </button>

                                            {/* Rows */}
                                            {!isCollapsed && (
                                                <div className="divide-y divide-gray-100">
                                                    {rows.map((row) => {
                                                        const isPos = row.deltaQty > 0;
                                                        const isNeg = row.deltaQty < 0;
                                                        const diffClass = isPos ? 'text-green-600 bg-green-50/30' : (isNeg ? 'text-red-500 bg-red-50/30' : 'text-gray-300');

                                                        return (
                                                            <div key={row.key} className="grid grid-cols-[150px_1fr_80px_80px_80px_120px_100px] gap-0 hover:bg-blue-50/10 transition-colors text-sm items-center">
                                                                <div className="px-4 py-2 font-mono text-xs font-medium text-gray-600 truncate" title={row.partNumber}>
                                                                    {row.partNumber}
                                                                </div>
                                                                <div className="px-4 py-2 text-gray-700 truncate" title={row.description}>
                                                                    {row.description}
                                                                </div>
                                                                <div className="px-4 py-2 text-center text-gray-400 text-xs">
                                                                    {row.qtyBase || '-'}
                                                                </div>
                                                                <div className="px-4 py-2 text-center text-gray-400 text-xs">
                                                                    {row.qtyComp || '-'}
                                                                </div>
                                                                <div className={`px-4 py-2 text-center font-bold h-full flex items-center justify-center border-x border-gray-50 ${diffClass}`}>
                                                                    {row.deltaQty > 0 ? '+' : ''}{row.deltaQty !== 0 ? row.deltaQty : '-'}
                                                                </div>
                                                                <div className={`px-4 py-2 text-right tabular-nums ${row.deltaCost !== 0 ? (row.deltaCost > 0 ? 'text-red-600' : 'text-green-600') : 'text-gray-300'}`}>
                                                                    {row.deltaCost !== 0 ? currency.format(row.deltaCost) : '-'}
                                                                </div>
                                                                <div className={`px-4 py-2 text-right tabular-nums ${row.deltaLabour !== 0 ? (row.deltaLabour > 0 ? 'text-red-600' : 'text-green-600') : 'text-gray-300'}`}>
                                                                    {row.deltaLabour !== 0 ? decimal.format(row.deltaLabour) : '-'}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
