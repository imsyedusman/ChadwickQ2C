'use client';

import { useState } from 'react';
import { useQuote, Item } from '@/context/QuoteContext';
import { Trash2, Plus, Minus, ChevronDown, ChevronRight, Edit2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// Define master categories
const MASTER_CATEGORIES = ['Switchboards', 'Basics', 'Busbars'];

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

    // Group items by category
    const groupedItems = items.reduce((acc, item) => {
        const category = item.category || 'Uncategorized';
        if (!acc[category]) acc[category] = [];
        acc[category].push(item);
        return acc;
    }, {} as Record<string, Item[]>);

    const toggleSection = (category: string) => {
        setCollapsedSections(prev => ({
            ...prev,
            [category]: !prev[category]
        }));
    };

    const handleQuantityChange = (itemId: string, currentQty: number, change: number) => {
        const newQty = Math.max(1, currentQty + change);
        updateItem(itemId, { quantity: newQty });
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
                    // Iterate through master categories to maintain order, plus any others found
                    [...MASTER_CATEGORIES, ...Object.keys(groupedItems).filter(k => !MASTER_CATEGORIES.includes(k))].map(category => {
                        const categoryItems = groupedItems[category];
                        if (!categoryItems || categoryItems.length === 0) return null;

                        const isCollapsed = collapsedSections[category];

                        return (
                            <div key={category} className="border border-gray-200 rounded-lg overflow-hidden">
                                <button
                                    onClick={() => toggleSection(category)}
                                    className="w-full px-4 py-2 bg-gray-50 flex items-center justify-between hover:bg-gray-100 transition-colors"
                                >
                                    <div className="flex items-center gap-2 font-semibold text-sm text-gray-700">
                                        {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                                        {category}
                                        <span className="text-xs font-normal text-gray-500">({categoryItems.length})</span>
                                    </div>
                                </button>

                                {!isCollapsed && (
                                    <div className="divide-y divide-gray-100">
                                        {categoryItems.map(item => (
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
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
