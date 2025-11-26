'use client';

import { useState } from 'react';
import { useQuote, Item } from '@/context/QuoteContext';
import { Trash2, Plus, Minus, ChevronDown, ChevronRight, Edit2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// ONLY these 3 master categories should appear as top-level collapsibles
// Using singular form to match database schema
const MASTER_CATEGORIES = ['Basics', 'Switchboard', 'Busbar'];

export default function BoardContent() {
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

    const handleQuantityChange = (itemId: string, currentQty: number, change: number) => {
        const newQty = Math.max(1, currentQty + change);
        updateItem(itemId, { quantity: newQty });
    };

    const renderItemRow = (item: Item) => (
        <div key={item.id} className="px-4 py-2 flex items-center gap-4 hover:bg-gray-50 group transition-colors text-sm">
            {/* Item Details */}
            <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 truncate" title={item.name}>{item.name}</div>
                {item.subcategory && (
                    <div className="text-[10px] text-gray-500 truncate">{item.subcategory}</div>
                )}
            </div>

            {/* Quantity Control */}
            <div className="flex items-center gap-1 bg-white border border-gray-200 rounded px-1 h-6">
                <button
                    onClick={() => handleQuantityChange(item.id, item.quantity, -1)}
                    className="text-gray-400 hover:text-red-600 transition-colors"
                >
                    <Minus size={12} />
                </button>
                <span className="w-6 text-center text-xs font-medium text-gray-700">{item.quantity}</span>
                <button
                    onClick={() => handleQuantityChange(item.id, item.quantity, 1)}
                    className="text-gray-400 hover:text-blue-600 transition-colors"
                >
                    <Plus size={12} />
                </button>
            </div>

            {/* Price & Total */}
            <div className="text-right w-20">
                <div className="font-medium text-gray-900">${(item.unitPrice * item.quantity).toFixed(2)}</div>
                <div className="text-[10px] text-gray-400">${item.unitPrice.toFixed(2)} ea</div>
            </div>

            {/* Actions */}
            <button
                onClick={() => removeItem(item.id)}
                className="text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
            >
                <Trash2 size={14} />
            </button>
        </div>
    );

    const renderSwitchboardsContent = (items: Item[]) => {
        // Group Switchboards items by subcategory (Power Meters, Fuses, Circuit Breakers, etc.)
        const groupedBySubcat = items.reduce((acc, item) => {
            const subcat = item.subcategory || 'Other';
            if (!acc[subcat]) acc[subcat] = [];
            acc[subcat].push(item);
            return acc;
        }, {} as Record<string, Item[]>);

        const subcatKeys = Object.keys(groupedBySubcat).sort();

        return (
            <div className="divide-y divide-gray-100">
                {subcatKeys.map(subcat => {
                    const subcatItems = groupedBySubcat[subcat];
                    const subcatKey = `Switchboard-${subcat}`;
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
                <div className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">
                    {selectedBoard.description || selectedBoard.name}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
                                        {masterCat}
                                        <span className="text-xs font-normal text-gray-500">({categoryItems.length})</span>
                                    </div>
                                </button>

                                {/* Master category content */}
                                {!isMasterCollapsed && (
                                    <>
                                        {masterCat === 'Switchboard' ? (
                                            // For Switchboard, render sub-collapsibles by subcategory
                                            renderSwitchboardsContent(categoryItems)
                                        ) : (
                                            // For Basics and Busbars, render items directly
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
