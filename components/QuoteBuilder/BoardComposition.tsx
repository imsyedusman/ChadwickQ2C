import React from 'react';
import { Item } from '../../context/QuoteContext';
import { cn, formatCurrency } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface BoardCompositionProps {
    items: Item[];
}

interface IndicatorConfig {
    label: string;
    isActive: boolean;
    count: number;
    description: string;
    totalLabour: number;
    totalCost: number;
}

const BoardComposition: React.FC<BoardCompositionProps> = ({ items }) => {
    // -------------------------------------------------------------------------
    // STRICT PRESENCE LOGIC & AGGREGATION
    // -------------------------------------------------------------------------

    const calculateTotals = (filteredItems: Item[]) => {
        return filteredItems.reduce((acc, item) => ({
            labour: acc.labour + (item.quantity * (item.labourHours || 0)),
            cost: acc.cost + (item.quantity * (item.unitPrice || 0))
        }), { labour: 0, cost: 0 });
    };

    // 1. BASICS: Category = 'Basics'
    const basicsItems = items.filter(i => i.category === 'Basics');
    const basicsTotals = calculateTotals(basicsItems);

    // 2. BUSBARS: Category = 'Busbar'
    const busbarItems = items.filter(i => i.category === 'Busbar');
    const busbarTotals = calculateTotals(busbarItems);

    // 3. CT METERING: System-managed items added by CT automation
    // strict: isSystemManaged AND (systemTag='CT_METERING' OR subcategory='CT Metering')
    // We avoid name matching.
    const ctItems = items.filter(i =>
        i.isSystemManaged && (
            i.systemTag === 'CT_METERING' ||
            i.subcategory === 'CT Metering'
        )
    );
    const ctTotals = calculateTotals(ctItems);

    // 4. MISCELLANEOUS: Category = 'Miscellaneous'
    // Note: In catalog, Miscellaneous is often a subcategory of Basics.
    // However, user specified "category = Miscellaneous".
    // We will check both top-level Category AND Subcategory to catch all "Miscellanous" intent strictly.
    const miscItems = items.filter(i =>
        i.category === 'Miscellaneous' ||
        i.subcategory === 'Miscellaneous'
    );
    const miscTotals = calculateTotals(miscItems);

    // 5. ISOLATORS / CHANGEOVER: Category = 'Isolators' OR 'Changeover'
    // Checking both Category and Subcategory for these specific keys.
    const isoItems = items.filter(i => {
        const cat = i.category || '';
        const sub = i.subcategory || '';
        return (
            cat === 'Isolators' || cat === 'Changeover' ||
            sub === 'Isolators' || sub === 'Changeover' ||
            sub === 'Main Switch'
        );
    });
    const isoTotals = calculateTotals(isoItems);

    const indicators: IndicatorConfig[] = [
        {
            label: 'Basics',
            isActive: basicsItems.length > 0,
            count: basicsItems.length,
            description: 'Enclosures, escutcheons, and mounting.',
            totalLabour: basicsTotals.labour,
            totalCost: basicsTotals.cost
        },
        {
            label: 'Busbars',
            isActive: busbarItems.length > 0,
            count: busbarItems.length,
            description: 'Main busbar systems.',
            totalLabour: busbarTotals.labour,
            totalCost: busbarTotals.cost
        },
        {
            label: 'CT Metering',
            isActive: ctItems.length > 0,
            count: ctItems.length,
            description: 'Automated CT metering allowance.',
            totalLabour: ctTotals.labour,
            totalCost: ctTotals.cost
        },
        {
            label: 'Miscellaneous',
            isActive: miscItems.length > 0,
            count: miscItems.length,
            description: 'General hardware and accessories.',
            totalLabour: miscTotals.labour,
            totalCost: miscTotals.cost
        },
        {
            label: 'Isolators / Switches',
            isActive: isoItems.length > 0,
            count: isoItems.length,
            description: 'Main isolation and changeover switches.',
            totalLabour: isoTotals.labour,
            totalCost: isoTotals.cost
        },
    ];

    return (
        <div className="px-6 py-1.5 bg-white border-b border-gray-100 flex items-center gap-6 text-xs text-gray-500 font-medium select-none overflow-x-auto h-9">
            <div className="text-gray-400 font-mono text-[10px] uppercase tracking-wider mr-2 shrink-0">Composition</div>
            {indicators.map((ind) => (
                <TooltipProvider key={ind.label}>
                    <Tooltip delayDuration={300}>
                        <TooltipTrigger asChild>
                            <div className={cn(
                                "flex items-center gap-2 transition-colors cursor-help",
                                ind.isActive ? "text-blue-700" : "text-gray-300"
                            )}>
                                <div className={cn(
                                    "w-1.5 h-1.5 rounded-full shrink-0",
                                    ind.isActive ? "bg-blue-600" : "bg-gray-300"
                                )} />
                                <span className={cn(
                                    "font-medium truncate text-[11px] leading-none",
                                    ind.isActive ? "text-gray-700" : "text-gray-400"
                                )}>{ind.label}</span>
                            </div>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="text-xs p-3">
                            <p className="font-semibold mb-1">{ind.label}</p>
                            <p className="text-gray-500 mb-2">{ind.description}</p>
                            <div className="space-y-1 border-t border-gray-100 pt-2">
                                <div className="flex justify-between gap-4">
                                    <span className="text-gray-500">Labour:</span>
                                    <span className="font-mono">{ind.totalLabour.toFixed(1)} hrs</span>
                                </div>
                                <div className="flex justify-between gap-4">
                                    <span className="text-gray-500">Material:</span>
                                    <span className="font-mono">{formatCurrency(ind.totalCost)}</span>
                                </div>
                                <div className="flex justify-between gap-4 pt-1 mt-1 border-t border-gray-50 text-gray-400 text-[10px]">
                                    <span>Count:</span>
                                    <span>{ind.count} items</span>
                                </div>
                            </div>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            ))}
        </div>
    );
};

export default BoardComposition;
