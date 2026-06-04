import React from 'react';
import { Item } from '@/context/QuoteContext';
import { Info, Zap, LockIcon } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { SystemItemHoverCard } from './SystemItemHoverCard';
import { isAutoManaged, isFormulaPriced } from '@/lib/system-definitions';

// The type in BoardContent.tsx for ConsolidatedItem
interface ConsolidatedItem extends Item {
    isConsolidated?: boolean;
    originalIds?: string[];
    pricingWarning?: boolean;
}

interface ItemBadgesProps {
    item: Item | ConsolidatedItem;
    boardItems: Item[];
    copperPricePerKg: number;
    showConsolidationBadges?: boolean;
}

export function ItemBadges({ item, boardItems, copperPricePerKg, showConsolidationBadges = false }: ItemBadgesProps) {
    const isAuto = item.isSystemManaged || (item as any).autoAdded || isAutoManaged(item.name) || item.isDefault;
    const autoManaged = isAuto;
    const formulaPriced = isFormulaPriced(item.name);
    
    let isCopper = false;
    if (item.totalCopperWeightKgPerMeter && item.isCopperPriced) {
        isCopper = true;
    }

    const consolidatedItem = item as ConsolidatedItem;

    return (
        <>
            {showConsolidationBadges && consolidatedItem.isConsolidated && (
                <span className="inline-flex items-center rounded-full bg-indigo-50 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700 ring-1 ring-inset ring-indigo-600/10">
                    Aggregated
                </span>
            )}
            {showConsolidationBadges && consolidatedItem.pricingWarning && (
                <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-1.5 py-0.5 text-[10px] font-medium text-red-700 ring-1 ring-inset ring-red-600/10" title="Warning: Multiple prices found for this part number. Showing price group.">
                    <Info size={8} />
                    Price Mismatch
                </span>
            )}
            {isCopper && (
                <div className="flex items-center gap-1">
                    <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-1.5 py-0.5 text-[10px] font-medium text-orange-700 ring-1 ring-inset ring-orange-600/20" title={`Live Copper Price: ${formatCurrency(copperPricePerKg)}/kg`}>
                        <Zap size={8} className="text-orange-700" />
                        Cu
                    </span>
                </div>
            )}
            {formulaPriced && !isCopper && (
                <div className="flex items-center gap-1">
                    <SystemItemHoverCard item={{ ...item, isFormulaPriced: true } as any} boardItems={boardItems}>
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20 hover:bg-amber-100 transition-colors cursor-help" title="">
                            <LockIcon size={8} className="text-amber-700" />
                            Calculated
                        </span>
                    </SystemItemHoverCard>
                </div>
            )}
            {autoManaged && !formulaPriced && !isCopper && (
                <div className="flex items-center gap-1">
                    <SystemItemHoverCard item={item} boardItems={boardItems}>
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 ring-1 ring-inset ring-blue-600/20 hover:bg-blue-100 transition-colors">
                            <LockIcon size={8} className="text-blue-700" />
                            {item.subcategory?.includes('MCCB Base') ? 'Auto (Base)' : 'Auto'}
                        </span>
                    </SystemItemHoverCard>
                </div>
            )}
            {item.category === 'Other' && (
                <div className="flex items-center gap-1">
                    <span className={cn(
                        "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset",
                        item.subcategory === 'Price Adjustment'
                            ? "bg-slate-50 text-slate-700 ring-slate-600/20"
                            : "bg-purple-50 text-purple-700 ring-purple-600/20"
                    )}>
                        {item.subcategory === 'Price Adjustment' ? 'Price Adjustment' : 'Manual Item'}
                    </span>
                </div>
            )}
        </>
    );
}
