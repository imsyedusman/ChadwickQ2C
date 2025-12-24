'use client';

import { useQuote } from '@/context/QuoteContext';
import { TrendingUp } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

export default function CostingView() {
    const { totals, settings, boards, selectedBoardId } = useQuote();

    const {
        materialCost,
        labourHours,
        labourCost,
        consumablesCost,
        costBase,
        overheadAmount,
        engineeringCost,
        totalCost,
        profit,
        sellPrice,
        sellPriceRounded,
        sheetmetalUplift
    } = totals;

    return (
        <div className="flex flex-col h-full">
            {/* Per-Board Summary */}
            <div className="bg-white border-b border-gray-200">
                <div className="p-4 border-b border-gray-100 bg-gray-50">
                    <h2 className="font-semibold text-gray-700 flex items-center gap-2 text-sm">
                        <TrendingUp size={16} />
                        Selected Board Summary
                    </h2>
                </div>

                <div className="p-4 space-y-4">
                    {/* Key Metrics */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-gray-50 p-2.5 rounded border border-gray-200">
                            <div className="text-xs text-gray-500 mb-0.5">Labour Hours</div>
                            <div className="text-lg font-bold text-gray-900">{labourHours.toFixed(1)}h</div>
                        </div>
                        <div className="bg-gray-50 p-2.5 rounded border border-gray-200">
                            <div className="text-xs text-gray-500 mb-0.5">Labour Cost</div>
                            <div className="text-lg font-bold text-gray-900">{formatCurrency(labourCost, 0)}</div>
                        </div>
                    </div>

                    {/* Sheetmetal Breakdown (Custom/Outdoor Boards Only) */}
                    {(() => {
                        // Parse config safely to determine enclosure type
                        const selectedBoard = boards.find(b => b.id === selectedBoardId);
                        let config: any = {};
                        if (selectedBoard?.config) {
                            try {
                                config = typeof selectedBoard.config === 'string' ? JSON.parse(selectedBoard.config) : selectedBoard.config;
                            } catch (e) {
                                // Ignore parsing error
                            }
                        }

                        if (config?.enclosureType === 'Custom') {
                            const totalSheetmetal = totals.sheetmetalSubtotal;
                            const quotedPrice = totalSheetmetal + totals.sheetmetalUplift;

                            return (
                                <div className="bg-blue-50 border border-blue-100 rounded p-2.5 text-xs">
                                    <div className="text-blue-900 font-semibold mb-1.5 border-b border-blue-200 pb-1">Sheetmetal</div>
                                    <div className="flex justify-between text-blue-800 mb-1">
                                        <span>Total Sheetmetal (Base)</span>
                                        <span>{formatCurrency(totalSheetmetal)}</span>
                                    </div>
                                    <div className="flex justify-between text-blue-900 font-medium">
                                        <span>Quoted Sheetmetal (+4%)</span>
                                        <span>{formatCurrency(quotedPrice)}</span>
                                    </div>
                                </div>
                            );
                        }
                        return null;
                    })()}

                    {/* Cost Breakdown */}
                    <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between text-gray-600">
                            <span>Materials</span>
                            <span className="font-medium">{formatCurrency(materialCost - sheetmetalUplift, 0)}</span>
                        </div>
                        {sheetmetalUplift > 0 && (
                            <div className="flex justify-between text-gray-500 text-[11px] pl-3">
                                <span>+ Sheetmetal Uplift (4%)</span>
                                <span>{formatCurrency(sheetmetalUplift, 0)}</span>
                            </div>
                        )}
                        {consumablesCost > 0 && (
                            <div className="flex justify-between text-gray-500 text-[11px] pl-3">
                                <span>+ Consumables</span>
                                <span>{formatCurrency(consumablesCost, 0)}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-gray-700 font-medium pt-1 border-t border-gray-100">
                            <span>Cost Base</span>
                            <span>{formatCurrency(costBase, 0)}</span>
                        </div>
                        {overheadAmount > 0 && (
                            <div className="flex justify-between text-gray-600">
                                <span>Overhead</span>
                                <span>{formatCurrency(overheadAmount, 0)}</span>
                            </div>
                        )}
                        {engineeringCost > 0 && (
                            <div className="flex justify-between text-gray-600">
                                <span>Engineering</span>
                                <span>{formatCurrency(engineeringCost, 0)}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-gray-900 font-semibold pt-1.5 border-t border-gray-200">
                            <span>Total Cost</span>
                            <span>{formatCurrency(totalCost, 0)}</span>
                        </div>
                        <div className="flex justify-between text-gray-600 pt-1">
                            <span>+ Margin</span>
                            <span className="text-green-600 font-medium">{formatCurrency(profit, 0)}</span>
                        </div>
                    </div>

                    {/* Sell Price */}
                    <div className="bg-blue-50 border border-blue-100 rounded p-2.5 mt-3">
                        <div className="flex justify-between items-baseline">
                            <span className="text-xs text-blue-700">Sell Price (ex GST)</span>
                            <span className="text-lg font-bold text-blue-900">{formatCurrency(sellPriceRounded, 0)}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
