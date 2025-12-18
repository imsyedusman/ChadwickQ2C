'use client';

import { useState, useEffect } from 'react';
import { Search, Edit2, Trash2, Save, X, Loader2, Plus, AlertTriangle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface CatalogItem {
    id: string;
    partNumber: string;
    description: string;
    subcategory: string;
    unitPrice: number;
    labourHours: number;
    defaultQuantity: number;
    isAutoAdd: boolean;
    isSheetmetal: boolean;
    notes: string;
    category: string;
}

interface CatalogManagerProps {
    category: string;
    title: string;
    description?: string;
}

export default function CatalogManager({ category, title, description }: CatalogManagerProps) {
    const [items, setItems] = useState<CatalogItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // Editing state
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Partial<CatalogItem>>({});

    // Create state
    const [isCreating, setIsCreating] = useState(false);
    const [createForm, setCreateForm] = useState<Partial<CatalogItem>>({
        category: category,
        subcategory: 'Miscellaneous',
        defaultQuantity: 1,
        isAutoAdd: false,
        isSheetmetal: false,
        unitPrice: 0,
        labourHours: 0
    });

    useEffect(() => {
        fetchItems();
    }, [category]);

    const fetchItems = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/catalog?category=${category}&take=1000`);
            if (res.ok) {
                const data = await res.json();
                setItems(data);
            } else {
                toast.error('Failed to load items');
            }
        } catch (error) {
            console.error('Failed to fetch items', error);
            toast.error('Network error loading items');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (item: CatalogItem) => {
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
                const updated = await res.json();
                setItems(prev => prev.map(item => item.id === editingId ? updated : item));
                setEditingId(null);
                setEditForm({});
                toast.success('Item updated successfully');
            } else {
                toast.error('Failed to update item');
            }
        } catch (error) {
            console.error('Failed to update item', error);
            toast.error('Error updating item');
        }
    };

    const handleDelete = async (id: string, partNumber: string) => {
        if (!confirm(`Are you sure you want to delete ${partNumber}?`)) return;

        try {
            const res = await fetch(`/api/catalog/${id}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                setItems(prev => prev.filter(item => item.id !== id));
                toast.success('Item deleted');
            } else {
                toast.error('Failed to delete item');
            }
        } catch (error) {
            console.error('Failed to delete item', error);
            toast.error('Error deleting item');
        }
    };

    const handleCreate = async () => {
        if (!createForm.partNumber || !createForm.description) {
            toast.error('Part Number and Description are required');
            return;
        }

        try {
            // Reusing existing API which takes an array for bulk import
            // Or we need a single create endpoint. GET /api/catalog doesn't support generic POST single item well.
            // But POST /api/catalog accepts { items: [] }.
            const payload = {
                items: [{
                    ...createForm,
                    category: category,
                    brand: 'Internal' // Mark as internal or similar
                }]
            };

            const res = await fetch('/api/catalog', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                await fetchItems(); // Refresh to get the ID
                setIsCreating(false);
                setCreateForm({
                    category: category,
                    subcategory: 'Miscellaneous',
                    defaultQuantity: 1,
                    isAutoAdd: false,
                    isSheetmetal: false,
                    unitPrice: 0,
                    labourHours: 0
                });
                toast.success('Item created');
            } else {
                toast.error('Failed to create item');
            }
        } catch (error) {
            console.error('Failed to create item', error);
            toast.error('Error creating item');
        }
    };

    const toggleAutoAdd = async (item: CatalogItem) => {
        // Optimistic update
        const newVal = !item.isAutoAdd;
        setItems(prev => prev.map(i => i.id === item.id ? { ...i, isAutoAdd: newVal } : i));

        try {
            const res = await fetch(`/api/catalog/${item.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isAutoAdd: newVal })
            });

            if (!res.ok) {
                // Revert
                setItems(prev => prev.map(i => i.id === item.id ? { ...i, isAutoAdd: !newVal } : i));
                toast.error('Failed to update status');
            }
        } catch (error) {
            setItems(prev => prev.map(i => i.id === item.id ? { ...i, isAutoAdd: !newVal } : i));
            toast.error('Network error');
        }
    };

    const toggleSheetmetal = async (item: CatalogItem) => {
        // Optimistic update
        const newVal = !item.isSheetmetal;
        setItems(prev => prev.map(i => i.id === item.id ? { ...i, isSheetmetal: newVal } : i));

        try {
            const res = await fetch(`/api/catalog/${item.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isSheetmetal: newVal })
            });

            if (!res.ok) {
                // Revert
                setItems(prev => prev.map(i => i.id === item.id ? { ...i, isSheetmetal: !newVal } : i));
                toast.error('Failed to update status');
            }
        } catch (error) {
            setItems(prev => prev.map(i => i.id === item.id ? { ...i, isSheetmetal: !newVal } : i));
            toast.error('Network error');
        }
    };

    const filteredItems = items.filter(item =>
        (item.partNumber?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (item.description?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (item.subcategory?.toLowerCase() || '').includes(searchQuery.toLowerCase())
    );

    // Group by subcategory
    const groupedItems = filteredItems.reduce((acc, item) => {
        const subcat = item.subcategory || 'Uncategorized';
        if (!acc[subcat]) acc[subcat] = [];
        acc[subcat].push(item);
        return acc;
    }, {} as Record<string, CatalogItem[]>);

    // Sort subcategories
    const sortedSubcategories = Object.keys(groupedItems).sort();

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gray-50">
                <div className="flex flex-col gap-1">
                    <h2 className="font-semibold text-gray-800 text-lg">{title}</h2>
                    <p className="text-sm text-gray-500">{description || `Manage ${category} items`}</p>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        />
                    </div>
                    <button
                        onClick={() => setIsCreating(true)}
                        className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                        <Plus size={16} />
                        Add Item
                    </button>
                </div>
            </div>

            {/* Create Form */}
            {isCreating && (
                <div className="p-6 bg-blue-50 border-b border-blue-100">
                    <h3 className="font-medium text-blue-900 mb-4">Add New Item</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                        <input
                            placeholder="Part Number"
                            value={createForm.partNumber || ''}
                            onChange={e => setCreateForm({ ...createForm, partNumber: e.target.value })}
                            className="px-3 py-2 border border-blue-200 rounded text-sm w-full"
                        />
                        <input
                            placeholder="Description"
                            value={createForm.description || ''}
                            onChange={e => setCreateForm({ ...createForm, description: e.target.value })}
                            className="px-3 py-2 border border-blue-200 rounded text-sm w-full lg:col-span-2"
                        />
                        <input
                            placeholder="Subcategory"
                            value={createForm.subcategory || ''}
                            onChange={e => setCreateForm({ ...createForm, subcategory: e.target.value })}
                            className="px-3 py-2 border border-blue-200 rounded text-sm w-full"
                        />
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-blue-700 font-medium w-16">Price $</span>
                            <input
                                type="number"
                                placeholder="0.00"
                                value={createForm.unitPrice || 0}
                                onChange={e => setCreateForm({ ...createForm, unitPrice: parseFloat(e.target.value) })}
                                className="px-3 py-2 border border-blue-200 rounded text-sm w-full"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-blue-700 font-medium w-16">Labour (h)</span>
                            <input
                                type="number"
                                placeholder="0.00"
                                value={createForm.labourHours || 0}
                                onChange={e => setCreateForm({ ...createForm, labourHours: parseFloat(e.target.value) })}
                                className="px-3 py-2 border border-blue-200 rounded text-sm w-full"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-blue-700 font-medium w-16">Def. Qty</span>
                            <input
                                type="number"
                                placeholder="1"
                                value={createForm.defaultQuantity || 1}
                                onChange={e => setCreateForm({ ...createForm, defaultQuantity: parseInt(e.target.value) })}
                                className="px-3 py-2 border border-blue-200 rounded text-sm w-full"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-blue-700 font-medium w-16">Notes</span>
                            <input
                                placeholder="Notes..."
                                value={createForm.notes || ''}
                                onChange={e => setCreateForm({ ...createForm, notes: e.target.value })}
                                className="px-3 py-2 border border-blue-200 rounded text-sm w-full"
                            />
                        </div>
                        <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 text-sm text-blue-800">
                                <input
                                    type="checkbox"
                                    checked={createForm.isAutoAdd || false}
                                    onChange={(e) => setCreateForm({ ...createForm, isAutoAdd: e.target.checked })}
                                    className="w-4 h-4 text-blue-600 rounded"
                                />
                                Auto-Add
                            </label>
                            <label className="flex items-center gap-2 text-sm text-blue-800">
                                <input
                                    type="checkbox"
                                    checked={createForm.isSheetmetal || false}
                                    onChange={(e) => setCreateForm({ ...createForm, isSheetmetal: e.target.checked })}
                                    className="w-4 h-4 text-blue-600 rounded"
                                />
                                Sheetmetal
                            </label>
                        </div>
                    </div>
                    <div className="flex justify-end gap-3">
                        <button
                            onClick={() => setIsCreating(false)}
                            className="px-3 py-1.5 text-blue-700 hover:bg-blue-100 rounded text-sm font-medium"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleCreate}
                            className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700"
                        >
                            Save New Item
                        </button>
                    </div>
                </div>
            )}

            <div className="overflow-x-auto max-h-[calc(100vh-300px)] overflow-y-auto">
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="animate-spin text-blue-600" size={32} />
                    </div>
                ) : items.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                        No items found.
                    </div>
                ) : (
                    sortedSubcategories.map(subcategory => (
                        <div key={subcategory} className="border-b border-gray-100 last:border-b-0">
                            <div className="bg-gray-50 px-6 py-2 font-semibold text-sm text-gray-700 sticky top-0 border-y border-gray-100">
                                {subcategory} ({groupedItems[subcategory].length})
                            </div>
                            <table className="w-full text-sm">
                                <thead className="text-xs text-gray-500 uppercase bg-white border-b border-gray-100">
                                    <tr>
                                        <th className="px-4 py-3 text-left font-medium w-32">Part Number</th>
                                        <th className="px-4 py-3 text-left font-medium">Description</th>
                                        <th className="px-4 py-3 text-left font-medium w-48">Notes</th>
                                        <th className="px-4 py-3 text-right font-medium w-24">Price</th>
                                        <th className="px-4 py-3 text-right font-medium w-24">Labour (h)</th>
                                        <th className="px-4 py-3 text-center font-medium w-20">Def. Qty</th>
                                        <th className="px-4 py-3 text-center font-medium w-16">Auto</th>
                                        <th className="px-4 py-3 text-center font-medium w-16">Sheet</th>
                                        <th className="px-4 py-3 text-center font-medium w-24">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {groupedItems[subcategory].map(item => (
                                        <tr key={item.id} className="hover:bg-blue-50/50 transition-colors group">
                                            {editingId === item.id ? (
                                                <>
                                                    <td className="px-4 py-3">
                                                        <input
                                                            type="text"
                                                            value={editForm.partNumber || ''}
                                                            onChange={(e) => setEditForm({ ...editForm, partNumber: e.target.value })}
                                                            className="w-full px-2 py-1 border border-blue-300 rounded text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <input
                                                            type="text"
                                                            value={editForm.description || ''}
                                                            onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                                                            className="w-full px-2 py-1 border border-blue-300 rounded text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <input
                                                            type="text"
                                                            value={editForm.notes || ''}
                                                            onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                                                            className="w-full px-2 py-1 border border-blue-300 rounded text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            value={editForm.unitPrice || 0}
                                                            onChange={(e) => setEditForm({ ...editForm, unitPrice: parseFloat(e.target.value) })}
                                                            className="w-full px-2 py-1 border border-blue-300 rounded text-sm text-right focus:ring-1 focus:ring-blue-500 outline-none"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            value={editForm.labourHours || 0}
                                                            onChange={(e) => setEditForm({ ...editForm, labourHours: parseFloat(e.target.value) })}
                                                            className="w-full px-2 py-1 border border-blue-300 rounded text-sm text-right focus:ring-1 focus:ring-blue-500 outline-none"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <input
                                                            type="number"
                                                            value={editForm.defaultQuantity || 1}
                                                            onChange={(e) => setEditForm({ ...editForm, defaultQuantity: parseInt(e.target.value) })}
                                                            className="w-full px-2 py-1 border border-blue-300 rounded text-sm text-center focus:ring-1 focus:ring-blue-500 outline-none"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <div className="flex justify-center">
                                                            <input
                                                                type="checkbox"
                                                                checked={editForm.isAutoAdd || false}
                                                                onChange={(e) => setEditForm({ ...editForm, isAutoAdd: e.target.checked })}
                                                                className="w-4 h-4 text-blue-600 rounded"
                                                            />
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <div className="flex justify-center">
                                                            <input
                                                                type="checkbox"
                                                                checked={editForm.isSheetmetal || false}
                                                                onChange={(e) => setEditForm({ ...editForm, isSheetmetal: e.target.checked })}
                                                                className="w-4 h-4 text-blue-600 rounded"
                                                            />
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center justify-center gap-1">
                                                            <button
                                                                onClick={handleSaveEdit}
                                                                className="p-1.5 text-green-600 hover:bg-green-100 rounded transition-colors"
                                                                title="Save"
                                                            >
                                                                <Save size={16} />
                                                            </button>
                                                            <button
                                                                onClick={handleCancelEdit}
                                                                className="p-1.5 text-gray-400 hover:bg-gray-100 rounded transition-colors"
                                                                title="Cancel"
                                                            >
                                                                <X size={16} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </>
                                            ) : (
                                                <>
                                                    <td className="px-4 py-3 font-medium text-gray-900 group-hover:text-blue-700">{item.partNumber}</td>
                                                    <td className="px-4 py-3 text-gray-600">{item.description}</td>
                                                    <td className="px-4 py-3 text-gray-400 text-xs italic truncate max-w-[12rem]">{item.notes}</td>
                                                    <td className="px-4 py-3 text-right text-gray-900 font-medium">${item.unitPrice.toFixed(2)}</td>
                                                    <td className="px-4 py-3 text-right text-gray-600">{item.labourHours.toFixed(2)}</td>
                                                    <td className="px-4 py-3 text-center text-gray-600">{item.defaultQuantity}</td>
                                                    <td className="px-4 py-3 text-center">
                                                        <button
                                                            onClick={() => toggleAutoAdd(item)}
                                                            className={cn(
                                                                "relative inline-flex h-4 w-8 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
                                                                item.isAutoAdd ? "bg-blue-600" : "bg-gray-200"
                                                            )}
                                                            title="Toggle Auto-Add"
                                                        >
                                                            <span
                                                                className={cn(
                                                                    "inline-block h-3 w-3 transform rounded-full bg-white transition-transform",
                                                                    item.isAutoAdd ? "translate-x-4" : "translate-x-1"
                                                                )}
                                                            />
                                                        </button>
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <button
                                                            onClick={() => toggleSheetmetal(item)}
                                                            className={cn(
                                                                "relative inline-flex h-4 w-8 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
                                                                item.isSheetmetal ? "bg-blue-600" : "bg-gray-200"
                                                            )}
                                                            title="Toggle Sheetmetal Inclusion"
                                                        >
                                                            <span
                                                                className={cn(
                                                                    "inline-block h-3 w-3 transform rounded-full bg-white transition-transform",
                                                                    item.isSheetmetal ? "translate-x-4" : "translate-x-1"
                                                                )}
                                                            />
                                                        </button>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button
                                                                onClick={() => handleEdit(item)}
                                                                className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                                title="Edit"
                                                            >
                                                                <Edit2 size={16} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDelete(item.id, item.partNumber)}
                                                                className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
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
    );
}
