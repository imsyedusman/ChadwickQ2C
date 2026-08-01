'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Search, Plus, Minus, Filter, Package, Zap, Layers, ChevronRight, ArrowLeft, Folder, Loader2, X, Trash2, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { isAutoManaged, isPermanentManualCategory } from '@/lib/system-definitions';
import { useQuote } from '@/context/QuoteContext';
import { cn, formatCurrency } from '@/lib/utils';
import { compareItems } from '@/lib/sorting';
import { computeBusbarPrice } from '@/utils/pricing/copperPricing';
import { normalizeSubcategory, formatSubcategoryLabel } from '@/lib/category-utils';
import { getDisplayPartNumber } from '@/lib/display-utils';
import { AlertCircle } from 'lucide-react';

interface CatalogItem {
    id: string;
    brand: string;
    category: string; // Master Category: Basics, Switchboard, Busbar
    subcategory: string; // Vendor Category (e.g. "Circuit Breakers > ATS > 50kA")
    partNumber: string;
    description: string;
    unitPrice: number;
    labourHours: number;
    meterType?: string | null;
    isCopperPriced?: boolean;
    totalCopperWeightKgPerMeter?: number | null; // Add this if missing in CatalogItem interface?
    // Wait, check CatalogItem in ItemSelection. It was defined: "isCopperPriced?: boolean;"
    // I need to add totalCopperWeightKgPerMeter too if I want to use it.
    // The API fetches CatalogItem, does it include it?
    // app/api/catalog/route.ts fetches CatalogItem. I should check if it includes it.
    // Assuming yes for now, I'll add it to interface.
}

interface ItemSelectionProps {
    onClose?: () => void;
    initialCategory?: 'Basics' | 'Switchboard' | 'Busbar';
    initialL1?: string;
    initialL2?: string;
    initialL3?: string;
}

interface ItemRowProps {
    item: CatalogItem;
    existingQty?: number;
    existingItemId?: string; // ID of the item if it exists on the board
    isSystemManaged?: boolean;
    onAdd: (item: CatalogItem, qty: number, unitPriceOverride?: number) => void;
    onDelete?: (itemId: string) => void;
    boardConfig?: any; // To determine scope for conditional locking
}

function ItemRow({ item, existingQty = 0, existingItemId, isSystemManaged, onAdd, onDelete, boardConfig }: ItemRowProps) {
    const { effectiveSettings } = useQuote(); // Added to get effectiveSettings

    // If it exists on board, start with that qty. Otherwise default to 1.
    // However, if we want "control surface" feel, we might want to default to 0 if not selected?
    // User requirement: "If the item is not on the board → show default quantity (e.g. 1)"
    const initialQty = existingQty > 0 ? existingQty : 1;

    const [qty, setQty] = useState(initialQty);

    const isPermanentlyManual = isPermanentManualCategory(item.category, item.subcategory);
    const autoManaged = !isPermanentlyManual && (isAutoManaged(item.partNumber) || isSystemManaged);

    // Pricing Calculation
    let displayUnitPrice = item.unitPrice;
    let displayTotalPrice = item.unitPrice * qty;
    let isCopper = false;

    if (item.isCopperPriced && item.totalCopperWeightKgPerMeter) {
        const copperResult = computeBusbarPrice({
            copperWeightKgPerMeter: item.totalCopperWeightKgPerMeter,
            isCopperPriced: true,
            length: qty,
            copperPricePerKg: effectiveSettings.copperPricePerKg
        });
        displayUnitPrice = copperResult.unitPrice;
        displayTotalPrice = copperResult.totalPrice;
        isCopper = true;
    }

    // Sync state if existingQty changes (live update from board)
    useEffect(() => {
        if (existingQty > 0) {
            setQty(existingQty);
        }
    }, [existingQty]);

    const handleManagedClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (autoManaged) {
            toast.info("This item is automatically calculated based on your board setup. To add or change it, please go back to the 'Board Configuration' menu.");
        }
    };

    return (
        <div
            className={cn(
                "group px-6 py-5 border-b border-gray-200 transition-all flex items-center gap-6 rounded-none shadow-none",
                existingQty > 0 ? "bg-blue-50/40" : "bg-white hover:bg-gray-50"
            )}
        >
            {/* Item Details */}
            <div className="flex-1 min-w-0 flex flex-col gap-1">
                {/* Description - FONT SIZE ADJUSTMENT */}
                <div className="font-bold text-lg text-gray-900 truncate" title={item.description}>
                    {item.description}
                </div>

                {/* Meta Line */}
                <div className="flex items-center gap-1.5 text-xs text-gray-500 truncate">
                    {item.partNumber && (
                        <span className="font-medium text-gray-600">{getDisplayPartNumber(item.partNumber)}</span>
                    )}
                    {item.partNumber && (item.brand || item.subcategory) && <span>•</span>}

                    {item.brand && (
                        <span>{item.brand}</span>
                    )}
                    {item.brand && item.subcategory && <span>•</span>}

                    {item.subcategory && (
                        <span className="text-gray-400 truncate max-w-[200px]" title={item.subcategory}>
                            {formatSubcategoryLabel(item.subcategory, item.category)}
                        </span>
                    )}

                    {isCopper && (
                        <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-medium text-orange-700 ring-1 ring-inset ring-orange-600/20" title={`Live Copper Price: ${formatCurrency(effectiveSettings.copperPricePerKg)}/kg`}>
                            <Zap size={8} className="text-orange-700" />
                            Cu
                        </span>
                    )}

                    {/* Existing Badge */}
                    {existingQty > 0 && (
                        <span className="ml-2 inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                            {existingQty} on board
                        </span>
                    )}

                    {/* Manual Category Badge (Cleats) */}
                    {isPermanentlyManual && (
                        <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20" title="This item is permanently manual and will never be system-locked.">
                            <Layers size={8} />
                            Manual
                        </span>
                    )}
                </div>
            </div>

            {/* Right Side: Logic */}
            <div className="flex items-center gap-4 shrink-0">
                {/* Quantity Selector */}
                <input
                    key={`qty-${existingQty}`}
                    type="text"
                    defaultValue={existingQty > 0 ? existingQty : ""}
                    readOnly={!!autoManaged}
                    onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setQty(isNaN(val) ? 0 : val);
                    }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            if (autoManaged) return;
                            const val = parseFloat(e.currentTarget.value);
                            const finalQty = isNaN(val) ? 0 : val;
                            if (finalQty > 0) {
                                onAdd(item, finalQty, isCopper ? displayUnitPrice : undefined);
                            }
                        }
                    }}
                    onBlur={(e) => {
                        if (existingQty > 0 && !autoManaged) {
                            if (e.relatedTarget && (e.relatedTarget as HTMLElement).closest('button')) {
                                return;
                            }
                            const val = parseFloat(e.currentTarget.value);
                            const finalQty = isNaN(val) ? 0 : val;
                            if (finalQty > 0) {
                                onAdd(item, finalQty, isCopper ? displayUnitPrice : undefined);
                            }
                        }
                    }}
                    onClick={(e) => {
                        if (autoManaged) { handleManagedClick(e as any); return; }
                        e.stopPropagation();
                    }}
                    className={cn(
                        "w-14 h-9 text-center text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white border border-gray-300 rounded-[4px] shadow-sm",
                        autoManaged ? "text-gray-400 bg-gray-50 cursor-not-allowed" : "text-gray-900"
                    )}
                />

                {/* Price */}
                <div className="text-right min-w-[120px]">
                    <div className="font-bold text-lg text-gray-900">{formatCurrency(displayTotalPrice)}</div>
                    <div className="flex items-center justify-end gap-1.5 mt-1">
                        {(qty > 1 || isCopper) && (
                            <div className="text-xs text-gray-400 font-medium whitespace-nowrap">{formatCurrency(displayUnitPrice)} {isCopper ? '/m' : 'ea'}</div>
                        )}
                        {(qty > 1 || isCopper) && item.labourHours > 0 && (
                            <span className="text-xs text-gray-300">•</span>
                        )}
                        {item.labourHours > 0 && (
                            <div 
                                className="text-xs text-gray-400 font-medium flex items-center gap-1 cursor-help transition-all"
                                title={`${qty} × ${item.labourHours}hr = ${(qty * item.labourHours).toFixed(1).replace(/\.0$/, '')} hrs\n@ ${formatCurrency(effectiveSettings.labourRate)}/hr\nLabour Total: ${formatCurrency(qty * item.labourHours * effectiveSettings.labourRate)}`}
                            >
                                {(qty > 1 || existingQty > 0) 
                                    ? <span className="font-bold text-gray-500">{(qty * item.labourHours).toFixed(1).replace(/\.0$/, '')}h</span>
                                    : <span>{item.labourHours}h</span>
                                }
                                <Clock size={12} className="text-gray-400" />
                            </div>
                        )}
                    </div>
                </div>

                {/* Add/Update Button */}
                <button
                    onClick={(e) => {
                        if (autoManaged) { handleManagedClick(e); return; }
                        e.stopPropagation();
                        // Pass unitPriceOverride if Copper Pricing is active
                        // We pass the calculated Per-Meter price (displayUnitPrice) as the unit price
                        onAdd(item, qty, isCopper ? displayUnitPrice : undefined);
                    }}
                    className={cn(
                        "h-9 px-4 rounded-lg font-semibold text-sm transition-all shadow-sm flex items-center gap-2 min-w-[80px] justify-center",
                        autoManaged
                            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                            : existingQty > 0
                                ? "bg-white border border-blue-600 text-blue-600 hover:bg-blue-50"
                                : "bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md active:transform active:scale-95"
                    )}
                >
                    {existingQty > 0 ? (
                        <>
                            <span>Update</span>
                        </>
                    ) : (
                        <>
                            <Plus size={18} />
                            <span>Add</span>
                        </>
                    )}
                </button>

                {/* Delete Button - ONLY if item exists on board AND is NOT system managed */}
                {existingItemId && !autoManaged && onDelete && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete(existingItemId);
                            setQty(1); // Reset local state immediately
                        }}
                        className="h-9 w-9 flex items-center justify-center rounded-lg border border-red-200 text-red-500 hover:bg-red-50 hover:border-red-300 transition-all shadow-sm active:scale-95"
                        title="Remove from board"
                    >
                        <Trash2 size={18} />
                    </button>
                )}
            </div>
        </div>
    );
}



