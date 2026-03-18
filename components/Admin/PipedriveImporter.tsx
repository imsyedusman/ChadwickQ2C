'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
    Upload, 
    CheckCircle2, 
    XCircle, 
    AlertTriangle, 
    History, 
    RefreshCcw, 
    Trash2, 
    ChevronDown, 
    ChevronRight, 
    Loader2,
    FileText,
    Activity,
    Clock,
    User,
    Building2,
    Briefcase,
    Bug,
    Info,
    Check
} from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { cn } from '@/lib/utils';

interface ImportBatch {
    id: string;
    source: string;
    status: string;
    createdAt: string;
    startedAt: string;
    lastHeartbeatAt: string;
    completedAt: string | null;
    totalClientsAttempted: number;
    totalContactsAttempted: number;
    totalProjectsAttempted: number;
    totalClientsCommitted: number;
    totalContactsCommitted: number;
    totalProjectsCommitted: number;
    skippedDeals: number;
    errorLog: any;
}

interface FileState {
    file: File | null;
    rowCount: number;
    status: 'empty' | 'valid' | 'invalid';
}

export default function PipedriveImporter() {
    // File States
    const [orgs, setOrgs] = useState<FileState>({ file: null, rowCount: 0, status: 'empty' });
    const [people, setPeople] = useState<FileState>({ file: null, rowCount: 0, status: 'empty' });
    const [deals, setDeals] = useState<FileState>({ file: null, rowCount: 0, status: 'empty' });
    
    // UI States
    const [mode, setMode] = useState<'UPDATE' | 'REPLACE'>('UPDATE');
    const [debug, setDebug] = useState(false);
    const [confirmReplace, setConfirmReplace] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [history, setHistory] = useState<ImportBatch[]>([]);
    const [activeBatch, setActiveBatch] = useState<any>(null);
    const [expandedBatchId, setExpandedBatchId] = useState<string | null>(null);

    // Fetch History
    const fetchHistory = useCallback(async () => {
        try {
            const res = await fetch('/api/admin/pipedrive-import?limit=10');
            const data = await res.json();
            if (data.history) setHistory(data.history);
            if (data.activeBatch) setActiveBatch(data.activeBatch);
            else setActiveBatch(null);
        } catch (e) {
            console.error('Failed to fetch import history', e);
        }
    }, []);

    useEffect(() => {
        fetchHistory();
        const interval = setInterval(fetchHistory, 15000); 
        return () => clearInterval(interval);
    }, [fetchHistory]);

    // File Parsing
    const handleFileChange = async (type: 'orgs' | 'people' | 'deals', file: File | null) => {
        if (!file) {
            const reset = { file: null, rowCount: 0, status: 'empty' as const };
            if (type === 'orgs') setOrgs(reset);
            if (type === 'people') setPeople(reset);
            if (type === 'deals') setDeals(reset);
            return;
        }

        try {
            const buffer = await file.arrayBuffer();
            const workbook = XLSX.read(buffer, { type: 'array' });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const data = XLSX.utils.sheet_to_json(sheet);
            
            const state: FileState = { 
                file, 
                rowCount: data.length, 
                status: data.length > 0 ? 'valid' : 'invalid' 
            };

            if (type === 'orgs') setOrgs(state);
            if (type === 'people') setPeople(state);
            if (type === 'deals') setDeals(state);

        } catch (e) {
            toast.error(`Failed to parse ${type} file`);
            console.error(e);
        }
    };

    // Upload
    const handleImport = async () => {
        if (!orgs.file || !people.file || !deals.file) {
            toast.error('Please upload all three required CSV files');
            return;
        }

        if (mode === 'REPLACE' && !confirmReplace) {
            toast.error('Please confirm the data replacement safety check');
            return;
        }

        setIsUploading(true);
        const formData = new FormData();
        formData.append('organizations', orgs.file);
        formData.append('people', people.file);
        formData.append('deals', deals.file);
        formData.append('mode', mode);
        formData.append('debug', debug.toString());

        try {
            const res = await fetch('/api/admin/pipedrive-import', {
                method: 'POST',
                body: formData
            });

            const result = await res.json();
            if (!res.ok) throw new Error(result.error || 'Import failed');

            if (result.status === 'WARNING') {
                toast.warning('Import completed with warnings. Check history for details.');
            } else {
                toast.success('Pipedrive Import Successful!');
            }

            setOrgs({ file: null, rowCount: 0, status: 'empty' });
            setPeople({ file: null, rowCount: 0, status: 'empty' });
            setDeals({ file: null, rowCount: 0, status: 'empty' });
            setConfirmReplace(false);
            fetchHistory();
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="space-y-8 max-w-6xl mx-auto p-4 md:p-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
                        Pipedrive Data Importer
                        {debug && <Bug className="w-6 h-6 text-rose-500 animate-pulse" />}
                    </h1>
                    <p className="text-slate-500 mt-2">Sync Organizations, People, and Deals with strict deterministic linking.</p>
                </div>
                {activeBatch && (
                    <div className="bg-blue-50 border border-blue-200 rounded-2xl px-4 py-2 flex items-center gap-3 animate-pulse shadow-sm shadow-blue-100">
                        <Activity className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-bold text-blue-700">Import in Progress...</span>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* File Upload Section */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm space-y-8">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                <Upload className="w-5 h-5 text-blue-600" />
                                Source Files
                            </h2>
                            <label className="flex items-center gap-2 cursor-pointer group">
                                <span className={cn("text-[10px] font-bold uppercase tracking-widest transition-colors", debug ? "text-rose-500" : "text-slate-400")}>
                                    Debug Mode
                                </span>
                                <div className="relative inline-flex h-5 w-9 items-center rounded-full bg-slate-200 p-1 transition-colors group-hover:bg-slate-300">
                                    <input 
                                        type="checkbox" 
                                        className="sr-only" 
                                        checked={debug} 
                                        onChange={(e) => setDebug(e.target.checked)} 
                                    />
                                    <div className={cn("h-3 w-3 rounded-full bg-white transition-transform", debug ? "translate-x-4 bg-rose-500" : "translate-x-0")} />
                                </div>
                            </label>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <FileCard 
                                title="Organizations" 
                                icon={<Building2 className="w-5 h-5" />}
                                subtitle="Clients CSV"
                                state={orgs}
                                onChange={(f) => handleFileChange('orgs', f)}
                            />
                            <FileCard 
                                title="People" 
                                icon={<User className="w-5 h-5" />}
                                subtitle="Contacts CSV"
                                state={people}
                                onChange={(f) => handleFileChange('people', f)}
                            />
                            <FileCard 
                                title="Deals" 
                                icon={<Briefcase className="w-5 h-5" />}
                                subtitle="Projects CSV"
                                state={deals}
                                onChange={(f) => handleFileChange('deals', f)}
                            />
                        </div>

                        {/* Mode Selection */}
                        <div className="pt-6 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6">
                            <div className="flex bg-slate-100 p-1 rounded-2xl w-full md:w-auto">
                                <button 
                                    onClick={() => setMode('UPDATE')}
                                    className={cn(
                                        "flex-1 md:flex-none px-6 py-2 rounded-xl text-sm font-bold transition-all",
                                        mode === 'UPDATE' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                                    )}
                                >
                                    Update Only
                                </button>
                                <button 
                                    onClick={() => setMode('REPLACE')}
                                    className={cn(
                                        "flex-1 md:flex-none px-6 py-2 rounded-xl text-sm font-bold transition-all",
                                        mode === 'REPLACE' ? "bg-white text-rose-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                                    )}
                                >
                                    Replace All
                                </button>
                            </div>

                            <button 
                                onClick={handleImport}
                                disabled={isUploading || activeBatch || orgs.status !== 'valid' || people.status !== 'valid' || deals.status !== 'valid'}
                                className={cn(
                                    "w-full md:w-auto px-10 py-3 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg",
                                    isUploading || activeBatch ? "bg-slate-200 text-slate-400 cursor-not-allowed" : "bg-blue-600 text-white hover:bg-blue-700 active:scale-95 shadow-blue-200"
                                )}
                            >
                                {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCcw className="w-5 h-5" />}
                                {isUploading ? 'Executing Sync...' : 'Start Synchronisation'}
                            </button>
                        </div>

                        {mode === 'REPLACE' && (
                            <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-4">
                                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                                <div className="space-y-3">
                                    <p className="text-sm text-rose-800 font-medium leading-relaxed">
                                        <span className="font-extrabold uppercase tracking-tight mr-1">Warning:</span> 
                                        Replace mode will permanently delete ALL existing Pipedrive-sourced data before re-importing.
                                    </p>
                                    <label className="flex items-center gap-3 cursor-pointer group">
                                        <input 
                                            type="checkbox" 
                                            checked={confirmReplace} 
                                            onChange={(e) => setConfirmReplace(e.target.checked)}
                                            className="w-5 h-5 rounded-lg border-rose-300 text-rose-600 focus:ring-rose-200 cursor-pointer"
                                        />
                                        <span className="text-sm font-bold text-rose-700 group-hover:text-rose-900 transition-colors">I confirm this is a safe operation.</span>
                                    </label>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Sidebar Info */}
                <div className="space-y-6 text-slate-600">
                    <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 opacity-[0.03] transition-opacity group-hover:opacity-10 duration-500">
                            <Info className="w-24 h-24" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                             Deterministic Sync
                        </h3>
                        <ul className="space-y-4 text-xs font-medium leading-relaxed">
                            <li className="flex gap-3">
                                <div className="w-4 h-4 rounded bg-emerald-100 flex items-center justify-center shrink-0">
                                    <Check className="w-2.5 h-2.5 text-emerald-600" />
                                </div>
                                <span>Zero-Leak Linking: In-memory mapping ensures 100% correct Client-to-Project relationships.</span>
                            </li>
                            <li className="flex gap-3">
                                <div className="w-4 h-4 rounded bg-emerald-100 flex items-center justify-center shrink-0">
                                    <Check className="w-2.5 h-2.5 text-emerald-600" />
                                </div>
                                <span>Collision Detection: Duplicate Org IDs are detected and logged during mapping.</span>
                            </li>
                            <li className="flex gap-3">
                                <div className="w-4 h-4 rounded bg-emerald-100 flex items-center justify-center shrink-0">
                                    <Check className="w-2.5 h-2.5 text-emerald-600" />
                                </div>
                                <span>Atomic Integrity: Sequential processing ensures no orphans or broken links.</span>
                            </li>
                        </ul>
                    </div>

                    <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-xl shadow-slate-200">
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <Activity className="w-5 h-5 text-blue-400" />
                            System Pulse
                        </h3>
                        {activeBatch ? (
                            <div className="space-y-3">
                                <div className="flex justify-between items-center text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                                    <span>Active Batch</span>
                                    <span className="text-blue-400">Processing</span>
                                </div>
                                <div className="text-sm font-bold font-mono tracking-tight bg-slate-800 p-2 rounded-xl text-center shadow-inner">
                                    {activeBatch.id.slice(0, 16)}...
                                </div>
                                <div className="text-[10px] text-slate-500 flex items-center gap-15 justify-center mt-2">
                                    <Clock className="w-3 h-3" />
                                    Last Pulse: {new Date(activeBatch.lastHeartbeatAt).toLocaleTimeString()}
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <p className="text-sm text-slate-400 font-medium">System is idle and ready for ingestion.</p>
                                <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                                    <div className="h-full w-full bg-emerald-500/50" />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* History Section */}
            <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <History className="w-5 h-5 text-slate-400" />
                        Ingestion Audit
                    </h2>
                    <button 
                        onClick={fetchHistory}
                        className="p-2 hover:bg-slate-50 rounded-xl transition-colors active:scale-90"
                    >
                        <RefreshCcw className="w-4 h-4 text-slate-400" />
                    </button>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50/50 text-slate-500 uppercase text-[10px] font-bold tracking-widest">
                            <tr>
                                <th className="px-6 py-4">Batch Identity</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Organizations</th>
                                <th className="px-6 py-4">Contacts</th>
                                <th className="px-6 py-4">Projects</th>
                                <th className="px-6 py-4">Skips/Warnings</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                            {history.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-16 text-center text-slate-400 italic font-medium">No ingestion history found.</td>
                                </tr>
                            ) : (
                                history.map((batch) => (
                                    <React.Fragment key={batch.id}>
                                        <tr className={cn(
                                            "group hover:bg-slate-50/50 transition-colors cursor-pointer",
                                            expandedBatchId === batch.id && "bg-slate-50/80"
                                        )} onClick={() => setExpandedBatchId(expandedBatchId === batch.id ? null : batch.id)}>
                                            <td className="px-6 py-5">
                                                <div className="font-bold text-slate-900 flex items-center gap-2">
                                                    {expandedBatchId === batch.id ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                                                    <span className="font-mono text-[11px]">{batch.id.slice(0, 8)}</span>
                                                </div>
                                                <div className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tight flex items-center gap-1.5 opacity-70 group-hover:opacity-100 transition-opacity">
                                                    <Clock className="w-3 h-3 text-slate-300" />
                                                    {new Date(batch.createdAt).toLocaleDateString()} at {new Date(batch.createdAt).toLocaleTimeString()}
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <StatusBadge status={batch.status} />
                                            </td>
                                            <td className="px-6 py-5">
                                                <span className="font-extrabold text-slate-700">{batch.totalClientsCommitted}</span>
                                                <span className="text-slate-400 ml-1 font-bold text-[10px]">/{batch.totalClientsAttempted || '-'}</span>
                                            </td>
                                            <td className="px-6 py-5">
                                                <span className="font-extrabold text-slate-700">{batch.totalContactsCommitted}</span>
                                                <span className="text-slate-400 ml-1 font-bold text-[10px]">/{batch.totalContactsAttempted || '-'}</span>
                                            </td>
                                            <td className="px-6 py-5">
                                                <span className="font-extrabold text-slate-700">{batch.totalProjectsCommitted}</span>
                                                <span className="text-slate-400 ml-1 font-bold text-[10px]">/{batch.totalProjectsAttempted || '-'}</span>
                                            </td>
                                            <td className="px-6 py-5">
                                                {batch.skippedDeals > 0 || batch.status === 'WARNING' ? (
                                                    <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 font-bold text-[10px] border border-amber-100 shadow-sm shadow-amber-50/50">
                                                        {batch.skippedDeals} Skips
                                                    </span>
                                                ) : <span className="text-slate-300">-</span>}
                                            </td>
                                            <td className="px-6 py-5 text-right">
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); deleteBatch(batch.id); }}
                                                    className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                                                    title="Purge Batch Data"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                        {expandedBatchId === batch.id && (
                                            <tr>
                                                <td colSpan={7} className="px-12 py-8 bg-slate-50/50 border-y border-slate-100 shadow-inner">
                                                     <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                                                        <div className="space-y-6">
                                                            <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                                <Activity className="w-3.5 h-3.5 text-blue-500" />
                                                                Sequential Metrics
                                                            </h4>
                                                            <div className="grid grid-cols-2 gap-4">
                                                                <MetricTile label="Started At" value={new Date(batch.startedAt).toLocaleTimeString()} />
                                                                <MetricTile label="Finished At" value={batch.completedAt ? new Date(batch.completedAt).toLocaleTimeString() : '-'} />
                                                                <MetricTile label="Linked Projects" value={batch.totalProjectsCommitted} success />
                                                                <MetricTile label="Linking Rate" value={batch.totalProjectsAttempted > 0 ? `${Math.round((batch.totalProjectsCommitted / batch.totalProjectsAttempted) * 100)}%` : '0%'} />
                                                            </div>
                                                        </div>
                                                        <div className="space-y-6">
                                                            <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                                                                Linking Integrity Diagnostics
                                                            </h4>
                                                            <ErrorLogView log={batch.errorLog} />
                                                        </div>
                                                     </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );

    async function deleteBatch(id: string) {
        if (!confirm('Are you sure you want to delete all records associated with this import batch? Linked quotes will block this action.')) return;
        
        try {
            const res = await fetch(`/api/admin/pipedrive-import?batchId=${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            toast.success('Batch data removed');
            fetchHistory();
        } catch (e: any) {
            toast.error(e.message);
        }
    }
}

function FileCard({ title, icon, subtitle, state, onChange }: { 
    title: string; 
    icon: React.ReactNode; 
    subtitle: string; 
    state: FileState;
    onChange: (f: File | null) => void;
}) {
    return (
        <label className={cn(
            "relative block cursor-pointer group rounded-3xl border p-5 transition-all duration-300",
            state.status === 'valid' ? "bg-emerald-50/50 border-emerald-200" : 
            state.status === 'invalid' ? "bg-rose-50/50 border-rose-200" :
            "bg-slate-50 border-slate-200 border-dashed hover:border-blue-400 hover:bg-white"
        )}>
            <input 
                type="file" 
                accept=".csv,.xlsx" 
                className="sr-only" 
                onChange={(e) => onChange(e.target.files?.[0] || null)}
            />
            
            <div className="flex flex-col items-center text-center space-y-3">
                <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-105 duration-500 shadow-sm",
                    state.status === 'valid' ? "bg-emerald-100 text-emerald-600" :
                    state.status === 'invalid' ? "bg-rose-100 text-rose-600" :
                    "bg-white text-slate-400"
                )}>
                    {state.status === 'valid' ? <CheckCircle2 className="w-6 h-6 animate-in zoom-in duration-300" /> : 
                     state.status === 'invalid' ? <XCircle className="w-6 h-6 animate-in zoom-in duration-300" /> : icon}
                </div>
                
                <div>
                    <h4 className="text-sm font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors uppercase tracking-tight">{title}</h4>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5 opacity-70 group-hover:opacity-100">{subtitle}</p>
                </div>

                <div className="mt-2 min-h-[26px]">
                    {state.status === 'empty' ? (
                        <span className="text-[10px] font-bold text-slate-400 tracking-wider">CLICK TO UPLOAD</span>
                    ) : (
                        <div className="px-3 py-1 bg-white border border-slate-100 rounded-full shadow-sm animate-in fade-in slide-in-from-bottom-1 duration-500">
                            <span className="text-[10px] font-extrabold text-slate-700">{state.rowCount} Rows Detected</span>
                        </div>
                    )}
                </div>
            </div>
        </label>
    );
}

function MetricTile({ label, value, success }: { label: string; value: string | number; success?: boolean }) {
    return (
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm shadow-slate-100">
            <div className="text-[9px] text-slate-400 uppercase font-extrabold tracking-widest mb-1">{label}</div>
            <div className={cn("text-sm font-extrabold", success ? "text-emerald-600" : "text-slate-800")}>{value}</div>
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const config: any = {
        'SUCCESS': { bg: 'bg-emerald-50', text: 'text-emerald-600', dot: 'bg-emerald-500', label: 'Healthy' },
        'WARNING': { bg: 'bg-amber-50', text: 'text-amber-600', dot: 'bg-amber-500', label: 'Partial Success' },
        'FAILED': { bg: 'bg-rose-50', text: 'text-rose-600', dot: 'bg-rose-500', label: 'Failure' },
        'PENDING': { bg: 'bg-blue-50', text: 'text-blue-600', dot: 'bg-blue-500', animate: 'animate-pulse', label: 'Processing' }
    };
    const c = config[status] || config.PENDING;
    return (
        <div className={cn("inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider", c.bg, c.text)}>
            <div className={cn("h-1.5 w-1.5 rounded-full", c.dot, c.animate)} />
            {c.label}
        </div>
    );
}

function ErrorLogView({ log }: { log: any }) {
    if (!log) return <div className="text-xs text-slate-400 italic bg-slate-100/50 p-4 rounded-2xl text-center border border-dashed border-slate-200">No linking issues or errors recorded.</div>;
    
    const data = typeof log === 'string' ? JSON.parse(log) : log;
    
    const skippedCount = data.skippedDeals?.length || 0;
    const unmatchedCount = data.unmatchedContacts?.length || 0;
    const validationCount = data.validationErrors?.length || 0;
    const duplicateCount = data.duplicateOrgs?.length || 0;
    const missingContactCount = data.missingContacts?.length || 0;

    const hasIssues = skippedCount + unmatchedCount + validationCount + duplicateCount + missingContactCount;

    if (hasIssues === 0) return (
        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6 text-center shadow-sm">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-3" />
            <p className="text-sm font-bold text-emerald-800">100% Linking Integrity</p>
            <p className="text-[11px] text-emerald-600 font-medium mt-1">All processed records mapped successfully.</p>
        </div>
    );

    return (
        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar p-1">
            {/* Warning Summaries */}
            <div className="grid grid-cols-2 gap-2 mb-4">
                {duplicateCount > 0 && <span className="bg-amber-100/50 border border-amber-200 text-amber-700 text-[10px] font-bold px-2 py-1 rounded-lg">{duplicateCount} Duplicate IDs</span>}
                {skippedCount > 0 && <span className="bg-rose-100/50 border border-rose-200 text-rose-700 text-[10px] font-bold px-2 py-1 rounded-lg">{skippedCount} Skipped Deals</span>}
                {unmatchedCount > 0 && <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-1 rounded-lg">{unmatchedCount} Unmatched People</span>}
            </div>

            {data.validationErrors?.map((err: string, i: number) => (
                <div key={i} className="text-xs text-rose-600 font-extrabold bg-rose-50 p-3 rounded-2xl border border-rose-100 flex items-start gap-2 shadow-sm">
                    <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>CRITICAL ERROR: {err}</span>
                </div>
            ))}

            {data.duplicateOrgs?.map((dup: any, i: number) => (
                <div key={i} className="text-[10px] text-amber-700 bg-amber-50 p-3 rounded-2xl border border-amber-100 flex items-start gap-3 shadow-sm">
                    <History className="w-4 h-4 shrink-0 mt-0.5 opacity-50" />
                    <div className="space-y-1">
                        <div className="font-extrabold uppercase tracking-tight">Duplicate ID Collision</div>
                        <div className="opacity-70">Normalized ID <span className="font-mono text-[9px] bg-white px-1 py-0.5 rounded">{dup.normalized}</span> appeared {dup.count} times. Used last occurrence.</div>
                    </div>
                </div>
            ))}

            {data.skippedDeals?.map((deal: any, i: number) => (
                <div key={i} className="text-[10px] text-rose-800 bg-rose-50/50 p-3 rounded-2xl border border-rose-100 flex items-start gap-3 shadow-sm">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 opacity-50" />
                    <div className="space-y-1">
                        <div className="font-extrabold uppercase tracking-tight">Deal Skipped (Linking Failed)</div>
                        <div className="font-bold">{deal.name} <span className="opacity-50 font-normal">[{deal.id}]</span></div>
                        <div className="opacity-70 mt-1">Reason: {deal.reason}. Attempted Org ID: <span className="font-mono text-[9px] bg-white px-1 py-0.5 rounded">{deal.org_id}</span></div>
                    </div>
                </div>
            ))}

            {data.missingContacts?.map((mc: any, i: number) => (
                <div key={i} className="text-[10px] text-slate-500 bg-white p-3 rounded-2xl border border-slate-100 flex items-start gap-3 italic">
                    <User className="w-4 h-4 shrink-0 mt-0.5 opacity-30" />
                    <span>Deal {mc.deal_id} specifies Contact Person {mc.person_id} which was missing from the people dataset. Proceeded without contact link.</span>
                </div>
            ))}

            {data.debugInfo && (
                <div className="mt-8 pt-8 border-t border-slate-100">
                    <div className="bg-slate-900 rounded-2xl p-4 text-[10px] font-mono text-blue-300 overflow-x-auto shadow-xl">
                        <div className="text-white font-bold mb-2 flex items-center gap-2">
                             Debug Map Diagnostic
                        </div>
                        <pre>{JSON.stringify(data.debugInfo, null, 2)}</pre>
                    </div>
                </div>
            )}

            {data.truncated && (
                <div className="text-[10px] text-slate-400 text-center py-4 italic font-bold uppercase tracking-widest bg-slate-50/50 rounded-2xl">
                    ... Audit log truncated for performance ...
                </div>
            )}
        </div>
    );
}
