'use client';

import { useState, useEffect } from 'react';
import { 
    History, 
    Search, 
    User, 
    Database, 
    ArrowRight,
    Clock,
    FileText,
    Shield,
    LogIn,
    Edit,
    PlusCircle,
    Copy,
    Trash2,
    Loader2,
    Eye
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';

interface AuditLog {
    id: string;
    action: string;
    entityType: string;
    entityId: string;
    metadata: any;
    createdAt: string;
    user: {
        name: string | null;
        email: string;
        role: { name: string };
    };
}

export default function AuditLogPage() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

    const fetchLogs = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/admin/audit');
            if (!res.ok) throw new Error('Failed to fetch logs');
            const data = await res.json();
            setLogs(data);
        } catch (error) {
            toast.error('Could not load activity logs');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    const filteredLogs = logs.filter(log => 
        log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.entityType.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getActionIcon = (action: string) => {
        if (action.includes('LOGIN')) return <LogIn className="w-4 h-4 text-blue-500" />;
        if (action.includes('CREATE')) return <PlusCircle className="w-4 h-4 text-green-500" />;
        if (action.includes('UPDATE') || action.includes('EDIT')) return <Edit className="w-4 h-4 text-amber-500" />;
        if (action.includes('DUPLICATE')) return <Copy className="w-4 h-4 text-indigo-500" />;
        if (action.includes('DELETE') || action.includes('TRASH')) return <Trash2 className="w-4 h-4 text-red-500" />;
        return <FileText className="w-4 h-4 text-gray-500" />;
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-500">
            {/* Header section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">System Audit Log</h1>
                    <p className="text-gray-500 mt-1">Full traceability of all management and estimation events.</p>
                </div>
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Filter by user, action or entity..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded-2xl py-3 pl-11 pr-4 text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium shadow-sm"
                    />
                </div>
            </div>

            {/* Logs Area */}
            <div className="bg-white rounded-3xl border border-gray-200 shadow-xl overflow-hidden min-h-[400px]">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center p-20 gap-4">
                        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                        <p className="text-gray-500 font-medium">Reconstructing event history...</p>
                    </div>
                ) : filteredLogs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-20 text-center">
                        <History className="w-12 h-12 text-gray-200 mb-4" />
                        <h3 className="text-lg font-bold text-gray-900">No events found</h3>
                        <p className="text-gray-500 max-w-xs mx-auto">Try adjusting your search filters or check back later.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50/50 border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Time</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">User</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Action</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Target</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Details</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredLogs.map((log) => (
                                    <tr key={log.id} className="hover:bg-gray-50/50 transition-colors group">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-gray-900">
                                                    {format(new Date(log.createdAt), 'HH:mm:ss')}
                                                </span>
                                                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">
                                                    {format(new Date(log.createdAt), 'MMM dd, yyyy')}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 text-[10px] font-bold">
                                                    {log.user.name?.[0] || log.user.email[0].toUpperCase()}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-gray-900">{log.user.name || 'Unknown'}</span>
                                                    <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">{log.user.role.name}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <div className="p-1.5 rounded-lg bg-gray-100 group-hover:bg-white transition-colors">
                                                    {getActionIcon(log.action)}
                                                </div>
                                                <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                                                    {log.action.replace(/_/g, ' ')}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-1.5">
                                                <span className="px-2 py-0.5 rounded bg-gray-100 text-[10px] font-bold text-gray-500 uppercase">
                                                    {log.entityType}
                                                </span>
                                                <ArrowRight className="w-3 h-3 text-gray-300" />
                                                <span className="text-xs font-mono text-gray-400">
                                                    {log.entityId.substring(0, 8)}...
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <button 
                                                onClick={() => setSelectedLog(log)}
                                                className="inline-flex items-center justify-center p-2 rounded-xl border border-gray-100 bg-white text-gray-400 hover:text-blue-600 hover:border-blue-100 hover:shadow-md transition-all"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Detail Modal */}
            {selectedLog && (
                <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
                    <DialogContent className="sm:max-w-2xl p-0 overflow-hidden border-none rounded-3xl shadow-2xl">
                        <div className="bg-gray-900 p-8 text-white">
                            <DialogHeader>
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2 rounded-xl bg-white/10 ring-1 ring-white/20">
                                        {getActionIcon(selectedLog.action)}
                                    </div>
                                    <DialogTitle className="text-xl font-bold">Event Manifest</DialogTitle>
                                </div>
                                <DialogDescription className="text-gray-400 font-medium">
                                    {selectedLog.action.replace(/_/g, ' ')} / {selectedLog.entityType}
                                </DialogDescription>
                            </DialogHeader>
                        </div>
                        <div className="p-8 space-y-6 bg-white overflow-y-auto max-h-[70vh]">
                            <div className="grid grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Executor</label>
                                        <div className="flex items-center gap-2">
                                            <User className="w-4 h-4 text-blue-600" />
                                            <p className="text-sm font-bold text-gray-900">{selectedLog.user.name || 'System'}</p>
                                        </div>
                                        <p className="text-xs text-gray-500 ml-6">{selectedLog.user.email}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Timestamp</label>
                                        <div className="flex items-center gap-2">
                                            <Clock className="w-4 h-4 text-blue-600" />
                                            <p className="text-sm font-bold text-gray-900">{format(new Date(selectedLog.createdAt), 'PPpp')}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Entity Target</label>
                                        <div className="flex items-center gap-2">
                                            <Database className="w-4 h-4 text-blue-600" />
                                            <p className="text-sm font-bold text-gray-900">{selectedLog.entityType}</p>
                                        </div>
                                        <p className="text-[10px] font-mono text-gray-400 ml-6">{selectedLog.entityId}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Trace Metadata</label>
                                <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                                    <pre className="text-xs font-mono text-gray-700 whitespace-pre-wrap">
                                        {JSON.stringify(selectedLog.metadata, null, 2)}
                                    </pre>
                                </div>
                            </div>

                            <button
                                onClick={() => setSelectedLog(null)}
                                className="w-full bg-gray-900 text-white font-bold py-3 rounded-2xl hover:bg-gray-800 transition-colors"
                            >
                                Close Activity
                            </button>
                        </div>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}
