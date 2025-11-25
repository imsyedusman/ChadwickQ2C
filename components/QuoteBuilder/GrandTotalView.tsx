'use client';

import { useState } from 'react';
import { useQuote } from '@/context/QuoteContext';
import { DollarSign, FileDown, Loader2 } from 'lucide-react';
import { ExportService } from '@/lib/export-service';

export default function GrandTotalView() {
    const { grandTotals, quoteNumber, clientName, projectRef, description, boards, settings } = useQuote();
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
        sellPrice,
        sellPriceRounded,
        gst,
        finalSellPrice
    } = grandTotals;

    const handleExport = async () => {
        setIsExporting(true);
        try {
            const quoteData = {
                quoteNumber,
                clientName,
                projectRef,
                description,
                boards
            };

            await ExportService.generateQuoteDocument({
                quote: quoteData,
                settings,
                totals: grandTotals
            });
        } catch (error) {
            console.error('Export failed', error);
            alert('Failed to generate document');
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="bg-white p-4">
            {/* Header */}
            <div className="mb-4 pb-3 border-b border-gray-200">
                <h3 className="text-sm font-semibold text-gray-700">Quote Total</h3>
                <p className="text-xs text-gray-500 mt-0.5">{quoteNumber}</p>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="bg-gray-50 p-2.5 rounded">
                    <div className="text-xs text-gray-500 mb-0.5">Labour Hours</div>
                    <div className="text-lg font-bold text-gray-900">{labourHours.toFixed(1)}h</div>
                </div>
                <div className="bg-gray-50 p-2.5 rounded">
                    <div className="text-xs text-gray-500 mb-0.5">Labour Cost</div>
                    <div className="text-lg font-bold text-gray-900">${labourCost.toFixed(0)}</div>
                </div>
            </div>

            {/* Cost Breakdown */}
            <div className="space-y-1.5 text-xs mb-4 pb-4 border-b border-gray-200">
                <div className="flex justify-between text-gray-600">
                    <span>Materials</span>
                    <span className="font-medium">${materialCost.toFixed(0)}</span>
                </div>
                {consumablesCost > 0 && (
                    <div className="flex justify-between text-gray-500 text-[11px] pl-3">
                        <span>+ Consumables</span>
                        <span>${consumablesCost.toFixed(0)}</span>
                    </div>
                )}
                <div className="flex justify-between text-gray-700 font-medium pt-1">
                    <span>Cost Base</span>
                    <span>${costBase.toFixed(0)}</span>
                </div>
                {overheadAmount > 0 && (
                    <div className="flex justify-between text-gray-600">
                        <span>Overhead</span>
                        <span>${overheadAmount.toFixed(0)}</span>
                    </div>
                )}
                {engineeringCost > 0 && (
                    <div className="flex justify-between text-gray-600">
                        <span>Engineering</span>
                        <span>${engineeringCost.toFixed(0)}</span>
                    </div>
                )}
                <div className="flex justify-between text-gray-900 font-semibold pt-1.5 border-t border-gray-200">
                    <span>Total Cost</span>
                    <span>${totalCost.toFixed(0)}</span>
                </div>
            </div>

            {/* Pricing */}
            <div className="space-y-2 mb-4">
                <div className="bg-blue-50 border border-blue-100 rounded p-2.5">
                    <div className="flex justify-between items-baseline mb-1">
                        <span className="text-xs text-blue-700">Sell Price (ex GST)</span>
                        <span className="text-sm font-semibold text-blue-900">${sellPriceRounded.toFixed(0)}</span>
                    </div>
                    <div className="flex justify-between items-baseline text-[11px]">
                        <span className="text-blue-600">+ GST ({(gst / sellPriceRounded * 100).toFixed(0)}%)</span>
                        <span className="text-blue-700">${gst.toFixed(0)}</span>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-lg p-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                            <DollarSign size={16} className="opacity-90" />
                            <span className="text-sm font-medium">Total (inc GST)</span>
                        </div>
                        <span className="text-2xl font-bold">${finalSellPrice.toFixed(0)}</span>
                    </div>
                    {profit > 0 && (
                        <div className="mt-2 pt-2 border-t border-blue-500/30 flex justify-between text-xs">
                            <span className="text-blue-100">Margin</span>
                            <span className="text-blue-100 font-medium">${profit.toFixed(0)} ({((profit / totalCost) * 100).toFixed(0)}%)</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Export Button */}
            <button
                onClick={handleExport}
                disabled={isExporting}
                className="w-full py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isExporting ? (
                    <>
                        <Loader2 className="animate-spin" size={18} />
                        Generating...
                    </>
                ) : (
                    <>
                        <FileDown size={18} />
                        Export Tender DOCX
                    </>
                )}
            </button>

            {/* Footer Note */}
            <p className="text-[10px] text-gray-400 mt-3 text-center italic">
                Using costing defaults from Settings
            </p>
        </div>
    );
}
