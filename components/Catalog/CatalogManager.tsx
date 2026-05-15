'use client';

import { useState, useEffect } from 'react';
import { Upload, FileSpreadsheet, Check, AlertCircle, Loader2, Search, Trash2, Filter, Database, RefreshCw, ChevronDown, ChevronUp, AlertTriangle, Layers } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useSession } from 'next-auth/react';
import { cn } from '@/lib/utils';
import { classifyCatalogItem } from '@/lib/catalog-service';

interface CatalogItem {
    id?: string;
    brand: string;
    category: string;
    subcategory: string;
    partNumber: string;
    description: string;
    unitPrice: number | null;
    labourHours: number | null;
    meterType?: string | null;
}

interface ComparisonSummary {
    updatedItems: any[];
    descriptionChanges: any[];
    newItems: any[];
    missingItems: any[];
    duplicates: any[];
    unchangedCount: number;
    highImpactChanges: any[];
    totalUploaded: number;
}

export default function CatalogManager() {
    const { data: session } = useSession();
    const isAdmin = session?.user?.role === 'ADMIN';

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
        descriptionChanges: false,
        newItems: false,
        missingItems: false,
        conflicts: false
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
            // Power Metering unification
            'Miscellaneous > Metering > Power Meter': 'Power Metering',
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
                descriptionChanges: false,
                newItems: false,
                missingItems: false,
                conflicts: false
            });
        } catch (err: any) {
            console.error('Analysis failed:', err);
            setUploadError(`Analysis failed: ${err.message}`);
        } finally {
            setIsAnalyzing(false);
            setAnalysisStatus('');
        }
    };

    // Import Flow State
    type ImportStep = 'UPLOAD' | 'MAPPING' | 'PREVIEW' | 'SUCCESS';
    const [importStep, setImportStep] = useState<ImportStep>('UPLOAD');
    const [rawExcelData, setRawExcelData] = useState<any[]>([]);
    const [excelHeaders, setExcelHeaders] = useState<string[]>([]);
    const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
    const [fieldStrategies, setFieldStrategies] = useState<Record<string, 'ALWAYS_UPDATE' | 'FILL_MISSING' | 'IGNORE' | 'PREFER_EXISTING'>>({
        unitPrice: 'ALWAYS_UPDATE',
        labourHours: 'ALWAYS_UPDATE',
        description: 'PREFER_EXISTING',
        subcategory: 'ALWAYS_UPDATE'
    });


    // Aliases for Smart Suggestion
    const FIELD_ALIASES: Record<string, string[]> = {
        partNumber: ['Material Reference', 'Part Number', 'Part No', 'Reference', 'Material Reference'],
        description: ['Description', 'Product Description', 'Desc'],
        unitPrice: ['Price Break 1', 'Unit Price', 'Price', 'Cost', 'Rate'],
        labourHours: ['HOURS', 'Labour', 'Labour Hours', 'Hrs'],
        category1: ['CATEGORY 1', 'Category', 'Cat'],
        category2: ['CATEGORY 2', 'Subcategory', 'Sub'],
        category3: ['CATEGORY 3', 'Detail', 'Type']
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsAnalyzing(true);
        setAnalysisStatus('Reading file headers...');
        setUploadError(null);

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                
                // Get all rows to detect headers correctly
                const data = XLSX.utils.sheet_to_json(ws) as any[];
                if (data.length === 0) throw new Error('Excel file appears to be empty.');

                const headers = Object.keys(data[0]);
                setExcelHeaders(headers);
                setRawExcelData(data);
                
                // Smart Mapping Suggestion
                const initialMapping: Record<string, string> = {};
                Object.entries(FIELD_ALIASES).forEach(([field, aliases]) => {
                    const match = headers.find(h => 
                        aliases.some(a => h.toLowerCase().includes(a.toLowerCase())) ||
                        h.toLowerCase() === field.toLowerCase()
                    );
                    if (match) initialMapping[field] = match;
                });
                
                setColumnMapping(initialMapping);
                setFileMetadata({
                    name: file.name,
                    size: (file.size / 1024).toFixed(1) + ' KB',
                    rows: data.length,
                    brand: manualBrand || 'Detecting...'
                });
                
                setImportStep('MAPPING');
            } catch (err: any) {
                setUploadError(err.message || 'Failed to parse Excel file.');
                console.error(err);
            } finally {
                setIsAnalyzing(false);
                setAnalysisStatus('');
            }
        };
        reader.readAsBinaryString(file);
    };

    const handleConfirmMapping = () => {
        if (!columnMapping.partNumber) {
            setUploadError('Part Number must be mapped to proceed.');
            return;
        }

        setIsAnalyzing(true);
        setAnalysisStatus('Reconciling data...');

        // Map raw data to internal format
        const mappedItems: CatalogItem[] = rawExcelData.map(row => {
            const partNo = row[columnMapping.partNumber];
            const desc = row[columnMapping.description];
            const price = row[columnMapping.unitPrice];
            const labour = row[columnMapping.labourHours];
            
            // Metadata for classification
            const cat1 = row[columnMapping.category1];
            const cat2 = row[columnMapping.category2];
            const cat3 = row[columnMapping.category3];

            const classification = classifyCatalogItem(
                desc ? String(desc) : '',
                partNo ? String(partNo) : '',
                cat1 ? String(cat1) : '',
                cat2 ? String(cat2) : '',
                cat3 ? String(cat3) : '',
                manualBrand
            );

            return {
                brand: classification.brand,
                category: classification.category,
                subcategory: classification.subcategory,
                partNumber: partNo ? String(partNo).trim() : '',
                description: desc ? String(desc).trim() : (partNo ? String(partNo).trim() : ''), // Fallback to Part Number if description is missing
                unitPrice: price ? parseFloat(String(price).replace(/[$,]/g, '')) : null,
                labourHours: labour ? parseFloat(String(labour)) : null,
                meterType: classification.meterType
            };
        }).filter(item => item.partNumber);

        setPreviewItems(mappedItems);
        handleAnalyze(mappedItems);
        setImportStep('PREVIEW');
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

                // Ensure skipped fields are explicitly set to IGNORE
                const finalStrategies = { ...fieldStrategies };
                const possibleFields = ['description', 'unitPrice', 'labourHours', 'category1', 'category2', 'category3'];
                possibleFields.forEach(field => {
                    if (!columnMapping[field]) {
                        finalStrategies[field] = 'IGNORE';
                    }
                });

                const res = await fetch('/api/catalog', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        items: chunk,
                        strategies: finalStrategies,
                        metadata: {
                            filename: fileMetadata?.name,
                            brand: manualBrand || previewItems[0]?.brand,
                            totalRows: fileMetadata?.rows
                        }
                    }),
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
            setImportStep('SUCCESS');
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

    const [standardizing, setStandardizing] = useState(false);

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

    const handleStandardize = async () => {
        if (!confirm('This will update all catalog items to follow the new hierarchy (e.g. adding "Miscellaneous >" prefix). This is required for the new navigation to work correctly. Proceed?')) return;
        
        setStandardizing(true);
        try {
            const res = await fetch('/api/catalog?action=standardize_categories', { method: 'PATCH' });
            if (res.ok) {
                const data = await res.json();
                alert(data.message);
                fetchBrandStats(); // Refresh stats
                fetchCatalog(); 
            } else {
                throw new Error('Failed to standardize categories');
            }
        } catch (error) {
            console.error(error);
            alert('Failed to standardize catalog categories');
        } finally {
            setStandardizing(false);
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
                    <div className="flex items-center gap-1">
                        <button
                            onClick={handleStandardize}
                            disabled={standardizing}
                            className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-full transition-colors"
                            title="Standardize Catalog Hierarchy (Required for new navigation)"
                        >
                            {standardizing ? <Loader2 className="animate-spin" size={16} /> : <Layers size={16} />}
                        </button>
                        <button
                            onClick={handleReclassify}
                            disabled={reclassifying}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
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

                                {isAdmin && (
                                    <button
                                        onClick={() => handleDeleteBrand(stat.brand, stat.originalBrand)}
                                        disabled={deletingBrand === stat.brand}
                                        className="w-full py-2 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors flex items-center justify-center gap-2"
                                        title="Delete all items from this brand"
                                    >
                                        {deletingBrand === stat.brand ? <Loader2 className="animate-spin" size={14} /> : <Trash2 size={14} />}
                                        Delete Pricelist
                                    </button>
                                )}
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
            {isAdmin && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                            <Upload className="text-blue-600" size={20} />
                            Import Catalog
                        </h2>
                        
                        {/* Step Indicator */}
                        <div className="flex items-center gap-4">
                            {[
                                { step: 'UPLOAD', label: '1. Upload' },
                                { step: 'MAPPING', label: '2. Map' },
                                { step: 'PREVIEW', label: '3. Review' }
                            ].map((s, idx) => (
                                <div key={s.step} className="flex items-center gap-2">
                                    <div className={cn(
                                        "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border",
                                        importStep === s.step ? "bg-blue-600 text-white border-blue-600 shadow-sm" : 
                                        idx < ['UPLOAD', 'MAPPING', 'PREVIEW'].indexOf(importStep) ? "bg-green-100 text-green-700 border-green-200" :
                                        "bg-gray-50 text-gray-400 border-gray-200"
                                    )}>
                                        {idx < ['UPLOAD', 'MAPPING', 'PREVIEW'].indexOf(importStep) ? <Check size={12} /> : idx + 1}
                                    </div>
                                    <span className={cn(
                                        "text-xs font-medium",
                                        importStep === s.step ? "text-blue-600" : "text-gray-400"
                                    )}>{s.label}</span>
                                    {idx < 2 && <div className="w-4 h-px bg-gray-200" />}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-6">
                        {importStep === 'UPLOAD' && (
                            <>
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
                                        Enter a brand name here to apply it to all uploaded items.
                                    </p>
                                </div>

                                <div className={cn("border-2 border-dashed rounded-lg p-12 text-center transition-colors", isAnalyzing ? "border-blue-300 bg-blue-50 cursor-not-allowed" : "border-gray-300 hover:bg-gray-50")}>
                                    <input
                                        type="file"
                                        accept=".xlsx, .xls"
                                        onChange={handleFileUpload}
                                        className="hidden"
                                        id="catalog-upload"
                                        disabled={isAnalyzing}
                                    />
                                    <label htmlFor="catalog-upload" className={cn("flex flex-col items-center gap-3", isAnalyzing ? "cursor-not-allowed opacity-70" : "cursor-pointer")}>
                                        <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 mb-2">
                                            <Upload size={24} />
                                        </div>
                                        <span className="text-base font-semibold text-gray-900">{isAnalyzing ? 'Processing file...' : 'Choose your catalog file'}</span>
                                        <p className="text-sm text-gray-500 max-w-xs mx-auto">
                                            Select an Excel file to begin the reconciliation process. We support partial updates.
                                        </p>
                                        {isAnalyzing && (
                                            <div className="flex items-center gap-2 text-blue-600 text-sm font-medium animate-pulse mt-2">
                                                <Loader2 className="animate-spin" size={16} />
                                                {analysisStatus}
                                            </div>
                                        )}
                                    </label>
                                </div>
                            </>
                        )}

                        {importStep === 'MAPPING' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                                <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg flex items-start gap-3">
                                    <AlertCircle className="text-blue-600 shrink-0 mt-0.5" size={18} />
                                    <div className="text-sm text-blue-800">
                                        <p className="font-semibold mb-1">Step 2: Map Your Columns</p>
                                        <p>Map your spreadsheet columns to system fields. For fields like <b>Labour</b> or <b>Category</b>, you can choose whether to overwrite or preserve existing data if it's already in the system.</p>
                                    </div>
                                </div>

                                <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
                                    <table className="w-full text-sm text-left border-collapse">
                                        <thead className="bg-gray-50 border-b border-gray-200">
                                            <tr>
                                                <th className="px-6 py-3 font-semibold text-gray-900 w-1/3">System Field</th>
                                                <th className="px-6 py-3 font-semibold text-gray-900">Excel Column (from {fileMetadata?.name})</th>
                                                <th className="px-6 py-3 font-semibold text-gray-900 text-right">Update Mode</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {[
                                                { id: 'partNumber', label: 'Part Number', required: true, numeric: false },
                                                { id: 'description', label: 'Description', required: false, numeric: false },
                                                { id: 'unitPrice', label: 'Unit Price', required: false, numeric: true },
                                                { id: 'labourHours', label: 'Labour Hours', required: false, numeric: true },
                                                { id: 'category1', label: 'Category 1', required: false, numeric: false },
                                                { id: 'category2', label: 'Category 2', required: false, numeric: false },
                                                { id: 'category3', label: 'Category 3', required: false, numeric: false },
                                            ].map((field) => (
                                                <tr key={field.id} className="hover:bg-gray-50/50">
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col">
                                                            <span className="font-medium text-gray-900">
                                                                {field.label}
                                                                {field.required && <span className="text-red-500 ml-1">*</span>}
                                                            </span>
                                                            <span className="text-[10px] text-gray-400 uppercase tracking-wider">{field.id}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <select
                                                            value={columnMapping[field.id] || ''}
                                                            onChange={(e) => setColumnMapping(prev => ({ ...prev, [field.id]: e.target.value }))}
                                                            className={cn(
                                                                "w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all",
                                                                columnMapping[field.id] ? "border-blue-200 bg-blue-50/30 text-blue-900" : "border-gray-200 text-gray-500"
                                                            )}
                                                        >
                                                            <option value="">-- Skip Field --</option>
                                                            {excelHeaders.map(h => (
                                                                <option key={h} value={h}>{h}</option>
                                                            ))}
                                                        </select>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        {!field.required && columnMapping[field.id] && (
                                                            <select
                                                                value={fieldStrategies[field.id] || 'ALWAYS_UPDATE'}
                                                                onChange={(e) => setFieldStrategies(prev => ({ ...prev, [field.id]: e.target.value as any }))}
                                                                className="text-xs bg-white border border-gray-200 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500 outline-none"
                                                            >
                                                                <option value="ALWAYS_UPDATE">Always Update</option>
                                                                <option value="FILL_MISSING">Fill Missing Values</option>
                                                                <option value="PREFER_EXISTING">Prefer Existing</option>
                                                                <option value="IGNORE">Ignore Incoming</option>
                                                            </select>
                                                        )}
                                                        {field.required && <span className="text-[10px] text-gray-400 font-bold uppercase">Required</span>}
                                                        {!columnMapping[field.id] && !field.required && <span className="text-[10px] text-gray-400 uppercase">Preserved</span>}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="flex items-center justify-between pt-4">
                                    <button
                                        onClick={() => setImportStep('UPLOAD')}
                                        className="px-4 py-2 text-gray-500 hover:text-gray-700 font-medium"
                                    >
                                        Go Back
                                    </button>
                                    <div className="flex items-center gap-3">
                                        {Object.keys(columnMapping).length < 1 && (
                                            <span className="text-xs text-amber-600 font-medium italic">Map at least Part Number</span>
                                        )}
                                        <button
                                            onClick={handleConfirmMapping}
                                            disabled={!columnMapping.partNumber}
                                            className="px-8 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-sm transition-all"
                                        >
                                            Confirm & Analyze Data
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {importStep === 'PREVIEW' && comparisonSummary && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                                {/* Analysis Progress Indicator */}
                                {isAnalyzing && (
                                    <div className="p-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-300">
                                        <Loader2 className="animate-spin mx-auto text-blue-600 mb-3" size={32} />
                                        <h3 className="font-semibold text-gray-900">{analysisStatus}</h3>
                                        <p className="text-sm text-gray-500">This might take a moment depending on the file size.</p>
                                    </div>
                                )}

                                {!isAnalyzing && (
                                    <>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            <div className="p-5 bg-white border border-gray-200 rounded-xl shadow-sm">
                                                <div className="text-2xl font-bold text-gray-900">{comparisonSummary.totalUploaded}</div>
                                                <div className="text-xs text-gray-500 font-medium uppercase tracking-wider">Items in File</div>
                                            </div>
                                            <div className="p-5 bg-white border border-blue-200 rounded-xl shadow-sm">
                                                <div className="text-2xl font-bold text-blue-600">{comparisonSummary.updatedItems.length}</div>
                                                <div className="text-xs text-blue-500 font-medium uppercase tracking-wider">Items to Update</div>
                                            </div>
                                            <div className="p-5 bg-white border border-green-200 rounded-xl shadow-sm">
                                                <div className="text-2xl font-bold text-green-600">{comparisonSummary.newItems.length}</div>
                                                <div className="text-xs text-green-500 font-medium uppercase tracking-wider">New Items to Create</div>
                                            </div>
                                            <div className="p-5 bg-white border border-gray-200 rounded-xl shadow-sm">
                                                <div className="text-2xl font-bold text-gray-400">{comparisonSummary.unchangedCount}</div>
                                                <div className="text-xs text-gray-500 font-medium uppercase tracking-wider">Unchanged Items</div>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            {/* Detailed Reconciliation Sections */}
                                            {comparisonSummary.highImpactChanges.length > 0 && (
                                                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                                    <div className="flex items-center gap-2 text-red-800 font-bold mb-2">
                                                        <AlertTriangle size={18} />
                                                        CRITICAL: {comparisonSummary.highImpactChanges.length} High-Impact Price Changes
                                                    </div>
                                                    <p className="text-sm text-red-700 mb-3">These items are used in active calculations and automated rules. Changing their price affects the entire system.</p>
                                                    <button 
                                                        onClick={() => toggleSection('highImpact')}
                                                        className="text-xs font-bold text-red-600 underline"
                                                    >
                                                        {expandedSections.highImpact ? 'Hide Details' : 'View Affected Items'}
                                                    </button>
                                                    
                                                    {expandedSections.highImpact && (
                                                        <div className="mt-4 max-h-60 overflow-y-auto border-t border-red-200 pt-3">
                                                            <table className="w-full text-xs text-left">
                                                                <thead>
                                                                    <tr className="text-red-800 uppercase tracking-tighter">
                                                                        <th className="py-2">Part No</th>
                                                                        <th className="py-2 text-right">Old Price</th>
                                                                        <th className="py-2 text-right">New Price</th>
                                                                        <th className="py-2 text-right">Change</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-red-100">
                                                                    {comparisonSummary.highImpactChanges.map((item, i) => (
                                                                        <tr key={i}>
                                                                            <td className="py-2 font-mono">{item.partNumber}</td>
                                                                            <td className="py-2 text-right text-red-400">${item.oldPrice.toFixed(2)}</td>
                                                                            <td className="py-2 text-right font-bold text-red-700">${item.newPrice.toFixed(2)}</td>
                                                                            <td className="py-2 text-right text-red-700">+{item.percentChange.toFixed(1)}%</td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                                                <button 
                                                    onClick={() => toggleSection('priceChanges')}
                                                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50"
                                                >
                                                    <div className="text-sm font-semibold flex items-center gap-2">
                                                        <Database className="text-blue-500" size={16} />
                                                        Field Change Summary
                                                    </div>
                                                    <ChevronDown size={16} />
                                                </button>
                                                {expandedSections.priceChanges && (
                                                    <div className="p-4 border-t border-gray-100">
                                                        <div className="grid grid-cols-2 gap-4">
                                                            {[
                                                                 { label: 'Prices Updated', count: comparisonSummary.updatedItems.filter(i => i.changedFields.includes('unitPrice')).length },
                                                                { label: 'Labour Hours Updated', count: comparisonSummary.updatedItems.filter(i => i.changedFields.includes('labourHours')).length },
                                                                { label: 'Descriptions Updated', count: comparisonSummary.updatedItems.filter(i => i.changedFields.includes('description')).length },
                                                                { label: 'Incomplete Records (No Description)', count: comparisonSummary.newItems.filter(i => i.missingDescription).length },
                                                            ].map(stat => (
                                                                <div key={stat.label} className={cn(
                                                                    "flex items-center justify-between text-sm p-2 rounded",
                                                                    stat.label.includes('Incomplete') && stat.count > 0 ? "bg-amber-50 text-amber-700" : "bg-gray-50 text-gray-600"
                                                                )}>
                                                                    <span>{stat.label}</span>
                                                                    <span className="font-bold">{stat.count}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="p-6 bg-gray-900 text-white rounded-xl shadow-lg mt-8 flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-inner">
                                                    <Check size={24} />
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-bold">Ready to Commit</h3>
                                                    <p className="text-gray-400 text-sm">System will perform an incremental reconciliation using the mapped strategies.</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <button
                                                    onClick={() => setImportStep('MAPPING')}
                                                    className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                                                >
                                                    Edit Mapping
                                                </button>
                                                <button
                                                    onClick={handleImport}
                                                    disabled={uploading}
                                                    className="px-8 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-bold transition-all flex items-center gap-2 shadow-blue-900/20 shadow-xl"
                                                >
                                                    {uploading ? <Loader2 className="animate-spin" size={20} /> : <Database size={20} />}
                                                    {uploading ? `Processing (${uploadProgress}%)...` : 'Confirm & Reconcile Catalog'}
                                                </button>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        {importStep === 'SUCCESS' && (
                            <div className="text-center py-12 animate-in zoom-in-95">
                                <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                                    <Check size={40} />
                                </div>
                                <h2 className="text-2xl font-bold text-gray-900 mb-2">Reconciliation Complete!</h2>
                                <p className="text-gray-600 max-w-md mx-auto mb-8">
                                    The catalog has been incrementally updated. Enriched fields were preserved where specified, and audit logs have been recorded.
                                </p>
                                <button
                                    onClick={() => {
                                        setImportStep('UPLOAD');
                                        setComparisonSummary(null);
                                        setPreviewItems([]);
                                        setFileMetadata(null);
                                    }}
                                    className="px-8 py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition-colors"
                                >
                                    Finish & Close
                                </button>
                            </div>
                        )}

                        {/* Error Messages */}
                        {uploadError && (
                            <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl flex items-start gap-3 animate-in shake">
                                <AlertCircle className="shrink-0 mt-0.5" size={20} />
                                <div className="text-sm">
                                    <p className="font-bold mb-1">Upload Error</p>
                                    <p>{uploadError}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

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
