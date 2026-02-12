import React, { useMemo, useState } from 'react';
import { X, ArrowRight, AlertCircle, ArrowLeftRight } from 'lucide-react';
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

    // Memoize the comparison result
    const comparison = useMemo(() => {
        const baseBoard = boards.find(b => b.id === baseBoardId);
        const compBoard = boards.find(b => b.id === compBoardId);

        if (!baseBoard || !compBoard) return null;

        const baseAgg = aggregateBoardItems(baseBoard.items);
        const compAgg = aggregateBoardItems(compBoard.items);

        return compareAggregations(baseAgg, compAgg);
    }, [baseBoardId, compBoardId, boards]);

    // Formatter
    const currency = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' });
    const decimal = new Intl.NumberFormat('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    if (!isOpen) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col p-0 gap-0 bg-white">
                {/* Header */}
                <DialogHeader className="p-4 border-b border-gray-100 flex-shrink-0">
                    <div className="flex items-center justify-between">
                        <DialogTitle className="text-lg font-bold text-gray-800 flex items-center gap-2">
                            <ArrowLeftRight size={20} className="text-blue-600" />
                            Board Comparison
                        </DialogTitle>
                        {/* Custom Close Button if needed, or rely on Dialog default */}
                    </div>

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
                                <span className="block text-[10px] text-blue-600 uppercase font-bold tracking-wider">Material Delta</span>
                                <span className={`text-lg font-bold ${comparison.summary.deltaMaterialCost > 0 ? 'text-red-600' : (comparison.summary.deltaMaterialCost < 0 ? 'text-green-600' : 'text-gray-700')}`}>
                                    {comparison.summary.deltaMaterialCost > 0 ? '+' : ''}{currency.format(comparison.summary.deltaMaterialCost)}
                                </span>
                            </div>
                            <div className="text-right">
                                <span className="block text-[10px] text-blue-600 uppercase font-bold tracking-wider">Labour Delta</span>
                                <span className={`text-lg font-bold ${comparison.summary.deltaLabourHours > 0 ? 'text-red-600' : (comparison.summary.deltaLabourHours < 0 ? 'text-green-600' : 'text-gray-700')}`}>
                                    {comparison.summary.deltaLabourHours > 0 ? '+' : ''}{decimal.format(comparison.summary.deltaLabourHours)} hrs
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-0">
                    {comparison?.summary.diffCount === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full py-20 text-gray-400">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                <ArrowLeftRight size={32} className="opacity-20" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-600">No differences detected</h3>
                            <p className="text-sm">The selected boards are identical in terms of content.</p>
                        </div>
                    ) : (
                        <table className="w-full text-sm text-left relative">
                            <thead className="text-xs text-gray-500 uppercase bg-gray-50 sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th className="px-4 py-3 font-bold w-[150px]">Part Number</th>
                                    <th className="px-4 py-3 font-bold">Description</th>
                                    <th className="px-4 py-3 font-bold text-center w-[80px] text-gray-400">Qty A</th>
                                    <th className="px-4 py-3 font-bold text-center w-[80px] text-gray-400">Qty B</th>
                                    <th className="px-4 py-3 font-bold text-center w-[80px] bg-blue-50/50">Diff</th>
                                    <th className="px-4 py-3 font-bold text-right w-[120px]">Cost Delta</th>
                                    <th className="px-4 py-3 font-bold text-right w-[100px]">Labour Delta</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {comparison?.rows.map((row) => {
                                    const isPos = row.deltaQty > 0;
                                    const isNeg = row.deltaQty < 0;
                                    const diffClass = isPos ? 'text-green-600 bg-green-50/30' : (isNeg ? 'text-red-500 bg-red-50/30' : 'text-gray-300');

                                    return (
                                        <tr key={row.key} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-4 py-2 font-mono text-xs font-medium text-gray-600 truncate max-w-[150px]" title={row.partNumber}>
                                                {row.partNumber}
                                            </td>
                                            <td className="px-4 py-2 text-gray-700 truncate max-w-[300px]" title={row.description}>
                                                {row.description}
                                            </td>
                                            <td className="px-4 py-2 text-center text-gray-400 text-xs">
                                                {row.qtyBase || '-'}
                                            </td>
                                            <td className="px-4 py-2 text-center text-gray-400 text-xs">
                                                {row.qtyComp || '-'}
                                            </td>
                                            <td className={`px-4 py-2 text-center font-bold border-x border-gray-100 ${diffClass}`}>
                                                {row.deltaQty > 0 ? '+' : ''}{row.deltaQty !== 0 ? row.deltaQty : '-'}
                                            </td>
                                            <td className={`px-4 py-2 text-right tabular-nums ${row.deltaCost !== 0 ? (row.deltaCost > 0 ? 'text-red-600' : 'text-green-600') : 'text-gray-300'}`}>
                                                {row.deltaCost !== 0 ? currency.format(row.deltaCost) : '-'}
                                            </td>
                                            <td className={`px-4 py-2 text-right tabular-nums ${row.deltaLabour !== 0 ? (row.deltaLabour > 0 ? 'text-red-600' : 'text-green-600') : 'text-gray-300'}`}>
                                                {row.deltaLabour !== 0 ? decimal.format(row.deltaLabour) : '-'}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
