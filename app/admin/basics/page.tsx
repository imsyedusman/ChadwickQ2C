'use client';

import { useState, useEffect } from 'react';
import { Search, Edit2, Trash2, Save, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BasicItem {
    id: string;
    partNumber: string;
    description: string;
    subcategory: string;
    unitPrice: number;
    labourHours: number;
    defaultQuantity: number;
    isAutoAdd: boolean;
}

export default function ManageBasicsPage() {
    const [items, setItems] = useState<BasicItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Partial<BasicItem>>({});

    useEffect(() => {
        fetchBasicItems();
    }, []);

    const fetchBasicItems = async () => {
        try {
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

    const handleEdit = (item: BasicItem) => {
        setEditingId(item.id);
        setEditForm(item);
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditForm({});
    };

    const handleSaveEdit = async () => {
        if (!editingId) return;

        try {
            const res = await fetch(`/api/catalog/${editingId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editForm)
            });

            if (res.ok) {
                await fetchBasicItems();
                setEditingId(null);
                setEditForm({});
            } else {
                alert('Failed to update item');
            }
        } catch (error) {
            console.error('Failed to update item', error);
            alert('Failed to update item');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this item?')) return;

        try {
            const res = await fetch(`/api/catalog/${id}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                await fetchBasicItems();
            } else {
                alert('Failed to delete item');
            }
        } catch (error) {
            console.error('Failed to delete item', error);
            alert('Failed to delete item');
        }
    };

    const toggleAutoAdd = async (id: string, currentValue: boolean) => {
        try {
            const res = await fetch(`/api/catalog/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isAutoAdd: !currentValue })
            });

            if (res.ok) {
                setItems(prev => prev.map(item =>
                    item.id === id ? { ...item, isAutoAdd: !currentValue } : item
                ));
            }
        } catch (error) {
            console.error('Failed to update item', error);
        }
    };

    const filteredItems = items.filter(item =>
        item.partNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.subcategory?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Group by subcategory
    const groupedItems = filteredItems.reduce((acc, item) => {
        const subcat = item.subcategory || 'Uncategorized';
        if (!acc[subcat]) acc[subcat] = [];
        acc[subcat].push(item);
        return acc;
    }, {} as Record<string, BasicItem[]>);

    return (
        <div className="min-h-screen bg-[#f9fafb] p-8">
            <div className="max-w-7xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Manage Basic Items</h1>
                    <p className="text-gray-500">Edit, update, and manage your internal Basic items catalog. These are separate from external supplier pricelists.</p>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                        <div className="flex items-center gap-4">
                            <h2 className="font-semibold text-gray-800">Basic Items Catalog</h2>
                            <span className="text-sm text-gray-500">({items.length} items)</span>
                        </div>
                        <div className="relative w-80">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input
                                type="text"
                                placeholder="Search by part number, description, or category..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto max-h-[calc(100vh-300px)] overflow-y-auto">
                        {loading ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="animate-spin text-blue-600" size={32} />
                            </div>
                        ) : Object.keys(groupedItems).length === 0 ? (
                            <div className="text-center py-12 text-gray-500">
                                No Basic items found.
                            </div>
                        ) : (
                            Object.entries(groupedItems).map(([subcategory, subcatItems]) => (
                                <div key={subcategory} className="border-b border-gray-100 last:border-b-0">
                                    <div className="bg-gray-50 px-6 py-2 font-semibold text-sm text-gray-700 sticky top-0">
                                        {subcategory} ({subcatItems.length})
                                    </div>
                                    <table className="w-full text-sm">
                                        <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200 sticky top-8">
                                            <tr>
                                                <th className="px-6 py-3 text-left font-medium w-32">Part Number</th>
                                                <th className="px-6 py-3 text-left font-medium">Description</th>
                                                <th className="px-6 py-3 text-right font-medium w-24">Price</th>
                                                <th className="px-6 py-3 text-right font-medium w-24">Labour (h)</th>
                                                <th className="px-6 py-3 text-center font-medium w-20">Qty</th>
                                                <th className="px-6 py-3 text-center font-medium w-24">Auto-Add</th>
                                                <th className="px-6 py-3 text-center font-medium w-32">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {subcatItems.map(item => (
                                                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                                    {editingId === item.id ? (
                                                        <>
                                                            <td className="px-6 py-3">
                                                                <input
                                                                    type="text"
                                                                    value={editForm.partNumber || ''}
                                                                    onChange={(e) => setEditForm({ ...editForm, partNumber: e.target.value })}
                                                                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                                                />
                                                            </td>
                                                            <td className="px-6 py-3">
                                                                <input
                                                                    type="text"
                                                                    value={editForm.description || ''}
                                                                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                                                                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                                                />
                                                            </td>
                                                            <td className="px-6 py-3">
                                                                <input
                                                                    type="number"
                                                                    step="0.01"
                                                                    value={editForm.unitPrice || 0}
                                                                    onChange={(e) => setEditForm({ ...editForm, unitPrice: parseFloat(e.target.value) })}
                                                                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-right"
                                                                />
                                                            </td>
                                                            <td className="px-6 py-3">
                                                                <input
                                                                    type="number"
                                                                    step="0.1"
                                                                    value={editForm.labourHours || 0}
                                                                    onChange={(e) => setEditForm({ ...editForm, labourHours: parseFloat(e.target.value) })}
                                                                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-right"
                                                                />
                                                            </td>
                                                            <td className="px-6 py-3">
                                                                <input
                                                                    type="number"
                                                                    value={editForm.defaultQuantity || 1}
                                                                    onChange={(e) => setEditForm({ ...editForm, defaultQuantity: parseInt(e.target.value) })}
                                                                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-center"
                                                                />
                                                            </td>
                                                            <td className="px-6 py-3 text-center">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={editForm.isAutoAdd || false}
                                                                    onChange={(e) => setEditForm({ ...editForm, isAutoAdd: e.target.checked })}
                                                                    className="w-4 h-4"
                                                                />
                                                            </td>
                                                            <td className="px-6 py-3">
                                                                <div className="flex items-center justify-center gap-2">
                                                                    <button
                                                                        onClick={handleSaveEdit}
                                                                        className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors"
                                                                        title="Save"
                                                                    >
                                                                        <Save size={16} />
                                                                    </button>
                                                                    <button
                                                                        onClick={handleCancelEdit}
                                                                        className="p-1 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                                                                        title="Cancel"
                                                                    >
                                                                        <X size={16} />
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <td className="px-6 py-3 font-medium text-gray-900">{item.partNumber}</td>
                                                            <td className="px-6 py-3 text-gray-600">{item.description}</td>
                                                            <td className="px-6 py-3 text-right text-gray-900">${item.unitPrice.toFixed(2)}</td>
                                                            <td className="px-6 py-3 text-right text-gray-600">{item.labourHours.toFixed(1)}</td>
                                                            <td className="px-6 py-3 text-center text-gray-600">{item.defaultQuantity}</td>
                                                            <td className="px-6 py-3 text-center">
                                                                <button
                                                                    onClick={() => toggleAutoAdd(item.id, item.isAutoAdd)}
                                                                    className={cn(
                                                                        "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
                                                                        item.isAutoAdd ? "bg-blue-600" : "bg-gray-200"
                                                                    )}
                                                                >
                                                                    <span
                                                                        className={cn(
                                                                            "inline-block h-3 w-3 transform rounded-full bg-white transition-transform",
                                                                            item.isAutoAdd ? "translate-x-5" : "translate-x-1"
                                                                        )}
                                                                    />
                                                                </button>
                                                            </td>
                                                            <td className="px-6 py-3">
                                                                <div className="flex items-center justify-center gap-2">
                                                                    <button
                                                                        onClick={() => handleEdit(item)}
                                                                        className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                                        title="Edit"
                                                                    >
                                                                        <Edit2 size={16} />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleDelete(item.id)}
                                                                        className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                                                                        title="Delete"
                                                                    >
                                                                        <Trash2 size={16} />
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </>
                                                    )}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
