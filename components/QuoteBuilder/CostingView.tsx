'use client';

import { useQuote } from '@/context/QuoteContext';
import { formatCurrency } from '@/lib/utils';
import FinancialsHeroCard from './FinancialsHeroCard';
import SidebarCard from './SidebarCard';

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
        sellPriceRounded,
        sheetmetalUplift
    } = totals;

    // Calculate margin percent for display
    const marginPercent = totalCost > 0 ? (profit / totalCost) * 100 : 0;

    return (
        <div className="flex flex-col">
            {/* Sticky Financials Hero Card */}
            <FinancialsHeroCard
                title="Board Financials"
                sellPrice={sellPriceRounded}
                margin={profit}
                marginPercent={marginPercent}
            />

            <div className="p-3 space-y-3 pb-8">
                {/* Labour & Engineering Card */}
                <SidebarCard title="Labour & Engineering">
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-500">Labour Hours ({labourHours.toFixed(1)}h)</span>
                            <span className="text-sm font-medium text-gray-900">{formatCurrency(labourCost, 0)}</span>
                        </div>
                        {engineeringCost > 0 && (
                            <div className="flex justify-between items-center pt-2 border-t border-gray-50">
                                <span className="text-xs text-gray-500">Engineering</span>
                                <span className="text-sm font-medium text-gray-900">{formatCurrency(engineeringCost, 0)}</span>
                            </div>
                        )}
                    </div>
                </SidebarCard>

                {/* Materials Breakdown Card */}
                <SidebarCard title="Materials Breakdown">
                    <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between text-gray-600">
                            <span>Materials Base</span>
                            <span className="font-medium text-gray-900">{formatCurrency(materialCost - sheetmetalUplift, 0)}</span>
                        </div>

                        {/* Sheetmetal Logic (Custom/Outdoor Boards Only) */}
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

                            if (config?.enclosureType === 'Custom' && totals.sheetmetalUplift > 0) {
                                return (
                                    <div className="flex justify-between text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded -mx-1.5">
                                        <span>+ Sheetmetal Uplift (4%)</span>
                                        <span>{formatCurrency(totals.sheetmetalUplift, 0)}</span>
                                    </div>
                                );
                            }
                            return null;
                        })()}

                        {consumablesCost > 0 && (
                            <div className="flex justify-between text-gray-500">
                                <span>+ Consumables</span>
                                <span>{formatCurrency(consumablesCost, 0)}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-gray-900 font-medium pt-1.5 border-t border-gray-100 mt-1">
                            <span>Total Materials</span>
                            <span>{formatCurrency(materialCost + consumablesCost, 0)}</span>
                        </div>
                    </div>
                </SidebarCard>

                {/* Cost Summary Card */}
                <SidebarCard title="Cost Overview">
                    <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between text-gray-600">
                            <span>Cost Base</span>
                            <span>{formatCurrency(costBase, 0)}</span>
                        </div>
                        {overheadAmount > 0 && (
                            <div className="flex justify-between text-gray-600">
                                <span>+ Overhead</span>
                                <span>{formatCurrency(overheadAmount, 0)}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-gray-900 font-bold pt-2 border-t border-gray-100 mt-1 text-sm">
                            <span>Total Cost</span>
                            <span>{formatCurrency(totalCost, 0)}</span>
                        </div>
                    </div>
                </SidebarCard>
            </div>
        </div>
    );
}