export default function ItemSelection({ onClose, initialCategory, initialL1, initialL2, initialL3 }: ItemSelectionProps) {
    const { addItemToBoard, updateItem, removeItem, selectedBoardId, quoteId, updateUiState, boards, updateBoardConfig } = useQuote();
    // Prioritize passed initialCategory, then default to Switchboard. 
    // State restoration (Lines 50+) will only run if initialCategory is NOT provided, to respect user context.
    const [activeCategory, setActiveCategoryState] = useState<'Basics' | 'Switchboard' | 'Busbar'>(
        initialCategory || 'Switchboard'
    );

    // Stable Tab Keys
    const TAB_KEYS = {
        'Basics': 'TAB_BASICS',
        'Switchboard': 'TAB_SWITCHGEAR',
        'Busbar': 'TAB_BUSBARS'
    };

    // Reverse lookup for restoring state
    const TAB_KEYS_REV = {
        'TAB_BASICS': 'Basics',
        'TAB_SWITCHGEAR': 'Switchboard',
        'TAB_BUSBARS': 'Busbar'
    };

    const setActiveCategory = (cat: 'Basics' | 'Switchboard' | 'Busbar') => {
        setActiveCategoryState(cat);
        // Persist
        updateUiState('lastActiveTab', TAB_KEYS[cat]);
    };

    // Initial State Restoration - ONLY if no specific context was passed
    useEffect(() => {
        // If initialCategory was passed (e.g. from BoardContent), don't override it with last used tab.
        if (initialCategory) {
            if (initialL1) {
                setSelectedL1(initialL1);
            }
            if (initialL2) {
                setSelectedL2(initialL2);
            }
            if (initialL3) {
                setSelectedL3(initialL3);
            }
            return;
        }

        try {
            const savedState = localStorage.getItem(`chadwick_ui_state_${quoteId}`);
            if (savedState) {
                const parsed = JSON.parse(savedState);
                if (parsed.lastActiveTab) {
                    const restoredCat = TAB_KEYS_REV[parsed.lastActiveTab as keyof typeof TAB_KEYS_REV];
                    if (restoredCat) {
                        setActiveCategoryState(restoredCat as any);
                    }
                }
            }
        } catch (e) {
            console.error("Failed to restore tab state", e);
        }
    }, [quoteId, initialCategory]);

    const [items, setItems] = useState<CatalogItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const searchInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === '/') {
                const active = document.activeElement as HTMLElement;
                if (
                    active &&
                    (active.tagName === 'INPUT' || 
                     active.tagName === 'TEXTAREA' || 
                     active.isContentEditable)
                ) {
                    return;
                }
                
                e.preventDefault();
                searchInputRef.current?.focus();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Hierarchical Navigation State
    const [allSubcategories, setAllSubcategories] = useState<string[]>([]); // Full list of subcat strings
    const [selectedL1, setSelectedL1] = useState<string | null>(null);
    const [selectedL2, setSelectedL2] = useState<string | null>(null);
    const [selectedL3, setSelectedL3] = useState<string | null>(null);

    // Power Meter Specific State
    const [meterBrandFilter, setMeterBrandFilter] = useState<string>('All');
    const [meterTypeFilter, setMeterTypeFilter] = useState<string>('All');

    // MCCB Redesign State
    const [mccbItemTypeFilter, setMccbItemTypeFilter] = useState<string>('All');
    const [mccbCapacityFilter, setMccbCapacityFilter] = useState<string>('All');
    const [mccbTypeFilter, setMccbTypeFilter] = useState<string>('All');
    const mccbCache = useRef<CatalogItem[] | null>(null);

    // MCCB Parsing Helper
    const parseMccbTokens = (subcategory: string) => {
        if (!subcategory) return { capacity: null, type: null, kA: 0 };
        const parts = subcategory.split(' > ');
        const lastPart = parts[parts.length - 1].toUpperCase();
        const tokens = lastPart.split(' ').map(t => t.trim()).filter(Boolean);

        let capacity = null;
        let type = null;
        let kA = 0;

        for (const token of tokens) {
            const capMatch = token.match(/^(\d+)KA$/);
            if (capMatch) {
                capacity = token;
                kA = parseInt(capMatch[1]);
            }
            if (['ELECT', 'TM', 'FRAME'].includes(token)) {
                type = token;
            }
        }
        return { capacity, type, kA };
    };

    // Initial Load: Removed explicit redundant fetch since activeCategory change (or initial render) triggers the effect below.

    // Derive Options from `allSubcategories`
    const { l1Options, l2Options, l3Options, isPowerMeterSelection, isMccbSelection } = useMemo(() => {
        const l1 = new Set<string>();
        const l2 = new Set<string>();
        const l3 = new Set<string>();
        let powerMeterActive = false;

        // Standard Navigation Logic
        allSubcategories.forEach(sub => {
            if (!sub) return;
            const parts = normalizeSubcategory(sub, activeCategory);

            if (parts.length > 0) l1.add(parts[0]);

            if (selectedL1 && parts[0] === selectedL1) {
                if (parts.length > 1) l2.add(parts[1]);
            }

            if (selectedL1 && selectedL2 && parts[0] === selectedL1 && parts[1] === selectedL2) {
                if (parts.length > 2) l3.add(parts[2]);
            }
        });

        if (selectedL1 === 'Power Metering' || selectedL2 === 'Power Metering' || selectedL3 === 'Power Metering' || 
            selectedL1 === 'Power Meters' || selectedL2 === 'Power Meters' || selectedL3 === 'Power Meters') {
            powerMeterActive = true;
        }

        const isMccbActive = activeCategory === 'Switchboard' && selectedL1 === 'Circuit Breakers' && selectedL2 === 'MCCB';

        // Custom Sorting
        const L1_ORDER = ['Circuit Breakers', 'Switches', 'Miscellaneous'];
        const MISC_ORDER = ['Contactor', 'General Control', 'Power Metering', 'Fuses'];

        const sortOptions = (options: Set<string>, orderList?: string[]) => {
            return Array.from(options).sort((a, b) => {
                if (orderList) {
                    const idxA = orderList.indexOf(a);
                    const idxB = orderList.indexOf(b);
                    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
                    if (idxA !== -1) return -1;
                    if (idxB !== -1) return 1;
                }
                return a.localeCompare(b);
            });
        };

        return {
            l1Options: sortOptions(l1, activeCategory === 'Switchboard' ? L1_ORDER : undefined),
            l2Options: sortOptions(l2, (activeCategory === 'Switchboard' && selectedL1 === 'Miscellaneous') ? MISC_ORDER : undefined),
            l3Options: sortOptions(l3),
            isPowerMeterSelection: powerMeterActive,
            isMccbSelection: isMccbActive
        };
    }, [allSubcategories, selectedL1, selectedL2, selectedL3, activeCategory]);

    // Separate Memo for Search Grouping (Depends on Items)
    const groupedItems = useMemo(() => {
        let grouped = {
            topHits: [] as CatalogItem[],
            basics: [] as CatalogItem[],
            switchgears: [] as CatalogItem[],
            busbars: [] as CatalogItem[],
            others: [] as CatalogItem[]
        };

        if (searchQuery && items.length > 0) {
            const q = searchQuery.toUpperCase();

            items.forEach(item => {
                const partNo = (item.partNumber || '').toUpperCase();
                let isTopHit = false;
                if (partNo === q || partNo.startsWith(q)) {
                    isTopHit = true;
                }

                if (isTopHit) {
                    grouped.topHits.push(item);
                } else {
                    const cat = (item.category || '').toLowerCase();
                    if (cat === 'basics') {
                        grouped.basics.push(item);
                    } else if (cat === 'switchboard') {
                        grouped.switchgears.push(item);
                    } else if (cat === 'busbar') {
                        grouped.busbars.push(item);
                    } else {
                        grouped.others.push(item);
                    }
                }
            });
        }
        return grouped;
    }, [items, searchQuery]);

    // Derived Power Meter Filters
    const { uniqueBrands, filteredItems } = useMemo(() => {
        if (!isPowerMeterSelection) return { uniqueBrands: [], filteredItems: items };

        // 1. Get Unique Brands from CURRENT items
        const brands = new Set<string>();
        items.forEach(i => {
            if (i.brand) brands.add(i.brand);
        });
        const POWER_METER_BRAND_ORDER: Record<string, number> = {
            'Schneider Electric': 1,
            'MERCS': 2,
            'NHP': 3,
            'IPD': 4
        };

        const sortedBrands = Array.from(brands).sort((a, b) => {
            const orderA = POWER_METER_BRAND_ORDER[a] || 99;
            const orderB = POWER_METER_BRAND_ORDER[b] || 99;
            if (orderA !== orderB) return orderA - orderB;
            return a.localeCompare(b);
        });

        // 2. Filter Logic
        const filtered = items.filter(item => {
            // Brand Filter
            if (meterBrandFilter !== 'All' && item.brand !== meterBrandFilter) return false;

            // Type Filter
            if (meterTypeFilter !== 'All') {
                if (meterTypeFilter === 'Special') {
                    // Special Logic: Show items where meterType is 'Special' OR null/undefined (Legacy/Fallback)
                    return item.meterType === 'Special' || !item.meterType;
                }
                return item.meterType === meterTypeFilter;
            }
            return true;
        });

        return { uniqueBrands: sortedBrands, filteredItems: filtered };

    }, [items, isPowerMeterSelection, meterBrandFilter, meterTypeFilter]);

    // Derived MCCB Filters
    const { filteredMccbItems, totalMccbMatchingCount, totalMccbAvailableCount } = useMemo(() => {
        if (!isMccbSelection) return { filteredMccbItems: [], totalMccbMatchingCount: 0, totalMccbAvailableCount: 0 };

        // Helper for strict Trip Unit detection
        const isTripUnit = (item: CatalogItem) => {
            const desc = (item.description || '').toUpperCase().trim();
            return desc.includes('TRIP UNIT') || desc.includes('BASE TRIP UNIT');
        };

        // Helper for tech detection
        const getTech = (item: CatalogItem) => {
            const { type } = parseMccbTokens(item.subcategory);
            const desc = (item.description || '').toUpperCase();
            
            if (type === 'ELECT') return 'ELECT';
            if (type === 'TM') return 'TM';
            if (type === 'FRAME') return 'FRAME';

            if (desc.includes('ELECT') || desc.includes('MICROLOGIC')) return 'ELECT';
            if (desc.includes(' TM ')) return 'TM';
            
            return null;
        };

        // 1. Filter Items
        const filtered = items.filter(item => {
            const tripUnit = isTripUnit(item);
            
            // A. Item Type Filter
            if (mccbItemTypeFilter === 'Breakers' && tripUnit) return false;
            if (mccbItemTypeFilter === 'Trip Units' && !tripUnit) return false;

            // B. Capacity Filter (Bypassed for Trip Units)
            if (!tripUnit && mccbCapacityFilter !== 'All') {
                const { capacity } = parseMccbTokens(item.subcategory);
                if (capacity !== mccbCapacityFilter) return false;
            }

            // C. Configuration Filter (Missing tags do not exclude)
            if (mccbTypeFilter !== 'All') {
                const tech = getTech(item);
                if (tech && tech !== mccbTypeFilter) return false;
            }

            return true;
        });

        // 2. Sort Items
        const sorted = [...filtered].sort((a, b) => {
            const tokensA = parseMccbTokens(a.subcategory);
            const tokensB = parseMccbTokens(b.subcategory);

            // 1. Capacity (Numeric kA)
            if (tokensA.kA !== tokensB.kA) return tokensA.kA - tokensB.kA;

            // 2. Type (ELECT -> TM -> FRAME)
            const typeOrder: Record<string, number> = { 'ELECT': 1, 'TM': 2, 'FRAME': 3 };
            const orderA = tokensA.type ? (typeOrder[tokensA.type] || 99) : 99;
            const orderB = tokensB.type ? (typeOrder[tokensB.type] || 99) : 99;
            if (orderA !== orderB) return orderA - orderB;

            // 3. Description
            return a.description.localeCompare(b.description);
        });

        return { 
            filteredMccbItems: sorted, 
            totalMccbMatchingCount: filtered.length,
            totalMccbAvailableCount: items.length
        };
    }, [items, isMccbSelection, mccbItemTypeFilter, mccbCapacityFilter, mccbTypeFilter]);

    // Fetch items when selection changes or search changes
    useEffect(() => {
        // If searching, fetch immediately
        if (searchQuery) {
            const delayDebounceFn = setTimeout(() => {
                fetchItems();
            }, 500);
            return () => clearTimeout(delayDebounceFn);
        }

        // Strict Category Gating: Only fetch if explicitly drilled down
        let shouldFetch = false;

        if (activeCategory === 'Switchboard' || activeCategory === 'Busbar') {
            // Case 1: 3-level hierarchy (L3 selected)
            if (selectedL3) {
                shouldFetch = true;
            }
            // Case 2: 2-level hierarchy (L2 selected, and no L3 options exist OR it's Miscellaneous OR it's MCCB)
            else if (selectedL2 && (l3Options.length === 0 || selectedL1 === 'Miscellaneous' || selectedL2 === 'MCCB')) {
                shouldFetch = true;
            }
            // Case 3: 1-level hierarchy (L1 selected, and no L2 options exist)
            else if (selectedL1 && l2Options.length === 0) {
                shouldFetch = true;
            }
        } else if (activeCategory === 'Basics') {
            // Basics: Strictly require L1 selection
            // Safety: Ensure selectedL1 actually belongs to Basics
            const basicsL1s = allSubcategories.map(s => normalizeSubcategory(s, 'Basics')[0]);
            if (selectedL1 && basicsL1s.includes(selectedL1)) {
                shouldFetch = true;
            }
        }

        if (shouldFetch) {
            fetchItems();
        } else {
            setItems([]); // Clear items if navigating up or drilling down
        }
    }, [activeCategory, selectedL1, selectedL2, selectedL3, searchQuery, l2Options, l3Options]);

    const fetchItems = async () => {
        // Caching Logic for MCCB
        const isMccbFetch = !searchQuery && activeCategory === 'Switchboard' && selectedL1 === 'Circuit Breakers' && selectedL2 === 'MCCB';
        if (isMccbFetch && mccbCache.current) {
            setItems(mccbCache.current);
            return;
        }

        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (searchQuery) params.append('search', searchQuery);

            // Constrain to active tab
            params.append('category', activeCategory);

            // Subcategory filtering
            if (!searchQuery) {
                if (activeCategory === 'Switchboard' || activeCategory === 'Busbar') {
                    // Fetch based on deepest selected level
                    if (selectedL3) {
                        const fullPath = [selectedL1, selectedL2, selectedL3].join(' > ');
                        params.append('subcategory', fullPath);
                    } else if (selectedL2) {
                        const fullPath = [selectedL1, selectedL2].join(' > ');
                        params.append('subcategory', fullPath);
                    } else if (selectedL1 && l2Options.length === 0) {
                        params.append('subcategory', selectedL1);
                    }
                } else if (activeCategory === 'Basics') {
                    // For Basics: filter by selected level
                    if (selectedL1) {
                        params.append('subcategory', selectedL1);
                    }
                }
            }

            // Increase limit for specific views
            params.append('take', isMccbFetch ? '1000' : '500');

            const queryString = params.toString();
            const res = await fetch(`/api/catalog?${queryString}`);
            if (res.ok) {
                const data = await res.json();
                if (data.length === 0) console.warn('[ItemSelection] WARNING: Empty response for params:', queryString);

                // Normalize brand names to prevent duplication (e.g., 'schneider electric' vs 'Schneider Electric')
                const filteredData = data.map((item: any) => {
                    if (item.brand) {
                        const b = item.brand.trim().toLowerCase();
                        if (b === 'schneider electric' || b === 'schneider') item.brand = 'Schneider Electric';
                        else if (b === 'mercs') item.brand = 'MERCS';
                        else if (b === 'nhp') item.brand = 'NHP';
                        else if (b === 'ipd') item.brand = 'IPD';
                        else item.brand = item.brand.trim();
                    }
                    return item;
                });

                // Apply Deterministic Sorting
                const sortedData = [...filteredData].sort(compareItems);

                if (isMccbFetch) {
                    mccbCache.current = sortedData;
                }
                setItems(sortedData);
            }
        } catch (error) {
            console.error('Failed to fetch items', error);
        } finally {
            setLoading(false);
        }
    };

    // Reset hierarchy when master category changes
    const prevActiveCategory = useRef(activeCategory);
    useEffect(() => {
        // Only reset state if the category actually changed from previous render
        // This avoids React 18 StrictMode double-invocations wiping out initial state
        if (prevActiveCategory.current !== activeCategory) {
            setSelectedL1(null);
            setSelectedL2(null);
            setSelectedL3(null);
            setSearchQuery('');
            setMccbItemTypeFilter('All');
            setMccbCapacityFilter('All');
            setMccbTypeFilter('All');
            setItems([]);
            mccbCache.current = null; // Clear cache on master tab change to be safe
            prevActiveCategory.current = activeCategory;
        }
        
        fetchCategoryTree(activeCategory);
    }, [activeCategory]);

    const fetchCategoryTree = async (category: string = 'Switchboard') => {
        try {
            const url = `/api/catalog?mode=tree&category=${category}`;
            const res = await fetch(url);

            if (res.ok) {
                const data: string[] = await res.json();
                const hasCleats = data.some(s => s.includes('Busbar Supports'));
                setAllSubcategories(data);
            }
        } catch (error) {
            console.error('Failed to fetch category tree', error);
        }
    };

    const handleAddItem = (item: CatalogItem, qty: number, unitPriceOverride?: number) => {
        if (!selectedBoardId) {
            alert('Please select a board first');
            return;
        }

        const selectedBoard = boards.find(b => b.id === selectedBoardId);
        // Find existing based on Part Number (name in Item)
        // If Part Number is empty, fallback to Description (less reliable but fallback)
        const key = item.partNumber || item.description;
        const existingItem = selectedBoard?.items.find(i => i.name === key);

        if (existingItem) {
            // Update mode: Set exact quantity
            // Note: unitPrice update is not handled here for existing items? 
            // Usually updateItem just updates qty. 
            // If we want to update price snapshot, we might need to pass it too.
            // But for copper items, price is ignored anyway. So updating qty is enough.
            updateItem(existingItem.id, { quantity: qty });
        } else {
            // Add mode
            const payload = {
                category: item.category || activeCategory,
                subcategory: item.subcategory,
                name: item.partNumber || item.description,
                description: item.description,
                partNumber: item.partNumber, // Explicitly pass Part Number
                unitPrice: unitPriceOverride !== undefined ? unitPriceOverride : item.unitPrice,
                labourHours: item.labourHours,
                quantity: qty
            };
            addItemToBoard(selectedBoardId, payload);
        }
    };

    const handleDeleteItem = (itemId: string) => {
        if (!itemId) return;
        removeItem(itemId);
    };

    // Breadcrumb / Back Navigation
    const renderNavigation = () => {
        if (searchQuery) return null;

        return (
            <div className="px-6 py-3 bg-white border-b border-gray-200 flex items-center gap-2 text-sm overflow-x-auto">
                {selectedL1 ? (
                    <>
                        <button
                            onClick={() => { setSelectedL1(null); setSelectedL2(null); setSelectedL3(null); setItems([]); }}
                            className="text-blue-600 hover:underline font-medium flex items-center gap-1"
                        >
                            All Categories
                        </button>
                        <ChevronRight size={14} className="text-gray-400" />

                        {/* Switchboard & Busbar: Multi-level breadcrumb */}
                        {(activeCategory === 'Switchboard' || activeCategory === 'Busbar') && selectedL2 ? (
                            <>
                                <button
                                    onClick={() => { setSelectedL2(null); setSelectedL3(null); setItems([]); }}
                                    className="text-blue-600 hover:underline font-medium"
                                >
                                    {selectedL1}
                                </button>
                                <ChevronRight size={14} className="text-gray-400" />
                                {selectedL3 ? (
                                    <>
                                        <button
                                            onClick={() => { setSelectedL3(null); setItems([]); }}
                                            className="text-blue-600 hover:underline font-medium"
                                        >
                                            {selectedL2}
                                        </button>
                                        <ChevronRight size={14} className="text-gray-400" />
                                        <span className="text-gray-900 font-semibold">{selectedL3}</span>
                                    </>
                                ) : (
                                    <span className="text-gray-900 font-semibold">{selectedL2}</span>
                                )}
                            </>
                        ) : (
                            /* Basics: 1-level breadcrumb */
                            <span className="text-gray-900 font-semibold">{selectedL1}</span>
                        )}
                    </>
                ) : (
                    <span className="text-gray-500 font-medium">Select a category to browse items</span>
                )}
            </div>
        );
    };

    const { tabCounts, l1Counts, l2Counts, l3Counts } = useMemo(() => {
        const tCounts: Record<string, number> = {};
        const l1c: Record<string, number> = {};
        const l2c: Record<string, number> = {};
        const l3c: Record<string, number> = {};

        const selectedBoard = boards.find(b => b.id === selectedBoardId);
        if (!selectedBoard) return { tabCounts: tCounts, l1Counts: l1c, l2Counts: l2c, l3Counts: l3c };

        selectedBoard.items.forEach((item: any) => {

            const cat = item.category || '';
            tCounts[cat] = (tCounts[cat] || 0) + (Number(item.quantity) || 0);

            if (cat === activeCategory && item.subcategory) {
                const parts = normalizeSubcategory(item.subcategory, activeCategory);
                if (parts.length > 0) {
                    l1c[parts[0]] = (l1c[parts[0]] || 0) + (Number(item.quantity) || 0);
                    if (parts.length > 1) {
                        l2c[parts[1]] = (l2c[parts[1]] || 0) + (Number(item.quantity) || 0);
                        if (parts.length > 2) {
                            const l3Key = `${parts[1]} > ${parts[2]}`;
                            l3c[l3Key] = (l3c[l3Key] || 0) + (Number(item.quantity) || 0);
                        }
                    }
                }
            }
        });

        return { tabCounts: tCounts, l1Counts: l1c, l2Counts: l2c, l3Counts: l3c };
    }, [boards, selectedBoardId, activeCategory]);

    return (
        <div className="flex flex-col h-full bg-gray-50">
            {/* Header & Tabs */}
            <div className="bg-white border-b border-gray-200 px-6 pt-4 pb-0 shadow-sm z-10">
                <div className="flex flex-col gap-4 mb-4">
                    {/* Top Row: Title & Search */}
                    <div className="flex items-center gap-4">
                        <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2 whitespace-nowrap shrink-0">
                            {onClose && (
                                <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full mr-1 transition-colors">
                                    <X size={20} className="text-gray-500" />
                                </button>
                            )}
                            Item Selection
                        </h2>

                        {/* Search Bar - Prominent & Full Width */}
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input
                                ref={searchInputRef}
                                type="text"
                                placeholder="Search items..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-gray-100 border-transparent focus:bg-white border focus:border-blue-500 rounded-lg text-sm transition-all outline-none text-gray-900 placeholder:text-gray-500"
                            />
                        </div>
                    </div>

                    {/* Master Category Tabs - Compact */}
                    <div className="flex space-x-1 bg-gray-100/50 p-1 rounded-lg">
                        {[
                            { value: 'Basics', label: 'Basics', icon: Package },
                            { value: 'Switchboard', label: 'Switchgears', icon: Zap },
                            { value: 'Busbar', label: 'Busbars', icon: Layers }
                        ].map((cat) => (
                            <button
                                key={cat.value}
                                onClick={() => setActiveCategory(cat.value as any)}
                                className={cn(
                                    "flex-1 py-1.5 text-xs font-medium rounded-md transition-all flex items-center justify-center gap-2",
                                    activeCategory === cat.value
                                        ? "bg-white text-blue-600 shadow-sm ring-1 ring-gray-200"
                                        : "text-gray-500 hover:text-gray-700 hover:bg-gray-200/50"
                                )}
                            >
                                <cat.icon size={14} />
                                {cat.label}
                                {tabCounts[cat.value] > 0 && (
                                    <span className="bg-blue-100 text-blue-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[16px] text-center">
                                        {tabCounts[cat.value]}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Hierarchical Navigation (Breadcrumbs) */}
            {renderNavigation()}

            {/* Category Selection Grid (Drill-down) */}
            {!searchQuery && (
                <div className="px-6 py-4 bg-gray-50">
                    {/* Switchboard & Busbar: Multi-level hierarchy */}
                    {(activeCategory === 'Switchboard' || activeCategory === 'Busbar') && (
                        <>
                            {!selectedL1 && (
                                <div className="grid grid-cols-2 gap-2">
                                    {l1Options.map(cat => (
                                        <button
                                            key={cat}
                                            onClick={() => setSelectedL1(cat)}
                                            className="px-3 py-2 bg-white border border-gray-200 rounded-md hover:border-blue-400 hover:shadow-sm transition-all text-left flex items-center gap-2 group"
                                        >
                                            <Folder size={16} className="text-blue-500 shrink-0" />
                                            <span className="text-sm font-medium text-gray-700 group-hover:text-blue-700">{cat}</span>
                                            {l1Counts[cat] > 0 && (
                                                <span className="ml-auto bg-blue-100 text-blue-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                                                    {l1Counts[cat]}
                                                </span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {selectedL1 && !selectedL2 && l2Options.length > 0 && (
                                <div className="grid grid-cols-2 gap-2">
                                    {l2Options.map(cat => (
                                        <button
                                            key={cat}
                                            onClick={() => setSelectedL2(cat)}
                                            className="px-3 py-2 bg-white border border-gray-200 rounded-md hover:border-blue-400 hover:shadow-sm transition-all text-left flex items-center gap-2 group"
                                        >
                                            <Folder size={14} className="text-blue-500 shrink-0" />
                                            <span className="text-xs font-medium text-gray-700 group-hover:text-blue-700">{cat}</span>
                                            {l2Counts[cat] > 0 && (
                                                <span className="ml-auto bg-blue-100 text-blue-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                                                    {l2Counts[cat]}
                                                </span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {selectedL1 && selectedL2 && !selectedL3 && l3Options.length > 0 && !isMccbSelection && (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                                    {l3Options.map(cat => (
                                        <button
                                            key={cat}
                                            onClick={() => setSelectedL3(cat)}
                                            className="px-3 py-2 bg-white border border-gray-200 rounded-full hover:border-blue-400 hover:shadow-sm transition-all text-sm text-gray-700 hover:text-blue-700 whitespace-nowrap flex items-center justify-center gap-2"
                                        >
                                            <span>{cat}</span>
                                            {l3Counts[`${selectedL2} > ${cat}`] > 0 && (
                                                <span className="bg-blue-100 text-blue-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                                                    {l3Counts[`${selectedL2} > ${cat}`]}
                                                </span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </>
                    )}

                    {/* Basics: 1-level hierarchy (subcategory only) */}
                    {activeCategory === 'Basics' && !selectedL1 && (
                        <div className="grid grid-cols-2 gap-2">
                            {l1Options.map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setSelectedL1(cat)}
                                    className="px-3 py-2 bg-white border border-gray-200 rounded-md hover:border-blue-400 hover:shadow-sm transition-all text-left flex items-center gap-2 group"
                                >
                                    <Folder size={16} className="text-blue-500 shrink-0" />
                                    <span className="text-sm font-medium text-gray-700 group-hover:text-blue-700">{cat}</span>
                                    {l1Counts[cat] > 0 && (
                                        <span className="ml-auto bg-blue-100 text-blue-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                                            {l1Counts[cat]}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Subtle Message for Busbars */}
            {activeCategory === 'Busbar' && (
                <div className="px-6 py-2 bg-amber-50 border-b border-amber-100 flex items-center gap-2 text-amber-700 animate-in fade-in slide-in-from-top duration-500">
                    <AlertCircle size={14} />
                    <span className="text-xs font-medium">Switchgear is typically completed first — results may be incomplete</span>
                </div>
            )}

            {/* Item List */}
            <div className="flex-1 overflow-y-auto py-4">
                {/* Busbar Insulation Configuration */}
                {activeCategory === 'Busbar' && (
                    <div className="mb-4 bg-blue-50 p-4 rounded-lg border border-blue-100 flex items-center justify-between">
                        <div>
                            <h4 className="text-sm font-semibold text-blue-900">Busbar Insulation</h4>
                            <p className="text-xs text-blue-700 mt-1">
                                Applies insulation cost to all Busbars on this board.
                            </p>
                        </div>
                        <select
                            value={boards.find(b => b.id === selectedBoardId)?.config?.insulationLevel || 'air'}
                            onChange={(e) => {
                                if (selectedBoardId && updateBoardConfig) {
                                    const currentConfig = boards.find(b => b.id === selectedBoardId)?.config || {};
                                    updateBoardConfig(selectedBoardId, { ...currentConfig, insulationLevel: e.target.value });
                                }
                            }}
                            className="block w-48 rounded-md border-gray-300 py-1.5 text-sm font-medium text-gray-900 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        >
                            <option value="none">None</option>
                            <option value="air">Air Insulated (0.25)</option>
                            <option value="fully">Fully Insulated (1.0)</option>
                        </select>
                    </div>
                )}

                {loading ? (
                    <div className="space-y-3">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-16 bg-white rounded-lg animate-pulse" />
                        ))}
                    </div>
                ) : items.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                        {searchQuery ? (
                            <p>No items found matching "{searchQuery}"</p>
                        ) : (
                            <p className="text-sm">Select a category to view items</p>
                        )}
                    </div>
                ) : (
                    <>
                        {/* Normal Navigation View (No Search) */}
                        {!searchQuery && (
                            <div className="grid grid-cols-1 gap-0">
                                {/* Power Metering: Filter UI Header */}
                                {isPowerMeterSelection && (
                                    <div className="mb-4 bg-white p-4 rounded-lg border border-blue-100 shadow-sm space-y-4">
                                        {/* Brand Tabs */}
                                        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-gray-100 no-scrollbar">
                                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mr-2 shrink-0">Brand:</span>
                                            <button
                                                onClick={() => setMeterBrandFilter('All')}
                                                className={cn(
                                                    "px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap",
                                                    meterBrandFilter === 'All'
                                                        ? "bg-blue-600 text-white shadow-md"
                                                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                                )}
                                            >
                                                All Brands
                                            </button>
                                            {uniqueBrands.map(brand => (
                                                <button
                                                    key={brand}
                                                    onClick={() => setMeterBrandFilter(brand)}
                                                    className={cn(
                                                        "px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap",
                                                        meterBrandFilter === brand
                                                            ? "bg-blue-600 text-white shadow-md"
                                                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                                    )}
                                                >
                                                    {brand}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* MCCB: Filter UI Header */}
                                {isMccbSelection && (
                                    <div className="mb-4 bg-white p-4 rounded-lg border border-blue-100 shadow-sm">
                                        <div className="flex items-center gap-6 overflow-x-auto no-scrollbar pb-1 pr-10">
                                             {/* Item Type */}
                                             <div className="space-y-2 shrink-0">
                                                 <div className="flex items-center justify-between px-1">
                                                     <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Item Type</span>
                                                 </div>
                                                 <div className="flex gap-1.5">
                                                     {[
                                                         { label: 'All', value: 'All' },
                                                         { label: 'Breakers', value: 'Breakers' },
                                                         { label: 'Trip Units', value: 'Trip Units' }
                                                     ].map((type) => (
                                                         <button
                                                             key={type.value}
                                                             onClick={() => setMccbItemTypeFilter(prev => prev === type.value ? 'All' : type.value)}
                                                             className={cn(
                                                                 "px-3 py-1.5 rounded-lg text-xs font-bold transition-all border shadow-sm",
                                                                 mccbItemTypeFilter === type.value
                                                                     ? "bg-blue-600 border-blue-600 text-white ring-2 ring-blue-100"
                                                                     : "bg-white border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-600 active:scale-95"
                                                             )}
                                                         >
                                                             {type.label}
                                                         </button>
                                                     ))}
                                                 </div>
                                             </div>

                                             {/* Breaking Capacity Chips */}
                                             <div className="space-y-2 shrink-0">
                                                 <div className="flex items-center justify-between px-1">
                                                     <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Breaking Capacity</span>
                                                 </div>
                                                 <div className="flex gap-1.5">
                                                     {['All', '25kA', '36kA', '40kA', '50kA', '70kA'].map((cap) => (
                                                         <button
                                                             key={cap}
                                                             onClick={() => setMccbCapacityFilter(prev => prev === (cap === 'All' ? 'All' : cap.toUpperCase()) ? 'All' : (cap === 'All' ? 'All' : cap.toUpperCase()))}
                                                             className={cn(
                                                                 "px-3 py-1.5 rounded-lg text-xs font-bold transition-all border shadow-sm",
                                                                 (mccbCapacityFilter === (cap === 'All' ? 'All' : cap.toUpperCase()))
                                                                     ? "bg-blue-600 border-blue-600 text-white ring-2 ring-blue-100"
                                                                     : "bg-white border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-600 active:scale-95"
                                                             )}
                                                         >
                                                             {cap}
                                                         </button>
                                                     ))}
                                                 </div>
                                             </div>

                                             {/* Configuration Chips */}
                                             <div className="space-y-2 shrink-0">
                                                 <div className="flex items-center justify-between px-1">
                                                     <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Configuration</span>
                                                 </div>
                                                 <div className="flex gap-1.5">
                                                     {[
                                                         { label: 'All', value: 'All' },
                                                         { label: 'Electronic', value: 'ELECT' },
                                                         { label: 'Thermal Magnetic', value: 'TM' },
                                                         { label: 'Frame', value: 'FRAME' }
                                                     ].map((type) => (
                                                         <button
                                                             key={type.value}
                                                             onClick={() => setMccbTypeFilter(prev => prev === type.value ? 'All' : type.value)}
                                                             className={cn(
                                                                 "px-3 py-1.5 rounded-lg text-xs font-bold transition-all border shadow-sm",
                                                                 mccbTypeFilter === type.value
                                                                     ? "bg-blue-600 border-blue-600 text-white ring-2 ring-blue-100"
                                                                     : "bg-white border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-600 active:scale-95"
                                                             )}
                                                         >
                                                             {type.label}
                                                         </button>
                                                     ))}
                                                 </div>
                                             </div>
                                         </div>
                                     </div>
                                 )}

                                {isPowerMeterSelection && filteredItems.map((item) => (
                                    <ItemWrapper key={item.id} item={item} boards={boards} selectedBoardId={selectedBoardId} handleAddItem={handleAddItem} handleDeleteItem={handleDeleteItem} />
                                ))}

                                {isMccbSelection && (
                                    <div className="space-y-3">
                                        {filteredMccbItems.map((item) => (
                                            <ItemWrapper key={item.id} item={item} boards={boards} selectedBoardId={selectedBoardId} handleAddItem={handleAddItem} handleDeleteItem={handleDeleteItem} />
                                        ))}
                                    </div>
                                )}

                                {!isPowerMeterSelection && !isMccbSelection && items.map((item) => (
                                    <ItemWrapper key={item.id} item={item} boards={boards} selectedBoardId={selectedBoardId} handleAddItem={handleAddItem} handleDeleteItem={handleDeleteItem} />
                                ))}

                                {/* Result Count Indicator for MCCB */}
                                {isMccbSelection && (
                                    <div className="mt-4 flex flex-col items-center gap-3 py-4">
                                        <p className="text-sm font-medium text-gray-500">
                                            {totalMccbMatchingCount === 0 ? (
                                                <span className="text-red-500 flex items-center gap-1.5">
                                                    <AlertCircle size={16} />
                                                    No items match selected filters
                                                </span>
                                            ) : (
                                                <>Showing <span className="text-gray-900 font-bold">{filteredMccbItems.length}</span> of <span className="text-gray-900 font-bold">{totalMccbAvailableCount}</span> items</>
                                            )}
                                        </p>
                                        {totalMccbMatchingCount === 0 && (
                                            <button 
                                                onClick={() => { setMccbItemTypeFilter('All'); setMccbCapacityFilter('All'); setMccbTypeFilter('All'); }}
                                                className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1"
                                            >
                                                Reset all filters
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Search Results Grouping */}
                        {searchQuery && (
                            <div className="space-y-6">
                                {/* 1. Top Hits */}
                                {groupedItems.topHits.length > 0 && (
                                    <div>
                                        <h3 className="text-sm font-semibold text-blue-800 uppercase tracking-wider mb-2 flex items-center gap-2">
                                            <Zap size={16} className="text-amber-500 fill-amber-500" />
                                            Top Hits
                                        </h3>
                                        <div className="grid grid-cols-1 gap-0">
                                            {groupedItems.topHits.map(item => (
                                                <ItemWrapper key={item.id} item={item} boards={boards} selectedBoardId={selectedBoardId} handleAddItem={handleAddItem} handleDeleteItem={handleDeleteItem} />
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* 2. Switchgears */}
                                {groupedItems.switchgears.length > 0 && (
                                    <div>
                                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 pl-1 border-l-4 border-blue-500">
                                            Switchgears
                                        </h3>
                                        <div className="grid grid-cols-1 gap-0">
                                            {groupedItems.switchgears.map(item => (
                                                <ItemWrapper key={item.id} item={item} boards={boards} selectedBoardId={selectedBoardId} handleAddItem={handleAddItem} handleDeleteItem={handleDeleteItem} />
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* 3. Basics */}
                                {groupedItems.basics.length > 0 && (
                                    <div>
                                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 pl-1 border-l-4 border-green-500">
                                            Basics
                                        </h3>
                                        <div className="grid grid-cols-1 gap-0">
                                            {groupedItems.basics.map(item => (
                                                <ItemWrapper key={item.id} item={item} boards={boards} selectedBoardId={selectedBoardId} handleAddItem={handleAddItem} handleDeleteItem={handleDeleteItem} />
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* 4. Busbars */}
                                {groupedItems.busbars.length > 0 && (
                                    <div>
                                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 pl-1 border-l-4 border-amber-500">
                                            Busbars
                                        </h3>
                                        <div className="grid grid-cols-1 gap-0">
                                            {groupedItems.busbars.map(item => (
                                                <ItemWrapper key={item.id} item={item} boards={boards} selectedBoardId={selectedBoardId} handleAddItem={handleAddItem} handleDeleteItem={handleDeleteItem} />
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* 5. Others */}
                                {groupedItems.others.length > 0 && (
                                    <div>
                                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 pl-1 border-l-4 border-gray-500">
                                            Other Matches
                                        </h3>
                                        <div className="grid grid-cols-1 gap-0">
                                            {groupedItems.others.map(item => (
                                                <ItemWrapper key={item.id} item={item} boards={boards} selectedBoardId={selectedBoardId} handleAddItem={handleAddItem} handleDeleteItem={handleDeleteItem} />
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div >
    );
}

// Helper for Search View to reduce duplication
function ItemWrapper({ item, boards, selectedBoardId, handleAddItem, handleDeleteItem }: { item: CatalogItem, boards: any[], selectedBoardId: string | null, handleAddItem: any, handleDeleteItem: any }) {
    const selectedBoard = boards.find(b => b.id === selectedBoardId);
    const key = item.partNumber || item.description;
    const existingItem = selectedBoard?.items.find((i: any) => i.name === key);
    const existingQty = existingItem ? existingItem.quantity : 0;

    return (
        <ItemRow
            item={item}
            existingQty={existingQty}
            existingItemId={existingItem?.id}
            isSystemManaged={(existingItem as any)?.isSystemManaged}
            onAdd={handleAddItem}
            onDelete={handleDeleteItem}
            boardConfig={selectedBoard?.config}
        />
    );
}
