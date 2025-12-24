'use client';

import { useState } from 'react';
import { useQuote } from '@/context/QuoteContext';
import { FileDown, Loader2 } from 'lucide-react';
import { ExportService } from '@/lib/export-service';
import { formatCurrency } from '@/lib/utils';
import FinancialsHeroCard from './FinancialsHeroCard';
import SidebarCard from './SidebarCard';

export default function GrandTotalView() {
    const { grandTotals, quoteNumber, clientName, clientCompany, projectRef, description, boards, settings, effectiveSettings } = useQuote();
    const [isExporting, setIsExporting] = useState(false);

    if (!grandTotals) return null;

    const {
        labourHours,
        materialCost,
        labourCost,
        consumablesCost,
        costBase,
        overheadAmount,
        engineeringCost,
        totalCost,
        profit,
        sellPriceRounded,
        gst,
        finalSellPrice
    } = grandTotals;

    // Calculate margin percent for display
    const marginPercent = totalCost > 0 ? (profit / totalCost) * 100 : 0;

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
            console.log("Starting export...");
            try {
                const res = await fetch("/api/templates?default=true");
                console.log("Fetched templates API:", res.status);
                if (res.ok) {
                    const templateData = await res.json();
                    if (templateData && templateData.filename) {
                        templatePath = `/templates/${templateData.filename}`;
                        console.log("Using default template:", templatePath);
                    } else {
                        console.log("No default template found");
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

            console.log("Calling ExportService with template:", templatePath);

            // Pass null for boardTotals so ExportService calculates them using effectiveSettings
            await ExportService.generateQuoteDocument({
                quote: { ...quoteData, templatePath },
                settings: effectiveSettings, // Use effective settings (with overrides)
                totals: {
                    boardTotals: null,
                    grandTotals
                }
            });
            console.log("ExportService finished");
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
                margin={profit}
                marginPercent={marginPercent}
                gst={gst}
            />

            <div className="p-3 space-y-3 pb-8">
                {/* Labour & Engineering */}
                <SidebarCard title="Labour & Engineering">
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-500">Total Labour Hours ({labourHours.toFixed(1)}h)</span>
                            <span className="text-sm font-medium text-gray-900">{formatCurrency(labourCost, 0)}</span>
                        </div>
                        {engineeringCost > 0 && (
                            <div className="flex justify-between items-center pt-2 border-t border-gray-50">
                                <span className="text-xs text-gray-500">Total Engineering</span>
                                <span className="text-sm font-medium text-gray-900">{formatCurrency(engineeringCost, 0)}</span>
                            </div>
                        )}
                    </div>
                </SidebarCard>

                {/* Materials Breakdown */}
                <SidebarCard title="Materials Breakdown">
                    <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between text-gray-600">
                            <span>Materials Base</span>
                            <span className="font-medium text-gray-900">{formatCurrency(materialCost, 0)}</span>
                        </div>
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

                {/* Cost Overview */}
                <SidebarCard title="Quote Overview">
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
                        <div className="flex justify-between text-gray-900 font-bold pt-2 border-t border-gray-100 mt-1 text-sm bg-blue-50/50 -mx-3 px-3 py-2 border-b">
                            <span>Total Cost</span>
                            <span>{formatCurrency(totalCost, 0)}</span>
                        </div>
                        <div className="flex justify-between text-blue-900 font-bold pt-2 text-base px-1">
                            <span>Total Inc GST</span>
                            <span>{formatCurrency(finalSellPrice, 0)}</span>
                        </div>
                    </div>
                </SidebarCard>

                {/* Export Button */}
                <button
                    onClick={handleExport}
                    disabled={isExporting}
                    className="w-full py-3 bg-gray-900 hover:bg-gray-800 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md text-sm mt-4"
                >
                    {isExporting ? (
                        <>
                            <Loader2 className="animate-spin" size={16} />
                            Generating...
                        </>
                    ) : (
                        <>
                            <FileDown size={16} />
                            Export Quote
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
