'use client';

import { useState, useEffect } from 'react';
import { useQuote } from '@/context/QuoteContext';
import { Settings, ChevronDown, ChevronRight, RotateCcw } from 'lucide-react';

export default function QuoteCostingOverrides() {
    const { settings, overrides, updateOverrides } = useQuote();
    const [isOpen, setIsOpen] = useState(false);

    // Local state for inputs to handle UX (debouncing could be added if needed, but onBlur is fine for now)
    // Actually, we can just use the overrides from context directly if we want instant feedback, 
    // but for number inputs it's often better to have local state or just use onBlur/Enter.
    // Let's use onBlur for saving to avoid too many writes, but update local state on change.

    const handleChange = (key: keyof typeof overrides, value: string) => {
        const numValue = value === '' ? null : parseFloat(value);
        updateOverrides({ [key]: numValue });
    };

    // Helper to render an input field
    const renderInput = (
        label: string,
        overrideKey: keyof typeof overrides,
        globalValue: number,
        isPercentage: boolean = false,
        step: number = 0.01
    ) => {
        const currentValue = overrides[overrideKey];
        const isOverridden = currentValue !== null && currentValue !== undefined;

        // Display value: if overridden, show it. If not, show empty (placeholder shows global).
        // Wait, user wants to see global default if empty.
        // Input value should be the override if it exists, else empty string.
        const displayValue = isOverridden ? currentValue : '';

        return (
            <div className="flex flex-col gap-1">
                <div className="flex justify-between items-center">
                    <label className="text-xs font-medium text-gray-600">{label}</label>
                    {isOverridden && (
                        <button
                            onClick={() => updateOverrides({ [overrideKey]: null })}
                            className="text-[10px] text-blue-600 hover:text-blue-800 flex items-center gap-1"
                            title="Reset to Global Default"
                        >
                            <RotateCcw size={10} />
                            Reset
                        </button>
                    )}
                </div>
                <div className="relative">
                    <input
                        type="number"
                        step={step}
                        value={displayValue ?? ''}
                        onChange={(e) => handleChange(overrideKey, e.target.value)}
                        placeholder={globalValue.toString()}
                        className={`w-full text-sm border rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors ${isOverridden
                                ? 'border-blue-300 bg-blue-50 text-blue-900 font-medium'
                                : 'border-gray-200 text-gray-900 placeholder:text-gray-400'
                            }`}
                    />
                    {isPercentage && (
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">
                            %
                        </span>
                    )}
                </div>
                {!isOverridden && (
                    <div className="text-[10px] text-gray-400 text-right">
                        Global: {globalValue}
                    </div>
                )}
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
                    <div className="p-3 bg-gray-50 rounded border border-gray-100 text-xs text-gray-500 mb-2">
                        Values set here override global defaults for this quote only. Leave empty to use global settings.
                    </div>

                    <div className="space-y-3">
                        {renderInput("Labour Rate ($/hr)", "overrideLabourRate", settings.labourRate, false, 1)}

                        <div className="grid grid-cols-2 gap-3">
                            {renderInput("Overhead", "overrideOverheadPct", settings.overheadPct, true, 0.01)}
                            {renderInput("Engineering", "overrideEngineeringPct", settings.engineeringPct, true, 0.01)}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            {renderInput("Target Margin", "overrideTargetMarginPct", settings.targetMarginPct, true, 0.01)}
                            {renderInput("Consumables", "overrideConsumablesPct", settings.consumablesPct, true, 0.01)}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            {renderInput("GST", "overrideGstPct", settings.gstPct, true, 0.01)}
                            {renderInput("Rounding", "overrideRoundingIncrement", settings.roundingIncrement, false, 1)}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
