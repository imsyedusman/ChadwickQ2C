'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
    ChevronLeft, 
    Calendar, 
    User, 
    Building2, 
    Briefcase,
    Plus,
    Clock,
    ArrowUpRight,
    Loader2,
    Link as LinkIcon,
    RefreshCw,
    FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { format } from 'date-fns';
import { cn, formatQuoteNumber } from '@/lib/utils';
import { toast } from 'sonner';
import LinkDealModal from '@/components/Project/LinkDealModal';
import QuoteRow from '@/components/Project/QuoteRow';
import DuplicateQuoteDialog from '@/components/Dashboard/DuplicateQuoteDialog';

import { 
    getProjectClientDisplay, 
    getProjectCompanyDisplay, 
    getProjectContactDisplay 
} from '@/lib/project-utils';

interface Project {
    id: string;
    projectName: string;
    clientName: string | null;
    companyName: string | null;
    projectStatus: string;
    createdAt: string;
    pipedrive_deal_id?: number | null;
    dealValue?: number | null;
    currency?: string | null;
    dealCreatedAt?: string | null;
    expectedCloseDate?: string | null;
    quoteFolder?: string | null;
    pipedriveDealUrl?: string | null;
    client?: { name: string } | null;
    contact?: { name: string } | null;
    quotes: {
        id: string;
        quoteNumber: string;
        revision: number;
        status: string;
        total: number;
        totalExGST: number;
        totalIncGST: number;
        createdAt: string;
        updatedAt: string;
        modifier?: { name: string };
    }[];
}

