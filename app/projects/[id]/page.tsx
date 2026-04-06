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
    FileText,
    ChevronUp,
    ChevronDown
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

import { useSearchParams } from 'next/navigation';

export default function ProjectDetail() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    
    // Sort parameters
    const currentSort = searchParams.get('sort') || 'updatedAt';
    const currentDir = (searchParams.get('dir') || 'desc') as 'asc' | 'desc';

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

    const handleCreateRevision = async (id: string) => {
        try {
            const res = await fetch(`/api/quotes/${id}/revision`, { method: 'POST' });
            if (!res.ok) throw new Error('Failed to create revision');
            const newQuote = await res.json();
            
            // ID-based replacement for state sync
            setOptimisticQuotes(prev => {
                const exists = prev.some(q => q.id === newQuote.id);
                if (exists) {
                    return prev.map(q => q.id === newQuote.id ? newQuote : q);
                }
                return [newQuote, ...prev];
            });
            
            toast.success('Revision created successfully');
        } catch (err) {
            console.error(err);
            toast.error('Failed to create revision');
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
                const exists = prev.some(q => q.id === newQuote.id);
                if (exists) {
                    return prev.map(q => q.id === newQuote.id ? newQuote : q);
                }
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

    const parseQuoteNumberForSort = (quoteNumber: string) => {
        const match = quoteNumber.match(/Q(\d+)-(\d+)/);
        if (match) {
            return parseInt(match[1]) * 1000000 + parseInt(match[2]);
        }
        return 0;
    };

    const toggleSort = (column: string) => {
        const newDir = currentSort === column && currentDir === 'desc' ? 'asc' : 'desc';
        const params = new URLSearchParams(searchParams.toString());
        params.set('sort', column);
        params.set('dir', newDir);
        router.push(`?${params.toString()}`);
    };

    const renderSortIcon = (column: string) => {
        if (currentSort !== column) return null;
        return currentDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />;
    };

    const sortedQuotes = (() => {
        let sorted = [...optimisticQuotes].sort((a: any, b: any) => {
            let aVal, bVal;
            
            switch (currentSort) {
                case 'total':
                    aVal = a.totalExGST || 0;
                    bVal = b.totalExGST || 0;
                    break;
                case 'status':
                    aVal = a.status || '';
                    bVal = b.status || '';
                    break;
                case 'estimator':
                    aVal = a.modifier?.name || '';
                    bVal = b.modifier?.name || '';
                    break;
                case 'quoteNumber':
                    aVal = parseQuoteNumberForSort(a.quoteNumber);
                    bVal = parseQuoteNumberForSort(b.quoteNumber);
                    break;
                case 'updatedAt':
                default:
                    aVal = new Date(a.updatedAt).getTime();
                    bVal = new Date(b.updatedAt).getTime();
            }

            if (aVal < bVal) return currentDir === 'asc' ? -1 : 1;
            if (aVal > bVal) return currentDir === 'asc' ? 1 : -1;
            return 0;
        });

        // Revision grouping logic
        const groups = sorted.reduce((acc, quote) => {
            const match = quote.quoteNumber.match(/^(Q\d{2}-\d{4})/);
            const base = match ? match[1] : quote.quoteNumber;
            if (!acc[base]) acc[base] = [];
            acc[base].push(quote);
            return acc;
        }, {} as Record<string, any[]>);

        const flat: any[] = [];
        const processedBases = new Set();
        
        // Use the initial sorted order to determine which group base comes first
        for (const quote of sorted) {
            const match = quote.quoteNumber.match(/^(Q\d{2}-\d{4})/);
            const base = match ? match[1] : quote.quoteNumber;
            
            if (processedBases.has(base)) continue;
            processedBases.add(base);

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

    return (
        <main className="w-full max-w-[1600px] mx-auto px-6 py-8 animate-in fade-in duration-500">
                <LinkDealModal 
                    isOpen={isLinkModalOpen} 
                    onClose={() => setIsLinkModalOpen(false)} 
                    onSelect={handleLinkDeal} 
                />
                
                {/* Pricing Discrepancy Indicator (Dev Only) */}
                {process.env.NODE_ENV === 'development' && optimisticQuotes.length > 0 && (
                    <div className="mb-4">
                        {optimisticQuotes.some(q => q.totalExGST === undefined || q.totalExGST === null) && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 animate-pulse">
                                <span className="w-2 h-2 bg-red-500 rounded-full" />
                                PRICING DATA INCOMPLETE: Some quotes are missing totalExGST values.
                            </div>
                        )}
                    </div>
                )}

                {/* Header & Back Button */}
                <div className="mb-6">
                    <button 
                        onClick={() => router.push('/projects')}
                        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors mb-4 group"
                    >
                        <ChevronLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
                        Back to Projects
                    </button>
                    
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                            <div className="flex items-center gap-3">
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

                <div className="space-y-6">
                    {/* Metadata Cards Row */}
                    <div className="flex flex-wrap items-stretch gap-4">
                        {/* Total Quotes Card */}
                        <div className="bg-white px-5 py-2.5 min-h-14 rounded-xl border border-gray-100 shadow-sm flex items-center gap-3">
                            <div className="p-1.5 bg-blue-50 rounded-lg shrink-0">
                                <FileText size={14} className="text-blue-500" />
                            </div>
                            <div>
                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Total Quotes</p>
                                <p className="text-base font-bold text-gray-900 leading-none">{optimisticQuotes.length || 0}</p>
                            </div>
                        </div>
                        
                        {/* Latest Activity Card */}
                        <div className="bg-white px-5 py-2.5 min-h-14 rounded-xl border border-gray-100 shadow-sm flex items-center gap-3">
                            <div className="p-1.5 bg-slate-50 rounded-lg shrink-0">
                                <Clock size={14} className="text-slate-500" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Latest Activity</p>
                                <p className="text-xs font-bold text-gray-800 leading-none truncate">
                                    {optimisticQuotes.length > 0 
                                        ? format(new Date(optimisticQuotes[0].updatedAt), 'MMM d, h:mm a')
                                        : 'No activity yet'}
                                </p>
                            </div>
                        </div>

                        {/* Consolidated Pipedrive Metadata Card */}
                        <div className={cn(
                            "bg-white px-5 py-2.5 min-h-14 rounded-xl border border-gray-100 shadow-sm flex items-center gap-6",
                            !project.pipedrive_deal_id && "opacity-60"
                        )}>
                            <div className="flex items-center gap-3 pr-6 border-r border-gray-100">
                                <div className="p-1.5 bg-blue-50 rounded-lg shrink-0">
                                    <img src="/pipedrive.jpeg" alt="Pipedrive" className="w-3.5 h-3.5 rounded" />
                                </div>
                                <div className="min-w-[100px]">
                                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Deal Value</p>
                                    <p className="text-base font-bold text-gray-900 leading-none">
                                        {(() => {
                                            const val = Number(project.dealValue);
                                            return (project.dealValue && !isNaN(val)) 
                                                ? `$${val.toLocaleString()}` 
                                                : "—";
                                        })()}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-6">
                                <div>
                                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Exp. Close</p>
                                    <p className="text-[11px] font-bold text-gray-700 leading-none">
                                        {project.expectedCloseDate ? format(new Date(project.expectedCloseDate), 'MMM d, yyyy') : '—'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Created</p>
                                    <p className="text-[11px] font-bold text-gray-700 leading-none">
                                        {project.dealCreatedAt ? format(new Date(project.dealCreatedAt), 'MMM d, yyyy') : '—'}
                                    </p>
                                </div>
                            </div>

                            {project.pipedrive_deal_id && (
                                <div className="flex items-center gap-2 pl-4 border-l border-gray-100 ml-auto">
                                    {project.quoteFolder && (
                                        <a 
                                            href={project.quoteFolder}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
                                            title="Open Sharepoint Folder"
                                        >
                                            <FileText size={16} />
                                        </a>
                                    )}
                                    <button 
                                        onClick={handleRefresh}
                                        disabled={refreshing}
                                        className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all disabled:opacity-50"
                                        title="Sync from Pipedrive"
                                    >
                                        <RefreshCw size={16} className={cn(refreshing && "animate-spin")} />
                                    </button>
                                    {project.pipedriveDealUrl && (
                                        <a 
                                            href={project.pipedriveDealUrl} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
                                            title="View in Pipedrive"
                                        >
                                            <ArrowUpRight size={16} />
                                        </a>
                                    )}
                                </div>
                            )}

                            {!project.pipedrive_deal_id && (
                                <Button 
                                    variant="link" 
                                    size="sm" 
                                    onClick={() => setIsLinkModalOpen(true)}
                                    className="text-blue-500 text-[10px] font-bold uppercase tracking-widest h-auto p-0 ml-4 hover:no-underline"
                                >
                                    Link Deal
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Associated Quotes Table */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden w-full">
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                            <h2 className="font-bold text-gray-900 flex items-center gap-2">
                                <Briefcase size={18} className="text-blue-500" />
                                Associated Quotes
                            </h2>
                        </div>
                        
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-gray-50/50">
                                        <th className="px-6 py-2.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest border-r border-gray-100/50 w-[80px]">Est.</th>
                                        <th 
                                            className="px-6 py-2.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest border-r border-gray-100/50 min-w-[160px] whitespace-nowrap cursor-pointer hover:bg-gray-100 transition-colors"
                                            onClick={() => toggleSort('quoteNumber')}
                                        >
                                            <div className="flex items-center gap-2">
                                                Quote Number
                                                {renderSortIcon('quoteNumber')}
                                            </div>
                                        </th>
                                        <th className="px-6 py-2.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest border-r border-gray-100/50 min-w-[200px]">Project Name</th>
                                        <th className="px-6 py-2.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest border-r border-gray-100/50 min-w-[120px]">Company</th>
                                        <th className="px-6 py-2.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest border-r border-gray-100/50 min-w-[120px]">Client</th>
                                        <th 
                                            className="px-6 py-2.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest border-r border-gray-100/50 w-[110px] cursor-pointer hover:bg-gray-100 transition-colors"
                                            onClick={() => toggleSort('status')}
                                        >
                                            <div className="flex items-center gap-2">
                                                Status
                                                {renderSortIcon('status')}
                                            </div>
                                        </th>
                                        <th 
                                            className="px-6 py-2.5 text-right text-[10px] font-bold text-gray-400 uppercase tracking-widest border-r border-gray-100/50 min-w-[140px] whitespace-nowrap cursor-pointer hover:bg-gray-100 transition-colors"
                                            onClick={() => toggleSort('total')}
                                        >
                                            <div className="flex items-center justify-end gap-2">
                                                Total (ex GST)
                                                {renderSortIcon('total')}
                                            </div>
                                        </th>
                                        <th className="px-6 py-2.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Notes</th>
                                        <th className="px-6 py-2.5 text-right text-[10px] font-bold text-gray-400 uppercase tracking-widest w-[80px]"></th>
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
                                            <td colSpan={9} className="px-6 py-12 text-center text-gray-500 font-medium italic">
                                                No quotes found for this project.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
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
