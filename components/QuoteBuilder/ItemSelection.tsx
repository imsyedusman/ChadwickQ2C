'use client';

import { useState, useEffect, useMemo } from 'react';
import { Search, Plus, Filter, Package, Zap, Layers, ChevronRight, ArrowLeft, Folder } from 'lucide-react';
import { useQuote } from '@/context/QuoteContext';
import { cn } from '@/lib/utils';

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

export default function ItemSelection() {
    const { addItemToBoard, selectedBoardId, quoteId, updateUiState, boards, updateBoardConfig } = useQuote();
    const [activeCategory, setActiveCategoryState] = useState<'Basics' | 'Switchboard' | 'Busbar'>('Switchboard');

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

    // Initial State Restoration
    useEffect(() => {
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
    }, [quoteId]);

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

    // Initial Load: Get the Category Tree
    useEffect(() => {
        fetchCategoryTree('Switchboard');
    }, []);

    // Derive Options from `allSubcategories`
    const { l1Options, l2Options, l3Options, isPowerMeterSelection } = useMemo(() => {
        const l1 = new Set<string>();
        const l2 = new Set<string>();
        const l3 = new Set<string>();
        let powerMeterActive = false;

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

        // Detect if we are in Power Meters section (L2 = 'Power Meters')
        // OR if the user clicked "Power Meters" directly if it's L1 (though mapped as subcat)
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
                const HIDDEN_ITEMS = ['1A-TIERS', '1B-TIERS-400', '1B-BASE', '1B-SS-2B', '1B-SS-NO4', 'MISC-LABELS', 'MISC-HARDWARE'];
                const filteredData = data.filter((i: any) => !HIDDEN_ITEMS.includes(i.partNumber));

                setItems(filteredData);
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

    const handleAddItem = (item: CatalogItem) => {
        if (!selectedBoardId) {
            alert('Please select a board first');
            return;
        }

        addItemToBoard(selectedBoardId, {
            category: item.category || activeCategory,  // Use item's actual category for vendor items
            subcategory: item.subcategory,
            name: item.partNumber || item.description,  // Use description if partNumber is empty
            description: item.description,
            unitPrice: item.unitPrice,
            labourHours: item.labourHours,
            quantity: 1
        });
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
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-800">Item Selection</h2>
                    <div className="relative w-64">
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

                {/* Master Category Tabs */}
                <div className="flex space-x-6">
                    {[
                        { value: 'Basics', label: 'Basics', icon: Package },
                        { value: 'Switchboard', label: 'Switchgears', icon: Zap },
                        { value: 'Busbar', label: 'Busbars', icon: Layers }
                    ].map((cat) => (
                        <button
                            key={cat.value}
                            onClick={() => setActiveCategory(cat.value as any)}
                            className={cn(
                                "pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2",
                                activeCategory === cat.value
                                    ? "border-blue-600 text-blue-600"
                                    : "border-transparent text-gray-500 hover:text-gray-700"
                            )}
                        >
                            <cat.icon size={18} />
                            {cat.label}
                        </button>
                    ))}
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
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {l1Options.map(cat => (
                                        <button
                                            key={cat}
                                            onClick={() => setSelectedL1(cat)}
                                            className="p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-400 hover:shadow-sm transition-all text-left flex items-center gap-3 group"
                                        >
                                            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-100 transition-colors">
                                                <Folder size={20} />
                                            </div>
                                            <span className="font-medium text-gray-900">{cat}</span>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {selectedL1 && !selectedL2 && l2Options.length > 0 && (
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {l2Options.map(cat => (
                                        <button
                                            key={cat}
                                            onClick={() => setSelectedL2(cat)}
                                            className="p-3 bg-white border border-gray-200 rounded-lg hover:border-blue-400 hover:shadow-sm transition-all text-left flex items-center gap-3 group"
                                        >
                                            <div className="p-1.5 bg-blue-50 text-blue-600 rounded-md group-hover:bg-blue-100 transition-colors">
                                                <Folder size={16} />
                                            </div>
                                            <span className="text-sm font-medium text-gray-900">{cat}</span>
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
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {l1Options.map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setSelectedL1(cat)}
                                    className="p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-400 hover:shadow-sm transition-all text-left flex items-center gap-3 group"
                                >
                                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-100 transition-colors">
                                        <Folder size={20} />
                                    </div>
                                    <span className="font-medium text-gray-900">{cat}</span>
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
                            value={boards.find(b => b.id === selectedBoardId)?.config?.insulationLevel || 'none'}
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
                    <div className="grid grid-cols-1 gap-3">
                        {/* Power Meters: Filter UI Header */}
                        {isPowerMeterSelection && items.length > 0 && (
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
                            <div
                                key={item.id}
                                className="group bg-white p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer flex items-center gap-4"
                                onClick={() => handleAddItem(item)}
                            >
                                <div className="flex-1 min-w-0">
                                    {/* Description (Primary - Bold) */}
                                    <div className="font-bold text-gray-900 mb-1" title={item.description}>
                                        {item.description}
                                    </div>

                                    {/* Part Number & Brand (Secondary) */}
                                    <div className="flex flex-wrap items-center gap-2">
                                        {item.partNumber && (
                                            <span className="text-sm text-gray-600">
                                                {item.partNumber}
                                            </span>
                                        )}
                                        {item.brand && (
                                            <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded-full">
                                                {item.brand}
                                            </span>
                                        )}
                                    </div>

                                    {/* Breadcrumb hint in item card */}
                                    {item.subcategory && (
                                        <p className="text-[10px] text-gray-400 mt-1 truncate">
                                            {item.subcategory.replace(/ > /g, ' › ')}
                                        </p>
                                    )}
                                </div>

                                <div className="text-right shrink-0">
                                    <div className="font-bold text-gray-900">${item.unitPrice.toFixed(2)}</div>
                                    <div className="text-xs text-gray-500">{item.labourHours}h</div>
                                </div>

                                <button
                                    className="p-2 text-blue-600 bg-blue-50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shrink-0 hover:bg-blue-100"
                                    title="Add to Board"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleAddItem(item);
                                    }}
                                >
                                    <Plus size={18} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div >
    );
}