export default function ProjectDetail() {
    const params = useParams();
    const router = useRouter();
    const [project, setProject] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
    const [optimisticQuotes, setOptimisticQuotes] = useState<any[]>([]);
    const [duplicateDialog, setDuplicateDialog] = useState<{
        isOpen: boolean;
        quoteId: string;
        clientName: string;
        clientCompany: string;
    }>({ isOpen: false, quoteId: '', clientName: '', clientCompany: '' });
    const [actionLoading, setActionLoading] = useState(false);

    const fetchProject = async () => {
        try {
            const url = `/api/projects/${params.id}`;
            const res = await fetch(url);
            if (!res.ok) throw new Error('Failed to fetch project');
            const result = await res.json();
            // result is { project, quotes }
            setProject({ ...result.project, quotes: result.quotes });
            setOptimisticQuotes(result.quotes);
        } catch (error) {
            console.error('Failed to fetch project:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (params.id) {
            fetchProject();
        }
    }, [params.id]);

    const handleCreateQuote = async () => {
        try {
            const res = await fetch('/api/quotes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId: project.id,
                    projectRef: project.projectName,
                    clientName: project.clientName,
                    clientCompany: project.companyName,
                    description: project.projectDescription,
                })
            });
            if (!res.ok) throw new Error('Failed to create quote');
            const newQuote = await res.json();
            
            setOptimisticQuotes([newQuote, ...optimisticQuotes]);
            toast.success('Quote created successfully');
            fetchProject(); // Refetch backgrounds to sync
        } catch (err) {
            toast.error('Error creating quote');
        }
    };

    const handleDuplicateQuoteClick = (quote: any) => {
        setDuplicateDialog({
            isOpen: true,
            quoteId: quote.id,
            clientName: quote.clientName || '',
            clientCompany: quote.clientCompany || '',
        });
    };

    const handleDuplicateConfirm = async (
        clientName: string, 
        clientCompany: string,
        pipedrivePersonId?: number | null,
        pipedriveOrgId?: number | null
    ) => {
        try {
            const res = await fetch(`/api/quotes/${duplicateDialog.quoteId}/duplicate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    clientName, 
                    clientCompany,
                    pipedrivePersonId,
                    pipedriveOrgId
                }),
            });

            if (!res.ok) throw new Error('Failed to duplicate quote');
            const newQuote = await res.json();
            
            setOptimisticQuotes(prev => {
                const idx = prev.findIndex(q => q.id === duplicateDialog.quoteId);
                if (idx > -1) {
                    const newArr = [...prev];
                    newArr.splice(idx + 1, 0, newQuote);
                    return newArr;
                }
                return [newQuote, ...prev];
            });
            toast.success('Quote duplicated successfully');
            fetchProject();
        } catch (error) {
            toast.error('Failed to duplicate quote');
        }
    };

    const handleCreateRevision = async (id: string) => {
        setActionLoading(true);
        try {
            const res = await fetch(`/api/quotes/${id}/revision`, {
                method: 'POST',
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || 'Failed to create revision');
            }

            const newQuote = await res.json();
            toast.success('Revision created successfully');
            fetchProject();
            router.push(`/quote/${newQuote.id}`);
        } catch (error: any) {
            console.error('Failed to create revision', error);
            toast.error(`Failed: ${error.message}`);
        } finally {
            setActionLoading(false);
        }
    };

    const handleUpdateQuote = (id: string, diff: any) => {
        setOptimisticQuotes(prev => prev.map(q => q.id === id ? { ...q, ...diff } : q));
    };

    const handleDeleteQuote = async (id: string) => {
        if (!confirm("Are you sure you want to delete this quote?")) return;
        setOptimisticQuotes(prev => prev.filter(q => q.id !== id));
        try {
            const res = await fetch('/api/quotes', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: [id] })
            });
            if (!res.ok) throw new Error('Failed to delete quote');
            toast.success('Quote deleted');
            fetchProject();
        } catch (err) {
            toast.error('Failed to delete quote');
            fetchProject(); 
        }
    };

    const handleProjectStatusChange = async (newStatus: string) => {
        setProject({ ...project, projectStatus: newStatus });
        try {
            await fetch(`/api/projects/${project.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectStatus: newStatus })
            });
        } catch (err) {
            toast.error('Failed to update project status');
            fetchProject();
        }
    };

    const sortedQuotes = (() => {
        const groups = optimisticQuotes.reduce((acc, quote) => {
            const match = quote.quoteNumber.match(/^(Q\d{2}-\d{4})/);
            const base = match ? match[1] : quote.quoteNumber;
            if (!acc[base]) acc[base] = [];
            acc[base].push(quote);
            return acc;
        }, {} as Record<string, any[]>);

        const flat: any[] = [];
        const sortedBases = Object.keys(groups).sort((a: string, b: string) => {
            const aLatest = Math.max(...groups[a].map((q: any) => new Date(q.createdAt).getTime()));
            const bLatest = Math.max(...groups[b].map((q: any) => new Date(q.createdAt).getTime()));
            return bLatest - aLatest;
        });

        for (const base of sortedBases) {
            const group = groups[base];
            group.sort((a: any, b: any) => a.revision - b.revision);
            if (group.length > 0) {
                flat.push({ ...group[0], _isChild: false });
                for (let i = 1; i < group.length; i++) {
                    flat.push({ ...group[i], _isChild: true });
                }
            }
        }
        return flat;
    })();

    const handleLinkDeal = async (deal: any) => {
        setIsLinkModalOpen(false);
        setRefreshing(true);
        try {
            // Fetch full deal details
            const detailRes = await fetch(`/api/pipedrive/deal/${deal.id}`);
            const fullDeal = await detailRes.json();

            const res = await fetch(`/api/projects/${params.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    pipedrive_deal_id: deal.id,
                    projectName: deal.title,
                    dealValue: fullDeal.value,
                    currency: fullDeal.currency,
                    dealCreatedAt: fullDeal.add_time ? new Date(fullDeal.add_time) : undefined,
                    expectedCloseDate: fullDeal.expected_close_date ? new Date(fullDeal.expected_close_date) : undefined,
                    quoteFolder: fullDeal.quote_folder,
                    pipedriveDealUrl: `https://app.pipedrive.com/deal/${deal.id}`,
                    client: fullDeal.organization ? {
                        pipedrive_org_id: fullDeal.organization.id,
                        name: fullDeal.organization.name
                    } : undefined,
                    contact: fullDeal.person ? {
                        pipedrive_person_id: fullDeal.person.id,
                        name: fullDeal.person.name
                    } : undefined
                })
            });

            if (res.ok) {
                toast.success('Project linked to Pipedrive deal');
                fetchProject();
            } else {
                toast.error('Failed to link deal');
            }
        } catch (error) {
            toast.error('Error linking deal');
        } finally {
            setRefreshing(false);
        }
    };

    const handleRefresh = async () => {
        if (!project?.pipedrive_deal_id) return;

        setRefreshing(true);
        try {
            const detailRes = await fetch(`/api/pipedrive/deal/${project.pipedrive_deal_id}`);
            const fullDeal = await detailRes.json();

            const res = await fetch(`/api/projects/${params.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectName: fullDeal.title,
                    dealValue: fullDeal.value,
                    currency: fullDeal.currency,
                    dealCreatedAt: fullDeal.add_time ? new Date(fullDeal.add_time) : undefined,
                    expectedCloseDate: fullDeal.expected_close_date ? new Date(fullDeal.expected_close_date) : undefined,
                    quoteFolder: fullDeal.quote_folder,
                    pipedriveDealUrl: `https://app.pipedrive.com/deal/${project.pipedrive_deal_id}`,
                    client: fullDeal.organization ? {
                        pipedrive_org_id: fullDeal.organization.id,
                        name: fullDeal.organization.name
                    } : undefined,
                    contact: fullDeal.person ? {
                        pipedrive_person_id: fullDeal.person.id,
                        name: fullDeal.person.name
                    } : undefined
                })
            });

            if (res.ok) {
                toast.success('Refreshed from Pipedrive');
                fetchProject();
            } else {
                toast.error('Failed to refresh');
            }
        } catch (error) {
            toast.error('Error refreshing project');
        } finally {
            setRefreshing(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
                <div className="flex flex-col items-center">
                    <Loader2 className="animate-spin text-blue-500 mb-4" size={40} />
                    <div className="text-gray-500 font-bold uppercase tracking-widest text-xs">Loading project details...</div>
                </div>
            </div>
        );
    }

    if (!project) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
                <p className="text-gray-500">Project not found</p>
                <Button onClick={() => router.push('/projects')}>Back to Projects</Button>
            </div>
        );
    }

    const getProjectStatusDisplay = (status: string) => {
        const statusMap: Record<string, { label: string; className: string }> = {
            'Budget': { label: 'Budget', className: 'bg-purple-100 text-purple-700 border-purple-200' },
            'Tender': { label: 'Tender', className: 'bg-orange-100 text-orange-700 border-orange-200' },
            'Live': { label: 'Live', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
        };
        return statusMap[status] || { label: status, className: 'bg-gray-100 text-gray-700 border-gray-200' };
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

    return (
        <main className="w-full max-w-[1600px] mx-auto px-6 py-8 animate-in fade-in duration-500">
                <LinkDealModal 
                    isOpen={isLinkModalOpen} 
                    onClose={() => setIsLinkModalOpen(false)} 
                    onSelect={handleLinkDeal} 
                />
                
                {/* Header & Back Button */}
                <div className="mb-8">
                    <button 
                        onClick={() => router.push('/projects')}
                        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors mb-4 group"
                    >
                        <ChevronLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
                        Back to Projects
                    </button>
                    
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <h1 className="text-3xl font-bold text-gray-900">{project.projectName}</h1>
                                <Select value={project.projectStatus} onValueChange={handleProjectStatusChange}>
                                    <SelectTrigger className={cn(
                                        "px-3 py-1 h-8 text-xs font-bold rounded-full border uppercase tracking-widest shadow-sm w-[120px] focus:ring-2 focus:ring-blue-500 bg-white cursor-pointer transition-colors",
                                        getProjectStatusDisplay(project.projectStatus).className
                                    )}>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Budget">Budget</SelectItem>
                                        <SelectItem value="Tender">Tender</SelectItem>
                                        <SelectItem value="Live">Live</SelectItem>
                                    </SelectContent>
                                </Select>
                                {project.pipedrive_deal_id && (
                                    <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-[10px] font-bold border border-blue-100 uppercase tracking-wider">
                                        <LinkIcon size={12} />
                                        Linked Deal #{project.pipedrive_deal_id}
                                    </div>
                                )}
                            </div>
                            <div className="flex flex-wrap items-center gap-y-2 gap-x-6 text-sm text-gray-500">
                                <div className="flex items-center gap-2">
                                    <Building2 size={16} className="text-gray-400" />
                                    <span className="font-bold text-gray-800">{getProjectCompanyDisplay(project)}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <User size={16} className="text-gray-400" />
                                    <span className="font-bold text-gray-800">{getProjectClientDisplay(project)}</span>
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                            {project.pipedriveDealUrl && (
                                <Button 
                                    variant="outline"
                                    onClick={() => window.open(project.pipedriveDealUrl, '_blank')}
                                    className="border-slate-200 text-slate-600 hover:bg-slate-50 gap-2 h-11 px-5 rounded-xl transition-all font-bold"
                                >
                                    <div className="w-5 h-5 rounded overflow-hidden shrink-0">
                                        <img src="/pipedrive.jpeg" alt="Pipedrive" className="w-full h-full object-cover" />
                                    </div>
                                    View in Pipedrive
                                </Button>
                            )}
                            {!project.pipedrive_deal_id && (
                                <Button 
                                    variant="outline"
                                    onClick={() => setIsLinkModalOpen(true)}
                                    className="border-slate-200 text-slate-600 hover:bg-slate-50 gap-2 h-11 px-5 rounded-xl transition-all font-bold"
                                >
                                    <LinkIcon size={18} />
                                    Link Pipedrive Deal
                                </Button>
                            )}
                            <Button onClick={handleCreateQuote} className="bg-blue-600 hover:bg-blue-700 text-white gap-2 h-11 px-6 rounded-xl shadow-lg shadow-blue-200 transition-all hover:scale-[1.02] active:scale-[0.98] font-bold">
                                <Plus size={20} />
                                New Project Quote
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
                    <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
                            <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total Quotes</p>
                                <p className="text-2xl font-bold text-gray-900">{optimisticQuotes.length || 0}</p>
                            </div>
                            <div className="mt-4 flex items-center gap-2 text-xs text-gray-500">
                                <FileText size={14} className="text-gray-400" />
                                <span>Quotes across all revisions</span>
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
                            <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Combined Selling (EX GST)</p>
                                <p className="text-2xl font-bold text-gray-900 text-blue-600">
                                    ${(optimisticQuotes.reduce((acc: number, q: any) => acc + (q.totalExGST || q.total || 0), 0) || 0).toLocaleString()}
                                </p>
                            </div>
                            <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-blue-500 uppercase tracking-tighter bg-blue-50 px-2 py-0.5 rounded-md self-start">
                                Exclusive of GST
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
                            <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Latest Activity</p>
                                <p className="text-lg font-bold text-gray-800 truncate">
                                    {optimisticQuotes.length > 0 
                                        ? format(new Date(optimisticQuotes[0].updatedAt), 'MMM d, h:mm a')
                                        : 'No activity yet'}
                                </p>
                            </div>
                            <div className="mt-4 flex items-center gap-2 text-xs text-gray-500">
                                <Clock size={14} className="text-gray-400" />
                                <span>Last modified date</span>
                            </div>
                        </div>
                    </div>

                    {/* Pipedrive Sidebar Stats */}
                    <div className="bg-slate-900 rounded-2xl p-6 shadow-xl border border-slate-800 relative overflow-hidden flex flex-col justify-between group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-16 -mt-16" />
                        
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <img src="/pipedrive.jpeg" alt="Pipedrive" className="w-5 h-5 rounded" />
                                    <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Pipedrive Deal</span>
                                </div>
                                {project.pipedriveDealUrl && (
                                    <a 
                                        href={project.pipedriveDealUrl} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-gray-400 hover:text-white transition-colors"
                                    >
                                        <ArrowUpRight size={14} />
                                    </a>
                                )}
                            </div>
                            
                            {project.pipedrive_deal_id ? (
                                <div className="space-y-4">
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Deal Value</p>
                                        <p className="text-xl font-bold text-white">
                                            {(() => {
                                                const val = Number(project.dealValue);
                                                return (project.dealValue && !isNaN(val)) 
                                                    ? `$${val.toLocaleString()}` 
                                                    : "—";
                                            })()}
                                        </p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Expected Close</p>
                                            <p className="text-xs font-bold text-slate-300">
                                                {project.expectedCloseDate ? format(new Date(project.expectedCloseDate), 'MMM d, yyyy') : 'TBA'}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Created</p>
                                            <p className="text-xs font-bold text-slate-300">
                                                {project.dealCreatedAt ? format(new Date(project.dealCreatedAt), 'MMM d, yyyy') : 'Unknown'}
                                            </p>
                                        </div>
                                    </div>
                                    {project.quoteFolder && (
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Quote Folder</p>
                                            <a 
                                                href={project.quoteFolder}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-2 p-2 bg-slate-800 rounded-lg text-xs font-bold text-blue-400 hover:bg-slate-700 hover:text-blue-300 transition-all border border-slate-700"
                                            >
                                                <FileText size={14} />
                                                Open Sharepoint Folder
                                            </a>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="py-4 text-center">
                                    <p className="text-xs text-slate-500 font-medium italic">Project not linked to a Pipedrive deal.</p>
                                    <Button 
                                        variant="link" 
                                        size="sm" 
                                        onClick={() => setIsLinkModalOpen(true)}
                                        className="text-blue-400 text-[10px] font-bold uppercase tracking-widest h-auto p-0 mt-2"
                                    >
                                        Link Now
                                    </Button>
                                </div>
                            )}
                        </div>

                        {project.pipedrive_deal_id && (
                            <button 
                                onClick={handleRefresh}
                                disabled={refreshing}
                                className="mt-6 flex items-center justify-center gap-2 w-full h-10 rounded-xl bg-slate-800 border border-slate-700 text-[10px] font-bold text-slate-300 uppercase tracking-widest hover:bg-slate-700 hover:text-white transition-all disabled:opacity-50"
                            >
                                <RefreshCw size={14} className={cn(refreshing && "animate-spin")} />
                                {refreshing ? 'Refreshing...' : 'Sync from Pipedrive'}
                            </button>
                        )}
                    </div>
                </div>

                {/* Quotes Table */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                        <h2 className="font-bold text-gray-900 flex items-center gap-2">
                            <Briefcase size={18} className="text-blue-500" />
                            Associated Quotes
                        </h2>
                    </div>
                    
                    <div className="overflow-x-auto">
                        <table className="w-full text-left table-fixed">
                            <thead className="bg-gray-50/50">
                                <tr>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest w-[160px]">Quote Number</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest w-[140px]">Status</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest min-w-[200px]">Inline Notes</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest w-[140px]">Total (Sell)</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest w-[120px]">Date Created</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest w-[140px]">Activity</th>
                                    <th className="px-6 py-4 w-[100px]"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {sortedQuotes.map((quote: any) => (
                                    <QuoteRow 
                                        key={quote.id} 
                                        quote={quote} 
                                        isChild={quote._isChild}
                                        onUpdate={handleUpdateQuote}
                                        onDuplicate={handleDuplicateQuoteClick}
                                        onCreateRevision={handleCreateRevision}
                                        onDelete={handleDeleteQuote}
                                    />
                                ))}
                                {optimisticQuotes.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                                            No quotes found for this project.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <DuplicateQuoteDialog
                    isOpen={duplicateDialog.isOpen}
                    onClose={() => setDuplicateDialog({ ...duplicateDialog, isOpen: false })}
                    onDuplicate={handleDuplicateConfirm}
                    initialClientName={duplicateDialog.clientName}
                    initialClientCompany={duplicateDialog.clientCompany}
                />
            </main>
    );
}
