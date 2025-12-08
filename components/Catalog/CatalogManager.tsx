'use client';

import { useState, useEffect } from 'react';
import { Upload, FileSpreadsheet, Check, AlertCircle, Loader2, Search, Trash2, Filter, Database, RefreshCw } from 'lucide-react';
import * as XLSX from 'xlsx';
import { cn } from '@/lib/utils';
import { classifyCatalogItem } from '@/lib/catalog-service';

interface CatalogItem {
    id?: string;
    brand: string;
    category: string;
    subcategory: string;
    partNumber: string;
    description: string;
    unitPrice: number;
    labourHours: number;
    meterType?: string | null;
}

export default function CatalogManager() {
    // Upload State
    const [previewItems, setPreviewItems] = useState<CatalogItem[]>([]);
    const [uploading, setUploading] = useState(false);
    const [uploadSuccess, setUploadSuccess] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [manualBrand, setManualBrand] = useState('');

    // Saved Catalog State
    const [savedItems, setSavedItems] = useState<CatalogItem[]>([]);
    const [brandStats, setBrandStats] = useState<{ brand: string; originalBrand: string | null; count: number }[]>([]);
    const [loadingSaved, setLoadingSaved] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [deletingBrand, setDeletingBrand] = useState<string | null>(null);
    const [reclassifying, setReclassifying] = useState(false);

    useEffect(() => {
        fetchCatalog();
        fetchBrandStats();
    }, []);

    const fetchBrandStats = async () => {
        try {
            const res = await fetch('/api/catalog?mode=stats');
            if (res.ok) {
                const data = await res.json();
                setBrandStats(data);
            }
        } catch (error) {
            console.error('Failed to fetch brand stats', error);
        }
    };

    const fetchCatalog = async () => {
        setLoadingSaved(true);
        try {
            const res = await fetch(`/api/catalog?search=${encodeURIComponent(searchQuery)}`);
            if (res.ok) {
                const data = await res.json();
                setSavedItems(data);
            }
        } catch (error) {
            console.error('Failed to fetch catalog', error);
        } finally {
            setLoadingSaved(false);
        }
    };

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchCatalog();
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    /**
     * Maps legacy category paths to unified structure.
     * Ensures future Excel imports maintain the unified category organization.
     */
    const mapLegacyCategory = (subcategory: string): string => {
        const categoryMap: Record<string, string> = {
            // Power Meters unification
            'Miscellaneous > Metering > Power Meter': 'Power Meters',
            'Miscellaneous > Metering > Power Meter Accessories': 'Power Meter Accessories',

            // Add more mappings here as needed in the future
            // 'Old Path > Structure': 'New Simplified Path',
        };

        return categoryMap[subcategory] || subcategory;
    };

    const findColumnValue = (row: any, possibleHeaders: string[]): string | undefined => {
        // Helper to normalize a string: remove non-alphanumeric, lowercase
        const normalize = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '');

        // Normalize keys in row once
        const normalizedRow: Record<string, any> = {};
        Object.keys(row).forEach(key => {
            normalizedRow[normalize(key)] = row[key];
        });

        for (const header of possibleHeaders) {
            // 1. Check exact match
            if (row[header] !== undefined) return row[header];

            // 2. Check normalized match
            const normalizedHeader = normalize(header);
            if (normalizedRow[normalizedHeader] !== undefined) return normalizedRow[normalizedHeader];
        }
        return undefined;
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws) as any[];

                // Map and validate data
                const mappedItems: CatalogItem[] = data.map((row) => {
                    // Specific mapping for the user's Schneider file
                    const partNo = findColumnValue(row, [
                        'Schneider\nElectric\nMaterial\nReference',
                        'Material Reference',
                        'Part Number',
                        'Part No',
                        'Reference'
                    ]);

                    const desc = findColumnValue(row, [
                        'Description',
                        'Product Description'
                    ]);

                    const priceRaw = findColumnValue(row, [
                        'Price Break 1 - CUSTOMER Cost (excl GST)',
                        'Price Break 1',
                        'Unit Price',
                        'Price',
                        'Cost'
                    ]);

                    const labourRaw = findColumnValue(row, [
                        'HOURS',
                        'Labour',
                        'Labour Hours'
                    ]);

                    // Vendor Category (Metadata) - Maps to subcategory for filtering
                    const vendorCat1 = findColumnValue(row, ['CATEGORY 1', 'Category', 'Cat']);
                    const vendorCat2 = findColumnValue(row, ['CATEGORY 2', 'Subcategory', 'Sub']);
                    const vendorCat3 = findColumnValue(row, ['CATEGORY 3', 'Detail', 'Type']);

                    // Use centralized classification service
                    const classification = classifyCatalogItem(
                        desc ? String(desc) : '',
                        partNo ? String(partNo) : '',
                        vendorCat1 ? String(vendorCat1) : '',
                        vendorCat2 ? String(vendorCat2) : '',
                        vendorCat3 ? String(vendorCat3) : '',
                        manualBrand
                    );

                    return {
                        brand: classification.brand,
                        category: classification.category,
                        subcategory: classification.subcategory,
                        partNumber: partNo ? String(partNo) : '',
                        description: desc ? String(desc) : '',
                        unitPrice: priceRaw ? parseFloat(String(priceRaw).replace(/[$,]/g, '')) : 0,
                        labourHours: labourRaw ? parseFloat(String(labourRaw)) : 0,
                        meterType: classification.meterType
                    };
                }).filter(item => item.description && item.partNumber); // Filter out empty rows

                if (mappedItems.length === 0) {
                    setUploadError('No valid items found. Please check your column headers. We look for: Material Reference, Description, Price Break 1, HOURS.');
                } else {
                    setPreviewItems(mappedItems);
                    setUploadError(null);
                    setUploadSuccess(false);
                }
            } catch (err) {
                setUploadError('Failed to parse Excel file. Please ensure it has the correct columns.');
                console.error(err);
            }
        };
        reader.readAsBinaryString(file);
    };

    const handleImport = async () => {
        if (previewItems.length === 0) return;
        setUploading(true);
        setUploadError(null);
        setUploadSuccess(false);
        setUploadProgress(0);

        const CHUNK_SIZE = 500;
        const totalChunks = Math.ceil(previewItems.length / CHUNK_SIZE);

        try {
            for (let i = 0; i < totalChunks; i++) {
                const chunk = previewItems.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);

                const res = await fetch('/api/catalog', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ items: chunk }),
                });

                if (!res.ok) {
                    const errorData = await res.json();
                    throw new Error(errorData.details || errorData.error || 'Failed to upload chunk');
                }

                // Update progress
                const progress = Math.round(((i + 1) / totalChunks) * 100);
                setUploadProgress(progress);
            }

            setUploadSuccess(true);
            setPreviewItems([]); // Clear preview
            setManualBrand('');
            fetchCatalog(); // Refresh saved list
            fetchBrandStats(); // Refresh stats
        } catch (err: any) {
            console.error('Upload failed:', err);
            setUploadError(`Upload failed: ${err.message}`);
        } finally {
            setUploading(false);
            setUploadProgress(0);
        }
    };

    const handleDeleteBrand = async (brandDisplay: string, originalBrand: string | null) => {
        if (!confirm(`Are you sure you want to delete all items for "${brandDisplay}"? This cannot be undone.`)) return;

        setDeletingBrand(brandDisplay);
        try {
            // If originalBrand is null, we pass 'null' string or handle it in API
            const param = originalBrand === null ? 'null' : originalBrand;
            const res = await fetch(`/api/catalog?brand=${encodeURIComponent(param)}`, {
                method: 'DELETE',
            });

            if (res.ok) {
                fetchCatalog();
                fetchBrandStats();
            } else {
                alert('Failed to delete brand');
            }
        } catch (error) {
            console.error('Failed to delete brand', error);
        } finally {
            setDeletingBrand(null);
        }
    };

    const handleDownloadExcel = async (brand: string) => {
        try {
            const res = await fetch(`/api/catalog?export=true&brand=${encodeURIComponent(brand)}`);
            if (!res.ok) throw new Error('Failed to download excel');

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `catalog_export_${brand.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error('Download failed', error);
            alert('Failed to download excel');
        }
    };

    const handleReclassify = async () => {
        setReclassifying(true);
        try {
            const res = await fetch('/api/catalog?action=reclassify', { method: 'PATCH' });
            if (res.ok) {
                const data = await res.json();
                alert(data.message);
                fetchCatalog(); // Refresh to see changes if any
            } else {
                throw new Error('Failed to re-classify');
            }
        } catch (error) {
            console.error(error);
            alert('Failed to re-classify catalog');
        } finally {
            setReclassifying(false);
        }
    };

    return (
        <div className="space-y-8">
            {/* Manage Pricelists Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <Database className="text-blue-600" size={20} />
                        Manage Pricelists
                    </h2>
                    <button
                        onClick={handleReclassify}
                        disabled={reclassifying}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors mr-2"
                        title="Re-classify Metadata (Fixes Missing Tags)"
                    >
                        {reclassifying ? <Loader2 className="animate-spin" size={16} /> : <Database size={16} />}
                    </button>
                    <button
                        onClick={fetchBrandStats}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                        title="Refresh List"
                    >
                        <RefreshCw size={16} />
                    </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {brandStats.length === 0 ? (
                        <div className="col-span-full text-sm text-gray-500 italic">No pricelists found.</div>
                    ) : (
                        brandStats.map(stat => (
                            <div key={stat.brand} className="flex flex-col justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors">
                                <div className="mb-3">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="font-semibold text-gray-900 truncate" title={stat.brand}>{stat.brand}</span>
                                    </div>
                                    <div className="text-xs text-gray-500 flex flex-col gap-1">
                                        <span className="flex items-center gap-1">
                                            <Database size={12} /> {stat.count} items
                                        </span>
                                    </div>
                                </div>

                                <button
                                    onClick={() => handleDeleteBrand(stat.brand, stat.originalBrand)}
                                    disabled={deletingBrand === stat.brand}
                                    className="w-full py-2 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors flex items-center justify-center gap-2"
                                    title="Delete all items from this brand"
                                >
                                    {deletingBrand === stat.brand ? <Loader2 className="animate-spin" size={14} /> : <Trash2 size={14} />}
                                    Delete Pricelist
                                </button>
                                <button
                                    onClick={() => handleDownloadExcel(stat.brand)}
                                    className="w-full py-2 text-xs font-medium text-green-600 bg-green-50 hover:bg-green-100 rounded-md transition-colors flex items-center justify-center gap-2 mt-2"
                                    title="Download Excel"
                                >
                                    <FileSpreadsheet size={14} />
                                    Download Excel
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Upload Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Upload className="text-blue-600" size={20} />
                    Import Catalog
                </h2>

                <div className="space-y-6">
                    {/* Brand Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Brand / Supplier Name
                        </label>
                        <input
                            type="text"
                            placeholder="e.g. Schneider Electric (Optional - overrides file)"
                            value={manualBrand}
                            onChange={(e) => setManualBrand(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Enter a brand name here to apply it to all uploaded items if missing in the file.
                        </p>
                    </div>

                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:bg-gray-50 transition-colors">
                        <input
                            type="file"
                            accept=".xlsx, .xls"
                            onChange={handleFileUpload}
                            className="hidden"
                            id="catalog-upload"
                        />
                        <label htmlFor="catalog-upload" className="cursor-pointer flex flex-col items-center gap-2">
                            <FileSpreadsheet className="text-green-600" size={32} />
                            <span className="text-sm font-medium text-gray-700">Click to upload Excel Catalog</span>
                            <span className="text-xs text-gray-500">
                                Supports: Material Reference, Description, Price Break 1, CATEGORY 1, HOURS
                            </span>
                        </label>
                    </div>

                    {/* Status Messages */}
                    {uploadError && (
                        <div className="p-3 bg-red-50 text-red-700 rounded-lg flex items-center gap-2 text-sm">
                            <AlertCircle size={16} /> {uploadError}
                        </div>
                    )}
                    {uploadSuccess && (
                        <div className="p-3 bg-green-50 text-green-700 rounded-lg flex items-center gap-2 text-sm">
                            <Check size={16} /> Catalog imported successfully!
                        </div>
                    )}

                    {/* Preview Table */}
                    {previewItems.length > 0 && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">Previewing {previewItems.length} items</span>
                                <div className="flex items-center gap-4">
                                    <button
                                        onClick={handleImport}
                                        disabled={uploading}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                                    >
                                        {uploading ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
                                        {uploading ? 'Importing...' : 'Import Items'}
                                    </button>
                                </div>
                            </div>

                            {uploading && (
                                <div className="w-full bg-gray-200 rounded-full h-2.5">
                                    <div
                                        className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                                        style={{ width: `${uploadProgress}%` }}
                                    ></div>
                                    <p className="text-xs text-gray-500 mt-1 text-center">{uploadProgress}% Complete</p>
                                </div>
                            )}

                            <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-50 sticky top-0">
                                        <tr>
                                            <th className="px-4 py-2">Brand</th>
                                            <th className="px-4 py-2">Part No</th>
                                            <th className="px-4 py-2">Description</th>
                                            <th className="px-4 py-2">Price</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {previewItems.slice(0, 50).map((item, idx) => (
                                            <tr key={idx}>
                                                <td className="px-4 py-2 font-medium text-gray-900">{item.brand}</td>
                                                <td className="px-4 py-2 font-mono text-xs text-gray-500">{item.partNumber}</td>
                                                <td className="px-4 py-2">{item.description}</td>
                                                <td className="px-4 py-2">${item.unitPrice.toFixed(2)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Saved Catalog Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <FileSpreadsheet className="text-green-600" size={20} />
                        Saved Catalog Items
                    </h2>

                    <div className="relative w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input
                            type="text"
                            placeholder="Search catalog..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>

                <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-4 py-3 font-medium text-gray-700">Brand</th>
                                <th className="px-4 py-3 font-medium text-gray-700">Part No</th>
                                <th className="px-4 py-3 font-medium text-gray-700">Description</th>
                                <th className="px-4 py-3 font-medium text-gray-700">Category</th>
                                <th className="px-4 py-3 font-medium text-gray-700 text-right">Price</th>
                                <th className="px-4 py-3 font-medium text-gray-700 text-right">Labour</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                            {loadingSaved ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                                        <Loader2 className="animate-spin mx-auto mb-2" size={24} />
                                        Loading catalog...
                                    </td>
                                </tr>
                            ) : savedItems.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                                        No items found. Upload a catalog to get started.
                                    </td>
                                </tr>
                            ) : (
                                savedItems.map((item) => (
                                    <tr key={item.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 font-medium text-blue-600">{item.brand}</td>
                                        <td className="px-4 py-3 font-mono text-xs text-gray-500">{item.partNumber}</td>
                                        <td className="px-4 py-3 text-gray-900">{item.description}</td>
                                        <td className="px-4 py-3 text-gray-500">{item.category}</td>
                                        <td className="px-4 py-3 text-right font-medium">${item.unitPrice.toFixed(2)}</td>
                                        <td className="px-4 py-3 text-right text-gray-500">{item.labourHours}h</td>
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
