import React, { useMemo, useState, useEffect } from 'react';
import { Item, useQuote } from '@/context/QuoteContext';
import { Search, ChevronUp, ChevronDown, ChevronRight, X, Info, Trash2, Minus, Plus, FileText, FileSpreadsheet, Clock, RefreshCw } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { computeBusbarPrice } from '@/utils/pricing/copperPricing';
import ManualItemForm from './ManualItemForm';
import BoardSummary from './BoardSummary';
import BoardComposition from './BoardComposition';
import { ItemBadges } from './ItemBadges';
import { ViewModeToggle } from './ViewModeToggle';
import { ExportBomDropdown } from './ExportBomDropdown';
import { BoardMoreActions } from './BoardMoreActions';

interface EstimatorBoardContentProps {
    items: Item[];
    setPresentationMode?: (mode: 'standard' | 'estimator') => void;
    onQuantityChange?: (itemId: string, newQty: number) => void;
    onRemoveItem?: (itemId: string) => void;
    onAddItems?: (category?: 'Basics' | 'Switchboard' | 'Busbar', l1?: string, l2?: string, l3?: string) => void;
    boardId?: string;
    onOpenDocxDescription?: () => void;
}

type EstimatorGroup = 'Basic' | 'CBs' | 'Switches' | 'Busbars' | 'Misc';

const GROUP_ORDER: EstimatorGroup[] = ['Basic', 'CBs', 'Switches', 'Busbars', 'Misc'];

function getEstimatorGroup(item: Item): EstimatorGroup {
    if (item.category === 'Basics') return 'Basic';
    if (item.category === 'Busbar') return 'Busbars';
    if (item.category === 'Other') return 'Misc';

    if (item.category === 'Switchboard') {
        const sub = item.subcategory || '';
        if (sub.includes('Circuit Breakers') || sub.includes('ACB') || sub.includes('ATS')) return 'CBs';
        if (sub.includes('Switches')) return 'Switches';
        return 'Misc';
    }
    
    return 'Misc';
}

