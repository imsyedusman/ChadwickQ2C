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
        type?: 'Item' | 'Price Adjustment';
    };
    onSave: (data: {
        partNumber: string;
        description: string;
        unitPrice: number;
        labourHours: number;
        quantity: number;
        type: 'Item' | 'Price Adjustment';
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
    const [itemType, setItemType] = useState<'Item' | 'Price Adjustment'>(initialData?.type || 'Item');
    const [loading, setLoading] = useState(false);

    const handleTypeChange = (newType: 'Item' | 'Price Adjustment') => {
        setItemType(newType);
        if (newType === 'Price Adjustment') {
            setLabourHours('0');
            setQuantity('1');
        }
    };

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
                type: itemType,
            });

            // If it's a new item creation, reset the form. Otherwise, wait for unmount.
            if (!isEditing) {
                setPartNumber('');
                setDescription('');
                setUnitPrice('0');
                setLabourHours('0');
                setQuantity('1');
                setItemType('Item');
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
            "bg-white transition-all flex flex-col gap-3",
            isEditing ? "p-4 border-y border-blue-50 shadow-none bg-blue-50/10" : "rounded-lg p-4 mb-4 border border-blue-200 shadow-sm"
        )}>
            {/* Item Type Toggle & Helper */}
            <div className="flex flex-col gap-2">
                <div className="flex bg-gray-100 p-1 rounded-lg w-fit">
                    <button
                        type="button"
                        onClick={() => handleTypeChange('Item')}
                        className={cn("px-4 py-1.5 text-xs font-medium rounded-md transition-all duration-200", itemType === 'Item' ? 'bg-white shadow-sm text-gray-900 border border-gray-200/50' : 'text-gray-500 hover:text-gray-700')}
                    >
                        Item
                    </button>
                    <button
                        type="button"
                        onClick={() => handleTypeChange('Price Adjustment')}
                        className={cn("px-4 py-1.5 text-xs font-medium rounded-md transition-all duration-200", itemType === 'Price Adjustment' ? 'bg-white shadow-sm text-gray-900 border border-gray-200/50' : 'text-gray-500 hover:text-gray-700')}
                    >
                        Price Adjustment
                    </button>
                </div>
                <div className="text-[11px] text-gray-500 mb-2">
                    {itemType === 'Item' ? (
                        <span><strong className="font-medium text-gray-700">Item:</strong> Use for real components, external purchases, or additional labour. These go through normal pricing calculations.</span>
                    ) : (
                        <span><strong className="font-medium text-gray-700">Price Adjustment:</strong> Use for discounts or manual price changes. These directly increase or decrease the final quote price.</span>
                    )}
                </div>
            </div>

            {/* Headers for larger screens */}
            <div className="hidden md:flex items-center gap-3 px-1">
                <div className="flex-1 min-w-[200px] text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Description <span className="text-blue-500">*</span></div>
                <div className="w-32 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Part No.</div>
                <div className="w-28 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Unit Price</div>
                {itemType === 'Item' && <div className="w-24 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Labour</div>}
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
                        value={description ?? ""}
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
                        value={partNumber ?? ""}
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
                        value={unitPrice ?? ""}
                        onChange={(e) => setUnitPrice(e.target.value)}
                        placeholder="0.00"
                        className="w-full pl-7 pr-3 text-sm bg-gray-50 border border-gray-200 rounded-md focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 py-1.5 transition-colors"
                    />
                </div>

                {/* Labour Hours */}
                {itemType === 'Item' && (
                    <div className="w-full md:w-24 shrink-0 relative">
                        <label className="sr-only">Labour Hours</label>
                        <input
                            type="number"
                            step="0.1"
                            min="0"
                            value={labourHours ?? ""}
                            onChange={(e) => setLabourHours(e.target.value)}
                            placeholder="0.0"
                            className="w-full pr-8 pl-3 text-sm bg-gray-50 border border-gray-200 rounded-md focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 py-1.5 transition-colors"
                        />
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                            <span className="text-gray-400 text-xs font-medium">h</span>
                        </div>
                    </div>
                )}

                {/* Quantity */}
                <div className="w-full md:w-20 shrink-0 relative">
                    <label className="sr-only">Quantity</label>
                    <input
                        type="number"
                        step="0.1"
                        value={quantity ?? ""}
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
