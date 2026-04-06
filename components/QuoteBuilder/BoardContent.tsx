'use client';

import { useState, useEffect } from 'react';
import { useQuote, Item } from '@/context/QuoteContext';
import { generateDescriptionBullets, syncDescriptionWithDraft } from '@/lib/description-logic';
import { 
    Plus, Minus, Trash2, Edit2, Info, ChevronDown, ChevronRight, Settings2, Zap, Clock, FileText, User, Lock as LockIcon 
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { computeBusbarPrice } from '@/utils/pricing/copperPricing';
import { isAutoManaged, isFormulaPriced } from '@/lib/system-definitions';
import { compareItems } from '@/lib/sorting';
import { consolidateItems, ConsolidatedItem } from '@/lib/items/consolidation';
import BoardSummary from './BoardSummary';
import BoardComposition from './BoardComposition';
import ManualItemForm from './ManualItemForm';

// ONLY these categories should appear as top-level collapsibles
// Using singular form to match database schema
const MASTER_CATEGORIES = ['Basics', 'Switchboard', 'Busbar', 'Other'];
import { Switch } from '@/components/ui/switch'; // Ensure Switch is available or use standard input checkbox
import { RefreshCw, FileSpreadsheet } from 'lucide-react'; // Import RotateCcw for Restore icon
import { SystemItemHoverCard } from './SystemItemHoverCard';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog";

const CATEGORY_LABELS: Record<string, string> = {
    'Basics': 'Basics',
    'Switchboard': 'Switchgears',
    'Busbar': 'Busbars',
    'Other': 'Other / Additional Items'
};

// Strict Order for Basics items (Part Numbers only)
const BASICS_STRICT_ORDER = [
    '1A-TIERS',
    '1A-COMPARTMENTS',
    '1A-50KA',
    '1A-COLOUR',
    '1B-TIERS-400',
    '1B-COMPARTMENTS',
    '1B-BASE',
    '1B-DOORS',
    '1B-600MM',
    '1B-800MM',
    '1B-SS-2B',
    '1B-SS-NO4',
    '1B-ABLOY',
    '1B-DUAL-LOCK',
    '1B-QUOTED',
    '1B1-CLEAT-SMALL-1',
    '1B1-CLEAT-SMALL-2',
    '1B1-CLEAT-LARGE-2',
    '1B1-CLEAT-LARGE-3',
    'CT-COMPARTMENTS',
    'CT-S-TYPE',
    'CT-T-TYPE',
    'CT-W-TYPE',
    'CT-U-TYPE',
    'CT-TEST-BLOCK',
    'CT-PANEL',
    'CT-WIRING',
    'CT-CTC400',
    '100A-PANEL',
    '100A-FUSE',
    '100A-WIRING-1PH',
    '100A-WIRING-3PH',
    '100A-NEUTRAL-LINK',
    '100A-MCB-1PH',
    '100A-MCB-3PH',
    '100A-CHASSIS-18',
    '100A-CHASSIS-24',
    '100A-CHASSIS-30',
    'MISC-CABLE-TRAY',
    'MISC-LABELS',
    'MISC-HARDWARE',
    'MISC-DELIVERY-HIAB',
    'MISC-DELIVERY-UTE',
    'MISC-SITE-RECONNECTION',
    'MISC-TEST-TIERS',
    'MISC-MISC'
];


interface BoardContentProps {
    onAddItems?: (category?: 'Basics' | 'Switchboard' | 'Busbar') => void;
}

export default function BoardContent({ onAddItems }: BoardContentProps) {
    const { 
        boards, selectedBoardId, updateItem, effectiveSettings, 
        quoteId, refreshQuote, addItemToBoard, updateBoardDetails,
        viewMode, setViewMode, removeItem
    } = useQuote();

    // Force consolidated mode on mount if not already set
    useEffect(() => {
        if (viewMode !== 'consolidated') {
            setViewMode('consolidated');
        }
    }, [viewMode, setViewMode]);
    const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
    const [showManualForm, setShowManualForm] = useState(false);
    const [editingItemId, setEditingItemId] = useState<string | null>(null);
    const [localCustomDesc, setLocalCustomDesc] = useState('');
    const [isDescDialogOpen, setIsDescDialogOpen] = useState(false);

    // New unified description state: local draft of bullets
    const [descriptionDraft, setDescriptionDraft] = useState<{ id?: string; text: string; isManual?: boolean }[]>([]);

    const selectedBoard = boards.find(b => b.id === selectedBoardId);

    // Synchronize description draft when dialog opens or config changes
    useEffect(() => {
        if (!isDescDialogOpen || !selectedBoard) return;

        const systemBullets = generateDescriptionBullets(selectedBoard as any);
        const options = (selectedBoard.descriptionOptions as any) || {};
        const savedDraft = options.draft as { id?: string; text: string; isManual?: boolean }[] | undefined;
        const editedIds = new Set(options.editedIds || []);

        if (savedDraft && savedDraft.length > 0) {
            // Use shared sync helper to update existing bullets and append new ones automatically
            const updatedDraft = syncDescriptionWithDraft(systemBullets, savedDraft, editedIds as Set<string>);
            setDescriptionDraft(updatedDraft);
        } else {
            // Initial draft from system logic
            setDescriptionDraft(systemBullets);
        }
    }, [isDescDialogOpen, selectedBoard?.config, selectedBoard?.descriptionOptions]);

    const saveDescriptionDraft = (newDraft: typeof descriptionDraft, newEditedIds?: string[]) => {
        if (!selectedBoard) return;
        const currentOptions = (selectedBoard.descriptionOptions as any) || {};
        const updates: any = {
            descriptionOptions: {
                ...currentOptions,
                draft: newDraft,
                editedIds: newEditedIds || currentOptions.editedIds || []
            }
        };
        updateBoardDetails(selectedBoard.id, updates);
    };
    // Sync local custom description when board changes or saved in background
    useEffect(() => {
        if (selectedBoard) {
            setLocalCustomDesc(selectedBoard.customDescription || '');
        }
    }, [selectedBoard?.id, selectedBoard?.customDescription]);

    if (!selectedBoard) {
        return (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm italic">
                Select a board to view items
            </div>
        );
    }

    const itemsRaw = selectedBoard.items || [];
    const items = consolidateItems(itemsRaw);

    // Group items by master category (Basics, Switchboards, Busbars, Other)
    const groupedByMasterCategory = items.reduce((acc, item) => {
        const masterCat = item.category || 'Uncategorized';
        if (!acc[masterCat]) acc[masterCat] = [];
        acc[masterCat].push(item);
        return acc;
    }, {} as Record<string, Item[]>);

    const toggleSection = (key: string) => {
        setCollapsedSections(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };


    // Helper: Toggle NSX100 Handle Override
    const toggleNSX100Handle = async (disable: boolean) => {
        if (!selectedBoard) return;
        try {
            const res = await fetch(`/api/quotes/${quoteId}/boards/${selectedBoard.id}/mccb-overrides`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ disableNSX100250RotaryHandle: disable })
            });
            if (res.ok) {
                await refreshQuote();
            } else {
                console.error("Failed to toggle handle");
                alert("Failed to update handle preference");
            }
        } catch (e) {
            console.error("Network error toggling handle", e);
            alert("Network error");
        }
    };



    const handleQuantityChange = async (itemId: string, newQty: number) => {
        if (newQty < 0) return;
        
        const targetItem = items.find(i => i.id === itemId) as ConsolidatedItem;
        if (!targetItem) return;

        if (targetItem.isConsolidated && targetItem.originalIds && targetItem.originalIds.length > 1) {
            // Multi-item update: Update first, delete others, break system link
            const [firstId, ...otherIds] = targetItem.originalIds;
            
            // 1. Update first item to total quantity and make it manual
            await updateItem(firstId, { 
                quantity: newQty,
                systemTag: null,
                isSystemManaged: false
            } as any);

            // 2. Remove other items
            for (const id of otherIds) {
                await removeItem(id);
            }
        } else {
            // Single item update
            await updateItem(itemId, { quantity: newQty });
        }
    };

    const handleRemoveItem = async (itemId: string) => {
        const targetItem = items.find(i => i.id === itemId) as ConsolidatedItem;
        if (!targetItem) return;

        if (targetItem.isConsolidated && targetItem.originalIds && targetItem.originalIds.length > 1) {
            // Multi-item delete
            if (!confirm(`This will remove all ${targetItem.originalIds.length} merged instances of this part. Continue?`)) return;
            for (const id of targetItem.originalIds) {
                await removeItem(id);
            }
        } else {
            await removeItem(itemId);
        }
    };

    const renderItemRow = (item: Item, isGhost = false) => {
        if (isGhost) {
            // Render specific ghost row for Missing NSX100 Handle
            // SKU: LV429338T
            return (
                <div
                    key="ghost-nsx100-handle"
                    className="px-4 py-2 flex items-center gap-4 bg-gray-50/30 text-gray-400 group transition-colors text-sm"
                >
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                            <div className="font-medium italic truncate">
                                Rotary Handle (NSX100-250)
                            </div>
                            <div className="flex items-center gap-1">
                                <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500 ring-1 ring-inset ring-gray-600/10">
                                    Excluded
                                </span>
                            </div>
                        </div>
                        <div className="text-[10px] text-gray-300 truncate flex items-center gap-2">
                            <span className="font-medium">LV429338T</span>
                        </div>
                    </div>

                    {/* Ghost Controls */}
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 px-2">
                            <span className="text-xs text-gray-400">Include</span>
                            {/* Simple Toggle - Checked = False (Include means Disable=False) */}
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={false} // OFF
                                    onChange={() => toggleNSX100Handle(false)} // Enable (disable=false)
                                />
                                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                        </div>
                    </div>
                    {/* Spacer for delete button alignment */}
                    <div className="w-[14px]"></div>
                </div>
            );
        }

        if (editingItemId === item.id) {
            return (
                <div key={item.id} className="p-0 border-b border-blue-100 bg-blue-50/5 transition-all duration-200 min-h-[140px] flex flex-col justify-center">
                    <ManualItemForm
                        isEditing
                        initialData={{
                            id: item.id,
                            partNumber: item.name,
                            description: item.description || '',
                            unitPrice: item.unitPrice,
                            labourHours: item.labourHours,
                            quantity: Number(item.quantity),
                            type: item.subcategory === 'Price Adjustment' ? 'Price Adjustment' : 'Item'
                        }}
                        onSave={async (data) => {
                            await updateItem(item.id, {
                                name: data.partNumber,
                                description: data.description,
                                unitPrice: data.unitPrice,
                                labourHours: data.labourHours,
                                quantity: data.quantity,
                                subcategory: data.type === 'Price Adjustment' ? 'Price Adjustment' : null
                            });
                            setEditingItemId(null);
                        }}
                        onCancel={() => setEditingItemId(null)}
                    />
                </div>
            );
        }

        // Use database flag for system management, fallback to name-check only if necessary
        let isAuto = item.isSystemManaged || (item as any).autoAdded || isAutoManaged(item.name) || item.isDefault;

        const autoManaged = isAuto;
        const formulaPriced = isFormulaPriced(item.name);

        // Lock Logic:
        // 1. Qty is locked for system items UNLESS they were auto-added (accessories).
        // 2. Delete is locked similarly.
        
        const isShield = ['LV429517', 'LV432593', '33628'].includes(item.name);
        const isNSX100Handle = item.name === 'LV429338T';
        const isOtherHandle = ['LV432598T', '33873'].includes(item.name);

        const isSwitchgear = item.category === 'Switchboard';

        // Relax locks for newly introduced autoAdded items (MCCB Accessories)
        const isAutoAccessory = (item as any).autoAdded === true || item.systemTag === 'MCCB_ACCESSORIES';
        
        // Switchgear auto-items should be UNLOCKED as per user request
        const isQtyLocked = (!!autoManaged && !isAutoAccessory && !isSwitchgear);
        const isDeleteLocked = false; // Always allow delete in summary view

        // Determine Tooltip Text
        let lockTooltip = "";
        if (isShield) lockTooltip = "Auto included (2 per breaker).";
        else if (isOtherHandle) lockTooltip = "Auto included (1 per breaker).";
        else if (isNSX100Handle) lockTooltip = "Optional handle. Can be excluded.";

        // Determine Pricing Method
        // 1. Dynamic Copper Pricing (Highest Priority for Busbars)
        // 2. Formula Pricing (Legacy)
        // 3. Stored Unit Price (Standard)

        let displayUnitPrice = item.unitPrice;
        let displayTotalPrice = item.unitPrice * item.quantity;
        let isCopper = false;

        if (item.totalCopperWeightKgPerMeter && item.isCopperPriced) {
            const copperResult = computeBusbarPrice({
                copperWeightKgPerMeter: item.totalCopperWeightKgPerMeter,
                isCopperPriced: true,
                length: item.quantity, // For busbars, quantity is length in meters
                copperPricePerKg: effectiveSettings.copperPricePerKg
            });

            displayUnitPrice = copperResult.unitPrice;
            displayTotalPrice = copperResult.totalPrice;
            isCopper = true;
        }

        if (Number(item.quantity) === 0) {
            displayUnitPrice = 0;
            displayTotalPrice = 0;
        }

        return (
            <div
                key={item.id}
                className={cn(
                    "px-4 py-2 flex items-center gap-4 hover:bg-gray-50 group transition-colors text-sm",
                    autoManaged && "bg-gray-50/50"
                )}
            >
                {/* Item Details */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                        <div className="font-medium text-gray-900 truncate" title={item.description || item.name}>
                            {item.description || item.name}
                        </div>
                        {(item as ConsolidatedItem).isConsolidated && (
                            <span className="inline-flex items-center rounded-full bg-indigo-50 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700 ring-1 ring-inset ring-indigo-600/10">
                                Aggregated
                            </span>
                        )}
                        {(item as ConsolidatedItem).pricingWarning && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-1.5 py-0.5 text-[10px] font-medium text-red-700 ring-1 ring-inset ring-red-600/10" title="Warning: Multiple prices found for this part number. Showing price group.">
                                <Info size={8} />
                                Price Mismatch
                            </span>
                        )}
                        {isCopper && (
                            <div className="flex items-center gap-1">
                                <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-1.5 py-0.5 text-[10px] font-medium text-orange-700 ring-1 ring-inset ring-orange-600/20" title={`Live Copper Price: ${formatCurrency(effectiveSettings.copperPricePerKg)}/kg`}>
                                    <Zap size={8} className="text-orange-700" />
                                    Cu
                                </span>
                            </div>
                        )}
                        {formulaPriced && !isCopper && (
                            <div className="flex items-center gap-1">
                                <SystemItemHoverCard item={{ ...item, isFormulaPriced: true } as any} boardItems={items}>
                                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20 hover:bg-amber-100 transition-colors cursor-help" title="">
                                        <LockIcon size={8} className="text-amber-700" />
                                        Calculated
                                    </span>
                                </SystemItemHoverCard>
                            </div>
                        )}
                        {autoManaged && !formulaPriced && !isCopper && (
                            <div className="flex items-center gap-1">
                                <SystemItemHoverCard item={item} boardItems={items}>
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
                    </div>
                    <div className="text-[10px] text-gray-500 truncate flex items-center gap-2">
                        {/* Only show item name (Part Number). Subcategory path removed as requested. */}
                        <span className="font-medium">{item.name}</span>
                    </div>
                </div>

                {/* Quantity Control (Lock if Auto-Managed) */}
                <div
                    className={cn(
                        "flex items-center gap-1 border rounded px-1 h-6",
                        isQtyLocked ? "bg-gray-100 border-gray-200 cursor-not-allowed" : "bg-white border-gray-200"
                    )}
                    title={autoManaged ? "Quantity is controlled by board configuration" : undefined}
                >
                    <button
                        onClick={() => handleQuantityChange(item.id, parseFloat(item.quantity as any) - (isCopper ? 0.1 : 1))}
                        className={cn(
                            "transition-colors",
                            isQtyLocked ? "text-gray-300 cursor-not-allowed" : "text-gray-400 hover:text-red-600"
                        )}
                        disabled={isQtyLocked}
                    >
                        <Minus size={12} />
                    </button>
                    <input
                        type="number"
                        defaultValue={item.quantity}
                        key={`qty-${item.id}-${item.quantity}`}
                        onBlur={(e) => {
                            if (isQtyLocked) return;
                            // On blur, validate and update
                            const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                            if (isNaN(val) || val < 0) {
                                handleQuantityChange(item.id, 0);
                            } else {
                                handleQuantityChange(item.id, val);
                            }
                        }}
                        onKeyDown={(e) => {
                            // Allow Enter to blur and save
                            if (e.key === 'Enter') {
                                e.currentTarget.blur();
                            }
                        }}
                        step={isCopper ? "0.001" : "1"}
                        min="0"
                        readOnly={isQtyLocked}
                        className={cn(
                            "w-12 text-center text-xs font-medium bg-transparent border-0 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
                            isQtyLocked ? "text-gray-500 cursor-not-allowed" : "text-gray-700"
                        )}
                    />
                    <button
                        onClick={() => handleQuantityChange(item.id, parseFloat(item.quantity as any) + (isCopper ? 0.1 : 1))}
                        className={cn(
                            "transition-colors",
                            isQtyLocked ? "text-gray-300 cursor-not-allowed" : "text-gray-400 hover:text-blue-600"
                        )}
                        disabled={isQtyLocked}
                    >
                        <Plus size={12} />
                    </button>
                </div>

                {/* Price & Total (Lock if Formula-Priced - though price edit UI not fully exposed here anyway) */}
                <div className="text-right w-20">
                    <div className="font-medium text-gray-900">{formatCurrency(displayTotalPrice)}</div>
                    <div className="flex justify-end gap-1">
                        <div
                            className="text-[10px] text-gray-400 cursor-help"
                            title={isCopper ? `Live Copper: ${item.totalCopperWeightKgPerMeter?.toFixed(2)}kg/m * ${formatCurrency(effectiveSettings.copperPricePerKg)}/kg` : formulaPriced ? "Price is formula-driven" : "Unit Price"}
                        >
                            {formatCurrency(displayUnitPrice)} {isCopper ? '/m' : 'ea'}
                        </div>
                        {item.labourHours > 0 && (
                            <div
                                className="text-gray-400 cursor-help flex items-center"
                                title={`Material: ${formatCurrency(displayUnitPrice)} ${isCopper ? '/m' : 'ea'}\nLabor: ${item.quantity} x ${item.labourHours}hr = ${(item.quantity * item.labourHours).toFixed(2)}hr @ ${formatCurrency(effectiveSettings.labourRate)}/hr\nTotal: ${formatCurrency((displayTotalPrice) + (item.quantity * item.labourHours * effectiveSettings.labourRate))}`}
                            >
                                <Clock size={14} />
                            </div>
                        )}
                    </div>
                </div>

                {/* Actions: Delete locked for auto-added if not manual */}
                {isAutoAccessory || isNSX100Handle ? (
                    <div className="flex items-center gap-2 px-2" title={lockTooltip}>
                        {/* No toggle anymore, just a placeholder or spacer */}
                        <div className="w-9 h-5" />
                    </div>
                ) : (
                    <SystemItemHoverCard item={item} boardItems={items}>
                        <button
                            className={cn(
                                "transition-colors",
                                isDeleteLocked
                                    ? "text-gray-200" // active look but handled by popover
                                    : "text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100"
                            )}
                            disabled={!isDeleteLocked} // Enable button if locked so popover works? No, popover works on wrapper. 
                        // If disabled, click might not propagate. 
                        // Actually, if I wrap it, I want the CLICK to trigger the popover. 
                        // If the button is disabled, some browsers block events. 
                        // Better: Render a DIV if locked.
                        // But wait, if it's NOT locked, we want the delete button.
                        // If it IS locked, we want the lock icon which triggers explanation.
                        >
                            {isDeleteLocked ? <LockIcon size={14} className="cursor-pointer text-gray-300 hover:text-blue-600" /> : null}
                        </button>
                    </SystemItemHoverCard>
                )}
                {!isNSX100Handle && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {item.category === 'Other' && (
                            <button
                                onClick={() => setEditingItemId(item.id)}
                                className="text-gray-300 hover:text-blue-500 p-1 rounded"
                                title="Edit manual item"
                            >
                                <Edit2 size={14} />
                            </button>
                        )}
                        <button
                            onClick={() => handleRemoveItem(item.id)}
                            className="text-gray-300 hover:text-red-500 p-1 rounded"
                            title="Remove item"
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                )}
            </div>
        )
    };

    const renderCategoryWithSubsections = (items: Item[], isBasics: boolean) => {
        // Group items by subcategory
        const groupedBySubcat = items.reduce((acc, item) => {
            const subcat = item.subcategory || 'Other';
            if (!acc[subcat]) acc[subcat] = [];
            acc[subcat].push(item);
            return acc;
        }, {} as Record<string, Item[]>);

        let subcatKeys = Object.keys(groupedBySubcat);

        if (isBasics) {
            // Sort keys by the position of their first item in the BASICS_STRICT_ORDER
            subcatKeys.sort((a, b) => {
                const getFirstIndex = (subcat: string) => {
                    const items = groupedBySubcat[subcat];
                    // Find the lowest index of any item in this subcat according to strict order
                    let minIndex = Infinity;
                    for (const item of items) {
                        const index = BASICS_STRICT_ORDER.indexOf(item.name); // Using name as PartNumber
                        if (index !== -1 && index < minIndex) {
                            minIndex = index;
                        }
                    }
                    return minIndex === Infinity ? 99999 : minIndex;
                };

                return getFirstIndex(a) - getFirstIndex(b);
            });

            // Also sort items within each subcategory for Basics
            subcatKeys.forEach(key => {
                groupedBySubcat[key].sort((a, b) => {
                    const indexA = BASICS_STRICT_ORDER.indexOf(a.name); // Using name as PartNumber
                    const indexB = BASICS_STRICT_ORDER.indexOf(b.name);

                    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
                    if (indexA !== -1) return -1;
                    if (indexB !== -1) return 1;
                    return 0; // maintain stable order for knowns
                });
            });

        } else {
            // Default sort for Switchboards (Deterministic)
            // We want to sort the GROUPS (subcats) by the same logic as items.
            // Create a dummy item for each subcat to use the shared sorter.
            // Or just sort the subcat string?
            // Shared sorter handles "Switchgear > MCCB Accessories" vs "Circuit Breakers" better if we pass a full item.
            // But here we only have the subcat key "MCCB Accessories".
            // The key in `groupedBySubcat` is mostly just the last part or full path?
            // "groupedBySubcat" uses `item.subcategory`. logic: `const subcat = item.subcategory || 'Other';`
            // So it IS the full path "Switchgear > MCCB Accessories".
            // So we can use `compareItems` with dummy items.

            subcatKeys.sort((a, b) => {
                // Create dummy items for comparison
                const itemA = { category: 'Switchboard', subcategory: a };
                const itemB = { category: 'Switchboard', subcategory: b };
                return compareItems(itemA, itemB);
            });
        }

        return (
            <div className="divide-y divide-gray-100">
                {subcatKeys.map(subcat => {
                    // Sort the items INSIDE the subcategory too
                    // (Though usually they are sorted by default fetch or insertion, strictly enforcing it here is safer)
                    const subcatItems = groupedBySubcat[subcat].sort(compareItems);

                    const subcatKey = `${isBasics ? 'Basics' : 'Switchboard'}-${subcat}`;
                    const isSubcatCollapsed = collapsedSections[subcatKey];

                    return (
                        <div key={subcat}>
                            {/* Sub-collapsible header */}
                            <button
                                onClick={() => toggleSection(subcatKey)}
                                className="w-full px-4 py-2 bg-gray-50 flex items-center justify-between hover:bg-gray-100 transition-colors"
                            >
                                <div className="flex items-center gap-2 font-medium text-xs text-gray-600">
                                    {isSubcatCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                                    {subcat}
                                    <span className="text-xs font-normal text-gray-400">({subcatItems.length})</span>
                                </div>
                            </button>

                            {/* Sub-collapsible items */}
                            {!isSubcatCollapsed && (
                                <div className="divide-y divide-gray-50 bg-white">
                                    {/* Include Ghost Row check for Accessories subcategory */}
                                    {subcat === 'MCCB Accessories' && (() => {
                                        // Specific Check: Do we need to show the NSX100 Ghost Handle?
                                        // 1. Are there NSX100-250 breakers?
                                        // 2. Is the LV429338T missing?

                                        // We can infer presence from 'items' list, but how to infer 'Requirement'?
                                        // We can count breakers on the client side just like we do on server, roughly.
                                        // Filter items with productFrame NSX100-250.
                                        const nsx100Breakers = items.filter(i =>
                                            !i.isSystemManaged &&
                                            i.productFrame === 'NSX100-250' &&
                                            i.subcategory !== 'MCCB Accessories'
                                        );
                                        const hasRequirement = nsx100Breakers.length > 0;

                                        const hasHandle = subcatItems.some(i => i.name === 'LV429338T');

                                        if (hasRequirement && !hasHandle) {
                                            return (
                                                <>
                                                    {subcatItems.map(item => renderItemRow(item, false))}
                                                    {renderItemRow({} as any, true)}
                                                </>
                                            )
                                        }
                                        return subcatItems.map(item => renderItemRow(item, false));
                                    })()}

                                    {subcat !== 'MCCB Accessories' && subcatItems.map(item => renderItemRow(item, false))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <>
            <div className="flex flex-col h-full bg-gray-50/30">
            <div className="px-6 py-3 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                <div>
                    <h3 className="text-sm font-bold text-gray-900 group-flex items-center gap-2">
                        {selectedBoard.name} 
                        <span className="text-[10px] font-normal text-gray-400 ml-2">Summary View</span>
                    </h3>
                    <p className="text-xs text-gray-500">{items.length} line items</p>
                </div>
                <div className="flex items-center gap-4">
                    {/* View Toggle Removed - Forcing Summary View */}

                    {onAddItems && (
                        <button
                            onClick={() => {
                                // Determine likely category based on what is expanded
                                let likelyCategory: 'Basics' | 'Switchboard' | 'Busbar' | undefined = undefined;

                                // Priority: Basics > Switchboard > Busbar
                                // collapseSections[key] === false (or undefined) means Expanded
                                if (!collapsedSections['Basics']) likelyCategory = 'Basics';
                                else if (!collapsedSections['Switchboard']) likelyCategory = 'Switchboard';
                                else if (!collapsedSections['Busbar']) likelyCategory = 'Busbar';

                                onAddItems?.(likelyCategory);
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm transition-all"
                        >
                            <Plus size={16} />
                            Add Items
                        </button>
                    )}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button
                                className="text-[10px] font-medium text-gray-500 hover:text-blue-600 hover:bg-blue-50 px-2 py-1 rounded transition-colors flex items-center gap-1 outline-none ring-0 focus:ring-2 focus:ring-blue-100"
                                title="Download Engineering BOM"
                            >
                                <FileText size={10} />
                                Export BOM
                                <ChevronDown size={10} className="text-gray-400 group-hover:text-blue-500" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56 bg-white shadow-lg border border-gray-100 p-1">
                            <DropdownMenuLabel className="text-xs text-gray-500 font-semibold px-2 py-1.5">Select Format</DropdownMenuLabel>
                            <DropdownMenuSeparator className="-mx-1 my-1 h-px bg-gray-100" />

                            <DropdownMenuItem
                                onClick={() => window.open(`/api/quotes/${quoteId}/boards/${selectedBoard.id}/export-bom?format=erp`, '_blank')}
                                className="gap-2 cursor-pointer focus:bg-gray-50 rounded-sm px-2 py-1.5 outline-none"
                            >
                                <FileSpreadsheet size={14} className="text-green-600" />
                                <div className="flex flex-col">
                                    <span className="text-sm font-medium text-gray-700">Export CSV (ERP)</span>
                                    <span className="text-[10px] text-gray-400">Strict tabular data for import</span>
                                </div>
                            </DropdownMenuItem>

                            <DropdownMenuItem
                                onClick={() => window.open(`/api/quotes/${quoteId}/boards/${selectedBoard.id}/export-bom?format=human`, '_blank')}
                                className="gap-2 cursor-pointer focus:bg-gray-50 rounded-sm px-2 py-1.5 outline-none"
                            >
                                <FileSpreadsheet size={14} className="text-blue-600" />
                                <div className="flex flex-col">
                                    <span className="text-sm font-medium text-gray-700">Export CSV (Detailed)</span>
                                    <span className="text-[10px] text-gray-400">Includes summary & formatting</span>
                                </div>
                            </DropdownMenuItem>

                            <DropdownMenuSeparator className="-mx-1 my-1 h-px bg-gray-100" />

                            <DropdownMenuItem
                                onClick={() => window.open(`/api/quotes/${quoteId}/boards/${selectedBoard.id}/export-bom?format=pdf`, '_blank')}
                                className="gap-2 cursor-pointer focus:bg-gray-50 rounded-sm px-2 py-1.5 outline-none"
                            >
                                <FileText size={14} className="text-red-600" />
                                <div className="flex flex-col">
                                    <span className="text-sm font-medium text-gray-700">Export PDF</span>
                                    <span className="text-[10px] text-gray-400">Engineering document (A4)</span>
                                </div>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <button
                        onClick={async () => {
                            if (!confirm('Refresh prices from catalog? This will update unit prices and labour hours for manually added items to match the current catalog. Formula-based items will effectively just update their descriptions.')) return;

                            try {
                                const res = await fetch(`/api/boards/${selectedBoard.id}/refresh-catalog`, { method: 'POST' });
                                if (res.ok) {
                                    const data = await res.json();
                                    alert(data.message);
                                    window.location.reload(); // Simple reload to see changes
                                } else {
                                    const err = await res.json();
                                    alert(err.error || 'Failed to refresh');
                                }
                            } catch (e) {
                                alert('Network error');
                            }
                        }}
                        className="text-[10px] font-medium text-gray-400 hover:text-gray-700 hover:bg-gray-100 px-2 py-1 rounded transition-colors flex items-center gap-1"
                        title="Update item prices and descriptions from the latest catalog"
                    >
                        <Edit2 size={10} />
                        Refresh Prices
                    </button>
                    {/* Restore Accessories Action */}

                    <div className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">
                        {selectedBoard.description || selectedBoard.name}
                    </div>
                </div>
            </div>



            {/* Electrical Identity Strip */}
            <div className="px-6 py-2 bg-white border-b border-gray-100 flex items-center text-xs text-gray-500 font-mono tracking-tight">
                {[
                    // IP Rating
                    (selectedBoard.config as any)?.ipRating
                        ? (selectedBoard.config as any).ipRating.startsWith('IP')
                            ? (selectedBoard.config as any).ipRating
                            : `IP${(selectedBoard.config as any).ipRating}`
                        : 'IP—',

                    // Fault Rating
                    (selectedBoard.config as any)?.faultRating
                        ? (selectedBoard.config as any).faultRating.toLowerCase().endsWith('ka')
                            ? (selectedBoard.config as any).faultRating
                            : `${(selectedBoard.config as any).faultRating}kA`
                        : '—kA',

                    // In / Out (Form)
                    (selectedBoard.config as any)?.form
                        ? (selectedBoard.config as any).form.replace(/^Form\s*/i, '') // Remove 'Form ' prefix if present
                        : '—',

                    // Current Rating
                    (selectedBoard.config as any)?.currentRating
                        ? (selectedBoard.config as any).currentRating.endsWith('A')
                            ? (selectedBoard.config as any).currentRating
                            : `${(selectedBoard.config as any).currentRating}A`
                        : '—A',

                ].map((val, i) => (
                    <span key={i} className="flex items-center">
                        {i > 0 && <span className="mx-2 text-gray-300">·</span>}
                        {val}
                    </span>
                ))}

                <div className="ml-auto flex items-center gap-3">
                    <button
                        onClick={() => setIsDescDialogOpen(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors text-[11px] font-semibold border border-blue-100 shadow-sm"
                    >
                        <FileText size={14} />
                        DOCX Description
                    </button>
                </div>
            </div>

            {/* Board Composition Indicators */}
            <BoardComposition items={items} />

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <BoardSummary />
                {items.length === 0 && !showManualForm ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-2">
                        <p>No items added yet.</p>
                        <p className="text-xs">Select items from the catalog below to add them.</p>
                    </div>
                ) : (
                    // Render ONLY the defined master categories
                    MASTER_CATEGORIES.map(masterCat => {
                        const categoryItems = groupedByMasterCategory[masterCat] || [];
                        if (categoryItems.length === 0 && masterCat !== 'Other') return null;

                        const isMasterCollapsed = collapsedSections[masterCat];

                        return (
                            <div key={masterCat} className="border border-gray-200 rounded-lg overflow-hidden">
                                {/* Master category header */}
                                <button
                                    onClick={() => toggleSection(masterCat)}
                                    className="w-full px-4 py-2 bg-gray-50 flex items-center justify-between hover:bg-gray-100 transition-colors"
                                >
                                    <div className="flex items-center gap-2 font-semibold text-sm text-gray-700">
                                        {isMasterCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                                        {CATEGORY_LABELS[masterCat] || masterCat}
                                        <span className="text-xs font-normal text-gray-500">({categoryItems.length})</span>
                                    </div>
                                </button>

                                {/* Master category content */}
                                {!isMasterCollapsed && (
                                    <>
                                        {masterCat === 'Switchboard' || masterCat === 'Basics' ? (
                                            // For Switchboard AND Basics, render sub-collapsibles by subcategory
                                            // Also apply strict sorting ONLY to Basics
                                            renderCategoryWithSubsections(categoryItems, masterCat === 'Basics')
                                        ) : (
                                            // For Busbars and Other, render items directly (flat list)
                                            <div className="divide-y divide-gray-100">
                                                {[...categoryItems].sort(compareItems).map(item => renderItemRow(item, false))}
                                            </div>
                                        )}
                                    </>
                                )}

                                {/* Add Button/Form at the bottom of the 'Other' category */}
                                {masterCat === 'Other' && !isMasterCollapsed && (
                                    <div className="p-4 border-t border-gray-100 bg-gray-50/50">
                                        {showManualForm ? (
                                            <ManualItemForm
                                                onSave={async (data) => {
                                                    await addItemToBoard(selectedBoard.id, {
                                                        category: 'Other',
                                                        name: data.partNumber || data.description,
                                                        description: data.description,
                                                        unitPrice: data.unitPrice,
                                                        labourHours: data.labourHours,
                                                        quantity: data.quantity,
                                                        partNumber: data.partNumber || null,
                                                        subcategory: data.type === 'Price Adjustment' ? 'Price Adjustment' : undefined
                                                    });
                                                    setShowManualForm(false);
                                                }}
                                                onCancel={() => setShowManualForm(false)}
                                            />
                                        ) : (
                                            <button
                                                onClick={() => setShowManualForm(true)}
                                                className="w-full py-3 border-2 border-dashed border-gray-200 rounded-lg text-gray-500 hover:text-blue-600 hover:border-blue-300 hover:bg-white transition-all text-sm font-medium flex items-center justify-center gap-2"
                                            >
                                                <Plus size={16} />
                                                Add Line Item Manually
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>

        {/* DOCX Description Dialog */}
        <Dialog open={isDescDialogOpen} onOpenChange={setIsDescDialogOpen}>
            <DialogContent className="max-w-2xl bg-white border-0 shadow-2xl rounded-xl p-0 overflow-hidden">
                {selectedBoard && (
                    <>
                        <DialogHeader className="p-6 bg-gray-50 border-b border-gray-100">
                            <div className="flex items-center justify-between">
                                <div>
                                    <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                        <FileText className="text-blue-600" size={24} />
                                        Board DOCX Description
                                    </DialogTitle>
                                    <DialogDescription className="text-xs text-gray-500 mt-1">
                                        Edit system bullets inline or add your own.
                                    </DialogDescription>
                                </div>
                                <button
                                    onClick={() => {
                                        const systemBullets = generateDescriptionBullets(selectedBoard as any);
                                        // Reset editedIds but keep manual bullets
                                        const manualOnly = descriptionDraft.filter(b => b.isManual || !b.id);
                                        const refreshed = [...systemBullets, ...manualOnly];
                                        setDescriptionDraft(refreshed);
                                        saveDescriptionDraft(refreshed, []);
                                    }}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-all border border-blue-100 shadow-sm"
                                    title="Re-sync system values from latest preselection"
                                >
                                    <RefreshCw size={14} />
                                    Refresh from Specs
                                </button>
                            </div>
                        </DialogHeader>

                        <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto bg-white">
                            {descriptionDraft.length === 0 && (
                                <div className="text-center py-12 border-2 border-dashed border-gray-100 rounded-xl">
                                    <p className="text-sm text-gray-400">No bullets defined for this board.</p>
                                </div>
                            )}

                            <div className="space-y-2.5">
                                {descriptionDraft.map((bullet, idx) => {
                                    const options = (selectedBoard.descriptionOptions as any) || {};
                                    const isEdited = bullet.id && (options.editedIds || []).includes(bullet.id);
                                    
                                    return (
                                        <div key={bullet.id || idx} className="flex gap-3 items-center group">
                                            <div className="flex-shrink-0 w-8 flex justify-center">
                                                {bullet.id ? (
                                                    isEdited ? (
                                                        <div title="System-linked but modified">
                                                            <Edit2 size={16} className="text-blue-400" />
                                                        </div>
                                                    ) : (
                                                        <div title="Live-synced to preselection">
                                                            <Zap size={16} className="text-amber-400" />
                                                        </div>
                                                    )
                                                ) : (
                                                    <div title="Manual note">
                                                        <User size={16} className="text-gray-300" />
                                                    </div>
                                                )}
                                            </div>
                                            
                                            <div className="flex-1 relative">
                                                <input
                                                    type="text"
                                                    value={bullet.text}
                                                    onChange={(e) => {
                                                        const newDraft = [...descriptionDraft];
                                                        newDraft[idx] = { ...newDraft[idx], text: e.target.value };
                                                        setDescriptionDraft(newDraft);
                                                    }}
                                                    onBlur={() => {
                                                        const options = (selectedBoard.descriptionOptions as any) || {};
                                                        let newEditedIds = [...(options.editedIds || [])];
                                                        if (bullet.id && !newEditedIds.includes(bullet.id)) {
                                                            newEditedIds.push(bullet.id);
                                                        }
                                                        saveDescriptionDraft(descriptionDraft, newEditedIds);
                                                    }}
                                                    className="w-full text-sm py-2 px-3 border border-gray-100 rounded-lg focus:border-blue-300 focus:ring-4 focus:ring-blue-50 outline-none transition-all text-gray-700 bg-gray-50/30 hover:bg-white"
                                                />
                                            </div>

                                            <button
                                                onClick={() => {
                                                    const newDraft = descriptionDraft.filter((_, i) => i !== idx);
                                                    setDescriptionDraft(newDraft);
                                                    saveDescriptionDraft(newDraft);
                                                }}
                                                className="opacity-0 group-hover:opacity-100 p-2 text-gray-300 hover:text-red-500 transition-all"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>

                            <button
                                onClick={() => {
                                    const newBullet = { text: "", isManual: true };
                                    const newDraft = [...descriptionDraft, newBullet];
                                    setDescriptionDraft(newDraft);
                                    // Don't save to DB until they blur or close? 
                                    // Actually, adding an empty bullet is better saved on blur
                                }}
                                className="w-full py-2.5 border-2 border-dashed border-gray-100 rounded-xl text-gray-400 hover:text-blue-500 hover:border-blue-200 hover:bg-blue-50/30 transition-all text-xs font-semibold flex items-center justify-center gap-2"
                            >
                                <Plus size={14} />
                                Add Extra Bullet
                            </button>
                        </div>

                        <DialogFooter className="p-4 bg-gray-50 border-t border-gray-100 sm:justify-between">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-medium">
                                    <Zap size={12} className="text-amber-400" /> Live
                                </div>
                                <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-medium">
                                    <Edit2 size={12} className="text-blue-400" /> Edited
                                </div>
                                <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-medium">
                                    <User size={12} className="text-gray-300" /> Manual
                                </div>
                            </div>
                            <button
                                onClick={() => setIsDescDialogOpen(false)}
                                className="px-6 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-all text-sm font-bold shadow-lg"
                            >
                                Done
                            </button>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
        </>
    );
}
