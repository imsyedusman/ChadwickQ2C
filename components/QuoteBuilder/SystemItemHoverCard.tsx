import React from 'react';
import {
    HoverCard,
    HoverCardContent,
    HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Item } from '@/context/QuoteContext';
import { getSystemItemExplanation } from '@/lib/system-explanations';
import { cn } from '@/lib/utils';
import { Info, Calculator, ShieldCheck } from 'lucide-react';

interface SystemItemHoverCardProps {
    item: Item;
    boardItems: Item[];
    children: React.ReactNode;
    className?: string;
}

export const SystemItemHoverCard: React.FC<SystemItemHoverCardProps> = ({
    item,
    boardItems,
    children,
    className
}) => {
    // Determine if we should show the card
    // 1. System Managed (Auto) OR Default
    // 2. Formula Priced (Calculated)
    const isAuto = item.isSystemManaged || (item as any).isDefault;
    const isCalculated = (item as any).isFormulaPriced;

    if (!isAuto && !isCalculated) {
        return <>{children}</>;
    }

    let explanation;
    try {
        explanation = getSystemItemExplanation(item, boardItems);
    } catch (err) {
        // Fallback for unexpected errors
        explanation = {
            reason: "This item is automatically managed by the system.",
            calculation: "",
            ruleName: "ERROR_IN_EXPLANATION",
            handler: "unknown"
        };
    }

    const title = isCalculated ? "Calculated Item" : "System Managed Item";
    const icon = isCalculated ? <Calculator size={16} className="text-amber-600" /> : <ShieldCheck size={16} className="text-blue-600" />;

    // Header Style
    const headerBg = isCalculated ? "bg-amber-50/50" : "bg-blue-50/50";
    const titleColor = isCalculated ? "text-amber-800" : "text-blue-900";

    return (
        <HoverCard openDelay={200} closeDelay={100}>
            <HoverCardTrigger asChild>
                <div className={cn("cursor-help inline-flex", className)}>
                    {children}
                </div>
            </HoverCardTrigger>
            <HoverCardContent
                className="w-80 p-0 overflow-hidden shadow-xl border-slate-200"
                side="top"
                align="start"
                sideOffset={8}
            >
                {/* Header */}
                <div className={cn("px-4 py-3 border-b border-slate-100 flex items-center gap-2", headerBg)}>
                    {icon}
                    <span className={cn("font-medium text-sm tracking-tight", titleColor)}>{title}</span>
                </div>

                {/* Body */}
                <div className="p-4 space-y-4 bg-white">

                    {/* Reason Section */}
                    <div className="space-y-1">
                        <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Reason</h4>
                        <p className="text-sm text-slate-800 font-medium leading-normal">
                            {explanation.reason}
                        </p>
                    </div>

                    {/* Quantity Section - Only if specific calculation info exists */}
                    {explanation.calculation && (
                        <div className="space-y-1">
                            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Quantity</h4>
                            <p className="text-sm text-slate-600 leading-normal">
                                {explanation.calculation}
                            </p>
                        </div>
                    )}

                    {/* Rule & Handler Footer */}
                    {(explanation.ruleName || explanation.handler) && (
                        <div className="pt-3 mt-2 border-t border-slate-50 space-y-1">
                            {explanation.ruleName && (
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-slate-400 font-medium w-12">RULE:</span>
                                    <code className="text-[10px] text-slate-500 font-mono tracking-tight">
                                        {explanation.ruleName}
                                    </code>
                                </div>
                            )}
                            {explanation.handler && (
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-slate-400 font-medium w-12">HANDLER:</span>
                                    <code className="text-[10px] text-slate-400 font-mono tracking-tight">
                                        {explanation.handler}
                                    </code>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </HoverCardContent>
        </HoverCard>
    );
};
