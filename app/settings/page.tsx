'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import CatalogManager from '@/components/Catalog/CatalogManager';
import { Database, DollarSign, Save, Loader2, Package, ToggleLeft, Wrench, FileText, HardDrive, AlertOctagon } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState<'catalog' | 'costing' | 'admin'>('catalog');
    const [settings, setSettings] = useState({
        labourRate: 100,
        consumablesPct: 3,
        overheadPct: 20,
        engineeringPct: 20,
        targetMarginPct: 18,
        gstPct: 10,
        roundingIncrement: 100,
        minMarginAlertPct: 5,
        companyName: '',
        companyAddress: ''
    });
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (activeTab === 'costing') {
            fetchSettings();
        }
    }, [activeTab]);

    const fetchSettings = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/settings');
            if (res.ok) {
                const data = await res.json();
                // Convert percentages from decimal to whole numbers for display
                setSettings({
                    ...data,
                    consumablesPct: (data.consumablesPct || 0.03) * 100,
                    overheadPct: (data.overheadPct || 0.20) * 100,
                    engineeringPct: (data.engineeringPct || 0.20) * 100,
                    targetMarginPct: (data.targetMarginPct || 0.18) * 100,
                    gstPct: (data.gstPct || 0.10) * 100,
                    minMarginAlertPct: (data.minMarginAlertPct || 0.05) * 100,
                    companyName: data.companyName || '',
                    companyAddress: data.companyAddress || '',
                });
            }
        } catch (error) {
            console.error('Failed to fetch settings', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveSettings = async () => {
        setSaving(true);
        try {
            // Convert percentages from whole numbers to decimals for storage
            const dataToSave = {
                ...settings,
                consumablesPct: settings.consumablesPct / 100,
                overheadPct: settings.overheadPct / 100,
                engineeringPct: settings.engineeringPct / 100,
                targetMarginPct: settings.targetMarginPct / 100,
                gstPct: settings.gstPct / 100,
                minMarginAlertPct: settings.minMarginAlertPct / 100,
            };

            const res = await fetch('/api/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dataToSave),
            });
            if (res.ok) {
                alert('Settings saved successfully');
            }
        } catch (error) {
            console.error('Failed to save settings', error);
            alert('Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#f9fafb]">
            <div className="max-w-7xl mx-auto p-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Settings</h1>
                    <p className="text-gray-600">Manage your application settings, catalog, and admin tools</p>
                </div>

                {/* Tab Navigation */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
                    <div className="flex border-b border-gray-200">
                        <button
                            onClick={() => setActiveTab('catalog')}
                            className={cn(
                                "flex items-center gap-2 px-6 py-4 font-medium text-sm border-b-2 transition-colors",
                                activeTab === 'catalog'
                                    ? "border-blue-600 text-blue-600"
                                    : "border-transparent text-gray-600 hover:text-gray-900"
                            )}
                        >
                            <Database size={18} />
                            Manage Pricelists
                        </button>
                        <button
                            onClick={() => setActiveTab('costing')}
                            className={cn(
                                "flex items-center gap-2 px-6 py-4 font-medium text-sm border-b-2 transition-colors",
                                activeTab === 'costing'
                                    ? "border-blue-600 text-blue-600"
                                    : "border-transparent text-gray-600 hover:text-gray-900"
                            )}
                        >
                            <DollarSign size={18} />
                            Costing Defaults
                        </button>
                        <button
                            onClick={() => setActiveTab('admin')}
                            className={cn(
                                "flex items-center gap-2 px-6 py-4 font-medium text-sm border-b-2 transition-colors",
                                activeTab === 'admin'
                                    ? "border-blue-600 text-blue-600"
                                    : "border-transparent text-gray-600 hover:text-gray-900"
                            )}
                        >
                            <Wrench size={18} />
                            Admin Tools
                        </button>
                    </div>

                    <div className="p-6">
                        {/* Catalog Tab */}
                        {activeTab === 'catalog' && (
                            <div>
                                <div className="mb-4">
                                    <h2 className="text-xl font-semibold text-gray-900 mb-2">External Pricelists</h2>
                                    <p className="text-sm text-gray-600">
                                        Upload and manage external supplier pricelists (Schneider, Mercs, etc.).
                                        <strong className="text-gray-900"> Note: Basic items are managed separately in Admin Tools.</strong>
                                    </p>
                                </div>
                                <CatalogManager />
                            </div>
                        )}

                        {/* Costing Tab */}
                        {activeTab === 'costing' && (
                            <div>
                                <h2 className="text-xl font-semibold text-gray-900 mb-6">Default Costing Parameters</h2>

                                {loading ? (
                                    <div className="flex items-center justify-center py-12">
                                        <Loader2 className="animate-spin text-blue-600" size={32} />
                                    </div>
                                ) : (
                                    <div className="space-y-6 max-w-4xl">
                                        <div className="grid grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Labour Rate ($/hour)
                                                </label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={settings.labourRate}
                                                    onChange={(e) => setSettings({ ...settings, labourRate: parseFloat(e.target.value) || 0 })}
                                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder:text-gray-500"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Consumables (%)
                                                </label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={settings.consumablesPct}
                                                    onChange={(e) => setSettings({ ...settings, consumablesPct: parseFloat(e.target.value) || 0 })}
                                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder:text-gray-500"
                                                />
                                                <p className="text-xs text-gray-500 mt-1">Percentage of material cost</p>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Overhead (%)
                                                </label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={settings.overheadPct}
                                                    onChange={(e) => setSettings({ ...settings, overheadPct: parseFloat(e.target.value) || 0 })}
                                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder:text-gray-500"
                                                />
                                                <p className="text-xs text-gray-500 mt-1">Percentage of cost base</p>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Engineering (%)
                                                </label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={settings.engineeringPct}
                                                    onChange={(e) => setSettings({ ...settings, engineeringPct: parseFloat(e.target.value) || 0 })}
                                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder:text-gray-500"
                                                />
                                                <p className="text-xs text-gray-500 mt-1">Percentage of cost base</p>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Target Margin (%)
                                                </label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={settings.targetMarginPct}
                                                    onChange={(e) => setSettings({ ...settings, targetMarginPct: parseFloat(e.target.value) || 0 })}
                                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder:text-gray-500"
                                                />
                                                <p className="text-xs text-gray-500 mt-1">Target profit margin</p>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    GST (%)
                                                </label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={settings.gstPct}
                                                    onChange={(e) => setSettings({ ...settings, gstPct: parseFloat(e.target.value) || 0 })}
                                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder:text-gray-500"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Rounding Increment ($)
                                                </label>
                                                <input
                                                    type="number"
                                                    value={settings.roundingIncrement}
                                                    onChange={(e) => setSettings({ ...settings, roundingIncrement: parseInt(e.target.value) || 0 })}
                                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder:text-gray-500"
                                                />
                                                <p className="text-xs text-gray-500 mt-1">Round sell price to nearest</p>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Min Margin Alert (%)
                                                </label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={settings.minMarginAlertPct}
                                                    onChange={(e) => setSettings({ ...settings, minMarginAlertPct: parseFloat(e.target.value) || 0 })}
                                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder:text-gray-500"
                                                />
                                                <p className="text-xs text-gray-500 mt-1">Alert when margin falls below</p>
                                            </div>
                                        </div>

                                        <div className="border-t border-gray-200 pt-6 mt-6">
                                            <h3 className="text-sm font-semibold text-gray-900 mb-4">Company Information</h3>
                                            <div className="space-y-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                                        Company Name
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={settings.companyName}
                                                        onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder:text-gray-500"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                                        Company Address
                                                    </label>
                                                    <textarea
                                                        value={settings.companyAddress}
                                                        onChange={(e) => setSettings({ ...settings, companyAddress: e.target.value })}
                                                        rows={3}
                                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder:text-gray-500"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <button
                                            onClick={handleSaveSettings}
                                            disabled={saving}
                                            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            {saving ? (
                                                <>
                                                    <Loader2 className="animate-spin" size={18} />
                                                    Saving...
                                                </>
                                            ) : (
                                                <>
                                                    <Save size={18} />
                                                    Save Settings
                                                </>
                                            )}
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Admin Tools Tab */}
                        {activeTab === 'admin' && (
                            <AdminToolsSection />
                        )}
                    </div>
                </div>
            </div>
        </div >
    );
}

function AdminToolsSection() {
    const [activeSubTab, setActiveSubTab] = useState<'catalog' | 'integrity' | 'exports'>('catalog');

    const tabs = [
        { id: 'catalog', label: 'Catalog Management', count: 2 },
        { id: 'integrity', label: 'Data Integrity & Safety', count: 2 },
        { id: 'exports', label: 'Documents & Exports', count: 1 },
    ] as const;

    return (
        <div>
            <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Admin Tools</h2>
                <p className="text-sm text-gray-600">
                    Manage internal catalogs and system settings
                </p>
            </div>

            {/* Sub Navigation */}
            <div className="flex gap-2 mb-6 border-b border-gray-200">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveSubTab(tab.id as any)}
                        className={cn(
                            "px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px flex items-center gap-2",
                            activeSubTab === tab.id
                                ? "border-blue-600 text-blue-600"
                                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                        )}
                    >
                        {tab.label}
                        <span className={cn(
                            "px-1.5 py-0.5 rounded-full text-[10px]",
                            activeSubTab === tab.id ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"
                        )}>
                            {tab.count}
                        </span>
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl">
                {/* Catalog Management Group */}
                {activeSubTab === 'catalog' && (
                    <>
                        <Link href="/admin/basics">
                            <div className="p-6 bg-white border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md transition-all cursor-pointer group h-full">
                                <div className="flex items-start gap-4">
                                    <div className="p-3 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
                                        <Package size={24} className="text-blue-600" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-gray-900 mb-1">Manage Basic Items</h3>
                                        <p className="text-sm text-gray-600">
                                            Edit, update, and manage your internal Basic items catalog (includes auto-add toggle)
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </Link>

                        <Link href="/admin/busbars">
                            <div className="p-6 bg-white border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md transition-all cursor-pointer group h-full">
                                <div className="flex items-start gap-4">
                                    <div className="p-3 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
                                        <ToggleLeft size={24} className="text-blue-600" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-gray-900 mb-1">Manage Busbar Items</h3>
                                        <p className="text-sm text-gray-600">
                                            Edit copper, labour, and busbar components pricing.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    </>
                )}

                {/* Integrity Group */}
                {activeSubTab === 'integrity' && (
                    <>
                        <Link href="/admin/integrity">
                            <div className="p-6 bg-white border-2 border-amber-200 rounded-lg hover:border-amber-500 hover:shadow-md transition-all cursor-pointer group h-full">
                                <div className="flex items-start gap-4">
                                    <div className="p-3 bg-amber-50 rounded-lg group-hover:bg-amber-100 transition-colors">
                                        <AlertOctagon size={24} className="text-amber-600" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-gray-900 mb-1">Catalog Integrity</h3>
                                        <p className="text-sm text-gray-600">
                                            Validate catalog consistency and identify risks.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </Link>

                        <Link href="/admin/backup">
                            <div className="p-6 bg-white border-2 border-amber-200 rounded-lg hover:border-amber-500 hover:shadow-md transition-all cursor-pointer group h-full">
                                <div className="flex items-start gap-4">
                                    <div className="p-3 bg-amber-50 rounded-lg group-hover:bg-amber-100 transition-colors">
                                        <HardDrive size={24} className="text-amber-600" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-gray-900 mb-1">Backup & Restore</h3>
                                        <p className="text-sm text-gray-600">
                                            Create system checkpoints or restore from file. Use with caution.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    </>
                )}

                {/* Exports Group */}
                {activeSubTab === 'exports' && (
                    <>
                        <Link href="/admin/templates">
                            <div className="p-6 bg-white border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md transition-all cursor-pointer group h-full">
                                <div className="flex items-start gap-4">
                                    <div className="p-3 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
                                        <FileText size={24} className="text-blue-600" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-gray-900 mb-1">Manage Export Templates</h3>
                                        <p className="text-sm text-gray-600">
                                            Upload and manage DOCX templates for Tender Exports
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    </>
                )}
            </div>
        </div>
    );
}
