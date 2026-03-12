'use client';

import { useState, useEffect } from 'react';
import { Save, Loader2, ArrowLeft, DollarSign } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function AdminCostingPage() {
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
        companyAddress: '',
        copperPricePerKg: 15.0
    });
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        setLoading(true);
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
                    companyName: data.companyName || '',
                    companyAddress: data.companyAddress || '',
                    copperPricePerKg: data.copperPricePerKg || 15.0,
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
        <div className="min-h-screen bg-[#f8fafc] py-12">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <Link href="/admin" className="p-2 hover:bg-white rounded-full transition-colors">
                                <ArrowLeft className="w-5 h-5 text-slate-400" />
                            </Link>
                            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Costing Defaults</h1>
                        </div>
                        <p className="text-slate-500">
                            Configure default profit margins, labour rates, and overheads for the system.
                        </p>
                    </div>
                </div>

                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-8">
                        {loading ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="animate-spin text-blue-600" size={32} />
                            </div>
                        ) : (
                            <div className="space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                                    <div className="col-span-1 md:col-span-2">
                                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider border-b pb-2 mb-4">Financial Parameters</h3>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                            Labour Rate ($/hour)
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-2.5 text-slate-400">$</span>
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={settings.labourRate}
                                                onChange={(e) => setSettings({ ...settings, labourRate: parseFloat(e.target.value) || 0 })}
                                                className="w-full pl-8 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-slate-900"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                            Copper Base Price ($/kg)
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-2.5 text-slate-400">$</span>
                                            <input
                                                type="number"
                                                step="0.10"
                                                value={settings.copperPricePerKg}
                                                onChange={(e) => setSettings({ ...settings, copperPricePerKg: parseFloat(e.target.value) || 0 })}
                                                className="w-full pl-8 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-slate-900"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                            Rounding Increment ($)
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-2.5 text-slate-400">$</span>
                                            <input
                                                type="number"
                                                value={settings.roundingIncrement}
                                                onChange={(e) => setSettings({ ...settings, roundingIncrement: parseInt(e.target.value) || 0 })}
                                                className="w-full pl-8 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-slate-900"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                            GST (%)
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={settings.gstPct}
                                                onChange={(e) => setSettings({ ...settings, gstPct: parseFloat(e.target.value) || 0 })}
                                                className="w-full pl-4 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-slate-900"
                                            />
                                            <span className="absolute right-3 top-2.5 text-slate-400">%</span>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                            Target Margin (%)
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={settings.targetMarginPct}
                                                onChange={(e) => setSettings({ ...settings, targetMarginPct: parseFloat(e.target.value) || 0 })}
                                                className="w-full pl-4 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-slate-900"
                                            />
                                            <span className="absolute right-3 top-2.5 text-slate-400">%</span>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                            Consumables (%)
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={settings.consumablesPct}
                                                onChange={(e) => setSettings({ ...settings, consumablesPct: parseFloat(e.target.value) || 0 })}
                                                className="w-full pl-4 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-slate-900"
                                            />
                                            <span className="absolute right-3 top-2.5 text-slate-400">%</span>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                            Overhead (%)
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={settings.overheadPct}
                                                onChange={(e) => setSettings({ ...settings, overheadPct: parseFloat(e.target.value) || 0 })}
                                                className="w-full pl-4 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-slate-900"
                                            />
                                            <span className="absolute right-3 top-2.5 text-slate-400">%</span>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                            Engineering (%)
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={settings.engineeringPct}
                                                onChange={(e) => setSettings({ ...settings, engineeringPct: parseFloat(e.target.value) || 0 })}
                                                className="w-full pl-4 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-slate-900"
                                            />
                                            <span className="absolute right-3 top-2.5 text-slate-400">%</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="border-t border-slate-100 pt-8">
                                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Company Information</h3>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                                Company Name
                                            </label>
                                            <input
                                                type="text"
                                                value={settings.companyName}
                                                onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-slate-900"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                                Company Address
                                            </label>
                                            <textarea
                                                value={settings.companyAddress}
                                                onChange={(e) => setSettings({ ...settings, companyAddress: e.target.value })}
                                                rows={3}
                                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-slate-900"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-6">
                                    <button
                                        onClick={handleSaveSettings}
                                        disabled={saving}
                                        className="flex items-center justify-center gap-2 w-full md:w-auto px-8 py-3 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-500/20"
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
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
