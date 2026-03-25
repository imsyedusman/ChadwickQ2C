'use client';

import { useState, useEffect } from 'react';
import { useQuote } from '@/context/QuoteContext';
import { Settings, ChevronDown, ChevronRight, RotateCcw } from 'lucide-react';

export default function QuoteCostingOverrides() {
    const { globalSettings, quoteSnapshot, overrides, updateOverrides, resetToGlobalDefaults, saving } = useQuote();
    const [isOpen, setIsOpen] = useState(false);

    // Local state for inputs to handle UX (debouncing could be added if needed, but onBlur is fine for now)
    // Actually, we can just use the overrides from context directly if we want instant feedback, 
    // but for number inputs it's often better to have local state or just use onBlur/Enter.
    // Let's use onBlur for saving to avoid too many writes, but update local state on change.

    const handleChange = (key: keyof typeof overrides, value: string, isPercentage: boolean = false) => {
        if (value === '') {
            updateOverrides({ [key]: null });
            return;
        }
        let numValue = parseFloat(value);
        if (isNaN(numValue)) return;

        if (isPercentage) {
            numValue = numValue / 100;
        }
        updateOverrides({ [key]: numValue });
    };

    const renderInput = (
        label: string,
        overrideKey: keyof typeof overrides,
        settingsKey: keyof typeof globalSettings,
        isPercentage: boolean = false,
        step: number = 0.01
    ) => {
        const globalValue = globalSettings[settingsKey] as number;
        const snapshotValue = (quoteSnapshot as any)?.[settingsKey] as number | undefined;
        const overrideValue = overrides[overrideKey];

        const isOverridden = overrideValue !== null && overrideValue !== undefined;
        const isSnapshotted = !isOverridden && snapshotValue !== undefined && snapshotValue !== null;

        // Effective value for display (Hierarchy: Override > Snapshot > Global)
        const effectiveValue = overrideValue ?? snapshotValue ?? globalValue;

        // For percentages:
        // stored: 0.18 -> display: 18
        // stored: 0.125 -> display: 12.5
        const multiplier = isPercentage ? 100 : 1;

        let displayValue: string | number = '';
        if (isOverridden || isSnapshotted) {
            // Fix float errors and parse back to number to remove trailing zeros
            displayValue = parseFloat((effectiveValue * multiplier).toFixed(4));
        }

        const placeholderValue = parseFloat((globalValue * multiplier).toFixed(4));
        const snapshotDisplayValue = isSnapshotted ? parseFloat((snapshotValue! * multiplier).toFixed(4)) : null;

        const showSnapshotHint = isSnapshotted && snapshotDisplayValue !== placeholderValue;

        return (
            <div className="flex flex-col gap-1">
                <div className="flex justify-between items-center">
                    <label className="text-xs font-medium text-gray-600">{label}</label>
                    {(isOverridden || isSnapshotted) && (
                        <button
                            onClick={() => {
                                if (isOverridden) {
                                    updateOverrides({ [overrideKey]: null });
                                }
                            }}
                            className={`text-[10px] flex items-center gap-1 transition-colors ${isOverridden ? 'text-blue-600 hover:text-blue-800' : 'text-gray-400 cursor-default'
                                }`}
                            title={isOverridden ? "Clear override to use snapshot/global" : "Using snapshot value"}
                            disabled={!isOverridden}
                        >
                            {isOverridden && <RotateCcw size={10} />}
                            {isOverridden ? 'Clear Override' : 'Snapshot Active'}
                        </button>
                    )}
                </div>
                <div className="relative">
                    <input
                        type="number"
                        step={step}
                        min={isPercentage ? 0 : undefined}
                        max={isPercentage ? 100 : undefined}
                        value={displayValue}
                        onChange={(e) => handleChange(overrideKey, e.target.value, isPercentage)}
                        placeholder={placeholderValue.toString()}
                        className={`w-full text-sm border rounded px-2 py-1.5 pr-7 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors ${isOverridden
                            ? 'border-blue-300 bg-blue-50 text-blue-900 font-medium'
                            : isSnapshotted
                                ? 'border-amber-200 bg-amber-50 text-amber-900'
                                : 'border-gray-200 text-gray-900 placeholder:text-gray-400'
                            }`}
                    />
                    {isPercentage && (
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-gray-600 font-medium pointer-events-none select-none">
                            %
                        </span>
                    )}
                </div>
                {showSnapshotHint && (
                    <div className="text-[10px] text-amber-600 font-medium">
                        Quote Default: {snapshotDisplayValue}{isPercentage ? '%' : ''}
                    </div>
                )}
                <div className="text-[10px] text-gray-400 text-right">
                    Current Global: {placeholderValue}{isPercentage ? '%' : ''}
                </div>
            </div>
        );
    };

    return (
        <div className="border-b border-gray-200 bg-white">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
            >
                <div className="flex items-center gap-2 font-semibold text-gray-700 text-sm">
                    <Settings size={16} />
                    <span>Management Settings</span>
                </div>
                {isOpen ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
            </button>

            {isOpen && (
                <div className="p-4 pt-0 space-y-4 animate-in slide-in-from-top-2 duration-200">
                    <div className="flex flex-col gap-2 mb-2">
                        <div className="p-3 bg-gray-50 rounded border border-gray-100 text-xs text-gray-500">
                            Values set here override global defaults for this quote only. Leave empty to use global settings.
                        </div>
                        <div className="flex justify-end">
                            <button
                                onClick={resetToGlobalDefaults}
                                disabled={saving}
                                className="text-xs font-medium text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded border border-red-200 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                            >
                                <RotateCcw size={12} />
                                Reset All to Global Defaults
                            </button>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                            {renderInput("Labour Rate ($/hr)", "overrideLabourRate", "labourRate", false, 1)}
                            {renderInput("Copper ($/kg)", "overrideCopperPricePerKg", "copperPricePerKg", false, 0.1)}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            {renderInput("Overhead", "overrideOverheadPct", "overheadPct", true, 0.0001)}
                            {renderInput("Engineering", "overrideEngineeringPct", "engineeringPct", true, 0.0001)}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            {renderInput("Target Margin", "overrideTargetMarginPct", "targetMarginPct", true, 0.0001)}
                            {renderInput("Consumables", "overrideConsumablesPct", "consumablesPct", true, 0.0001)}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            {renderInput("GST", "overrideGstPct", "gstPct", true, 0.0001)}
                            {renderInput("Rounding", "overrideRoundingIncrement", "roundingIncrement", false, 1)}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
