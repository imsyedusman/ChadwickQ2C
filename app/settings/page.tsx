'use client';

import { useState, useEffect } from 'react';
import { Database, DollarSign, Save, Loader2, RefreshCw, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface CatalogStat {
    brand: string;
    originalBrand: string | null;
    count: number;
}

interface CostingSettings {
    labourRate: number;
    consumablesPct: number;
    overheadPct: number;
    engineeringPct: number;
    targetMarginPct: number;
    gstPct: number;
    roundingIncrement: number;
    minMarginAlertPct: number;
    copperPricePerKg: number;
}

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState<'catalogs' | 'costing'>('catalogs');
    
    // Catalog State
    const [catalogStats, setCatalogStats] = useState<CatalogStat[]>([]);
    const [loadingCatalogs, setLoadingCatalogs] = useState(true);

    // Costing State
    const [settings, setSettings] = useState<CostingSettings>({
        labourRate: 100,
        consumablesPct: 3,
        overheadPct: 20,
        engineeringPct: 20,
        targetMarginPct: 18,
        gstPct: 10,
        roundingIncrement: 100,
        minMarginAlertPct: 5,
        copperPricePerKg: 15.0
    });
    const [loadingSettings, setLoadingSettings] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (activeTab === 'catalogs') {
            fetchCatalogStats();
        } else {
            fetchSettings();
        }
    }, [activeTab]);

    const fetchCatalogStats = async () => {
        setLoadingCatalogs(true);
        try {
            const res = await fetch('/api/catalog?mode=stats');
            if (res.ok) {
                const data = await res.json();
                setCatalogStats(data);
            }
        } catch (error) {
            console.error('Failed to fetch catalog stats', error);
            toast.error('Failed to load catalogs');
        } finally {
            setLoadingCatalogs(false);
        }
    };

    const fetchSettings = async () => {
        setLoadingSettings(true);
        try {
            const res = await fetch('/api/settings');
            if (res.ok) {
                const data = await res.json();
                setSettings({
                    ...data,
                    consumablesPct: (data.consumablesPct || 0.03) * 100,
                    overheadPct: (data.overheadPct || 0.20) * 100,
                    engineeringPct: (data.engineeringPct || 0.20) * 100,
                    targetMarginPct: (data.targetMarginPct || 0.18) * 100,
                    gstPct: (data.gstPct || 0.10) * 100,
                    minMarginAlertPct: (data.minMarginAlertPct || 0.05) * 100,
                });
            }
        } catch (error) {
            console.error('Failed to fetch settings', error);
            toast.error('Failed to load costing defaults');
        } finally {
            setLoadingSettings(false);
        }
    };

    const handleSaveSettings = async () => {
        setSaving(true);
        try {
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
                toast.success('Costing defaults saved successfully');
            } else {
                toast.error('Failed to save settings');
            }
        } catch (error) {
            console.error('Failed to save settings', error);
            toast.error('Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#f8fafc] py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="mb-12">
                    <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-3">Settings</h1>
                    <p className="text-lg text-slate-600 max-w-2xl">
                        Configure your quoting workflow and view available system data.
                    </p>
                </div>

                <div className="flex flex-col md:flex-row gap-8">
                    {/* Sidebar */}
                    <aside className="w-full md:w-64 space-y-2">
                        <button
                            onClick={() => setActiveTab('catalogs')}
                            className={cn(
                                "w-full flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-2xl transition-all",
                                activeTab === 'catalogs'
                                    ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                                    : "text-slate-500 hover:bg-white hover:text-slate-900"
                            )}
                        >
                            <Database size={18} />
                            External Catalogs
                        </button>
                        <button
                            onClick={() => setActiveTab('costing')}
                            className={cn(
                                "w-full flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-2xl transition-all",
                                activeTab === 'costing'
                                    ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                                    : "text-slate-500 hover:bg-white hover:text-slate-900"
                            )}
                        >
                            <DollarSign size={18} />
                            Costing Defaults
                        </button>
                    </aside>

                    {/* Content */}
                    <main className="flex-1">
                        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm min-h-[500px]">
                            {activeTab === 'catalogs' && (
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h2 className="text-xl font-bold text-slate-900">External Catalogs</h2>
                                            <p className="text-slate-500 text-sm">Available supplier pricelists and part data.</p>
                                        </div>
                                        <button 
                                            onClick={fetchCatalogStats}
                                            className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
                                            title="Refresh Data"
                                        >
                                            <RefreshCw size={18} className={loadingCatalogs ? "animate-spin" : ""} />
                                        </button>
                                    </div>

                                    {loadingCatalogs ? (
                                        <div className="flex items-center justify-center py-20">
                                            <Loader2 className="animate-spin text-blue-600" size={32} />
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 gap-4">
                                            {catalogStats.length === 0 ? (
                                                <div className="text-center py-20 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                                                    <Database className="mx-auto w-12 h-12 text-slate-300 mb-4" />
                                                    <p className="text-slate-500 font-medium">No catalogs found in the system.</p>
                                                </div>
                                            ) : (
                                                catalogStats.map((stat) => (
                                                    <div key={stat.brand} className="group flex items-center justify-between p-6 bg-white border border-slate-200 rounded-2xl hover:border-blue-200 hover:shadow-md transition-all">
                                                        <div className="flex items-center gap-4">
                                                            <div className="p-3 bg-blue-50 rounded-xl group-hover:bg-blue-100 transition-colors">
                                                                <FileText className="w-6 h-6 text-blue-600" />
                                                            </div>
                                                            <div>
                                                                <p className="font-bold text-slate-900 text-lg">{stat.brand}</p>
                                                                <p className="text-sm text-slate-500">{stat.count} Part Numbers</p>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <span className="inline-block px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-[10px] font-bold uppercase tracking-wider">
                                                                Active
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    )}

                                    <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl">
                                        <p className="text-amber-700 text-xs font-medium">
                                            Note: Catalog management (upload/delete) is restricted to administrators in the Admin Control Center.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'costing' && (
                                <div className="space-y-8">
                                    <div>
                                        <h2 className="text-xl font-bold text-slate-900">Costing Defaults</h2>
                                        <p className="text-slate-500 text-sm">Configure default parameters used when generating new quotes.</p>
                                    </div>

                                    {loadingSettings ? (
                                        <div className="flex items-center justify-center py-20">
                                            <Loader2 className="animate-spin text-blue-600" size={32} />
                                        </div>
                                    ) : (
                                        <div className="space-y-8">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                                                <div className="col-span-1 md:col-span-2">
                                                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b pb-2">Financial Targets</h3>
                                                </div>

                                                <div className="space-y-2">
                                                    <label className="text-sm font-bold text-slate-700">Labour Rate ($/hr)</label>
                                                    <div className="relative">
                                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                                                        <input
                                                            type="number"
                                                            value={settings.labourRate}
                                                            onChange={(e) => setSettings({ ...settings, labourRate: parseFloat(e.target.value) || 0 })}
                                                            className="w-full pl-8 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-slate-900 font-medium"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="space-y-2">
                                                    <label className="text-sm font-bold text-slate-700">Copper Base ($/kg)</label>
                                                    <div className="relative">
                                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                                                        <input
                                                            type="number"
                                                            value={settings.copperPricePerKg}
                                                            onChange={(e) => setSettings({ ...settings, copperPricePerKg: parseFloat(e.target.value) || 0 })}
                                                            className="w-full pl-8 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-slate-900 font-medium"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="space-y-2">
                                                    <label className="text-sm font-bold text-slate-700">Target Margin (%)</label>
                                                    <div className="relative">
                                                        <input
                                                            type="number"
                                                            value={settings.targetMarginPct}
                                                            onChange={(e) => setSettings({ ...settings, targetMarginPct: parseFloat(e.target.value) || 0 })}
                                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-slate-900 font-medium"
                                                        />
                                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">%</span>
                                                    </div>
                                                </div>

                                                <div className="space-y-2">
                                                    <label className="text-sm font-bold text-slate-700">Consumables (%)</label>
                                                    <div className="relative">
                                                        <input
                                                            type="number"
                                                            value={settings.consumablesPct}
                                                            onChange={(e) => setSettings({ ...settings, consumablesPct: parseFloat(e.target.value) || 0 })}
                                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-slate-900 font-medium"
                                                        />
                                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">%</span>
                                                    </div>
                                                </div>

                                                <div className="col-span-1 md:col-span-2 mt-4">
                                                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b pb-2">Overheads & Engineering</h3>
                                                </div>

                                                <div className="space-y-2">
                                                    <label className="text-sm font-bold text-slate-700">Overhead Rate (%)</label>
                                                    <div className="relative">
                                                        <input
                                                            type="number"
                                                            value={settings.overheadPct}
                                                            onChange={(e) => setSettings({ ...settings, overheadPct: parseFloat(e.target.value) || 0 })}
                                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-slate-900 font-medium"
                                                        />
                                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">%</span>
                                                    </div>
                                                </div>

                                                <div className="space-y-2">
                                                    <label className="text-sm font-bold text-slate-700">Engineering Rate (%)</label>
                                                    <div className="relative">
                                                        <input
                                                            type="number"
                                                            value={settings.engineeringPct}
                                                            onChange={(e) => setSettings({ ...settings, engineeringPct: parseFloat(e.target.value) || 0 })}
                                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-slate-900 font-medium"
                                                        />
                                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">%</span>
                                                    </div>
                                                </div>

                                                <div className="space-y-2">
                                                    <label className="text-sm font-bold text-slate-700">Rounding ($)</label>
                                                    <div className="relative">
                                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                                                        <input
                                                            type="number"
                                                            value={settings.roundingIncrement}
                                                            onChange={(e) => setSettings({ ...settings, roundingIncrement: parseInt(e.target.value) || 0 })}
                                                            className="w-full pl-8 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-slate-900 font-medium"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="space-y-2">
                                                    <label className="text-sm font-bold text-slate-700">GST Rate (%)</label>
                                                    <div className="relative">
                                                        <input
                                                            type="number"
                                                            value={settings.gstPct}
                                                            onChange={(e) => setSettings({ ...settings, gstPct: parseFloat(e.target.value) || 0 })}
                                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-slate-900 font-medium"
                                                        />
                                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">%</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="pt-6 border-t border-slate-100 flex justify-end">
                                                <button
                                                    onClick={handleSaveSettings}
                                                    disabled={saving}
                                                    className="flex items-center justify-center gap-2 px-10 py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xl shadow-blue-500/20 active:scale-[0.98]"
                                                >
                                                    {saving ? (
                                                        <>
                                                            <Loader2 className="animate-spin" size={20} />
                                                            Saving Changes...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Save size={20} />
                                                            Save Costing Defaults
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </main>
                </div>
            </div>
        </div>
    );
}
