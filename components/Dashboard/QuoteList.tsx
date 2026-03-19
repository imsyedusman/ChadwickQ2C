'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, FileText, Trash2, Copy, Search, ChevronDown, ChevronRight, Hash, RotateCcw, Filter, Settings2, MoreHorizontal, User as UserIcon, Clock, Check, X, Shield, Briefcase, ChevronLeft, Pencil, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format, formatDistanceToNow } from 'date-fns';
import { cn, formatQuoteNumber } from '@/lib/utils';
import { calculateQuoteTotals, PricingSettings, PricingBoard } from '@/lib/pricing';
import NewQuoteDialog from './NewQuoteDialog';
import { toast } from 'sonner';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import {
    HoverCard,
    HoverCardContent,
    HoverCardTrigger,
} from '@/components/ui/hover-card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from '@/components/ui/dialog';

interface Quote {
    id: string;
    quoteNumber: string;
    revision: number;
    revisionGroupId: string | null;
    clientName: string | null;
    clientCompany: string | null;
    projectRef: string | null;
    description: string | null;
    status: string;
    projectId: string | null;
    projectStatus: string;
    createdAt: string;
    updatedAt: string;
    boards: PricingBoard[];
    overrideLabourRate?: number | null;
    overrideOverheadPct?: number | null;
    overrideEngineeringPct?: number | null;
    overrideTargetMarginPct?: number | null;
    overrideConsumablesPct?: number | null;
    overrideGstPct?: number | null;
    overrideRoundingIncrement?: number | null;
    overrideCopperPricePerKg?: number | null;
    createdBy?: string | null;
    lastModifiedBy?: string | null;
    gridInternalNotes: string | null;
    creator?: { name: string; email: string } | null;
    modifier?: { name: string; email: string } | null;
    project?: {
        id: string;
        projectName: string;
        clientName: string | null;
        companyName: string | null;
        projectStatus: string;
        client?: { name: string } | null;
        contact?: { name: string } | null;
    } | null;
    total?: number;
    totalExGST?: number;
    totalIncGST?: number;
}

// Global settings snapshot may not be needed if we assume global settings for dashboard
// But if quote has overrides, we use them.

