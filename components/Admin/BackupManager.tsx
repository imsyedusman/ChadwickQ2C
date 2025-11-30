'use client';

import { useState } from 'react';
import { Download, Upload, AlertTriangle, Check, Loader2, Database, FileJson, FileText } from 'lucide-react';

export default function BackupManager() {
    const [restoring, setRestoring] = useState(false);
    const [restoreStatus, setRestoreStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
    const [clearBeforeImport, setClearBeforeImport] = useState(false);

    const handleDownloadBackup = async () => {
        try {
            const res = await fetch('/api/admin/backup/catalog');
            if (!res.ok) throw new Error('Failed to download backup');

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `catalog-backup-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error('Download failed', error);
            alert('Failed to download backup');
        }
    };

    const handleDownloadQuotesBackup = async () => {
        try {
            const res = await fetch('/api/admin/backup/quotes');
            if (!res.ok) throw new Error('Failed to download quotes backup');

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `quotes-backup-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error('Download failed', error);
            alert('Failed to download quotes backup');
        }
    };

    const handleRestoreBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!confirm('Are you sure you want to restore this backup? This will modify your catalog data.')) {
            e.target.value = '';
            return;
        }

        setRestoring(true);
        setRestoreStatus(null);

        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const json = JSON.parse(evt.target?.result as string);

                const res = await fetch('/api/admin/backup/catalog', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: 'catalog_backup',
                        items: json.items,
                        clearBeforeImport
                    })
                });

                const data = await res.json();

                if (res.ok) {
                    setRestoreStatus({
                        type: 'success',
                        message: `Successfully restored ${data.details.createdCount} items.${data.details.deletedCount ? ` (Deleted ${data.details.deletedCount} existing items)` : ''}`
                    });
                } else {
                    throw new Error(data.error || 'Restore failed');
                }
            } catch (error: any) {
                console.error('Restore failed', error);
                setRestoreStatus({ type: 'error', message: error.message || 'Failed to restore backup' });
            } finally {
                setRestoring(false);
                e.target.value = ''; // Reset input
            }
        };
        reader.readAsText(file);
    };

    const handleRestoreQuotes = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!confirm('Are you sure you want to restore quotes? Existing quotes with the same number will be updated.')) {
            e.target.value = '';
            return;
        }

        setRestoring(true);
        setRestoreStatus(null);

        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const json = JSON.parse(evt.target?.result as string);

                const res = await fetch('/api/admin/backup/quotes', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: 'quotes_backup',
                        quotes: json.quotes
                    })
                });

                const data = await res.json();

                if (res.ok) {
                    setRestoreStatus({
                        type: 'success',
                        message: `Successfully restored quotes. Created: ${data.details.createdCount}, Updated: ${data.details.updatedCount}`
                    });
                } else {
                    throw new Error(data.error || 'Restore failed');
                }
            } catch (error: any) {
                console.error('Restore failed', error);
                setRestoreStatus({ type: 'error', message: error.message || 'Failed to restore quotes' });
            } finally {
                setRestoring(false);
                e.target.value = ''; // Reset input
            }
        };
        reader.readAsText(file);
    };

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-blue-50 rounded-lg">
                        <Database className="text-blue-600" size={24} />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">Catalog Backup & Restore</h2>
                        <p className="text-sm text-gray-600">Full system backup of Basics, Busbars, and Vendor Catalogs.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Export Section */}
                    <div className="p-6 bg-gray-50 rounded-lg border border-gray-200">
                        <h3 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                            <Download size={18} className="text-gray-600" />
                            Export Catalog
                        </h3>
                        <p className="text-sm text-gray-600 mb-4">
                            Download a JSON file containing your entire catalog.
                        </p>
                        <button
                            onClick={handleDownloadBackup}
                            className="w-full py-2 px-4 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
                        >
                            <FileJson size={18} />
                            Download Backup (.json)
                        </button>
                    </div>

                    {/* Import Section */}
                    <div className="p-6 bg-gray-50 rounded-lg border border-gray-200">
                        <h3 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                            <Upload size={18} className="text-gray-600" />
                            Restore Catalog
                        </h3>
                        <p className="text-sm text-gray-600 mb-4">
                            Upload a backup file to restore your catalog.
                        </p>

                        <div className="mb-4 flex items-start gap-2 p-3 bg-yellow-50 text-yellow-800 rounded-md text-xs border border-yellow-200">
                            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                            <div>
                                <label className="flex items-center gap-2 cursor-pointer font-medium">
                                    <input
                                        type="checkbox"
                                        checked={clearBeforeImport}
                                        onChange={(e) => setClearBeforeImport(e.target.checked)}
                                        className="rounded border-yellow-400 text-yellow-600 focus:ring-yellow-500"
                                    />
                                    Clear existing catalog before import
                                </label>
                                <p className="mt-1 opacity-90">
                                    If checked, ALL existing items will be deleted before importing.
                                    Recommended for full syncs.
                                </p>
                            </div>
                        </div>

                        <div className="relative">
                            <input
                                type="file"
                                accept=".json"
                                onChange={handleRestoreBackup}
                                disabled={restoring}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                            />
                            <button
                                disabled={restoring}
                                className="w-full py-2 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                            >
                                {restoring ? <Loader2 className="animate-spin" size={18} /> : <Upload size={18} />}
                                {restoring ? 'Restoring...' : 'Select Backup File'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Quotes Backup Section */}
                <div className="mt-8 pt-8 border-t border-gray-200">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-purple-50 rounded-lg">
                            <FileText className="text-purple-600" size={24} />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">Quotes Backup & Restore</h2>
                            <p className="text-sm text-gray-600">Transfer your created quotes between environments.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Export Quotes */}
                        <div className="p-6 bg-gray-50 rounded-lg border border-gray-200">
                            <h3 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                                <Download size={18} className="text-gray-600" />
                                Export Quotes
                            </h3>
                            <p className="text-sm text-gray-600 mb-4">
                                Download a JSON file containing all your Quotes, Boards, and Items.
                            </p>
                            <button
                                onClick={handleDownloadQuotesBackup}
                                className="w-full py-2 px-4 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
                            >
                                <FileJson size={18} />
                                Download Quotes (.json)
                            </button>
                        </div>

                        {/* Import Quotes */}
                        <div className="p-6 bg-gray-50 rounded-lg border border-gray-200">
                            <h3 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                                <Upload size={18} className="text-gray-600" />
                                Restore Quotes
                            </h3>
                            <p className="text-sm text-gray-600 mb-4">
                                Upload a quotes backup file. Existing quotes (by Quote Number) will be updated.
                            </p>

                            <div className="relative">
                                <input
                                    type="file"
                                    accept=".json"
                                    onChange={handleRestoreQuotes}
                                    disabled={restoring}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                                />
                                <button
                                    disabled={restoring}
                                    className="w-full py-2 px-4 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                                >
                                    {restoring ? <Loader2 className="animate-spin" size={18} /> : <Upload size={18} />}
                                    {restoring ? 'Restoring...' : 'Select Quotes Backup'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {restoreStatus && (
                    <div className={`mt-4 p-4 rounded-lg flex items-center gap-3 ${restoreStatus.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
                        }`}>
                        {restoreStatus.type === 'success' ? <Check size={20} /> : <AlertTriangle size={20} />}
                        <span className="text-sm font-medium">{restoreStatus.message}</span>
                    </div>
                )}
            </div>
        </div>
    );
}
