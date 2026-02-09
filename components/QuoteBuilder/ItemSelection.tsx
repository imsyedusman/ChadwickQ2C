'use client';

import { useState, useEffect, useMemo } from 'react';
import { Search, Plus, Minus, Filter, Package, Zap, Layers, ChevronRight, ArrowLeft, Folder, Loader2, X, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { isAutoManaged } from '@/lib/system-definitions';
import { useQuote } from '@/context/QuoteContext';
import { cn } from '@/lib/utils';
import { compareItems } from '@/lib/sorting';

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
}

interface ItemSelectionProps {
    onClose?: () => void;
}

interface ItemRowProps {
    item: CatalogItem;
    existingQty?: number;
    existingItemId?: string; // ID of the item if it exists on the board
    isSystemManaged?: boolean;
    onAdd: (item: CatalogItem, qty: number) => void;
    onDelete?: (itemId: string) => void;
    boardConfig?: any; // To determine scope for conditional locking
}

function ItemRow({ item, existingQty = 0, existingItemId, isSystemManaged, onAdd, onDelete, boardConfig }: ItemRowProps) {
    // If it exists on board, start with that qty. Otherwise default to 1.
    // However, if we want "control surface" feel, we might want to default to 0 if not selected?
    // User requirement: "If the item is not on the board → show default quantity (e.g. 1)"
    const initialQty = existingQty > 0 ? existingQty : 1;

    const [qty, setQty] = useState(initialQty);

    // CLEAT EXEMPTION LOGIC
    // Cleats are statically defined as "Auto Managed" in system-definitions.ts
    // BUT we want them to be Manual if out-of-scope (Fault > 50kA or Form != 3B).
    const isCleatPart = item.partNumber?.startsWith('1B1-CLEAT');
    const isCleatSection = item.subcategory === 'Busbar Supports - Required for Custom Boards Only';
    const isCleat = isCleatPart || isCleatSection;

    let isAuto = isAutoManaged(item.partNumber) || isSystemManaged;

    if (isCleat && boardConfig) {
        // Parse Scope
        const isCustom = boardConfig.enclosureType === 'Custom';
        const isForm3B = (boardConfig.form || '').toLowerCase() === '3b'; // Handles undefined
        // Safe Parse Fault Rating
        const faultRatingStr = boardConfig.faultRating || '999';
        const faultkA = parseInt(faultRatingStr.replace(/[^0-9]/g, '') || '999');
        const isFaultSafe = faultkA <= 50; // In-scope only if 50kA or less

        const inScope = isCustom && isForm3B && isFaultSafe;

        if (!inScope) {
            // OUT OF SCOPE: Force Manual Control
            isAuto = false;
        }
    }

    // Combine client-side check with server-side flag
    const autoManaged = isAuto;

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
                "group bg-white px-6 py-5 rounded-md border transition-all flex items-center gap-6",
                existingQty > 0 ? "border-blue-200 bg-blue-50/10 shadow-sm" : "border-gray-200 hover:border-blue-300 hover:shadow-sm"
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
                        <span className="font-medium text-gray-600">{item.partNumber}</span>
                    )}
                    {item.partNumber && (item.brand || item.subcategory) && <span>•</span>}

                    {item.brand && (
                        <span>{item.brand}</span>
                    )}
                    {item.brand && item.subcategory && <span>•</span>}

                    {item.subcategory && (
                        <span className="text-gray-400 truncate max-w-[200px]">
                            {item.subcategory.split(' > ').pop()}
                        </span>
                    )}

                    {/* Existing Badge */}
                    {existingQty > 0 && (
                        <span className="ml-2 inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                            {existingQty} on board
                        </span>
                    )}
                </div>
            </div>

            {/* Right Side: Logic */}
            <div className="flex items-center gap-4 shrink-0">
                {/* Quantity Selector */}
                <div
                    className="flex items-center gap-0 bg-white border border-gray-300 rounded overflow-hidden h-9 shadow-sm"
                    onClick={autoManaged ? handleManagedClick : undefined}
                >
                    <button
                        onClick={(e) => {
                            if (autoManaged) { handleManagedClick(e); return; }
                            e.stopPropagation();
                            setQty(Math.max(1, qty - 1));
                        }}
                        className={cn(
                            "w-9 h-full flex items-center justify-center transition-colors border-r border-gray-200 active:bg-gray-100",
                            autoManaged ? "text-gray-300 bg-gray-50 cursor-not-allowed" : "text-gray-500 hover:bg-gray-50 hover:text-blue-600"
                        )}
                    >
                        <Minus size={16} />
                    </button>
                    <input
                        type="number"
                        min="1"
                        value={qty}
                        readOnly={!!autoManaged}
                        onChange={(e) => {
                            const val = parseInt(e.target.value);
                            setQty(isNaN(val) || val < 1 ? 1 : val);
                        }}
                        onClick={(e) => {
                            if (autoManaged) { handleManagedClick(e as any); return; }
                            e.stopPropagation();
                        }}
                        className={cn(
                            "w-14 h-full text-center text-base font-semibold focus:outline-none focus:ring-inset focus:ring-1 focus:ring-blue-500 bg-transparent flex items-center justify-center p-0",
                            autoManaged ? "text-gray-400 bg-gray-50 cursor-pointer" : "text-gray-900" // cursor-pointer on input to encourage click for toast? Or not-allowed? User said click.
                        )}
                        style={autoManaged ? { cursor: 'not-allowed' } : {}}
                    />
                    <button
                        onClick={(e) => {
                            if (autoManaged) { handleManagedClick(e); return; }
                            e.stopPropagation();
                            setQty(qty + 1);
                        }}
                        className={cn(
                            "w-9 h-full flex items-center justify-center transition-colors border-l border-gray-200 active:bg-gray-100",
                            autoManaged ? "text-gray-300 bg-gray-50 cursor-not-allowed" : "text-gray-500 hover:bg-gray-50 hover:text-blue-600"
                        )}
                    >
                        <Plus size={16} />
                    </button>
                </div>

                {/* Price */}
                <div className="text-right min-w-[80px]">
                    <div className="font-bold text-lg text-gray-900">${(item.unitPrice * qty).toFixed(2)}</div>
                    <div className="flex flex-col items-end gap-0.5 mt-1">
                        {qty > 1 && (
                            <div className="text-xs text-gray-400 font-medium">${item.unitPrice.toFixed(2)} ea</div>
                        )}
                        <div className="text-xs text-blue-600 font-medium bg-blue-50 px-1.5 py-0.5 rounded">
                            {item.labourHours}h
                        </div>
                    </div>
                </div>

                {/* Add/Update Button */}
                <button
                    onClick={(e) => {
                        if (autoManaged) { handleManagedClick(e); return; }
                        e.stopPropagation();
                        onAdd(item, qty);
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

interface ItemSelectionProps {
    onClose?: () => void;
    initialCategory?: 'Basics' | 'Switchboard' | 'Busbar';
}

export default function ItemSelection({ onClose, initialCategory }: ItemSelectionProps) {
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
        if (initialCategory) return;

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

    // Hierarchical Navigation State
    const [allSubcategories, setAllSubcategories] = useState<string[]>([]); // Full list of subcat strings
    const [selectedL1, setSelectedL1] = useState<string | null>(null);
    const [selectedL2, setSelectedL2] = useState<string | null>(null);
    const [selectedL3, setSelectedL3] = useState<string | null>(null);

    // Power Meter Specific State
    const [meterBrandFilter, setMeterBrandFilter] = useState<string>('All');
    const [meterTypeFilter, setMeterTypeFilter] = useState<string>('All');

    // Initial Load: Removed explicit redundant fetch since activeCategory change (or initial render) triggers the effect below.

    // Derive Options from `allSubcategories`
    const { l1Options, l2Options, l3Options, isPowerMeterSelection } = useMemo(() => {
        const l1 = new Set<string>();
        const l2 = new Set<string>();
        const l3 = new Set<string>();
        let powerMeterActive = false;

        // Standard Navigation Logic (unchanged)
        allSubcategories.forEach(sub => {
            if (!sub) return;
            const parts = sub.split(' > ').map(s => s.trim()).filter(Boolean);

            if (parts.length > 0) l1.add(parts[0]);

            if (selectedL1 && parts[0] === selectedL1) {
                if (parts.length > 1) l2.add(parts[1]);
            }

            if (selectedL1 && selectedL2 && parts[0] === selectedL1 && parts[1] === selectedL2) {
                if (parts.length > 2) l3.add(parts[2]);
            }
        });

        if (selectedL1 === 'Power Meters' || selectedL2 === 'Power Meters' || selectedL3 === 'Power Meters') {
            powerMeterActive = true;
        }

        return {
            l1Options: Array.from(l1).sort(),
            l2Options: Array.from(l2).sort(),
            l3Options: Array.from(l3).sort(),
            isPowerMeterSelection: powerMeterActive
        };
    }, [allSubcategories, selectedL1, selectedL2, selectedL3]);

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
        const sortedBrands = Array.from(brands).sort();

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

    // Fetch items when selection changes or search changes
    useEffect(() => {
        // If searching, fetch immediately
        if (searchQuery) {
            const delayDebounceFn = setTimeout(() => {
                fetchItems();
            }, 500);
            return () => clearTimeout(delayDebounceFn);
        }

        // If browsing Switchboards or Busbars, fetch when fully drilled down
        if (activeCategory === 'Switchboard' || activeCategory === 'Busbar') {
            // Case 1: 3-level hierarchy (L3 selected)
            if (selectedL3) {
                fetchItems();
            }
            // Case 2: 2-level hierarchy (L2 selected, and no L3 options exist)
            else if (selectedL2 && l3Options.length === 0) {
                fetchItems();
            }
            // Case 3: 1-level hierarchy (L1 selected, and no L2 options exist)
            else if (selectedL1 && l2Options.length === 0) {
                fetchItems();
            } else {
                setItems([]); // Clear items if navigating up or drilling down
            }
        } else {
            // For Basics, fetch when any level is selected OR show all if none selected
            fetchItems();
        }
    }, [activeCategory, selectedL1, selectedL2, selectedL3, searchQuery, l2Options, l3Options]);

    const fetchItems = async () => {
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
                        // 2-level hierarchy (e.g. Main Bars > Custom Busbar)
                        const fullPath = [selectedL1, selectedL2].join(' > ');
                        params.append('subcategory', fullPath);
                    } else if (selectedL1 && l2Options.length === 0) {
                        // 1-level hierarchy
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
            params.append('take', '500');

            const res = await fetch(`/api/catalog?${params.toString()}`);
            if (res.ok) {
                const data = await res.json();

                // Filter out system-managed basics that shouldn't be added manually
                const filteredData = data;

                // Apply Deterministic Sorting
                const sortedData = [...filteredData].sort(compareItems);

                setItems(sortedData);
            }
        } catch (error) {
            console.error('Failed to fetch items', error);
        } finally {
            setLoading(false);
        }
    };

    // Reset hierarchy when master category changes
    useEffect(() => {
        setSelectedL1(null);
        setSelectedL2(null);
        setSelectedL3(null);
        setSearchQuery('');
        setItems([]);
        fetchCategoryTree(activeCategory);
    }, [activeCategory]);

    const fetchCategoryTree = async (category: string = 'Switchboard') => {
        try {
            const res = await fetch(`/api/catalog?mode=tree&category=${category}`);
            if (res.ok) {
                const data = await res.json();
                setAllSubcategories(data);
            }
        } catch (error) {
            console.error('Failed to fetch category tree', error);
        }
    };

    const handleAddItem = (item: CatalogItem, qty: number) => {
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
            updateItem(existingItem.id, { quantity: qty });
        } else {
            // Add mode
            addItemToBoard(selectedBoardId, {
                category: item.category || activeCategory,
                subcategory: item.subcategory,
                name: item.partNumber || item.description,
                description: item.description,
                partNumber: item.partNumber, // Explicitly pass Part Number
                unitPrice: item.unitPrice,
                labourHours: item.labourHours,
                quantity: qty
            });
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
                                        </button>
                                    ))}
                                </div>
                            )}

                            {selectedL1 && selectedL2 && !selectedL3 && l3Options.length > 0 && (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                                    {l3Options.map(cat => (
                                        <button
                                            key={cat}
                                            onClick={() => setSelectedL3(cat)}
                                            className="px-3 py-2 bg-white border border-gray-200 rounded-full hover:border-blue-400 hover:shadow-sm transition-all text-sm text-gray-700 hover:text-blue-700 whitespace-nowrap"
                                        >
                                            {cat}
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
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Item List */}
            <div className="flex-1 overflow-y-auto p-4">
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
                        ) : activeCategory === 'Switchboard' && !selectedL3 ? (
                            <p className="text-sm">Select a category above to view items</p>
                        ) : (
                            <p>No items found in this category.</p>
                        )}
                    </div>
                ) : (
                    <>
                        {/* Normal Navigation View (No Search) */}
                        {!searchQuery && (
                            <div className="grid grid-cols-1 gap-3">
                                {/* Power Meters: Filter UI Header */}
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

                                        {/* Type Filters */}
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mr-2">Type:</span>
                                            {['All', 'Direct', 'CT', 'NMI', 'Special'].map(type => (
                                                <button
                                                    key={type}
                                                    onClick={() => setMeterTypeFilter(type)}
                                                    className={cn(
                                                        "px-4 py-1.5 rounded-md text-xs font-semibold border transition-all",
                                                        meterTypeFilter === type
                                                            ? "bg-blue-50 border-blue-600 text-blue-700 ring-1 ring-blue-200"
                                                            : "bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                                                    )}
                                                >
                                                    {type}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {(isPowerMeterSelection ? filteredItems : items).map((item) => (
                                    <ItemWrapper key={item.id} item={item} boards={boards} selectedBoardId={selectedBoardId} handleAddItem={handleAddItem} handleDeleteItem={handleDeleteItem} />
                                ))}
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
                                        <div className="grid grid-cols-1 gap-3">
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
                                        <div className="grid grid-cols-1 gap-3">
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
                                        <div className="grid grid-cols-1 gap-3">
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
                                        <div className="grid grid-cols-1 gap-3">
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
                                        <div className="grid grid-cols-1 gap-3">
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