export default function EstimatorBoardContent({ items, setPresentationMode, onQuantityChange, onRemoveItem, onAddItems, boardId, onOpenDocxDescription }: EstimatorBoardContentProps) {
    const { overrides, quoteSnapshot, globalSettings, addItemToBoard, quoteId, boards } = useQuote();
    const copperPricePerKg = overrides?.overrideCopperPricePerKg ?? quoteSnapshot?.copperPricePerKg ?? globalSettings?.copperPricePerKg ?? 0;
    const selectedBoard = boards.find(b => b.id === boardId);

    const [showManualForm, setShowManualForm] = useState(false);
    const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

    const toggleSection = (group: string) => {
        setCollapsedSections(prev => ({ ...prev, [group]: !prev[group] }));
    };

    const expandAll = () => setCollapsedSections({});
    const collapseAll = () => {
        const all: Record<string, boolean> = {};
        GROUP_ORDER.forEach(g => all[g] = true);
        setCollapsedSections(all);
    };

    const getItemCost = (item: Item) => {
        const qty = Number(item.quantity) || 0;
        if (item.totalCopperWeightKgPerMeter && item.isCopperPriced) {
            const copperResult = computeBusbarPrice({
                copperWeightKgPerMeter: item.totalCopperWeightKgPerMeter,
                isCopperPriced: true,
                length: qty,
                copperPricePerKg: copperPricePerKg
            });
            return copperResult.totalPrice;
        }
        return (Number(item.unitPrice) || 0) * qty;
    };

    // Group items and calculate costs
    const { groupedItems, groupCosts, groupLabourHours, totalMaterialCost } = useMemo(() => {
        const groups: Record<EstimatorGroup, Item[]> = {
            'Basic': [], 'CBs': [], 'Switches': [], 'Busbars': [], 'Misc': []
        };
        const costs: Record<EstimatorGroup, number> = {
            'Basic': 0, 'CBs': 0, 'Switches': 0, 'Busbars': 0, 'Misc': 0
        };
        const labourHours: Record<EstimatorGroup, number> = {
            'Basic': 0, 'CBs': 0, 'Switches': 0, 'Busbars': 0, 'Misc': 0
        };
        let totalCost = 0;
        
        items.forEach(item => {
            const group = getEstimatorGroup(item);
            groups[group].push(item);
            
            const cost = getItemCost(item);
            const itemLabourHours = (Number(item.labourHours) || 0) * (Number(item.quantity) || 0);
            
            // As per lib/pricing.ts, Price Adjustments are not part of Base Material Cost
            if (item.subcategory !== 'Price Adjustment') {
                costs[group] += cost;
                totalCost += cost;
                labourHours[group] += itemLabourHours;
            }
        });
        
        return { groupedItems: groups, groupCosts: costs, groupLabourHours: labourHours, totalMaterialCost: totalCost };
    }, [items, copperPricePerKg]);

    // --- SEARCH STATE ---
    const [searchQuery, setSearchQuery] = useState('');
    const [activeMatchIndex, setActiveMatchIndex] = useState(0);

    // Derived matches
    const matches = useMemo(() => {
        if (!searchQuery.trim()) return [];
        const q = searchQuery.toLowerCase();
        
        const matchedIds: string[] = [];
        
        GROUP_ORDER.forEach(group => {
            if (groupedItems[group]) {
                groupedItems[group].forEach(item => {
                    const nameMatch = item.name?.toLowerCase().includes(q);
                    const descMatch = item.description?.toLowerCase().includes(q);
                    const subcatMatch = item.subcategory?.toLowerCase().includes(q);
                    const anyItem = item as any;
                    const brandMatch = anyItem.brand?.toLowerCase().includes(q);
                    
                    if (nameMatch || descMatch || brandMatch || subcatMatch) {
                        matchedIds.push(item.id);
                    }
                });
            }
        });
        
        return matchedIds;
    }, [searchQuery, groupedItems]);

    const jumpToMatch = (index: number) => {
        if (matches.length === 0) return;
        let newIndex = index;
        if (newIndex < 0) newIndex = matches.length - 1;
        if (newIndex >= matches.length) newIndex = 0;
        
        setActiveMatchIndex(newIndex);
        
        const matchId = matches[newIndex];
        const el = document.getElementById(`estimator-item-${matchId}`);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    };

    useEffect(() => {
        setActiveMatchIndex(0);
        if (searchQuery.trim() && matches.length > 0) {
            const timer = setTimeout(() => {
                const el = document.getElementById(`estimator-item-${matches[0]}`);
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 50);
            return () => clearTimeout(timer);
        }
    }, [searchQuery]);

    // Active groups
    const activeGroups = GROUP_ORDER;

    const scrollToSection = (group: string) => {
        setCollapsedSections(prev => ({ ...prev, [group]: false }));
        setTimeout(() => {
            const el = document.getElementById(`estimator-section-${group}`);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth' });
            }
        }, 50);
    };

    const [activeTab, setActiveTab] = useState<string>(activeGroups[0] || '');

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setActiveTab(entry.target.id.replace('estimator-section-', ''));
                    }
                });
            },
            { rootMargin: '-100px 0px -60% 0px' }
        );

        activeGroups.forEach(group => {
            const el = document.getElementById(`estimator-section-${group}`);
            if (el) observer.observe(el);
        });

        return () => observer.disconnect();
    }, [activeGroups]);

    const handleAddClick = (group: EstimatorGroup) => {
        if (!onAddItems) return;
        switch(group) {
            case 'Basic': onAddItems('Basics'); break;
            case 'CBs': onAddItems('Switchboard', 'Circuit Breakers'); break;
            case 'Switches': onAddItems('Switchboard', 'Switches'); break;
            case 'Busbars': onAddItems('Busbar'); break;
            case 'Misc': onAddItems('Switchboard', 'Miscellaneous'); break;
        }
    };

    return (
        <div className="flex flex-col h-full bg-gray-50/30 overflow-hidden relative">
            {/* Header */}
            <div className="px-6 py-3 border-b border-gray-100 bg-gray-50 flex justify-between items-center z-20 gap-4">
                <div className="flex items-center gap-3 shrink-0">
                    <h3 className="text-sm font-bold text-gray-900">{selectedBoard ? selectedBoard.name : 'Estimator View'}</h3>
                    <span className="text-[10px] font-bold text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full">{items.length} Total Items</span>
                </div>

                {/* Search Bar */}
                <div className="flex-1 max-w-xs mx-auto flex items-center gap-2">
                    <div className="relative flex-1">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search size={14} className="text-gray-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search part number, description..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') jumpToMatch(activeMatchIndex + 1);
                            }}
                            className="w-full pl-9 pr-8 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute inset-y-0 right-0 pr-2 flex items-center text-gray-400 hover:text-gray-600"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>
                    
                    {searchQuery && (
                        <div className="flex items-center gap-2 shrink-0 bg-white border border-gray-200 rounded-lg px-2 py-1 shadow-sm">
                            <span className="text-xs font-medium text-gray-600 min-w-[70px] text-center">
                                {matches.length > 0 ? `${activeMatchIndex + 1} of ${matches.length}` : '0 matches'}
                            </span>
                            <div className="flex items-center border-l border-gray-200 pl-2 gap-1">
                                <button 
                                    onClick={() => jumpToMatch(activeMatchIndex - 1)}
                                    disabled={matches.length === 0}
                                    className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded disabled:opacity-50 transition-colors"
                                >
                                    <ChevronUp size={14} />
                                </button>
                                <button 
                                    onClick={() => jumpToMatch(activeMatchIndex + 1)}
                                    disabled={matches.length === 0}
                                    className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded disabled:opacity-50 transition-colors"
                                >
                                    <ChevronDown size={14} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Expand / Collapse All Controls */}
                <div className="flex items-center gap-2 border-l border-gray-200 pl-4 ml-2 shrink-0">
                    <button onClick={expandAll} className="text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors">Expand All</button>
                    <span className="text-gray-300">|</span>
                    <button onClick={collapseAll} className="text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors">Collapse All</button>
                </div>

                <div className="flex items-center gap-4 shrink-0 pl-2">
                    {/* Export BOM and Refresh */}
                    {selectedBoard && (
                        <>
                            <ExportBomDropdown quoteId={quoteId} boardId={selectedBoard.id} />
                            <BoardMoreActions 
                                onOpenDocxDescription={onOpenDocxDescription} 
                                onRefreshPrices={async () => {
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
                            />
                        </>
                    )}

                    {setPresentationMode && (
                        <ViewModeToggle 
                            presentationMode="estimator" 
                            setPresentationMode={setPresentationMode} 
                        />
                    )}
                </div>
            </div>
            
            {/* Consolidated Board Header (Summary + Composition inline) */}
            <BoardComposition 
                items={items} 
                leftHeaderContent={<BoardSummary />} 
            />

            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
                <div className="space-y-6 pb-12 max-w-5xl mx-auto">

                    {/* Grouped Sections */}
                    {activeGroups.map(group => {
                        const groupHasSearchMatch = matches.some(matchId => groupedItems[group].some(item => item.id === matchId));
                        const isCollapsed = collapsedSections[group] && (!searchQuery.trim() || !groupHasSearchMatch);

                        return (
                        <div 
                            key={group} 
                            id={`estimator-section-${group}`}
                            className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden scroll-mt-24 flex flex-col"
                        >
                            <div 
                                className="bg-gray-50 px-6 py-3 border-b border-gray-200 font-bold text-gray-800 flex justify-between items-center cursor-pointer hover:bg-gray-100 transition-colors"
                                onClick={() => toggleSection(group)}
                            >
                                <div className="flex items-center gap-3">
                                    {isCollapsed ? <ChevronRight size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                                    <span>{group}</span>
                                    <span className="text-xs font-normal text-gray-500 bg-white px-2 py-0.5 rounded shadow-sm border border-gray-100">{groupedItems[group].length} Items</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-slate-700">
                                    <span className="font-medium text-slate-600">
                                        {groupLabourHours[group] % 1 === 0 ? groupLabourHours[group] : groupLabourHours[group].toFixed(1)}h Labour
                                    </span>
                                    <span className="text-gray-300">|</span>
                                    <span className="font-bold">{formatCurrency(groupCosts[group])} Material</span>
                                </div>
                            </div>
                            
                            {!isCollapsed && (
                                <>
                                {groupedItems[group].length > 0 ? (
                                <div className="divide-y divide-gray-100">
                                    {groupedItems[group].map(item => {
                                        const isMatch = matches.includes(item.id);
                                        const isActiveMatch = matches.length > 0 && matches[activeMatchIndex] === item.id;
                                        const cost = getItemCost(item);
                                        
                                        return (
                                            <div 
                                                key={item.id} 
                                                id={`estimator-item-${item.id}`}
                                                className={`group px-6 py-3 flex justify-between items-center text-sm transition-all duration-200 border-l-4 ${
                                                    isActiveMatch ? 'bg-yellow-100/70 border-yellow-500 shadow-sm z-10 relative' : 
                                                    isMatch ? 'bg-yellow-50/40 border-yellow-300' : 
                                                    'border-transparent hover:bg-gray-50/50'
                                                }`}
                                            >
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-semibold text-gray-900" title={item.description || item.name}>{item.description || item.name}</p>
                                                        <ItemBadges 
                                                            item={item} 
                                                            boardItems={items} 
                                                            copperPricePerKg={copperPricePerKg} 
                                                            showConsolidationBadges={false} 
                                                        />
                                                    </div>
                                                    {item.description && item.name && item.description !== item.name && (
                                                        <p className="text-xs text-gray-500 mt-0.5 font-mono" title={item.name}>{item.name}</p>
                                                    )}
                                                    {item.subcategory && (
                                                        <p className="text-[10px] text-gray-400 mt-0.5">{item.subcategory}</p>
                                                    )}
                                                </div>
                                                <div className={`w-28 flex items-center justify-between rounded mx-4 border transition-colors ${
                                                    isMatch ? 'bg-white border-yellow-200' : 'bg-white border-gray-200'
                                                } overflow-hidden shadow-sm`}>
                                                    <button 
                                                        onClick={() => onQuantityChange && onQuantityChange(item.id, Math.max(0, Number(item.quantity) - 1))}
                                                        disabled={!onQuantityChange || Number(item.quantity) === 0}
                                                        className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 disabled:opacity-30 transition-colors"
                                                    >
                                                        <Minus size={12} />
                                                    </button>
                                                    <input 
                                                        type="number"
                                                        value={Number(item.quantity)}
                                                        onChange={(e) => {
                                                            const val = parseInt(e.target.value);
                                                            if (!isNaN(val) && onQuantityChange) {
                                                                onQuantityChange(item.id, val);
                                                            }
                                                        }}
                                                        className={`w-10 text-center text-xs font-semibold bg-transparent focus:outline-none appearance-none hide-number-spinners ${
                                                            isMatch ? 'text-yellow-800' : 'text-gray-700'
                                                        }`}
                                                    />
                                                    <button 
                                                        onClick={() => onQuantityChange && onQuantityChange(item.id, Number(item.quantity) + 1)}
                                                        disabled={!onQuantityChange}
                                                        className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 disabled:opacity-30 transition-colors"
                                                    >
                                                        <Plus size={12} />
                                                    </button>
                                                </div>
                                                <div className={`w-28 text-right font-medium ${
                                                    isMatch ? 'text-yellow-900' : 'text-gray-900'
                                                }`}>
                                                    <div>{formatCurrency(cost)}</div>
                                                    {item.labourHours > 0 && (
                                                        <div 
                                                            className="text-gray-400 cursor-help flex items-center justify-end gap-1 mt-0.5"
                                                            title={`${item.quantity} × ${item.labourHours}hr = ${(Number(item.quantity) * item.labourHours).toFixed(1).replace(/\.0$/, '')} hrs`}
                                                        >
                                                            <span className="text-[10px] font-medium">{(Number(item.quantity) * item.labourHours).toFixed(1).replace(/\.0$/, '')}h</span>
                                                            <Clock size={12} />
                                                        </div>
                                                    )}
                                                </div>
                                                {onRemoveItem ? (
                                                    <div className="w-8 flex justify-end ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button 
                                                            onClick={() => onRemoveItem(item.id)}
                                                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                                                            title="Remove Item"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="w-8 ml-2"></div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="py-6 text-center text-xs text-gray-400 italic bg-white">
                                    No items in this section.
                                </div>
                            )}

                            {/* Add Item Area */}
                            {group === 'Misc' ? (
                                <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex flex-col gap-3 mt-auto">
                                    <div className="flex gap-3">
                                        <button 
                                            onClick={() => handleAddClick(group)} 
                                            className="flex-1 py-2.5 border-2 border-dashed border-gray-200 rounded-lg text-gray-500 hover:text-blue-600 hover:border-blue-300 hover:bg-white transition-all text-sm font-medium flex items-center justify-center gap-2"
                                        >
                                            <Plus size={16} /> Add Catalog Item
                                        </button>
                                        <button 
                                            onClick={() => setShowManualForm(!showManualForm)} 
                                            className="flex-1 py-2.5 border-2 border-dashed border-gray-200 rounded-lg text-gray-500 hover:text-purple-600 hover:border-purple-300 hover:bg-white transition-all text-sm font-medium flex items-center justify-center gap-2"
                                        >
                                            <Plus size={16} /> Add Manual Item
                                        </button>
                                    </div>
                                    
                                    {showManualForm && boardId && (
                                        <div className="bg-white p-4 border rounded-lg shadow-sm animate-in fade-in slide-in-from-top-4">
                                            <ManualItemForm
                                                onSave={async (data) => {
                                                    await addItemToBoard(boardId, {
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
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="p-4 border-t border-gray-100 bg-gray-50/50 mt-auto">
                                    <button 
                                        onClick={() => handleAddClick(group)} 
                                        className="w-full py-2.5 border-2 border-dashed border-gray-200 rounded-lg text-gray-500 hover:text-blue-600 hover:border-blue-300 hover:bg-white transition-all text-sm font-medium flex items-center justify-center gap-2"
                                    >
                                        <Plus size={16} /> Add {group === 'Basic' ? 'Basic Item' : group.slice(0, -1)}
                                    </button>
                                </div>
                            )}
                            </>
                            )}
                        </div>
                    )})}

                </div>
            </div>

            {/* Bottom Tab Navigation (Excel Style) */}
            {activeGroups.length > 0 && (
                <div className="shrink-0 bg-gray-100 border-t border-gray-300 flex overflow-x-auto px-2 pt-1.5 hide-scrollbar relative z-20">
                    {activeGroups.map(group => (
                        <button
                            key={group}
                            onClick={() => scrollToSection(group)}
                            className={`px-4 py-2 text-xs font-semibold whitespace-nowrap transition-all flex gap-2 items-center border border-b-0 rounded-t-md mx-0.5 ${
                                activeTab === group
                                    ? 'text-blue-700 bg-white border-gray-300 shadow-[0_-2px_0_0_#2563eb]'
                                    : 'text-gray-500 bg-[#e5e7eb] border-transparent hover:bg-gray-300 hover:text-gray-700'
                            }`}
                        >
                            {group} 
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                                activeTab === group ? 'bg-blue-100 text-blue-700' : 'bg-white/60 text-gray-500'
                            }`}>{groupedItems[group].length}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
