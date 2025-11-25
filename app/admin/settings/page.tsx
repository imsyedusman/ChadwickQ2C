'use client';

import { useState, useEffect } from 'react';
import { Search, Check, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BasicItem {
    id: string;
    partNumber: string;
    description: string;
    brand: string;
    isAutoAdd: boolean;
}

export default function AdminSettingsPage() {
    const [items, setItems] = useState<BasicItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchBasicItems();
    }, []);

    const fetchBasicItems = async () => {
        try {
            // Fetch only 'Basics' category
            const res = await fetch('/api/catalog?category=Basics&take=1000');
            if (res.ok) {
                const data = await res.json();
                setItems(data);
            }
        } catch (error) {
            console.error('Failed to fetch basic items', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleAutoAdd = async (id: string, currentValue: boolean) => {
        // Optimistic update
        setItems(prev => prev.map(item =>
            item.id === id ? { ...item, isAutoAdd: !currentValue } : item
        ));

        try {
            const res = await fetch(`/api/catalog/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isAutoAdd: !currentValue })
            });

            if (!res.ok) {
                // Revert on failure
                setItems(prev => prev.map(item =>
                    item.id === id ? { ...item, isAutoAdd: currentValue } : item
                ));
                alert('Failed to update setting');
            }
        } catch (error) {
            console.error('Failed to update item', error);
            // Revert on failure
            setItems(prev => prev.map(item =>
                item.id === id ? { ...item, isAutoAdd: currentValue } : item
            ));
        }
    };

    const filteredItems = items.filter(item =>
        item.partNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="p-8 max-w-5xl mx-auto">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Admin Settings</h1>
                <p className="text-gray-500">Manage default items that are automatically added to new switchboards.</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                    <div>
                        <h2 className="font-semibold text-gray-800">Auto-Add Basics</h2>
                        <p className="text-sm text-gray-500">Select which Basic items should be added to every new board by default.</p>
                    </div>
                    <div className="relative w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input
                            type="text"
                            placeholder="Search basics..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3 font-medium">Part Number</th>
                                <th className="px-6 py-3 font-medium">Description</th>
                                <th className="px-6 py-3 font-medium">Brand</th>
                                <th className="px-6 py-3 font-medium text-center">Auto-Add?</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                                        <Loader2 className="animate-spin mx-auto mb-2" size={24} />
                                        Loading items...
                                    </td>
                                </tr>
                            ) : filteredItems.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                                        No Basic items found.
                                    </td>
                                </tr>
                            ) : (
                                filteredItems.map(item => (
                                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-3 font-medium text-gray-900">{item.partNumber}</td>
                                        <td className="px-6 py-3 text-gray-600">{item.description}</td>
                                        <td className="px-6 py-3 text-gray-500">{item.brand}</td>
                                        <td className="px-6 py-3 text-center">
                                            <button
                                                onClick={() => toggleAutoAdd(item.id, item.isAutoAdd)}
                                                className={cn(
                                                    "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
                                                    item.isAutoAdd ? "bg-blue-600" : "bg-gray-200"
                                                )}
                                            >
                                                <span
                                                    className={cn(
                                                        "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                                                        item.isAutoAdd ? "translate-x-6" : "translate-x-1"
                                                    )}
                                                />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
