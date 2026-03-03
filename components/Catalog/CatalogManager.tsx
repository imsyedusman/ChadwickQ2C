'use client';

import { useState, useEffect } from 'react';
import { Upload, FileSpreadsheet, Check, AlertCircle, Loader2, Search, Trash2, Filter, Database, RefreshCw, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
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

interface ComparisonSummary {
    updatedItems: any[];
    newItems: any[];
    missingItems: any[];
    unchangedCount: number;
    highImpactChanges: any[];
    totalUploaded: number;
}

export default function CatalogManager() {
    // Upload State
    const [previewItems, setPreviewItems] = useState<CatalogItem[]>([]);
    const [uploading, setUploading] = useState(false);
    const [uploadSuccess, setUploadSuccess] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [manualBrand, setManualBrand] = useState('');

    const [fileMetadata, setFileMetadata] = useState<{ name: string, size: string, rows: number, brand: string } | null>(null);
    const [analysisStatus, setAnalysisStatus] = useState<string>('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [comparisonSummary, setComparisonSummary] = useState<ComparisonSummary | null>(null);
    const [expandedSections, setExpandedSections] = useState({
        highImpact: false,
        priceChanges: false,
        newItems: false,
        missingItems: false
    });

    const toggleSection = (section: keyof typeof expandedSections) => {
        setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

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

    const handleAnalyze = async (itemsToAnalyze: CatalogItem[]) => {
        if (itemsToAnalyze.length === 0) return;
        setIsAnalyzing(true);
        setAnalysisStatus('Comparing with existing catalog...');
        setUploadError(null);
        setUploadSuccess(false);

        try {
            const res = await fetch('/api/catalog/compare', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ items: itemsToAnalyze }),
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || 'Failed to analyze upload');
            }

            const data = await res.json();
            setComparisonSummary(data.summary);
            setExpandedSections({
                highImpact: data.summary.highImpactChanges.length > 0, // Auto-expand if critical
                priceChanges: false,
                newItems: false,
                missingItems: false
            });
        } catch (err: any) {
            console.error('Analysis failed:', err);
            setUploadError(`Analysis failed: ${err.message}`);
        } finally {
            setIsAnalyzing(false);
            setAnalysisStatus('');
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsAnalyzing(true);
        setAnalysisStatus('Parsing file...');
        setFileMetadata(null);
        setComparisonSummary(null);
        setPreviewItems([]);
        setUploadError(null);
        setUploadSuccess(false);

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
                }); // Dont filter yet to check mapping length

                const validItems = mappedItems.filter(item => item.description && item.partNumber);

                if (validItems.length === 0) {
                    throw new Error('No valid items found. Please check your column headers. We look for: Material Reference, Description, Price Break 1, HOURS.');
                }

                // Schneider strict validation
                const brands = new Set(validItems.map(i => i.brand).filter(b => b.trim() !== ''));
                if (brands.size > 1 || (brands.size === 1 && !brands.has('Schneider Electric'))) {
                    throw new Error('This feature currently only supports Schneider Electric uploads. Please upload a Schneider Electric catalog.');
                }

                setFileMetadata({
                    name: file.name,
                    size: (file.size / 1024).toFixed(1) + ' KB',
                    brand: 'Schneider Electric',
                    rows: validItems.length
                });

                setPreviewItems(validItems);
                setAnalysisStatus('Validating structure...');

                // Small delay to let React render the Validating status before heavy fetch blocking
                setTimeout(() => {
                    handleAnalyze(validItems);
                }, 50);

            } catch (err: any) {
                setUploadError(err.message || 'Failed to parse Excel file. Please ensure it has the correct columns.');
                console.error(err);
                setIsAnalyzing(false);
                setAnalysisStatus('');
            }

            // Clear input so same file can be selected again
            const inputElement = document.getElementById('catalog-upload') as HTMLInputElement;
            if (inputElement) inputElement.value = '';
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
            setComparisonSummary(null);
            setFileMetadata(null);
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

                    <div className={cn("border-2 border-dashed rounded-lg p-8 text-center transition-colors", isAnalyzing ? "border-blue-300 bg-blue-50 cursor-not-allowed" : "border-gray-300 hover:bg-gray-50")}>
                        <input
                            type="file"
                            accept=".xlsx, .xls"
                            onChange={handleFileUpload}
                            className="hidden"
                            id="catalog-upload"
                            disabled={isAnalyzing}
                        />
                        <label htmlFor="catalog-upload" className={cn("flex flex-col items-center gap-2", isAnalyzing ? "cursor-not-allowed opacity-70" : "cursor-pointer")}>
                            <FileSpreadsheet className={isAnalyzing ? "text-blue-500" : "text-green-600"} size={32} />
                            <span className="text-sm font-medium text-gray-700">{isAnalyzing ? 'Processing upload...' : 'Click to upload Excel Catalog'}</span>
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

                    {/* File Metadata & Analysis Status */}
                    {fileMetadata && !comparisonSummary && !uploadSuccess && (
                        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-3 animate-in fade-in">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                    <div className="text-gray-500 mb-1">File Name</div>
                                    <div className="font-medium text-gray-900 truncate" title={fileMetadata.name}>{fileMetadata.name}</div>
                                </div>
                                <div>
                                    <div className="text-gray-500 mb-1">Size</div>
                                    <div className="font-medium text-gray-900">{fileMetadata.size}</div>
                                </div>
                                <div>
                                    <div className="text-gray-500 mb-1">Detected Brand</div>
                                    <div className="font-medium text-blue-600 truncate">{fileMetadata.brand}</div>
                                </div>
                                <div>
                                    <div className="text-gray-500 mb-1">Parsed Rows</div>
                                    <div className="font-medium text-gray-900">{fileMetadata.rows}</div>
                                </div>
                            </div>

                            {isAnalyzing && analysisStatus && (
                                <div className="flex items-center gap-3 pt-3 border-t border-gray-200 text-blue-700">
                                    <Loader2 className="animate-spin" size={18} />
                                    <span className="font-medium text-sm">{analysisStatus}</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Summary UI View */}
                    {comparisonSummary && !uploadSuccess && (
                        <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
                            {/* Top Level Summary Card */}
                            <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload Summary</h3>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                                    <div className="p-4 bg-white rounded-lg border border-gray-200 text-center">
                                        <div className="text-2xl font-bold text-gray-700">{comparisonSummary.unchangedCount}</div>
                                        <div className="text-sm text-gray-500 font-medium">Unchanged</div>
                                    </div>
                                    <div className="p-4 bg-white rounded-lg border border-blue-200 text-center">
                                        <div className="text-2xl font-bold text-blue-700">{comparisonSummary.updatedItems.length}</div>
                                        <div className="text-sm text-blue-600 font-medium">Price Changes</div>
                                    </div>
                                    <div className="p-4 bg-white rounded-lg border border-green-200 text-center">
                                        <div className="text-2xl font-bold text-green-700">{comparisonSummary.newItems.length}</div>
                                        <div className="text-sm text-green-600 font-medium">New Items</div>
                                    </div>
                                    <div className="p-4 bg-white rounded-lg border border-gray-200 text-center" title="These items currently exist in DB but were not in the upload file. They will not be modified or deleted.">
                                        <div className="text-2xl font-bold text-gray-600">{comparisonSummary.missingItems.length}</div>
                                        <div className="text-sm text-gray-500 font-medium">Not in Upload</div>
                                    </div>
                                    <div className={cn("p-4 bg-white rounded-lg border text-center", comparisonSummary.highImpactChanges.length > 0 ? "border-red-300" : "border-gray-200")}>
                                        <div className={cn("text-2xl font-bold", comparisonSummary.highImpactChanges.length > 0 ? "text-red-600" : "text-gray-400")}>{comparisonSummary.highImpactChanges.length}</div>
                                        <div className={cn("text-sm font-medium", comparisonSummary.highImpactChanges.length > 0 ? "text-red-600" : "text-gray-500")}>High-Impact</div>
                                    </div>
                                </div>
                            </div>

                            {/* Detailed Sections */}
                            <div className="space-y-4">
                                {/* High Impact Section */}
                                {comparisonSummary.highImpactChanges.length > 0 && (
                                    <div className="border border-red-200 rounded-lg overflow-hidden">
                                        <button
                                            onClick={() => toggleSection('highImpact')}
                                            className="w-full px-4 py-3 bg-red-50 hover:bg-red-100 flex items-center justify-between transition-colors"
                                        >
                                            <div className="flex items-center gap-2 text-red-800 font-medium">
                                                <AlertTriangle size={18} />
                                                Important: High-Impact Price Changes ({comparisonSummary.highImpactChanges.length})
                                            </div>
                                            {expandedSections.highImpact ? <ChevronUp size={18} className="text-red-500" /> : <ChevronDown size={18} className="text-red-500" />}
                                        </button>

                                        {expandedSections.highImpact && (
                                            <div className="p-4 bg-white border-t border-red-100 max-h-80 overflow-y-auto">
                                                <table className="w-full text-sm text-left">
                                                    <thead className="text-xs text-gray-500 uppercase sticky top-0 bg-white">
                                                        <tr>
                                                            <th className="px-4 py-2">Part Number</th>
                                                            <th className="px-4 py-2">Description</th>
                                                            <th className="px-4 py-2 text-right">Old Price</th>
                                                            <th className="px-4 py-2 text-right">New Price</th>
                                                            <th className="px-4 py-2 text-right">% Change</th>
                                                            <th className="px-4 py-2">Explanation</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-red-100">
                                                        {comparisonSummary.highImpactChanges.map((item, i) => (
                                                            <tr key={i} className="hover:bg-red-50/50">
                                                                <td className="px-4 py-2 font-mono text-xs text-gray-800">{item.partNumber}</td>
                                                                <td className="px-4 py-2 text-gray-800">{item.description}</td>
                                                                <td className="px-4 py-2 text-right text-gray-500 font-mono">${item.oldPrice.toFixed(2)}</td>
                                                                <td className="px-4 py-2 text-right font-medium font-mono">${item.newPrice.toFixed(2)}</td>
                                                                <td className="px-4 py-2 text-right">
                                                                    <span className={cn(
                                                                        "inline-flex items-center justify-end font-medium w-full",
                                                                        item.percentChange > 25 ? "text-red-700 bg-red-100 px-2 rounded font-bold" :
                                                                            item.percentChange > 10 ? "text-amber-700 bg-amber-100 px-2 rounded" :
                                                                                "text-gray-600"
                                                                    )}>
                                                                        {item.isIncrease ? '▲' : '▼'} {item.percentChange.toFixed(1)}%
                                                                    </span>
                                                                </td>
                                                                <td className="px-4 py-2 text-xs text-red-700 font-medium">{item.impactReason}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Price Changes Section */}
                                <div className="border border-gray-200 rounded-lg overflow-hidden">
                                    <button
                                        onClick={() => toggleSection('priceChanges')}
                                        className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 flex items-center justify-between transition-colors"
                                    >
                                        <div className="font-medium text-gray-800">
                                            Price Changes ({comparisonSummary.updatedItems.length})
                                        </div>
                                        {expandedSections.priceChanges ? <ChevronUp size={18} className="text-gray-500" /> : <ChevronDown size={18} className="text-gray-500" />}
                                    </button>

                                    {expandedSections.priceChanges && (
                                        <div className="p-4 bg-white border-t border-gray-200 max-h-80 overflow-y-auto">
                                            {comparisonSummary.updatedItems.length === 0 ? (
                                                <div className="text-gray-500 text-sm text-center py-4">No price changes detected.</div>
                                            ) : (
                                                <table className="w-full text-sm text-left">
                                                    <thead className="text-xs text-gray-500 uppercase sticky top-0 bg-white shadow-sm">
                                                        <tr>
                                                            <th className="px-4 py-2">Part Number</th>
                                                            <th className="px-4 py-2">Description</th>
                                                            <th className="px-4 py-2 text-right">Old Price</th>
                                                            <th className="px-4 py-2 text-right">New Price</th>
                                                            <th className="px-4 py-2 text-right">% Change</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-100">
                                                        {comparisonSummary.updatedItems.map((item, i) => (
                                                            <tr key={i} className="hover:bg-gray-50 cursor-pointer">
                                                                <td className="px-4 py-2 font-mono text-xs">{item.partNumber}</td>
                                                                <td className="px-4 py-2 text-gray-700">{item.description}</td>
                                                                <td className="px-4 py-2 text-right text-gray-500 font-mono">${item.oldPrice.toFixed(2)}</td>
                                                                <td className="px-4 py-2 text-right font-medium font-mono">${item.newPrice.toFixed(2)}</td>
                                                                <td className="px-4 py-2 text-right">
                                                                    <span className={cn(
                                                                        "inline-flex justify-end items-center gap-1 font-medium w-full",
                                                                        item.percentChange > 25 ? "text-red-700 bg-red-100 px-2 rounded font-bold" :
                                                                            item.percentChange > 10 ? "text-amber-700 bg-amber-50 px-2 rounded" :
                                                                                "text-gray-600"
                                                                    )}>
                                                                        {item.isIncrease ? '▲' : '▼'} {item.percentChange.toFixed(1)}%
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* New Items Section */}
                                <div className="border border-gray-200 rounded-lg overflow-hidden">
                                    <button
                                        onClick={() => toggleSection('newItems')}
                                        className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 flex items-center justify-between transition-colors"
                                    >
                                        <div className="font-medium text-gray-800">
                                            New Items Added ({comparisonSummary.newItems.length})
                                        </div>
                                        {expandedSections.newItems ? <ChevronUp size={18} className="text-gray-500" /> : <ChevronDown size={18} className="text-gray-500" />}
                                    </button>

                                    {expandedSections.newItems && (
                                        <div className="p-4 bg-white border-t border-gray-200 max-h-80 overflow-y-auto">
                                            {comparisonSummary.newItems.length === 0 ? (
                                                <div className="text-gray-500 text-sm text-center py-4">No new items found.</div>
                                            ) : (
                                                <table className="w-full text-sm text-left">
                                                    <thead className="text-xs text-gray-500 uppercase sticky top-0 bg-white shadow-sm">
                                                        <tr>
                                                            <th className="px-4 py-2">Part Number</th>
                                                            <th className="px-4 py-2">Description</th>
                                                            <th className="px-4 py-2">Category</th>
                                                            <th className="px-4 py-2 text-right">Price</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-100">
                                                        {comparisonSummary.newItems.map((item, i) => (
                                                            <tr key={i} className="hover:bg-gray-50">
                                                                <td className="px-4 py-2 font-mono text-xs">{item.partNumber}</td>
                                                                <td className="px-4 py-2 text-gray-700">{item.description}</td>
                                                                <td className="px-4 py-2 text-gray-500 text-xs">{item.category}</td>
                                                                <td className="px-4 py-2 text-right font-medium font-mono">${item.unitPrice.toFixed(2)}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Missing Items Section */}
                                <div className="border border-gray-200 rounded-lg overflow-hidden">
                                    <button
                                        onClick={() => toggleSection('missingItems')}
                                        className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 flex items-center justify-between transition-colors"
                                    >
                                        <div className="font-medium text-gray-800">
                                            Items Not Found in Upload ({comparisonSummary.missingItems.length})
                                        </div>
                                        {expandedSections.missingItems ? <ChevronUp size={18} className="text-gray-500" /> : <ChevronDown size={18} className="text-gray-500" />}
                                    </button>

                                    {expandedSections.missingItems && (
                                        <div className="p-4 bg-white border-t border-gray-200 max-h-80 overflow-y-auto">
                                            {comparisonSummary.missingItems.length === 0 ? (
                                                <div className="text-gray-500 text-sm text-center py-4">No missing items detected. All matching DB items are present in upload.</div>
                                            ) : (
                                                <div className="space-y-3">
                                                    <div className="p-3 bg-blue-50 text-blue-800 text-sm rounded-lg flex items-center gap-2">
                                                        <span>ℹ️ These items are in the system but missing from your upload file. <b>They will NOT be deleted or modified.</b></span>
                                                    </div>
                                                    <table className="w-full text-sm text-left">
                                                        <thead className="text-xs text-gray-500 uppercase sticky top-0 bg-white shadow-sm">
                                                            <tr>
                                                                <th className="px-4 py-2">Part Number</th>
                                                                <th className="px-4 py-2">Description</th>
                                                                <th className="px-4 py-2 text-right">Current Price</th>
                                                                <th className="px-4 py-2 text-right">Status</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-gray-100">
                                                            {comparisonSummary.missingItems.map((item, i) => (
                                                                <tr key={i} className="hover:bg-gray-50">
                                                                    <td className="px-4 py-2 font-mono text-xs">{item.partNumber}</td>
                                                                    <td className="px-4 py-2 text-gray-700">{item.description}</td>
                                                                    <td className="px-4 py-2 text-right text-gray-500 font-mono">${item.currentPrice.toFixed(2)}</td>
                                                                    <td className="px-4 py-2 text-right text-gray-400 italic text-xs">{item.status}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Confirmation & Apply Actions */}
                            <div className="p-6 bg-gray-50 border border-gray-200 rounded-xl mt-6 space-y-4">
                                {comparisonSummary.highImpactChanges.length > 0 && (
                                    <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800">
                                        <AlertTriangle size={20} className="shrink-0 mt-0.5" />
                                        <div className="text-sm">
                                            <p className="font-semibold mb-1">Some price changes affect automated board logic. Please review carefully.</p>
                                            <p>These prices automatically cascade to existing active quotes and automations.</p>
                                        </div>
                                    </div>
                                )}

                                <div className="flex items-center justify-end gap-3 pt-4">
                                    <button
                                        onClick={() => {
                                            setComparisonSummary(null);
                                            setPreviewItems([]);
                                            setFileMetadata(null);
                                            const inputEl = document.getElementById('catalog-upload') as HTMLInputElement;
                                            if (inputEl) inputEl.value = '';
                                        }}
                                        className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                                    >
                                        Cancel Upload
                                    </button>
                                    <button
                                        onClick={handleImport}
                                        disabled={uploading}
                                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium transition-colors shadow-sm"
                                    >
                                        {uploading ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />}
                                        {uploading ? 'Applying Updates...' : 'Confirm & Apply Changes'}
                                    </button>
                                </div>
                            </div>

                            {/* Upload progress shown cleanly here during application */}
                            {uploading && (
                                <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2 overflow-hidden">
                                    <div
                                        className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                                        style={{ width: `${uploadProgress}%` }}
                                    ></div>
                                    <p className="text-xs text-gray-500 mt-1 text-right">{uploadProgress}% Complete</p>
                                </div>
                            )}
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
