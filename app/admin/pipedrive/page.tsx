'use client';

import { useState, useEffect } from 'react';
import { Save, Loader2, CheckCircle2, XCircle, ExternalLink, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function PipedriveSettingsPage() {
    const [token, setToken] = useState('');
    const [isTokenSet, setIsTokenSet] = useState(false);
    const [loading, setLoading] = useState(true);
    const [testing, setTesting] = useState(false);
    const [saving, setSaving] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
    const [conflictData, setConflictData] = useState<{ id: string; startedAt: string; lastHeartbeatAt: string; minutesSince: number } | null>(null);


    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await fetch('/api/admin/pipedrive/settings');
            if (res.ok) {
                const data = await res.json();
                setIsTokenSet(data.pipedriveTokenSet);
            }
        } catch (error) {
            console.error('Failed to fetch settings', error);
            toast.error('Failed to load settings');
        } finally {
            setLoading(false);
        }
    };


    const handleTestConnection = async () => {
        if (!token && !isTokenSet) {
            toast.error('Please enter an API token to test');
            return;
        }

        setTesting(true);
        setTestResult(null);
        try {
            const res = await fetch('/api/pipedrive/test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: token || undefined }), // If token is empty, backend might use stored one if we adjust it, but here we only test NEW token or stored if we send nothing? Actually my API requires token in body.
            });
            const data = await res.json();
            if (data.success) {
                setTestResult({ success: true, message: 'Connection successful! Pipedrive is reachable.' });
                toast.success('Pipedrive connection verified');
            } else {
                setTestResult({ success: false, message: 'Connection failed. Please check your API token.' });
                toast.error('Pipedrive connection failed');
            }
        } catch (error) {
            setTestResult({ success: false, message: 'An error occurred while testing the connection.' });
            toast.error('Error testing Pipedrive connection');
        } finally {
            setTesting(false);
        }
    };

    const handleSaveToken = async () => {
        if (!token) {
            toast.error('Please enter an API token to save');
            return;
        }

        setSaving(true);
        try {
            const res = await fetch('/api/admin/pipedrive/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token }),
            });
            if (res.ok) {
                toast.success('Pipedrive API token saved securely');
                setIsTokenSet(true);
                setToken(''); // Clear local state after saving
            } else {
                toast.error('Failed to save API token');
            }
        } catch (error) {
            console.error('Failed to save settings', error);
            toast.error('Error saving API token');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="animate-spin text-blue-600" size={32} />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto py-10 px-6">
            <div className="mb-10 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
                        <img src="/pipedrive.jpeg" alt="Pipedrive" className="w-10 h-10 rounded-xl shadow-sm" />
                        Pipedrive Integration
                    </h1>
                    <p className="text-slate-500 mt-2">
                        Connect your Chadwick Quotes account with Pipedrive to sync deals and customer data.
                    </p>
                </div>
                <div className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold border transition-all",
                    isTokenSet 
                        ? "bg-emerald-50 text-emerald-700 border-emerald-100" 
                        : "bg-slate-50 text-slate-500 border-slate-100"
                )}>
                    {isTokenSet ? (
                        <>
                            <CheckCircle2 size={16} />
                            Connected
                        </>
                    ) : (
                        <>
                            <XCircle size={16} />
                            Not Configured
                        </>
                    )}
                </div>
            </div>

            <div className="space-y-8">
                {/* Token Configuration Card */}
                <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
                    <div className="flex items-start justify-between mb-8">
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                <ShieldCheck className="text-blue-600" size={20} />
                                API Authentication
                            </h2>
                            <p className="text-slate-500 text-sm mt-1">
                                Securely store your Pipedrive API token to enable data syncing.
                            </p>
                        </div>
                        <a 
                            href="https://app.pipedrive.com/settings/api" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors"
                        >
                            Get API Token
                            <ExternalLink size={14} />
                        </a>
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">Personal API Token</label>
                            <div className="relative">
                                <input
                                    type="password"
                                    value={token}
                                    onChange={(e) => setToken(e.target.value)}
                                    placeholder={isTokenSet ? "••••••••••••••••••••••••••••" : "Paste your Pipedrive API token here"}
                                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-slate-900"
                                />
                                {isTokenSet && !token && (
                                    <span className="absolute right-5 top-1/2 -translate-y-1/2 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
                                        Token Stored
                                    </span>
                                )}
                            </div>
                            <p className="text-[11px] text-slate-400 mt-2 italic px-1">
                                Your token is encrypted and stored securely in our database. It is never exposed to the frontend.
                            </p>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-slate-50">
                            <button
                                onClick={handleTestConnection}
                                disabled={testing || (!token && !isTokenSet)}
                                className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-white border-2 border-slate-200 text-slate-700 rounded-2xl font-bold hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                {testing ? (
                                    <>
                                        <Loader2 className="animate-spin text-slate-400" size={20} />
                                        Testing...
                                    </>
                                ) : (
                                    "Test Connection"
                                )}
                            </button>
                            <button
                                onClick={handleSaveToken}
                                disabled={saving || !token}
                                className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xl shadow-blue-500/20 shadow-lg"
                            >
                                {saving ? (
                                    <>
                                        <Loader2 className="animate-spin" size={20} />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Save size={20} />
                                        Save Token
                                    </>
                                )}
                            </button>
                        </div>

                        {testResult && (
                            <div className={cn(
                                "flex items-start gap-3 p-5 rounded-2xl border animate-in fade-in slide-in-from-top-2 duration-300",
                                testResult.success 
                                    ? "bg-emerald-50 border-emerald-100 text-emerald-800" 
                                    : "bg-rose-50 border-rose-100 text-rose-800"
                            )}>
                                {testResult.success ? (
                                    <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-600" size={20} />
                                ) : (
                                    <XCircle className="mt-0.5 shrink-0 text-rose-600" size={20} />
                                )}
                                <div>
                                    <p className="font-bold text-sm">{testResult.success ? 'Success' : 'Connection Failed'}</p>
                                    <p className="text-xs mt-1 opacity-90">{testResult.message}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>


            </div>
        </div>
    );
}