export default function QuoteList() {
    const [quotes, setQuotes] = useState<Quote[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');
    const [quoteStatusFilter, setQuoteStatusFilter] = useState<string>('ALL');
    const [projectStatusFilter, setProjectStatusFilter] = useState<string>('ALL');
    const [settings, setSettings] = useState<PricingSettings | null>(null);
    const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
    const [view, setView] = useState<'ACTIVE' | 'TRASH'>('ACTIVE');
    const [isNewQuoteDialogOpen, setIsNewQuoteDialogOpen] = useState(false);
    const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({
        quoteNumber: true,
        projectName: true,
        clientName: true,
        company: true,
        projectStatus: true,
        quoteStatus: true,
        total: true,
        activity: true,
        internalNotes: false,
    });
    const [editingCell, setEditingCell] = useState<{ id: string; field: string; value: string } | null>(null);
    const [savingId, setSavingId] = useState<string | null>(null);
    const [syncingPipedrive, setSyncingPipedrive] = useState(false);
    const [syncBatchId, setSyncBatchId] = useState<string | null>(null);
    const [syncProgress, setSyncProgress] = useState<{ processed: number; committed: number } | null>(null);

    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

    // Poll for sync status
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (syncingPipedrive && syncBatchId) {
            interval = setInterval(async () => {
                try {
                    const res = await fetch(`/api/admin/pipedrive/sync/status?batchId=${syncBatchId}`);
                    if (res.ok) {
                        const data = await res.json();
                        setSyncProgress({
                            processed: data.totalAttempted,
                            committed: data.totalCommitted
                        });
                        if (data.status === 'SUCCESS' || data.status === 'FAILED') {
                            setSyncingPipedrive(false);
                            setSyncBatchId(null);
                        }
                    }
                } catch (error) {
                    console.error('Status polling error', error);
                }
            }, 1500);
        }
        return () => clearInterval(interval);
    }, [syncingPipedrive, syncBatchId]);

    const handleSync = async () => {
        setSyncingPipedrive(true);
        setSyncProgress(null);
        try {
            const res = await fetch('/api/admin/pipedrive/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'recent' }),
            });
            
            if (res.ok) {
                const data = await res.json();
                setSyncBatchId(data.batchId);
                toast.success('Pipedrive sync started');
            } else if (res.status === 409) {
                const data = await res.json();
                setSyncBatchId(data.conflict.id);
                toast.info('A synchronization is already in progress');
            } else {
                const data = await res.json().catch(() => ({}));
                toast.error(data.error || 'Sync failed to start');
                setSyncingPipedrive(false);
            }
        } catch (error) {
            console.error('Sync error', error);
            toast.error('An error occurred during sync');
            setSyncingPipedrive(false);
        }
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === quotes.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(quotes.map(q => q.id));
        }
    };

    const toggleSelect = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setSelectedIds(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleBulkDelete = async () => {
        if (selectedIds.length === 0) return;
        setActionLoading(true);
        const isPermanent = view === 'TRASH';
        try {
            const res = await fetch(`/api/quotes?permanent=${isPermanent}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: selectedIds }),
            });
            if (res.ok) {
                setSelectedIds([]);
                fetchQuotes();
                setIsBulkDeleteDialogOpen(false);
                toast.success(`Successfully deleted ${selectedIds.length} quotes`);
            } else {
                const data = await res.json();
                toast.error(data.error || 'Failed to delete quotes');
            }
        } catch (error) {
            console.error('Failed to delete quotes', error);
            toast.error('An error occurred during deletion');
        } finally {
            setActionLoading(false);
        }
    };

    // Column Persistence
    useEffect(() => {
        const savedVisibility = localStorage.getItem('quotesGridColumnVisibility');
        if (savedVisibility) {
            try {
                setColumnVisibility(JSON.parse(savedVisibility));
            } catch (e) {
                console.error('Failed to parse column visibility', e);
            }
        }
    }, []);

    const toggleColumnVisibility = (field: string, visible: boolean) => {
        const newVisibility = { ...columnVisibility, [field]: visible };
        setColumnVisibility(newVisibility);
        localStorage.setItem('quotesGridColumnVisibility', JSON.stringify(newVisibility));
    };

    // Pagination
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(25);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(0);

    const router = useRouter();

    useEffect(() => {
        setPage(1); // Reset to first page on filter or limit change
    }, [view, quoteStatusFilter, projectStatusFilter, search, limit]);

    useEffect(() => {
        fetchQuotes();
    }, [view, quoteStatusFilter, projectStatusFilter, search, page, limit]);

    useEffect(() => {
        const next = searchInput.trim();
        if (!next) {
            setSearch('');
            return;
        }

        const t = setTimeout(() => setSearch(next), 250);
        return () => clearTimeout(t);
    }, [searchInput]);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchQuotes = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                showTrash: (view === 'TRASH').toString(),
                page: page.toString(),
                limit: limit.toString()
            });
            if (quoteStatusFilter !== 'ALL') params.append('status', quoteStatusFilter);
            if (projectStatusFilter !== 'ALL') params.append('projectStatus', projectStatusFilter);
            if (search) params.append('search', search);

            const url = `/api/quotes?${params}`;
            const res = await fetch(url);
            const result = await res.json();
            // result is { data, page, limit, total, totalPages }
            setQuotes(result.data || []);
            setTotal(result.total || 0);
            setTotalPages(result.totalPages || 0);
        } catch (error) {
            console.error('Failed to fetch quotes', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchSettings = async () => {
        try {
            const res = await fetch('/api/settings');
            const data = await res.json();
            setSettings(data);
        } catch (error) {
            console.error('Failed to fetch settings', error);
        }
    };



    const getStatusDisplay = (status: string) => {
        const statusMap: Record<string, { label: string; className: string }> = {
            'DRAFT': { label: 'Draft', className: 'bg-yellow-100 text-yellow-700' },
            'SENT': { label: 'Sent', className: 'bg-blue-100 text-blue-700' },
            'WON': { label: 'Won', className: 'bg-green-100 text-green-700' },
            'LOST': { label: 'Lost', className: 'bg-red-100 text-red-700' },
        };
        return statusMap[status] || { label: status, className: 'bg-gray-100 text-gray-700' };
    };

    const getProjectStatusDisplay = (status: string) => {
        const statusMap: Record<string, { label: string; className: string }> = {
            'Budget': { label: 'Budget', className: 'bg-purple-100 text-purple-700 border-purple-200' },
            'Tender': { label: 'Tender', className: 'bg-orange-100 text-orange-700 border-orange-200' },
            'Live': { label: 'Live', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
        };
        return statusMap[status] || { label: status, className: 'bg-gray-100 text-gray-700 border-gray-200' };
    };

    const handleInlineUpdate = async (quoteId: string, field: string, value: string, projectId?: string) => {
        const originalValue = quotes.find(q => q.id === quoteId)?.[field as keyof Quote] || '';

        setSavingId(quoteId);
        try {
            let res: Response;
            if ((field === 'projectName' || field === 'projectStatus') && projectId) {
                const projectBody: any = {};
                if (field === 'projectName') projectBody.projectName = value;
                if (field === 'projectStatus') projectBody.projectStatus = value;

                res = await fetch(`/api/projects/${projectId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(projectBody)
                });
            } else {
                const quoteBody = { id: quoteId, field, value };
                res = await fetch('/api/quotes/bulk-update', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(quoteBody)
                });
            }

            if (!res.ok) throw new Error('Update failed');

            // Refresh the grid to ensure alignment with server state
            await fetchQuotes();
            setEditingCell(null);
        } catch (error) {
            console.error('Update failed', error);
            // Revert optimistic update
            setQuotes(prev => prev.map(q => {
                if (q.id === quoteId) {
                    if (field === 'projectName' && q.project) {
                        return { ...q, project: { ...q.project, projectName: originalValue as any } };
                    }
                    if (field === 'projectStatus' && q.project) {
                        return { ...q, project: { ...q.project, projectStatus: originalValue as any } };
                    }
                    return { ...q, [field]: originalValue };
                }
                return q;
            }));
            alert('Failed to update field');
        } finally {
            setSavingId(null);
        }
    };

    const getInitials = (name?: string | null, email?: string | null) => {
        if (name && name.trim()) {
            return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
        }
        if (email) {
            return email.split('@')[0].substring(0, 2).toUpperCase();
        }
        return '??';
    };

    const handleCreate = () => {
        setIsNewQuoteDialogOpen(true);
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        const isPermanent = view === 'TRASH';

        if (isPermanent) {
            if (!confirm('Permanently delete this quote? This will also update the sequential numbering if this was the latest quote. This action cannot be undone.')) return;
        } else {
            if (!confirm('Move this quote to Trash?')) return;
        }

        try {
            const res = await fetch(`/api/quotes/${id}?permanent=${isPermanent}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete quote');

            // Re-fetch to update pagination and grid
            await fetchQuotes();
            router.refresh();
        } catch (error) {
            console.error('Failed to delete quote', error);
            alert('Failed to delete quote');
        }
    };

    const handleRestore = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        try {
            const res = await fetch(`/api/quotes/${id}/restore`, { method: 'POST' });
            if (res.status === 409) {
                const data = await res.json();
                alert(data.error || 'Quote number already exists. Please rename it before restoring.');
                return;
            }
            if (!res.ok) throw new Error('Failed to restore quote');

            // Re-fetch to update pagination and grid
            await fetchQuotes();
            router.refresh();
        } catch (error) {
            console.error('Failed to restore quote', error);
            alert('Failed to restore quote');
        }
    };

    const handleDuplicate = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();

        try {
            const res = await fetch(`/api/quotes/${id}/duplicate`, {
                method: 'POST',
            });

            if (!res.ok) {
                throw new Error('Failed to duplicate quote');
            }

            const newQuote = await res.json();

            // Refresh the quotes list
            await fetchQuotes();

            // Navigate to the new quote
            router.push(`/quote/${newQuote.id}`);
        } catch (error) {
            console.error('Failed to duplicate quote', error);
            alert('Failed to duplicate quote. Please try again.');
        }
    };

    const filteredQuotes = Array.isArray(quotes) ? quotes.filter((q: Quote) =>
        (q.clientName || '').toLowerCase().includes(search.toLowerCase()) ||
        (q.clientCompany || '').toLowerCase().includes(search.toLowerCase()) ||
        (q.project?.projectName || q.projectRef || '').toLowerCase().includes(search.toLowerCase()) ||
        (q.quoteNumber || '').toLowerCase().includes(search.toLowerCase())
    ) : [];

    interface QuoteGroup {
        quoteNumber: string;
        parent: Quote;
        children: Quote[];
        latestUpdate: string;
        highestRevision: number;
    }

    const groupedQuotes = useMemo(() => {
        const groups: Record<string, Quote[]> = {};
        
        filteredQuotes.forEach((q: Quote) => {
            // AUTHORITATIVE GROUPING: Use revisionGroupId if available
            // FALLBACK (for data consistency): Strip suffix if missing (Q26-0263-A -> Q26-0263)
            const fallbackKey = q.quoteNumber.split('-').slice(0, 2).join('-');
            const groupId = q.revisionGroupId || fallbackKey;
            
            if (!groups[groupId]) {
                groups[groupId] = [];
            }
            groups[groupId].push(q);
        });

        const result: QuoteGroup[] = Object.entries(groups).map(([groupId, quotesInGroup]) => {
            // Sort by revision ascending: 0 (parent) always first
            const sortedByRev = [...quotesInGroup].sort((a, b) => (a.revision || 0) - (b.revision || 0));
            const parent = sortedByRev[0];
            const children = sortedByRev.slice(1);

            // Highest revision strictly for the group
            const highestRevision = Math.max(...quotesInGroup.map((q: Quote) => q.revision || 0));
            
            const latestUpdate = quotesInGroup.reduce((latest: string, q: Quote) =>
                (new Date(q.updatedAt) > new Date(latest)) ? q.updatedAt : latest
                , quotesInGroup[0]?.updatedAt || new Date().toISOString());

            return {
                quoteNumber: parent.quoteNumber.replace(/-[A-Z]+$/, ''),
                parent,
                children,
                latestUpdate,
                highestRevision
            };
        });

        // Sort groups by latest update descending
        return result.sort((a, b) => new Date(b.latestUpdate).getTime() - new Date(a.latestUpdate).getTime());
    }, [filteredQuotes]);

    const toggleGroup = (e: React.MouseEvent, quoteNumber: string) => {
        e.stopPropagation();
        setCollapsedGroups(prev => ({
            ...prev,
            [quoteNumber]: !prev[quoteNumber]
        }));
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                    <h1 className="text-3xl font-bold text-gray-900">Quotes</h1>
                    <div className="flex bg-gray-100 p-1 rounded-lg self-end">
                        <button
                            onClick={() => setView('ACTIVE')}
                            className={cn(
                                "px-4 py-1.5 text-sm font-medium rounded-md transition-all",
                                view === 'ACTIVE'
                                    ? "bg-white text-blue-600 shadow-sm"
                                    : "text-gray-500 hover:text-gray-700"
                            )}
                        >
                            Active
                        </button>
                        <button
                            onClick={() => setView('TRASH')}
                            className={cn(
                                "px-4 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-2",
                                view === 'TRASH'
                                    ? "bg-white text-red-600 shadow-sm"
                                    : "text-gray-500 hover:text-gray-700"
                            )}
                        >
                            <Trash2 size={16} />
                            Trash
                        </button>
                    </div>
                </div>
                {view === 'ACTIVE' && (
                    <div className="flex items-center gap-3">
                        <Button
                            variant="outline"
                            onClick={handleSync}
                            disabled={syncingPipedrive}
                            className="flex items-center gap-2 border-gray-200 rounded-xl h-10 shadow-sm hover:bg-slate-50 transition-all font-semibold text-slate-600"
                        >
                            {syncingPipedrive ? (
                                <Loader2 className="animate-spin text-blue-500" size={18} />
                            ) : (
                                <img src="/pipedrive.jpeg" alt="Pipedrive" className="w-5 h-5 rounded-md" />
                            )}
                            {syncingPipedrive ? 'Syncing...' : 'Sync Pipedrive'}
                        </Button>

                        <button
                            onClick={handleCreate}
                            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 font-bold h-10"
                        >
                            <Plus size={20} />
                            New Quote
                        </button>
                    </div>
                )}
            </div>

            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search quotes, clients, or projects..."
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-gray-900 placeholder:text-gray-400 bg-white shadow-sm hover:border-gray-300"
                    />
                </div>

                <div className="flex items-center gap-2">
                    <Select value={projectStatusFilter} onValueChange={setProjectStatusFilter}>
                        <SelectTrigger className="w-[160px] bg-white border-gray-200 h-10 rounded-xl shadow-sm hover:border-gray-300">
                            <SelectValue placeholder="Project Status" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                            <SelectItem value="ALL">All Project Status</SelectItem>
                            <SelectItem value="Budget">Budget</SelectItem>
                            <SelectItem value="Tender">Tender</SelectItem>
                            <SelectItem value="Live">Live</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={quoteStatusFilter} onValueChange={setQuoteStatusFilter}>
                        <SelectTrigger className="w-[160px] bg-white border-gray-200 h-10 rounded-xl shadow-sm hover:border-gray-300">
                            <SelectValue placeholder="Quote Status" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                            <SelectItem value="ALL">All Quote Status</SelectItem>
                            <SelectItem value="DRAFT">Draft</SelectItem>
                            <SelectItem value="SENT">Sent</SelectItem>
                            <SelectItem value="WON">Won</SelectItem>
                            <SelectItem value="LOST">Lost</SelectItem>
                        </SelectContent>
                    </Select>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="icon" className="h-10 w-10 border-gray-200 rounded-xl bg-white shadow-sm hover:bg-gray-50">
                                <Settings2 className="h-4 w-4 text-gray-500" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56 rounded-xl p-2">
                            <DropdownMenuLabel className="px-2 py-1.5 text-xs font-bold text-gray-400 uppercase tracking-wider">Visible Columns</DropdownMenuLabel>
                            <DropdownMenuSeparator className="my-1" />
                            <DropdownMenuCheckboxItem
                                checked={columnVisibility.projectName}
                                onCheckedChange={(v) => toggleColumnVisibility('projectName', !!v)}
                                className="rounded-md"
                            >
                                Project Name
                            </DropdownMenuCheckboxItem>
                            <DropdownMenuCheckboxItem
                                checked={columnVisibility.clientName}
                                onCheckedChange={(v) => toggleColumnVisibility('clientName', !!v)}
                                className="rounded-md"
                            >
                                Client Name
                            </DropdownMenuCheckboxItem>
                            <DropdownMenuCheckboxItem
                                checked={columnVisibility.company}
                                onCheckedChange={(v) => toggleColumnVisibility('company', !!v)}
                                className="rounded-md"
                            >
                                Company
                            </DropdownMenuCheckboxItem>
                            <DropdownMenuCheckboxItem
                                checked={columnVisibility.projectStatus}
                                onCheckedChange={(v) => toggleColumnVisibility('projectStatus', !!v)}
                                className="rounded-md"
                            >
                                Project Status
                            </DropdownMenuCheckboxItem>
                            <DropdownMenuCheckboxItem
                                checked={columnVisibility.quoteStatus}
                                onCheckedChange={(v) => toggleColumnVisibility('quoteStatus', !!v)}
                                className="rounded-md"
                            >
                                Quote Status
                            </DropdownMenuCheckboxItem>
                            <DropdownMenuCheckboxItem
                                checked={columnVisibility.total}
                                onCheckedChange={(v) => toggleColumnVisibility('total', !!v)}
                                className="rounded-md"
                            >
                                Total (Ex GST)
                            </DropdownMenuCheckboxItem>
                            <DropdownMenuCheckboxItem
                                checked={columnVisibility.activity}
                                onCheckedChange={(v) => toggleColumnVisibility('activity', !!v)}
                                className="rounded-md"
                            >
                                Activity
                            </DropdownMenuCheckboxItem>
                            <DropdownMenuCheckboxItem
                                checked={columnVisibility.internalNotes}
                                onCheckedChange={(v) => toggleColumnVisibility('internalNotes', !!v)}
                                className="rounded-md"
                            >
                                Internal Grid Notes
                            </DropdownMenuCheckboxItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
                {/* Table Header */}
                <div className={cn(
                    "grid gap-0 px-6 py-3 bg-gray-50 border-b border-gray-200 text-[10px] font-bold text-gray-500 uppercase tracking-widest items-center",
                    {
                        "grid-cols-[1.5fr_1.5fr_1fr_1fr_0.8fr_0.8fr_1fr_1fr_auto]": true
                    }
                )}
                    style={{
                        gridTemplateColumns: `40px 1.5fr ${columnVisibility.projectName ? '1.5fr' : ''} ${columnVisibility.clientName ? '1fr' : ''} ${columnVisibility.company ? '1fr' : ''} ${columnVisibility.projectStatus ? '0.8fr' : ''} ${columnVisibility.quoteStatus ? '0.8fr' : ''} ${columnVisibility.total ? '0.8fr' : ''} ${columnVisibility.internalNotes ? '1.2fr' : ''} ${columnVisibility.activity ? '1fr' : ''} 40px`.replace(/\s+/g, ' ')
                    }}
                >
                    <div className="flex items-center justify-center border-r border-gray-200/60 h-full py-1">
                        <input 
                            type="checkbox" 
                            checked={quotes.length > 0 && selectedIds.length === quotes.length}
                            onChange={toggleSelectAll}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                    </div>
                    <div className="flex items-center gap-2 border-r border-gray-200/60 h-full py-1 pl-4">Quote Number</div>
                    {columnVisibility.projectName && <div className="border-r border-gray-200/60 h-full py-1 pl-4">Project Name</div>}
                    {columnVisibility.clientName && <div className="border-r border-gray-200/60 h-full py-1 pl-4">Client Name</div>}
                    {columnVisibility.company && <div className="border-r border-gray-200/60 h-full py-1 pl-4">Company</div>}
                    {columnVisibility.projectStatus && <div className="text-center border-r border-gray-200/60 h-full py-1 px-2">Proj Status</div>}
                    {columnVisibility.quoteStatus && <div className="text-center border-r border-gray-200/60 h-full py-1 px-2">Quote Status</div>}
                    {columnVisibility.total && <div className="text-right border-r border-gray-200/60 h-full py-1 pr-4">Total (Ex GST)</div>}
                    {columnVisibility.internalNotes && <div className="border-r border-gray-200/60 h-full py-1 pl-4">Grid Notes</div>}
                    {columnVisibility.activity && <div className="pl-4 h-full py-1">Activity</div>}
                    <div className="w-10"></div>
                </div>

                <div className="divide-y divide-gray-100 overflow-y-auto max-h-[calc(100vh-280px)] relative">
                    {loading && (
                        <div className="sticky top-0 z-20 w-full bg-white/80 backdrop-blur-sm border-b border-gray-100">
                            <div className="px-6 py-4 text-sm text-gray-500">
                                Loading quotes…
                            </div>
                        </div>
                    )}
                    {groupedQuotes.map((group) => {
                        const isCollapsed = collapsedGroups[group.quoteNumber] || false;
                        const parent = group.parent;
                        const totalPrice = parent.total || 0;
                        const updatedDate = new Date(parent.updatedAt);

                        return (
                            <div key={group.quoteNumber} className="flex flex-col">
                                {/* Parent Row */}
                                 <div
                                    className={cn(
                                        "grid gap-0 px-6 py-5 items-center hover:bg-gray-50 transition-all group animate-in fade-in slide-in-from-top-1 duration-200",
                                        !isCollapsed && group.children.length > 0 && "bg-blue-50/20"
                                    )}
                                    style={{
                                        gridTemplateColumns: `40px 1.5fr ${columnVisibility.projectName ? '1.5fr' : ''} ${columnVisibility.clientName ? '1fr' : ''} ${columnVisibility.company ? '1fr' : ''} ${columnVisibility.projectStatus ? '0.8fr' : ''} ${columnVisibility.quoteStatus ? '0.8fr' : ''} ${columnVisibility.total ? '0.8fr' : ''} ${columnVisibility.internalNotes ? '1.2fr' : ''} ${columnVisibility.activity ? '1fr' : ''} 40px`.replace(/\s+/g, ' ')
                                    }}
                                >
                                    {/* Selection Checkbox */}
                                    <div className="flex items-center justify-center border-r border-gray-100 h-full">
                                        <input 
                                            type="checkbox" 
                                            checked={selectedIds.includes(parent.id)}
                                            onChange={(e) => toggleSelect(e as any, parent.id)}
                                            onClick={(e) => e.stopPropagation()}
                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                        />
                                    </div>
                                    {/* Debug Validation */}
                                    {(() => {
                                        if (process.env.NODE_ENV === 'development') {
                                            console.log(`[QuoteRow] Parent ID: ${parent.id} | EX: ${parent.totalExGST} | INC: ${parent.totalIncGST} | Display: totalExGST`);
                                        }
                                        return null;
                                    })()}
                                    {/* Quote Number - NAVIGATION TRIGGER */}
                                    <div 
                                        className="flex items-center gap-3 border-r border-gray-100 h-full pr-2 cursor-pointer group/nav"
                                        onClick={() => router.push(`/quote/${parent.id}`)}
                                    >
                                        <div className="flex items-center gap-2">
                                            {group.children.length > 0 && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        toggleGroup(e, group.parent.id);
                                                    }}
                                                    className="p-1 hover:bg-gray-200 rounded text-gray-400 transition-all hover:scale-110 active:scale-95"
                                                >
                                                    {collapsedGroups[group.parent.id] ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                                                </button>
                                            )}
                                        </div>
                                        <div>
                                            <div className="font-bold text-gray-900 flex items-center gap-2 text-sm group-hover/nav:text-blue-600 group-hover/nav:underline">
                                                {formatQuoteNumber(parent.quoteNumber, parent.revision)}
                                                {/* Only show 'Latest' on parent if no children exist */}
                                                {group.children.length === 0 && (
                                                    <span className="text-[8px] font-black px-1.5 py-0.5 bg-green-500 text-white rounded-full uppercase tracking-tighter no-underline inline-block">
                                                        Latest
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1.5 text-[10px] text-gray-400 mt-1">
                                                <Clock size={10} />
                                                {parent.createdAt ? format(new Date(parent.createdAt), 'dd/MM/yy') : '--/--/--'}
                                            </div>
                                        </div>
                                    </div>

                                     {/* Project Name */}
                                    {columnVisibility.projectName && (
                                        <div
                                            className={cn(
                                                "font-semibold text-gray-800 truncate text-sm flex items-center gap-2 group/cell h-full border-r border-gray-100 pl-4 pr-2",
                                                editingCell?.id === parent.id && editingCell?.field === 'projectName' && "bg-blue-50/50"
                                            )}
                                            title={parent.project?.projectName || parent.projectRef || ''}
                                            onDoubleClick={(e) => {
                                                e.stopPropagation();
                                                setEditingCell({ id: parent.id, field: 'projectName', value: parent.project?.projectName || parent.projectRef || '' });
                                            }}
                                        >
                                            {editingCell?.id === parent.id && editingCell?.field === 'projectName' ? (
                                                <input
                                                    autoFocus
                                                    className="w-full px-2 py-1 text-sm border-b-2 border-blue-500 focus:outline-none bg-transparent"
                                                    value={editingCell.value}
                                                    onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value })}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') handleInlineUpdate(parent.id, 'projectName', editingCell.value, parent.projectId || undefined);
                                                        if (e.key === 'Escape') setEditingCell(null);
                                                    }}
                                                    onBlur={() => handleInlineUpdate(parent.id, 'projectName', editingCell.value, parent.projectId || undefined)}
                                                />
                                            ) : (
                                                <span className="flex items-center gap-2">
                                                    <span className="truncate group-hover:text-blue-600 border-b border-transparent hover:border-blue-200 pb-0.5 transition-all">
                                                        {parent.project?.projectName || parent.projectRef || <span className="text-gray-300 italic">Untitled</span>}
                                                    </span>
                                                    <Pencil size={12} className="text-gray-300 opacity-0 group-hover/cell:opacity-100 transition-opacity" />
                                                </span>
                                            )}
                                        </div>
                                    )}

                                     {/* Client Name */}
                                    {columnVisibility.clientName && (
                                        <div
                                            className={cn(
                                                "text-sm text-gray-600 truncate flex items-center gap-2 group/cell h-full border-r border-gray-100 pl-4 pr-2",
                                                editingCell?.id === parent.id && editingCell?.field === 'clientName' && "bg-blue-50/50"
                                            )}
                                            onDoubleClick={(e) => {
                                                e.stopPropagation();
                                                setEditingCell({ id: parent.id, field: 'clientName', value: parent.project?.contact?.name || parent.project?.clientName || parent.clientName || '' });
                                            }}
                                        >
                                            {editingCell?.id === parent.id && editingCell?.field === 'clientName' ? (
                                                <input
                                                    autoFocus
                                                    className="w-full px-2 py-1 text-sm border-b-2 border-blue-500 focus:outline-none bg-transparent"
                                                    value={editingCell.value}
                                                    onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value })}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') handleInlineUpdate(parent.id, 'clientName', editingCell.value);
                                                        if (e.key === 'Escape') setEditingCell(null);
                                                    }}
                                                    onBlur={() => handleInlineUpdate(parent.id, 'clientName', editingCell.value)}
                                                />
                                            ) : (
                                                <span className="flex items-center gap-2">
                                                    <span className="truncate group-hover:text-blue-600 border-b border-transparent hover:border-blue-200 pb-0.5 transition-all">
                                                        {parent.project?.contact?.name || parent.project?.clientName || parent.clientName || <span className="text-gray-300">---</span>}
                                                    </span>
                                                    <Pencil size={12} className="text-gray-300 opacity-0 group-hover/cell:opacity-100 transition-opacity" />
                                                </span>
                                            )}
                                        </div>
                                    )}

                                     {/* Company Name */}
                                    {columnVisibility.company && (
                                        <div
                                            className="text-sm text-gray-600 truncate h-full flex items-center border-r border-gray-100 pl-4 pr-2"
                                        >
                                            {editingCell?.id === parent.id && editingCell?.field === 'clientCompany' ? (
                                                <input
                                                    autoFocus
                                                    className="w-full px-2 py-1 text-sm border-b-2 border-blue-500 focus:outline-none bg-transparent"
                                                    value={editingCell.value}
                                                    onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value })}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') handleInlineUpdate(parent.id, 'clientCompany', editingCell.value);
                                                        if (e.key === 'Escape') setEditingCell(null);
                                                    }}
                                                    onBlur={() => handleInlineUpdate(parent.id, 'clientCompany', editingCell.value)}
                                                />
                                            ) : (
                                                <span
                                                    className="hover:text-blue-600 border-b border-transparent hover:border-blue-200 pb-0.5 transition-all"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setEditingCell({ id: parent.id, field: 'clientCompany', value: parent.project?.client?.name || parent.project?.companyName || parent.clientCompany || '' });
                                                    }}
                                                >
                                                    {parent.project?.client?.name || parent.project?.companyName || parent.clientCompany || <span className="text-gray-300">---</span>}
                                                </span>
                                            )}
                                        </div>
                                    )}

                                     {/* Project Status */}
                                    {columnVisibility.projectStatus && (
                                        <div className="flex justify-center border-r border-gray-100 h-full items-center px-2" onClick={(e) => e.stopPropagation()}>
                                            {parent.projectId ? (
                                                <Select
                                                    value={parent.project?.projectStatus}
                                                    onValueChange={(val) => handleInlineUpdate(parent.id, 'projectStatus', val, parent.projectId!)}
                                                >
                                                    <SelectTrigger className={cn(
                                                        "h-7 px-2 text-[10px] font-bold rounded border uppercase tracking-tighter w-[80px]",
                                                        getProjectStatusDisplay(parent.project!.projectStatus).className
                                                    )}>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent className="rounded-xl">
                                                        <SelectItem value="Budget">Budget</SelectItem>
                                                        <SelectItem value="Tender">Tender</SelectItem>
                                                        <SelectItem value="Live">Live</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            ) : (
                                                <span className="text-[10px] font-bold px-2 py-1 rounded border border-gray-100 text-gray-400 uppercase tracking-tighter bg-gray-50/50">
                                                    Legacy
                                                </span>
                                            )}
                                        </div>
                                    )}

                                     {/* Quote Status */}
                                    {columnVisibility.quoteStatus && (
                                        <div className="flex justify-center border-r border-gray-100 h-full items-center px-2" onClick={(e) => e.stopPropagation()}>
                                            <Select
                                                value={parent.status}
                                                onValueChange={(val) => handleInlineUpdate(parent.id, 'status', val)}
                                            >
                                                <SelectTrigger className={cn(
                                                    "h-7 px-2 text-[10px] font-bold rounded border uppercase tracking-tighter w-[80px]",
                                                    getStatusDisplay(parent.status).className
                                                )}>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-xl">
                                                    <SelectItem value="DRAFT">Draft</SelectItem>
                                                    <SelectItem value="SENT">Sent</SelectItem>
                                                    <SelectItem value="WON">Won</SelectItem>
                                                    <SelectItem value="LOST">Lost</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}

                                     {/* Total */}
                                    {columnVisibility.total && (
                                        <div className="text-right font-bold text-gray-900 text-sm border-r border-gray-100 h-full flex items-center justify-end pr-4">
                                            ${(parent.totalExGST ?? parent.total ?? 0).toLocaleString()}
                                        </div>
                                    )}

                                     {/* Internal Grid Notes */}
                                    {columnVisibility.internalNotes && (
                                        <div
                                            className="text-xs text-gray-500 truncate italic cursor-text hover:bg-white/80 px-4 py-2 rounded transition-colors group/note border-r border-gray-100 h-full flex items-center bg-gray-50/50 mx-2"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setEditingCell({ id: parent.id, field: 'gridInternalNotes', value: parent.gridInternalNotes || '' });
                                            }}
                                        >
                                            {editingCell?.id === parent.id && editingCell?.field === 'gridInternalNotes' ? (
                                                <textarea
                                                    autoFocus
                                                    className="w-full p-2 text-xs border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-lg"
                                                    value={editingCell.value}
                                                    onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value })}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter' && e.ctrlKey) handleInlineUpdate(parent.id, 'gridInternalNotes', editingCell.value);
                                                        if (e.key === 'Escape') setEditingCell(null);
                                                    }}
                                                    onBlur={() => handleInlineUpdate(parent.id, 'gridInternalNotes', editingCell.value)}
                                                />
                                            ) : (
                                                <>
                                                    {parent.gridInternalNotes || <span className="text-gray-300 opacity-0 group-hover/note:opacity-100 transition-opacity">Add note...</span>}
                                                </>
                                            )}
                                        </div>
                                    )}

                                    {/* Activity Column */}
                                    {columnVisibility.activity && (
                                        <div className="pl-4">
                                            <HoverCard openDelay={200}>
                                                <HoverCardTrigger asChild>
                                                    <div className="flex items-center gap-2 cursor-help group/activity">
                                                        <div className="w-6 h-6 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center text-[10px] font-bold text-blue-700 shadow-sm transition-transform group-hover/activity:scale-110">
                                                            {getInitials(parent.modifier?.name || parent.creator?.name, parent.modifier?.email || parent.creator?.email)}
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-[10px] font-semibold text-gray-600">
                                                                {getInitials(parent.modifier?.name || parent.creator?.name, parent.modifier?.email || parent.creator?.email)}
                                                            </span>
                                                            <span className="text-[9px] text-gray-400">
                                                                {formatDistanceToNow(new Date(parent.updatedAt), { addSuffix: true }).replace('about ', '')}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </HoverCardTrigger>
                                                <HoverCardContent className="w-80 rounded-2xl p-4 shadow-xl border-gray-100" side="left">
                                                    <div className="flex flex-col gap-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="p-2 bg-blue-50 rounded-xl">
                                                                <Clock size={20} className="text-blue-600" />
                                                            </div>
                                                            <div>
                                                                <h4 className="text-sm font-bold text-gray-900">Activity History</h4>
                                                                <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Audit Detail</p>
                                                            </div>
                                                        </div>
                                                        <div className="space-y-3">
                                                            <div className="flex items-start gap-3">
                                                                <div className="mt-0.5 p-1 bg-green-50 rounded-md">
                                                                    <Plus size={10} className="text-green-600" />
                                                                </div>
                                                                <div className="flex-1">
                                                                    <p className="text-xs text-gray-600">Created by <span className="font-bold text-gray-900">{parent.creator?.name || 'Unknown'}</span></p>
                                                                    <p className="text-[10px] text-gray-400">{format(new Date(parent.createdAt), 'dd MMM yyyy HH:mm')}</p>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-start gap-3">
                                                                <div className="mt-0.5 p-1 bg-yellow-50 rounded-md">
                                                                    <MoreHorizontal size={10} className="text-yellow-600" />
                                                                </div>
                                                                <div className="flex-1">
                                                                    <p className="text-xs text-gray-600">Last modified by <span className="font-bold text-gray-900">{parent.modifier?.name || parent.creator?.name || 'Unknown'}</span></p>
                                                                    <p className="text-[10px] text-gray-400">{format(new Date(parent.updatedAt), 'dd MMM yyyy HH:mm')}</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </HoverCardContent>
                                            </HoverCard>
                                        </div>
                                    )}

                                    {/* Actions */}
                                    <div className="flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-gray-100 rounded-lg text-gray-400 group-hover:text-gray-600">
                                                    <MoreHorizontal size={16} />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-48 rounded-xl p-2">
                                                {view === 'ACTIVE' ? (
                                                    <>
                                                        <DropdownMenuItem onClick={(e) => handleDuplicate(e, parent.id)} className="rounded-md gap-3 py-2">
                                                            <Copy size={16} className="text-blue-500" />
                                                            Duplicate Quote
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator className="my-1" />
                                                        <DropdownMenuItem onClick={(e) => handleDelete(e, parent.id)} className="rounded-md gap-3 py-2 text-red-600 focus:text-red-700 focus:bg-red-50">
                                                            <Trash2 size={16} />
                                                            Move to Trash
                                                        </DropdownMenuItem>
                                                    </>
                                                ) : (
                                                    <>
                                                        <DropdownMenuItem onClick={(e) => handleRestore(e, parent.id)} className="rounded-md gap-3 py-2 text-green-600 focus:text-green-700 focus:bg-green-50">
                                                            <RotateCcw size={16} />
                                                            Restore Quote
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator className="my-1" />
                                                        <DropdownMenuItem onClick={(e) => handleDelete(e, parent.id)} className="rounded-md gap-3 py-2 text-red-600 focus:text-red-700 focus:bg-red-50 font-bold">
                                                            <Trash2 size={16} />
                                                            Delete Permanently
                                                        </DropdownMenuItem>
                                                    </>
                                                )}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>

                                {/* Child Rows */}
                                {!collapsedGroups[group.parent.id] && group.children.length > 0 && (
                                    <div className="flex flex-col relative">
                                        {/* Vertical Connector Line */}
                                        <div className="absolute left-[36px] top-0 bottom-6 w-px bg-blue-100/60 z-10" />
                                        
                                        {group.children.map((child: Quote) => {
                                            const childTotal = child.totalExGST ?? child.total ?? 0;
                                            
                                            // Debug Validation
                                            if (process.env.NODE_ENV === 'development') {
                                                console.log(`[QuoteRow] Child ID: ${child.id} | EX: ${child.totalExGST} | INC: ${child.totalIncGST} | Display: totalExGST`);
                                            }
                                            return (
                                                    <div
                                                        key={child.id}
                                                        className={cn(
                                                            "grid gap-0 px-6 py-3 items-center hover:bg-white transition-all group/child border-b border-gray-100 last:border-0 relative",
                                                            child.revision === group.highestRevision && "bg-green-50/10"
                                                        )}
                                                        style={{
                                                            gridTemplateColumns: `1.5fr ${columnVisibility.projectName ? '1.5fr' : ''} ${columnVisibility.clientName ? '1fr' : ''} ${columnVisibility.company ? '1fr' : ''} ${columnVisibility.projectStatus ? '0.8fr' : ''} ${columnVisibility.quoteStatus ? '0.8fr' : ''} ${columnVisibility.total ? '0.8fr' : ''} ${columnVisibility.internalNotes ? '1.2fr' : ''} ${columnVisibility.activity ? '1fr' : ''} 40px`.replace(/\s+/g, ' ')
                                                        }}
                                                    >
                                                        {/* Quote Number with indent and connector stub - NAVIGATION TRIGGER */}
                                                        <div 
                                                            className="flex items-center gap-3 pl-[32px] border-r border-gray-100 h-full py-2 relative cursor-pointer group/nav"
                                                            onClick={() => router.push(`/quote/${child.id}`)}
                                                        >
                                                            {/* Horizontal branch from vertical line */}
                                                            <div className="absolute left-[-1px] top-1/2 w-4 h-px bg-blue-100/60" />
                                                            
                                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-400/30 shrink-0" />
                                                            <div>
                                                                <div className="text-xs font-bold text-gray-600 flex items-center gap-2 group-hover/nav:text-blue-600 group-hover/nav:underline">
                                                                    {formatQuoteNumber(child.quoteNumber, child.revision)}
                                                                    {child.revision === group.highestRevision && (
                                                                        <span className="text-[7px] font-black px-1 py-0.25 bg-green-500 text-white rounded-full uppercase tracking-tighter no-underline">
                                                                            Latest
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <div className="text-[9px] text-gray-400 font-medium">
                                                                    {format(new Date(child.updatedAt), 'dd/MM/yy HH:mm')}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        
                                                        {/* Project Name */}
                                                        {columnVisibility.projectName && (
                                                            <div
                                                                className={cn(
                                                                    "text-xs text-gray-500 truncate italic border-r border-gray-100 h-full flex items-center pl-4 pr-2 group/cell",
                                                                    editingCell?.id === child.id && editingCell?.field === 'projectName' && "bg-blue-50/50"
                                                                )}
                                                                onDoubleClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setEditingCell({ id: child.id, field: 'projectName', value: child.project?.projectName || child.projectRef || '' });
                                                                }}
                                                            >
                                                                {editingCell?.id === child.id && editingCell?.field === 'projectName' ? (
                                                                    <input
                                                                        autoFocus
                                                                        className="w-full px-2 py-1 text-xs border-b border-blue-500 focus:outline-none bg-transparent"
                                                                        value={editingCell.value}
                                                                        onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value })}
                                                                        onKeyDown={(e) => {
                                                                            if (e.key === 'Enter') handleInlineUpdate(child.id, 'projectName', editingCell.value, child.projectId || undefined);
                                                                            if (e.key === 'Escape') setEditingCell(null);
                                                                        }}
                                                                        onBlur={() => handleInlineUpdate(child.id, 'projectName', editingCell.value, child.projectId || undefined)}
                                                                        onClick={(e) => e.stopPropagation()}
                                                                    />
                                                                ) : (
                                                                    <span className="flex items-center gap-2">
                                                                        <span className="truncate group-hover/child:text-blue-600 border-b border-transparent hover:border-blue-200 pb-0.5 transition-all">{child.project?.projectName || child.projectRef || 'No description'}</span>
                                                                        <Pencil size={10} className="text-gray-300 opacity-0 group-hover/cell:opacity-100 transition-opacity" />
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )}

                                                        {/* Client Name */}
                                                        {columnVisibility.clientName && (
                                                            <div
                                                                className={cn(
                                                                    "text-xs text-gray-500 truncate border-r border-gray-100 h-full flex items-center pl-4 pr-2 group/cell",
                                                                    editingCell?.id === child.id && editingCell?.field === 'clientName' && "bg-blue-50/50"
                                                                )}
                                                                onDoubleClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setEditingCell({ id: child.id, field: 'clientName', value: child.project?.clientName || child.clientName || '' });
                                                                }}
                                                            >
                                                                {editingCell?.id === child.id && editingCell?.field === 'clientName' ? (
                                                                    <input
                                                                        autoFocus
                                                                        className="w-full px-2 py-1 text-xs border-b border-blue-500 focus:outline-none bg-transparent"
                                                                        value={editingCell.value}
                                                                        onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value })}
                                                                        onKeyDown={(e) => {
                                                                            if (e.key === 'Enter') handleInlineUpdate(child.id, 'clientName', editingCell.value);
                                                                            if (e.key === 'Escape') setEditingCell(null);
                                                                        }}
                                                                        onBlur={() => handleInlineUpdate(child.id, 'clientName', editingCell.value)}
                                                                        onClick={(e) => e.stopPropagation()}
                                                                    />
                                                                ) : (
                                                                    <span className="flex items-center gap-2">
                                                                        <span className="truncate group-hover/child:text-blue-600 border-b border-transparent hover:border-blue-200 pb-0.5 transition-all">{child.project?.clientName || child.clientName || '---'}</span>
                                                                        <Pencil size={10} className="text-gray-300 opacity-0 group-hover/cell:opacity-100 transition-opacity" />
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )}

                                                        {/* Company */}
                                                        {columnVisibility.company && (
                                                            <div className="text-xs text-gray-500 truncate border-r border-gray-100 h-full flex items-center pl-4 pr-2 group/cell">
                                                                <span 
                                                                    className="truncate hover:text-blue-600 cursor-pointer border-b border-transparent hover:border-blue-200 pb-0.5 transition-all"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setEditingCell({ id: child.id, field: 'clientCompany', value: child.project?.companyName || child.clientCompany || '' });
                                                                    }}
                                                                >
                                                                    {child.project?.companyName || child.clientCompany || '---'}
                                                                </span>
                                                            </div>
                                                        )}

                                                        {/* Project Status */}
                                                        {columnVisibility.projectStatus && (
                                                            <div className="flex justify-center border-r border-gray-100 h-full items-center px-2" onClick={(e) => e.stopPropagation()}>
                                                                {child.projectId ? (
                                                                    <Select
                                                                        value={child.project?.projectStatus}
                                                                        onValueChange={(val) => handleInlineUpdate(child.id, 'projectStatus', val, child.projectId!)}
                                                                    >
                                                                        <SelectTrigger className={cn(
                                                                            "h-6 px-1.5 text-[8px] font-bold rounded border uppercase tracking-tighter w-[70px]",
                                                                            getProjectStatusDisplay(child.project!.projectStatus).className
                                                                        )} onClick={(e) => e.stopPropagation()}>
                                                                            <SelectValue />
                                                                        </SelectTrigger>
                                                                        <SelectContent className="rounded-xl">
                                                                            <SelectItem value="Budget">Budget</SelectItem>
                                                                            <SelectItem value="Tender">Tender</SelectItem>
                                                                            <SelectItem value="Live">Live</SelectItem>
                                                                        </SelectContent>
                                                                    </Select>
                                                                ) : (
                                                                    <div className="text-[8px] font-bold px-1.5 py-0.5 rounded border border-gray-100 text-gray-400 uppercase tracking-tighter bg-gray-50/50">
                                                                        Legacy
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}

                                                        {/* Quote Status */}
                                                        {columnVisibility.quoteStatus && (
                                                            <div className="flex justify-center border-r border-gray-100 h-full items-center px-2" onClick={(e) => e.stopPropagation()}>
                                                                <Select
                                                                    value={child.status}
                                                                    onValueChange={(val) => handleInlineUpdate(child.id, 'status', val)}
                                                                >
                                                                    <SelectTrigger className={cn(
                                                                        "h-6 px-1.5 text-[8px] font-bold rounded border uppercase tracking-tighter w-[70px]",
                                                                        getStatusDisplay(child.status).className
                                                                    )} onClick={(e) => e.stopPropagation()}>
                                                                        <SelectValue />
                                                                    </SelectTrigger>
                                                                    <SelectContent className="rounded-xl">
                                                                        <SelectItem value="DRAFT">Draft</SelectItem>
                                                                        <SelectItem value="SENT">Sent</SelectItem>
                                                                        <SelectItem value="WON">Won</SelectItem>
                                                                        <SelectItem value="LOST">Lost</SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                        )}

                                                        {/* Total */}
                                                        {columnVisibility.total && (
                                                            <div className="text-right text-xs font-bold text-gray-600 border-r border-gray-100 h-full flex items-center justify-end pr-4">
                                                                ${childTotal.toLocaleString()}
                                                            </div>
                                                        )}

                                                        {/* Internal Notes */}
                                                        {columnVisibility.internalNotes && (
                                                            <div
                                                                className="text-[10px] text-gray-400 truncate italic border-r border-gray-100 h-full flex items-center pl-4 pr-2 bg-gray-50/10 mx-2 group/cell cursor-text"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setEditingCell({ id: child.id, field: 'gridInternalNotes', value: child.gridInternalNotes || '' });
                                                                }}
                                                            >
                                                                {editingCell?.id === child.id && editingCell?.field === 'gridInternalNotes' ? (
                                                                    <input
                                                                        autoFocus
                                                                        className="w-full px-2 py-1 text-[10px] border border-blue-500 rounded focus:outline-none bg-white font-normal non-italic"
                                                                        value={editingCell.value}
                                                                        onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value })}
                                                                        onKeyDown={(e) => {
                                                                            if (e.key === 'Enter') handleInlineUpdate(child.id, 'gridInternalNotes', editingCell.value);
                                                                            if (e.key === 'Escape') setEditingCell(null);
                                                                        }}
                                                                        onBlur={() => handleInlineUpdate(child.id, 'gridInternalNotes', editingCell.value)}
                                                                        onClick={(e) => e.stopPropagation()}
                                                                    />
                                                                ) : (
                                                                    <span className="truncate">{child.gridInternalNotes || <span className="text-gray-200">...</span>}</span>
                                                                )}
                                                            </div>
                                                        )}

                                                        {/* Activity */}
                                                        {columnVisibility.activity && (
                                                            <div className="pl-4 flex items-center gap-2 opacity-70">
                                                                <div className="w-4 h-4 rounded-full bg-blue-50 flex items-center justify-center text-[8px] font-bold text-blue-600 border border-blue-100">
                                                                    {getInitials(child.modifier?.name || child.creator?.name, child.modifier?.email || child.creator?.email)}
                                                                </div>
                                                                <span className="text-[8px] text-gray-400">
                                                                    {formatDistanceToNow(new Date(child.updatedAt), { addSuffix: true }).replace('about ', '')}
                                                                </span>
                                                            </div>
                                                        )}

                                                        {/* Actions */}
                                                        <div className="flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                    <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-gray-100 rounded-lg text-gray-400 flex items-center justify-center transition-colors">
                                                                        <MoreHorizontal size={14} />
                                                                    </Button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent align="end" className="w-48 rounded-xl p-2">
                                                                    <DropdownMenuItem onClick={(e) => handleDuplicate(e, child.id)} className="rounded-md gap-3 py-2">
                                                                        <Copy size={16} className="text-blue-500" />
                                                                        Duplicate Version
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuSeparator className="my-1" />
                                                                    <DropdownMenuItem onClick={(e) => handleDelete(e, child.id)} className="rounded-md gap-3 py-2 text-red-600 focus:text-red-700 focus:bg-red-50">
                                                                        <Trash2 size={16} />
                                                                        Move to Trash
                                                                    </DropdownMenuItem>
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        </div>
                                                    </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {groupedQuotes.length === 0 && (
                    <div className="text-center py-20 bg-gray-50/50">
                        <div className="flex flex-col items-center justify-center space-y-3">
                            <div className="p-4 bg-white rounded-full border border-gray-100 shadow-sm">
                                <Search className="text-gray-300" size={32} />
                            </div>
                            <p className="text-gray-500 font-medium">
                                {loading ? 'Searching…' : 'No results match your filters.'}
                            </p>
                            <Button variant="outline" size="sm" onClick={() => {
                                setQuoteStatusFilter('ALL');
                                setProjectStatusFilter('ALL');
                                setSearchInput('');
                                setSearch('');
                            }}>
                                Clear all filters
                            </Button>
                        </div>
                    </div>
                )}

                 {/* Pagination Footer */}
                {(totalPages > 1 || limit !== 25) && (
                    <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                        <div className="flex items-center gap-8">
                            <div className="text-sm text-gray-500">
                                Showing <span className="font-semibold text-gray-900">{total > 0 ? ((page - 1) * limit) + 1 : 0}</span> to <span className="font-semibold text-gray-900">{Math.min(page * limit, total)}</span> of <span className="font-semibold text-gray-900">{total}</span> quotes
                            </div>
                            
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Per Page</span>
                                <Select 
                                    value={limit.toString()} 
                                    onValueChange={(val) => {
                                        setLimit(parseInt(val));
                                        setPage(1);
                                    }}
                                >
                                    <SelectTrigger className="h-8 w-[70px] bg-white border-gray-200 rounded-lg text-xs shadow-sm">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl">
                                        <SelectItem value="25">25</SelectItem>
                                        <SelectItem value="50">50</SelectItem>
                                        <SelectItem value="100">100</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage(prev => Math.max(1, prev - 1))}
                                disabled={page === 1}
                                className="h-9 px-3 rounded-xl border-gray-200 bg-white"
                            >
                                <ChevronLeft size={16} />
                                Previous
                            </Button>
                            <div className="flex items-center gap-1">
                                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                    // Basic pagination logic
                                    let startPage = Math.max(1, page - 2);
                                    let endPage = Math.min(totalPages, startPage + 4);
                                    if (endPage - startPage < 4) startPage = Math.max(1, endPage - 4);

                                    const p = startPage + i;
                                    if (p > totalPages || p < 1) return null;

                                    return (
                                        <Button
                                            key={p}
                                            variant={page === p ? "default" : "outline"}
                                            size="sm"
                                            onClick={() => setPage(p)}
                                            className={cn(
                                                "h-9 w-9 rounded-xl p-0",
                                                page === p ? "bg-blue-600 hover:bg-blue-700" : "border-gray-200 bg-white"
                                            )}
                                        >
                                            {p}
                                        </Button>
                                    );
                                })}
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
                                disabled={page === totalPages || totalPages === 0}
                                className="h-9 px-3 rounded-xl border-gray-200 bg-white"
                            >
                                Next
                                <ChevronRight size={16} />
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            <NewQuoteDialog
                isOpen={isNewQuoteDialogOpen}
                onClose={() => setIsNewQuoteDialogOpen(false)}
            />
            {/* Bulk Delete Dialog */}
            <Dialog open={isBulkDeleteDialogOpen} onOpenChange={setIsBulkDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="text-red-600 flex items-center gap-2">
                            <AlertCircle /> {view === 'TRASH' ? 'Permanently Delete' : 'Move to Trash'} {selectedIds.length} Quotes?
                        </DialogTitle>
                        <DialogDescription className="py-2">
                            <div className="space-y-3">
                                <p className="font-bold text-gray-900 border-l-4 border-red-500 pl-4 bg-red-50 py-2">
                                    WARNING: You are about to {view === 'TRASH' ? 'permanently delete' : 'trash'} {selectedIds.length} quotes.
                                </p>
                                <p>This action {view === 'TRASH' ? 'cannot' : 'can'} be undone {view === 'TRASH' ? '' : 'from the Trash view'}.</p>
                            </div>
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="ghost" onClick={() => setIsBulkDeleteDialogOpen(false)}>Cancel</Button>
                        <Button 
                            variant="destructive" 
                            onClick={handleBulkDelete}
                            disabled={actionLoading}
                        >
                            {actionLoading ? <Loader2 className="animate-spin" /> : `${view === 'TRASH' ? 'Delete' : 'Trash'} ${selectedIds.length} Quotes`}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Bulk Actions Bar */}
            {selectedIds.length > 0 && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-6 animate-in slide-in-from-bottom-8 duration-300 z-50">
                    <div className="flex items-center gap-3 pr-6 border-r border-slate-700">
                        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center font-bold text-sm">
                            {selectedIds.length}
                        </div>
                        <span className="text-sm font-medium">Quotes Selected</span>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => setSelectedIds([])}
                            className="text-slate-400 hover:text-white hover:bg-slate-800"
                        >
                            Clear Selection
                        </Button>
                        
                        <Button 
                            variant="destructive" 
                            size="sm"
                            onClick={() => setIsBulkDeleteDialogOpen(true)}
                            className="bg-red-600 hover:bg-red-700 gap-2"
                        >
                            <Trash2 size={16} />
                            {view === 'TRASH' ? 'Delete Permanently' : 'Move to Trash'}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
