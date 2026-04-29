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
import { 
    getProjectClientDisplay, 
    getProjectCompanyDisplay, 
    getProjectContactDisplay,
    getProjectStatusDisplay
} from '@/lib/project-utils';
import ProjectQuotesTable from '@/components/Project/ProjectQuotesTable';
import DuplicateQuoteDialog from '@/components/Dashboard/DuplicateQuoteDialog';

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
        revisionGroupId?: string | null;
        modifier?: { name: string };
    }[];
}

import { useSearchParams } from 'next/navigation';

export default function ProjectDetail() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    
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
        initialProjectName: string;
    }>({ isOpen: false, quoteId: '', clientName: '', clientCompany: '', initialProjectName: '' });
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
            initialProjectName: project?.projectName || quote.projectRef || '',
        });
    };

    const handleDuplicateConfirm = async (
        clientName: string, 
        clientCompany: string,
        projectName: string,
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
                    projectName,
                    pipedrivePersonId,
                    pipedriveOrgId
                }),
            });

            if (!res.ok) throw new Error('Failed to duplicate quote');
            const newQuote = await res.json();
            
            // Only update local table if it still belongs to this project
            if (newQuote.projectId === params.id) {
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
                
                if (newQuote.linkedToExistingProject) {
                    toast.success(`Linked to existing project: ${newQuote.projectName}`);
                } else {
                    toast.success('Quote duplicated successfully');
                }
            } else {
                // It was duplicated to a DIFFERENT project
                toast.success(
                    <div className="flex flex-col gap-1">
                        <span>Duplicated to different project: <b>{newQuote.projectName}</b></span>
                        <Button 
                            variant="link" 
                            className="h-auto p-0 text-blue-600 justify-start font-bold"
                            onClick={() => router.push(`/projects/${newQuote.projectId}`)}
                        >
                            View Project
                        </Button>
                    </div>
                );
            }
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
                <div className="mb-6 sm:mb-8">
                    <button 
                        onClick={() => router.push('/projects')}
                        className="flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-blue-600 transition-colors mb-4 group"
                    >
                        <ChevronLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
                        Back to Projects
                    </button>
                    
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                        <div className="flex flex-col gap-3">
                            <div className="flex flex-wrap items-center gap-3">
                                <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight leading-tight">
                                    {project.projectName}
                                </h1>
                                <div className="flex items-center gap-2">
                                    <Select value={project.projectStatus} onValueChange={handleProjectStatusChange}>
                                        <SelectTrigger className={cn(
                                            "px-3 py-1 h-8 text-[10px] font-bold rounded-full border uppercase tracking-widest shadow-sm w-[110px] focus:ring-2 focus:ring-blue-500 bg-white cursor-pointer transition-colors",
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
                                            #{project.pipedrive_deal_id}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
                            {project.pipedriveDealUrl && (
                                <Button 
                                    variant="outline"
                                    onClick={() => window.open(project.pipedriveDealUrl, '_blank')}
                                    className="w-full sm:w-auto border-slate-200 text-slate-600 hover:bg-slate-50 gap-2 h-11 px-5 rounded-xl transition-all font-bold shadow-sm"
                                >
                                    <div className="w-5 h-5 rounded overflow-hidden shrink-0">
                                        <img src="/pipedrive.jpeg" alt="Pipedrive" className="w-full h-full object-cover" />
                                    </div>
                                    <span className="hidden xs:inline">View in Pipedrive</span>
                                    <span className="xs:hidden">Pipedrive</span>
                                </Button>
                            )}
                            <Button 
                                onClick={handleCreateQuote} 
                                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white gap-2 h-11 px-6 rounded-xl shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98] font-extrabold"
                            >
                                <Plus size={20} />
                                New Quote
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    {/* Metadata Cards Row */}
                    <div className="grid grid-cols-1 md:flex md:flex-wrap items-stretch gap-4">
                        {/* Total Quotes Card */}
                        <div className="bg-white px-5 py-3 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
                                <FileText size={18} className="text-blue-500" />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Total Quotes</p>
                                <p className="text-lg font-extrabold text-gray-900 leading-none">{optimisticQuotes.length || 0}</p>
                            </div>
                        </div>
                        
                        {/* Latest Activity Card */}
                        <div className="bg-white px-5 py-3 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                            <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center shrink-0">
                                <Clock size={18} className="text-slate-500" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Latest Activity</p>
                                <p className="text-sm font-extrabold text-gray-800 leading-none truncate">
                                    {optimisticQuotes.length > 0 
                                        ? format(new Date(optimisticQuotes[0].updatedAt), 'MMM d, h:mm a')
                                        : 'No activity yet'}
                                </p>
                            </div>
                        </div>

                        {/* Consolidated Pipedrive Metadata Card */}
                        <div className={cn(
                            "bg-white px-5 py-3 rounded-2xl border border-gray-100 shadow-sm flex flex-col sm:flex-row sm:items-center gap-6",
                            !project.pipedrive_deal_id && "opacity-60"
                        )}>
                            <div className="flex items-center gap-4 sm:pr-6 sm:border-r sm:border-gray-100">
                                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
                                    <img src="/pipedrive.jpeg" alt="Pipedrive" className="w-6 h-6 rounded-md" />
                                </div>
                                <div className="min-w-[120px]">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Deal Value</p>
                                    <p className="text-lg font-extrabold text-gray-900 leading-none">
                                        {(() => {
                                            const val = Number(project.dealValue);
                                            return (project.dealValue && !isNaN(val)) 
                                                ? `$${val.toLocaleString()}` 
                                                : "—";
                                        })()}
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6 sm:flex sm:items-center sm:gap-8">
                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Exp. Close</p>
                                    <p className="text-xs font-extrabold text-gray-700 leading-none">
                                        {project.expectedCloseDate ? format(new Date(project.expectedCloseDate), 'MMM d, yyyy') : '—'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Created</p>
                                    <p className="text-xs font-extrabold text-gray-700 leading-none">
                                        {project.dealCreatedAt ? format(new Date(project.dealCreatedAt), 'MMM d, yyyy') : '—'}
                                    </p>
                                </div>
                            </div>

                            {project.pipedrive_deal_id ? (
                                <div className="flex items-center gap-3 pt-3 sm:pt-0 sm:pl-4 border-t sm:border-t-0 sm:border-l border-gray-100 sm:ml-auto">
                                    {project.quoteFolder && (
                                        <a 
                                            href={project.quoteFolder}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all border border-gray-100 sm:border-transparent"
                                            title="Open Sharepoint Folder"
                                        >
                                            <FileText size={18} />
                                        </a>
                                    )}
                                    <button 
                                        onClick={handleRefresh}
                                        disabled={refreshing}
                                        className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all disabled:opacity-50 border border-gray-100 sm:border-transparent"
                                        title="Sync from Pipedrive"
                                    >
                                        <RefreshCw size={18} className={cn(refreshing && "animate-spin")} />
                                    </button>
                                    {project.pipedriveDealUrl && (
                                        <a 
                                            href={project.pipedriveDealUrl} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all border border-gray-100 sm:border-transparent"
                                            title="View in Pipedrive"
                                        >
                                            <ArrowUpRight size={18} />
                                        </a>
                                    )}
                                </div>
                            ) : (
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => setIsLinkModalOpen(true)}
                                    className="h-10 rounded-xl border-blue-100 bg-blue-50/50 text-blue-600 font-extrabold uppercase tracking-widest text-[10px] w-full sm:w-auto px-4"
                                >
                                    Link Pipedrive Deal
                                </Button>
                            )}
                        </div>
                    </div>
div>

                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden w-full">
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                            <h2 className="font-bold text-gray-900 flex items-center gap-2">
                                <Briefcase size={18} className="text-blue-500" />
                                Associated Quotes
                            </h2>
                        </div>
                        
                        <ProjectQuotesTable 
                            quotes={optimisticQuotes}
                            currentSort={currentSort}
                            currentDir={currentDir}
                            toggleSort={toggleSort}
                            renderSortIcon={renderSortIcon}
                            onUpdate={handleUpdateQuote}
                            onDuplicate={handleDuplicateQuoteClick}
                            onCreateRevision={handleCreateRevision}
                            onDelete={handleDeleteQuote}
                        />
                    </div>
                </div>


                <DuplicateQuoteDialog
                    isOpen={duplicateDialog.isOpen}
                    onClose={() => setDuplicateDialog({ ...duplicateDialog, isOpen: false })}
                    onDuplicate={handleDuplicateConfirm}
                    initialClientName={duplicateDialog.clientName}
                    initialClientCompany={duplicateDialog.clientCompany}
                    initialProjectName={duplicateDialog.initialProjectName}
                />
            </main>
    );
}
