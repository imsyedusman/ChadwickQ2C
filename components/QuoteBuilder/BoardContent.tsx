'use client';

import { useState } from 'react';
import { useQuote, Item } from '@/context/QuoteContext';
import { Trash2, Plus, Minus, ChevronDown, ChevronRight, Edit2, Lock } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { isAutoManaged, isFormulaPriced } from '@/lib/system-definitions';
import BoardSummary from './BoardSummary';

// ONLY these 3 master categories should appear as top-level collapsibles
// Using singular form to match database schema
const MASTER_CATEGORIES = ['Basics', 'Switchboard', 'Busbar'];

const CATEGORY_LABELS: Record<string, string> = {
    'Basics': 'Basics',
    'Switchboard': 'Switchgears',
    'Busbar': 'Busbars'
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
    const { boards, selectedBoardId, updateItem, removeItem } = useQuote();
    const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

    const selectedBoard = boards.find(b => b.id === selectedBoardId);

    if (!selectedBoard) {
        return (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm italic">
                Select a board to view items
            </div>
        );
    }

    const items = selectedBoard.items || [];

    // Group items by master category (only Basics, Switchboards, Busbars)
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

    const handleQuantityChange = (itemId: string, newQty: number) => {
        // Ensure quantity is valid (>= 0, allow decimals)
        const validQty = Math.max(0, newQty);
        updateItem(itemId, { quantity: validQty });
    };

    const renderItemRow = (item: Item) => {
        const autoManaged = isAutoManaged(item.name) || item.isDefault;
        const formulaPriced = isFormulaPriced(item.name);

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
                        {formulaPriced && (
                            <div className="flex items-center gap-1">
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20" title="Price/Labour is calculated from configuration">
                                    <Lock size={8} className="text-amber-700" />
                                    Calculated
                                </span>
                            </div>
                        )}
                        {autoManaged && !formulaPriced && (
                            <div className="flex items-center gap-1">
                                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 ring-1 ring-inset ring-blue-600/20" title="System-managed item">
                                    <Lock size={8} className="text-blue-700" />
                                    Auto
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
                        autoManaged ? "bg-gray-100 border-gray-200 cursor-not-allowed" : "bg-white border-gray-200"
                    )}
                    title={autoManaged ? "Quantity is controlled by board configuration" : undefined}
                >
                    <button
                        onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                        className={cn(
                            "transition-colors",
                            autoManaged ? "text-gray-300 cursor-not-allowed" : "text-gray-400 hover:text-red-600"
                        )}
                        disabled={!!autoManaged}
                    >
                        <Minus size={12} />
                    </button>
                    <input
                        type="number"
                        defaultValue={item.quantity}
                        key={`qty-${item.id}-${item.quantity}`}
                        onBlur={(e) => {
                            if (autoManaged) return;
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
                        step="0.01"
                        min="0"
                        readOnly={!!autoManaged}
                        className={cn(
                            "w-12 text-center text-xs font-medium bg-transparent border-0 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
                            autoManaged ? "text-gray-500 cursor-not-allowed" : "text-gray-700"
                        )}
                    />
                    <button
                        onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                        className={cn(
                            "transition-colors",
                            autoManaged ? "text-gray-300 cursor-not-allowed" : "text-gray-400 hover:text-blue-600"
                        )}
                        disabled={!!autoManaged}
                    >
                        <Plus size={12} />
                    </button>
                </div>

                {/* Price & Total (Lock if Formula-Priced - though price edit UI not fully exposed here anyway) */}
                <div className="text-right w-20">
                    <div className="font-medium text-gray-900">{formatCurrency(item.unitPrice * item.quantity)}</div>
                    <div
                        className="text-[10px] text-gray-400 cursor-help"
                        title={formulaPriced ? "Price is formula-driven" : "Unit Price"}
                    >
                        {formatCurrency(item.unitPrice)} ea
                    </div>
                </div>

                {/* Actions (Delete Lock if Auto-Managed) */}
                <button
                    onClick={() => removeItem(item.id)}
                    className={cn(
                        "transition-colors",
                        autoManaged
                            ? "text-gray-200 cursor-not-allowed"
                            : "text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100"
                    )}
                    disabled={!!autoManaged}
                    title={autoManaged ? "Auto-managed items cannot be manually removed" : "Remove item"}
                >
                    {autoManaged ? <Lock size={14} /> : <Trash2 size={14} />}
                </button>
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
            // Default sort for Switchboards (Alphabetical)
            subcatKeys.sort();
        }

        return (
            <div className="divide-y divide-gray-100">
                {subcatKeys.map(subcat => {
                    const subcatItems = groupedBySubcat[subcat];
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
                                    {subcatItems.map(renderItemRow)}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full bg-white">
            <div className="px-6 py-3 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                <div>
                    <h3 className="font-bold text-gray-800">{selectedBoard.name}</h3>
                    <p className="text-xs text-gray-500">{items.length} items selected</p>
                </div>
                <div className="flex items-center gap-2">
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
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <BoardSummary />
                {items.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-2">
                        <p>No items added yet.</p>
                        <p className="text-xs">Select items from the catalog below to add them.</p>
                    </div>
                ) : (
                    // Render ONLY the 3 master categories
                    MASTER_CATEGORIES.map(masterCat => {
                        const categoryItems = groupedByMasterCategory[masterCat];
                        if (!categoryItems || categoryItems.length === 0) return null;

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
                                            // For Busbars, render items directly (flat list)
                                            <div className="divide-y divide-gray-100">
                                                {categoryItems.map(renderItemRow)}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
