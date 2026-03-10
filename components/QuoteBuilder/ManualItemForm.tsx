'use client';

import { useState } from 'react';
import { Plus, X, Save } from 'lucide-react';

interface ManualItemFormProps {
    initialData?: {
        id?: string;
        partNumber: string;
        description: string;
        unitPrice: number;
        labourHours: number;
        quantity: number;
    };
    onSave: (data: {
        partNumber: string;
        description: string;
        unitPrice: number;
        labourHours: number;
        quantity: number;
    }) => Promise<void>;
    onCancel: () => void;
    isEditing?: boolean;
}

export default function ManualItemForm({ initialData, onSave, onCancel, isEditing = false }: ManualItemFormProps) {
    const [partNumber, setPartNumber] = useState(initialData?.partNumber || '');
    const [description, setDescription] = useState(initialData?.description || '');
    const [unitPrice, setUnitPrice] = useState<string>(initialData?.unitPrice?.toString() || '0');
    const [labourHours, setLabourHours] = useState<string>(initialData?.labourHours?.toString() || '0');
    const [quantity, setQuantity] = useState<string>(initialData?.quantity?.toString() || '1');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!description.trim()) {
            alert('Description is required.');
            return;
        }

        setLoading(true);
        try {
            await onSave({
                partNumber,
                description,
                unitPrice: parseFloat(unitPrice) || 0,
                labourHours: parseFloat(labourHours) || 0,
                quantity: parseFloat(quantity) || 1,
            });

            // If it's a new item creation, reset the form. Otherwise, wait for unmount.
            if (!isEditing) {
                setPartNumber('');
                setDescription('');
                setUnitPrice('0');
                setLabourHours('0');
                setQuantity('1');
            }
        } catch (error) {
            console.error('Failed to save manual item', error);
            alert('Failed to save item.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="bg-white border text-sm border-blue-200 rounded-lg p-4 shadow-sm mb-4">
            <h4 className="font-semibold text-gray-800 mb-3">{isEditing ? 'Edit Manual Item' : 'Add Manual Item'}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-3">
                <div className="lg:col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Description *</label>
                    <input
                        type="text"
                        required
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="e.g. Supplier discount, External enclosure"
                        className="w-full border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
                <div className="lg:col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Part Number (Optional)</label>
                    <input
                        type="text"
                        value={partNumber}
                        onChange={(e) => setPartNumber(e.target.value)}
                        placeholder="e.g. DISCOUNT-01"
                        className="w-full border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Unit Price ($)</label>
                    <input
                        type="number"
                        step="0.01"
                        value={unitPrice}
                        onChange={(e) => setUnitPrice(e.target.value)}
                        className="w-full border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Labour Hours</label>
                    <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={labourHours}
                        onChange={(e) => setLabourHours(e.target.value)}
                        className="w-full border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Quantity</label>
                    <input
                        type="number"
                        step="0.1"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        className="w-full border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>

                <div className="flex items-end gap-2">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={loading}
                        className="flex-1 py-2 px-3 bg-gray-100 text-gray-600 font-medium rounded hover:bg-gray-200 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 py-2 px-3 bg-blue-600 text-white font-medium rounded hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                    >
                        {loading ? 'Saving...' : isEditing ? <><Save size={16} /> Save</> : <><Plus size={16} /> Add</>}
                    </button>
                </div>
            </div>
            {!isEditing && (
                <p className="text-xs text-blue-600 flex items-center gap-1 bg-blue-50 px-2 py-1.5 rounded inline-block">
                    Negative values can be used for discounts or deductions.
                </p>
            )}
        </form>
    );
}
