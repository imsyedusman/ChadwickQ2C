'use client';

import { useState } from 'react';
import { Plus, X, Save } from 'lucide-react';
import { cn } from '@/lib/utils';

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
        <form onSubmit={handleSubmit} className={cn(
            "bg-white border-blue-200 shadow-sm transition-all",
            isEditing ? "rounded p-2" : "rounded-lg p-3 mb-4 border"
        )}>
            {/* Headers for larger screens */}
            <div className="hidden md:flex items-center gap-3 mb-1 px-1">
                <div className="flex-1 min-w-[200px] text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Description <span className="text-blue-500">*</span></div>
                <div className="w-32 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Part No.</div>
                <div className="w-28 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Unit Price</div>
                <div className="w-24 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Labour</div>
                <div className="w-20 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Qty</div>
                <div className="w-24 border-none"></div>
            </div>

            {/* Row Layout */}
            <div className="flex flex-col md:flex-row items-start md:items-center gap-3 w-full">

                {/* Description (Largest) */}
                <div className="flex-1 min-w-[200px] w-full">
                    <label className="sr-only">Description</label>
                    <input
                        type="text"
                        required
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="e.g. Supplier discount, External enclosure..."
                        className="w-full text-sm bg-gray-50 border border-gray-200 rounded-md focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 placeholder:text-gray-400 py-1.5 px-3 transition-colors"
                    />
                </div>

                {/* Part Number */}
                <div className="w-full md:w-32 shrink-0">
                    <label className="sr-only">Part Number</label>
                    <input
                        type="text"
                        value={partNumber}
                        onChange={(e) => setPartNumber(e.target.value)}
                        placeholder="Optional"
                        className="w-full text-sm bg-gray-50 border border-gray-200 rounded-md focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 placeholder:text-gray-400 py-1.5 px-3 transition-colors"
                    />
                </div>

                {/* Unit Price */}
                <div className="w-full md:w-28 shrink-0 relative">
                    <label className="sr-only">Unit Price</label>
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-500 text-sm font-medium">$</span>
                    </div>
                    <input
                        type="number"
                        step="0.01"
                        value={unitPrice}
                        onChange={(e) => setUnitPrice(e.target.value)}
                        placeholder="0.00"
                        className="w-full pl-7 pr-3 text-sm bg-gray-50 border border-gray-200 rounded-md focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 py-1.5 transition-colors"
                    />
                </div>

                {/* Labour Hours */}
                <div className="w-full md:w-24 shrink-0 relative">
                    <label className="sr-only">Labour Hours</label>
                    <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={labourHours}
                        onChange={(e) => setLabourHours(e.target.value)}
                        placeholder="0.0"
                        className="w-full pr-8 pl-3 text-sm bg-gray-50 border border-gray-200 rounded-md focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 py-1.5 transition-colors"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <span className="text-gray-400 text-xs font-medium">h</span>
                    </div>
                </div>

                {/* Quantity */}
                <div className="w-full md:w-20 shrink-0 relative">
                    <label className="sr-only">Quantity</label>
                    <input
                        type="number"
                        step="0.1"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        placeholder="1"
                        className="w-full pr-8 pl-3 text-sm bg-gray-50 border border-gray-200 rounded-md focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 py-1.5 transition-colors"
                    />
                    <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none">
                        <span className="text-gray-400 text-[10px] font-medium">ea</span>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0 md:ml-auto w-full md:w-auto mt-2 md:mt-0 justify-end md:w-24">
                    {isEditing ? (
                        <>
                            <button
                                type="button"
                                onClick={onCancel}
                                disabled={loading}
                                className="p-1.5 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100 transition-colors"
                                title="Cancel"
                            >
                                <X size={16} />
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-3 py-1.5 bg-blue-600 text-white font-medium text-xs rounded hover:bg-blue-700 transition-colors flex items-center gap-1.5 shadow-sm"
                            >
                                {loading ? 'Saving...' : <><Save size={14} /> Save</>}
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                type="button"
                                onClick={onCancel}
                                disabled={loading}
                                className="p-1.5 text-gray-400 hover:bg-gray-100 rounded transition-colors"
                                title="Cancel"
                            >
                                <X size={16} />
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-3 py-1.5 bg-blue-600 text-white font-medium text-sm rounded hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-1.5"
                            >
                                {loading ? '...' : <><Plus size={16} /> Add</>}
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Helper Text */}
            {!isEditing && (
                <div className="flex items-center mt-3 px-1">
                    <p className="text-[11px] text-gray-400">
                        * Use negative unit prices to apply <span className="text-gray-500">discounts</span> or <span className="text-gray-500">deductions</span>.
                    </p>
                </div>
            )}
        </form>
    );
}
