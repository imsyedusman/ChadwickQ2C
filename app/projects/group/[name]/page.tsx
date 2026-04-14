'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { 
    ChevronLeft, 
    Calendar, 
    User, 
    Building2, 
    Briefcase,
    Loader2,
    RefreshCw,
    FileText,
    ChevronUp,
    ChevronDown,
    Layers,
    AlertCircle,
    Clock,
    Plus,
    ExternalLink,
    ArrowUpRight,
    Link as LinkIcon,
    Link2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import ProjectQuotesTable from '@/components/Project/ProjectQuotesTable';
import DuplicateQuoteDialog from '@/components/Dashboard/DuplicateQuoteDialog';
import { 
    getProjectClientDisplay, 
    getProjectCompanyDisplay, 
    normalizeProjectName,
    getProjectStatusDisplay
} from '@/lib/project-utils';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import LinkDealModal from '@/components/Project/LinkDealModal';

interface SimplifiedProject {
    id: string;
    projectName: string;
    clientName: string | null;
    companyName: string | null;
    projectReference: string | null;
    projectDescription: string | null;
    projectStatus: string;
    createdAt: string;
    updatedAt: string;
    pipedrive_deal_id?: number | null;
    dealValue: number | null;
    currency?: string | null;
    dealCreatedAt?: string | null;
    expectedCloseDate?: string | null;
    quoteFolder?: string | null;
    pipedriveDealUrl?: string | null;
    client?: { name: string } | null;
    contact?: { name: string } | null;
}

interface FullProject extends SimplifiedProject {
    quotes: any[];
}

export default function GroupDetail() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    
    // Decoding the name from URL
    const groupName = typeof params.name === 'string' ? decodeURIComponent(params.name) : '';
    
    // Sort parameters (optional, could apply per table or globally)
    const currentSort = searchParams.get('sort') || 'updatedAt';
    const currentDir = (searchParams.get('dir') || 'desc') as 'asc' | 'desc';

    const [projects, setProjects] = useState<FullProject[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
    
    const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
    const [linkingProjectId, setLinkingProjectId] = useState<string | null>(null);
    const [isCapped, setIsCapped] = useState(false);

    const fetchData = async () => {
        if (!groupName) {
            toast.error("Invalid project name");
            router.push('/projects');
            return;
        }

        try {
            setRefreshing(true);
            const searchUrl = `/api/projects?search=${encodeURIComponent(groupName)}&limit=200`;
            const searchRes = await fetch(searchUrl);
            if (!searchRes.ok) throw new Error('Failed to search projects');
            const searchData = await searchRes.json();
            
            const normalizedGroupName = normalizeProjectName(groupName);
            const matchingProjects = (searchData.projects as SimplifiedProject[]).filter(
                p => normalizeProjectName(p.projectName) === normalizedGroupName
            );

            if (matchingProjects.length === 0) {
                setLoading(false);
                return;
            }

            const BATCH_SIZE = 10;
            const MAX_PROJECTS = 50;
            const projectsToFetch = matchingProjects.slice(0, MAX_PROJECTS);
            
            if (matchingProjects.length > MAX_PROJECTS) {
                setIsCapped(true);
            }

            const fullProjects: FullProject[] = [];
            
            for (let i = 0; i < projectsToFetch.length; i += BATCH_SIZE) {
                const batch = projectsToFetch.slice(i, i + BATCH_SIZE);
                const batchResults = await Promise.all(
                    batch.map(async (p) => {
                        try {
                            const res = await fetch(`/api/projects/${p.id}`);
                            if (!res.ok) return null;
                            const data = await res.json();
                            return { ...data.project, quotes: data.quotes };
                        } catch (e) {
                            console.error(`Failed to fetch project ${p.id}`, e);
                            return null;
                        }
                    })
                );
                fullProjects.push(...(batchResults.filter(Boolean) as FullProject[]));
            }

            setProjects(fullProjects);
            
            // Default first project to expanded
            if (fullProjects.length > 0) {
                setExpandedProjects(new Set([fullProjects[0].id]));
            }
            
            // Aggregated stats
            let tQuotes = 0;
            let tValue = 0;
            let lActivity = new Date(0);
            
            fullProjects.forEach(p => {
                tQuotes += p.quotes.length;
                tValue += Number(p.dealValue) || 0;
                const pDate = new Date(p.createdAt);
                if (pDate > lActivity) lActivity = pDate;
            });

            setStats({
                totalQuotes: tQuotes,
                totalValue: tValue,
                latestActivity: lActivity
            });

        } catch (error) {
            console.error('Failed to fetch group data:', error);
            toast.error('Error loading grouped projects');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const [duplicateDialog, setDuplicateDialog] = useState<{
        isOpen: boolean;
        quoteId: string;
        projectId?: string;
        clientName: string;
        clientCompany: string;
        initialProjectName: string;
    }>({ isOpen: false, quoteId: '', clientName: '', clientCompany: '', initialProjectName: '' });

    const [stats, setStats] = useState({
        totalQuotes: 0,
        totalValue: 0,
        latestActivity: new Date(0),
    });

    useEffect(() => {
        fetchData();
    }, [groupName]);

    const toggleProject = (id: string) => {
        const newSet = new Set(expandedProjects);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setExpandedProjects(newSet);
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

    const handleCreateQuote = async (project: FullProject) => {
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
            
            setProjects(prev => prev.map(p => p.id === project.id ? { ...p, quotes: [newQuote, ...p.quotes] } : p));
            toast.success('Quote created successfully');
        } catch (err) {
            toast.error('Error creating quote');
        }
    };

    const handleCreateRevision = async (projectId: string, id: string) => {
        try {
            const res = await fetch(`/api/quotes/${id}/revision`, { method: 'POST' });
            if (!res.ok) throw new Error('Failed to create revision');
            const newQuote = await res.json();
            
            setProjects(prev => prev.map(p => {
                if (p.id !== projectId) return p;
                const exists = p.quotes.some(q => q.id === newQuote.id);
                if (exists) {
                    return { ...p, quotes: p.quotes.map(q => q.id === newQuote.id ? newQuote : q) };
                }
                return { ...p, quotes: [newQuote, ...p.quotes] };
            }));
            
            toast.success('Revision created successfully');
        } catch (err) {
            toast.error('Failed to create revision');
        }
    };

    const handleDuplicateQuoteClick = (projectId: string, quote: any) => {
        setDuplicateDialog({
            isOpen: true,
            quoteId: quote.id,
            projectId: projectId, 
            clientName: quote.clientName || '',
            clientCompany: quote.clientCompany || '',
            initialProjectName: groupName, // In grouped view, the project name is the group name
        } as any);
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
            if (!res.ok) throw new Error('Failed to duplicate');
            const newQuote = await res.json();
            
            // Check if this project already exists in our group state
            const projectExists = projects.some(p => p.id === newQuote.projectId);

            if (projectExists) {
                // Update specific project in state
                setProjects(prev => prev.map(p => {
                    if (p.id !== newQuote.projectId) return p;
                    
                    const exists = p.quotes.some(q => q.id === newQuote.id);
                    if (exists) {
                        return { ...p, quotes: p.quotes.map(q => q.id === newQuote.id ? newQuote : q) };
                    }
                    
                    // Logic to insert near the original quote if possible, or just at top
                    const idx = p.quotes.findIndex(q => q.id === duplicateDialog.quoteId);
                    if (idx > -1) {
                        const newArr = [...p.quotes];
                        newArr.splice(idx + 1, 0, newQuote);
                        return { ...p, quotes: newArr };
                    }
                    return { ...p, quotes: [newQuote, ...p.quotes] };
                }));

                if (newQuote.linkedToExistingProject) {
                    toast.success(`Linked to existing project: ${newQuote.projectName || projectName}`);
                } else {
                    toast.success('Quote duplicated');
                }
            } else {
                // It's a new project or linked project not currently in state.
                // Does it belong to this group?
                const normalizedGroupName = normalizeProjectName(groupName);
                const normalizedTargetName = normalizeProjectName(newQuote.projectName || projectName);

                if (normalizedGroupName === normalizedTargetName) {
                    // It belongs to this group! Fetch again to get the full project metadata
                    toast.success('New project created in group');
                    fetchData();
                } else {
                    // It was duplicated to a COMPLETELY DIFFERENT project group
                    toast.success(
                        <div className="flex flex-col gap-1">
                            <span>Duplicated to different project: <b>{newQuote.projectName || projectName}</b></span>
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
            }
        } catch (error) {
            toast.error('Failed to duplicate quote');
        }
    };

    const handleDeleteQuote = async (projectId: string, id: string) => {
        if (!confirm("Are you sure you want to delete this quote?")) return;
        setProjects(prev => prev.map(p => p.id === projectId ? { ...p, quotes: p.quotes.filter(q => q.id !== id) } : p));
        try {
            const res = await fetch('/api/quotes', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: [id] })
            });
            if (!res.ok) throw new Error('Failed to delete');
            toast.success('Quote deleted');
        } catch (err) {
            toast.error('Failed to delete quote');
            fetchData();
        }
    };

    const handleProjectStatusChange = async (projectId: string, newStatus: string) => {
        setProjects(prev => prev.map(p => p.id === projectId ? { ...p, projectStatus: newStatus } : p));
        try {
            await fetch(`/api/projects/${projectId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectStatus: newStatus })
            });
        } catch (err) {
            toast.error('Failed to update project status');
            fetchData();
        }
    };

    const handleRefresh = async (project: FullProject) => {
        if (!project?.pipedrive_deal_id) return;

        setRefreshing(true);
        try {
            const detailRes = await fetch(`/api/pipedrive/deal/${project.pipedrive_deal_id}`);
            const fullDeal = await detailRes.json();

            const res = await fetch(`/api/projects/${project.id}`, {
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
                // Deep update
                const updatedData = await res.json();
                setProjects(prev => prev.map(p => p.id === project.id ? { ...p, ...updatedData } : p));
                fetchData(); // Full refresh to be safe
            } else {
                toast.error('Failed to refresh');
            }
        } catch (error) {
            toast.error('Error refreshing project');
        } finally {
            setRefreshing(false);
        }
    };

    const handleLinkDeal = async (deal: any) => {
        if (!linkingProjectId) return;
        
        setIsLinkModalOpen(false);
        setRefreshing(true);
        try {
            const detailRes = await fetch(`/api/pipedrive/deal/${deal.id}`);
            const fullDeal = await detailRes.json();

            const res = await fetch(`/api/projects/${linkingProjectId}`, {
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
                fetchData();
            } else {
                toast.error('Failed to link deal');
            }
        } catch (error) {
            toast.error('Error linking deal');
        } finally {
            setRefreshing(false);
            setLinkingProjectId(null);
        }
    };

    if (loading) {
        return (
            <div className="p-8 space-y-8 animate-in fade-in duration-500">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-100 rounded-2xl animate-pulse" />
                    <div className="space-y-2">
                        <div className="h-6 w-48 bg-gray-100 rounded animate-pulse" />
                        <div className="h-4 w-32 bg-gray-50 rounded animate-pulse" />
                    </div>
                </div>
                <div className="space-y-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-48 bg-gray-50 rounded-2xl animate-pulse border border-gray-100" />
                    ))}
                </div>
            </div>
        );
    }

    if (projects.length === 0) {
        return (
            <div className="p-8 text-center flex flex-col items-center justify-center min-h-[400px] space-y-4">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-300">
                    <AlertCircle size={32} />
                </div>
                <h2 className="text-xl font-bold text-gray-900">No Projects Found</h2>
                <p className="text-gray-500 max-w-xs">We couldn't find any projects matching this name.</p>
                <Button onClick={() => router.push('/projects')} variant="outline" className="rounded-xl border-gray-200">
                    Back to Projects
                </Button>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-4">
                    <button 
                        onClick={() => router.push('/projects')}
                        className="group flex items-center gap-2 text-gray-400 hover:text-blue-600 font-bold text-xs uppercase tracking-widest transition-all"
                    >
                        <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                        Back to Projects
                    </button>
                    
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shadow-sm border border-blue-100">
                            <Layers size={28} />
                        </div>
                        <div className="space-y-1">
                            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                                {groupName}
                            </h1>
                            <div className="flex items-center gap-3 text-sm font-medium text-gray-500">
                                <span className="flex items-center gap-1.5"><Briefcase size={14} className="text-gray-400" /> {projects.length} Projects</span>
                                <span>•</span>
                                <span className="flex items-center gap-1.5"><FileText size={14} className="text-gray-400" /> {stats.totalQuotes} Quotes</span>
                                <span>•</span>
                                <span className="flex items-center gap-1.5 text-blue-600 font-bold">
                                    <img src="/pipedrive.jpeg" alt="" className="w-3.5 h-3.5 rounded-full" />
                                    ${stats.totalValue.toLocaleString()}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {isCapped && (
                <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl flex items-center gap-3 text-amber-700">
                    <AlertCircle size={20} className="shrink-0" />
                    <p className="text-sm font-medium">Limited to first 50 project matches.</p>
                </div>
            )}

            {/* Individual Project Sections */}
            <div className="space-y-4">
                {projects.map((project) => (
                    <div 
                        key={project.id} 
                        className={cn(
                            "bg-white rounded-2xl border transition-all duration-300 overflow-hidden",
                            expandedProjects.has(project.id) ? "border-blue-200 shadow-md" : "border-gray-200 hover:border-gray-300"
                        )}
                    >
                        {/* Section Header */}
                        <div 
                            className={cn(
                                "px-8 py-5 flex items-center justify-between cursor-pointer select-none",
                                expandedProjects.has(project.id) ? "bg-blue-50/20 border-b border-blue-100" : "bg-white"
                            )}
                            onClick={() => toggleProject(project.id)}
                        >
                            <div className="flex items-center gap-6 min-w-0">
                                <div className="flex flex-col min-w-0">
                                    <div className="flex items-center gap-4 mb-1">
                                        <h3 className="text-2xl font-black text-gray-900 truncate tracking-tight">
                                            {getProjectCompanyDisplay(project)}
                                        </h3>
                                        <div className="flex items-center gap-3">
                                            <Select 
                                                value={project.projectStatus} 
                                                onValueChange={(val) => handleProjectStatusChange(project.id, val)}
                                            >
                                                <SelectTrigger 
                                                    onClick={(e) => e.stopPropagation()}
                                                    className={cn(
                                                        "px-3 py-1 h-8 text-xs font-bold rounded-full border uppercase tracking-widest shadow-sm w-[120px] focus:ring-2 focus:ring-blue-500 bg-white cursor-pointer transition-colors",
                                                        getProjectStatusDisplay(project.projectStatus).className
                                                    )}
                                                >
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent onClick={(e) => e.stopPropagation()}>
                                                    <SelectItem value="Budget">Budget</SelectItem>
                                                    <SelectItem value="Tender">Tender</SelectItem>
                                                    <SelectItem value="Live">Live</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            
                                            {project.pipedrive_deal_id && (
                                                <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-[10px] font-bold border border-blue-100 uppercase tracking-wider">
                                                    <Link2 size={12} />
                                                    Linked Deal #{project.pipedrive_deal_id}
                                                </div>
                                            )}
                                        </div>
                                        <div className="h-4 w-[1px] bg-gray-200 mx-1 hidden md:block" />
                                        <span className="text-lg font-bold text-gray-500 truncate">
                                            {getProjectClientDisplay(project)}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-4 text-xs font-semibold">
                                        <span className="flex items-center gap-1.5 text-gray-500">
                                            <FileText size={14} className="text-gray-400" /> 
                                            <span className="text-gray-900">{project.quotes.length} Quotes</span>
                                        </span>
                                        
                                        {project.dealValue && (
                                            <>
                                                <div className="w-[1px] h-3 bg-gray-200" />
                                                <div className="flex items-center gap-1.5 text-blue-600">
                                                    <img src="/pipedrive.jpeg" alt="" className="w-3 h-3 rounded-full" />
                                                    <span className="font-black">${Number(project.dealValue).toLocaleString()}</span>
                                                    <span className="text-[10px] text-gray-400 font-medium ml-0.5">from Pipedrive</span>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                {project.pipedrive_deal_id && (
                                    <div className="flex items-center gap-2 mr-2">
                                        {project.quoteFolder && (
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <a 
                                                            href={project.quoteFolder}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="p-2 bg-white border border-gray-200 rounded-lg text-gray-400 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm group"
                                                        >
                                                            <FileText size={14} className="group-hover:scale-110 transition-transform" />
                                                        </a>
                                                    </TooltipTrigger>
                                                    <TooltipContent>Open Sharepoint Folder</TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        )}
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <button 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleRefresh(project);
                                                        }}
                                                        disabled={refreshing}
                                                        className="p-2 bg-white border border-gray-200 rounded-lg text-gray-400 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm group disabled:opacity-50"
                                                    >
                                                        <RefreshCw size={14} className={cn("group-hover:scale-110 transition-transform", refreshing && "animate-spin")} />
                                                    </button>
                                                </TooltipTrigger>
                                                <TooltipContent>Sync from Pipedrive</TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                        {project.pipedriveDealUrl && (
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <a 
                                                            href={project.pipedriveDealUrl} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer"
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="p-2 bg-white border border-gray-200 rounded-lg text-gray-400 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm group"
                                                        >
                                                            <ArrowUpRight size={14} className="group-hover:scale-110 transition-transform" />
                                                        </a>
                                                    </TooltipTrigger>
                                                    <TooltipContent>View in Pipedrive</TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        )}
                                    </div>
                                )}
                                
                                {!project.pipedrive_deal_id && (
                                    <Button 
                                        variant="outline"
                                        size="sm"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setLinkingProjectId(project.id);
                                            setIsLinkModalOpen(true);
                                        }}
                                        className="h-8 border-slate-200 text-slate-600 hover:bg-slate-50 gap-2 px-3 rounded-lg transition-all font-bold text-[10px] uppercase tracking-wider"
                                    >
                                        <Link2 size={14} />
                                        Link Deal
                                    </Button>
                                )}

                                <div className={cn(
                                    "w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 transition-transform duration-300 bg-white",
                                    expandedProjects.has(project.id) && "rotate-180 border-blue-200 text-blue-500 shadow-sm"
                                )}>
                                    <ChevronDown size={14} />
                                </div>
                            </div>
                        </div>

                        {/* Section Content */}
                        {expandedProjects.has(project.id) && (
                            <div className="p-6 space-y-6 animate-in slide-in-from-top-1 duration-200">
                                <div className="flex items-center justify-between pb-2">
                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Project Quotes</h4>
                                    <Button
                                        onClick={() => handleCreateQuote(project)}
                                        className="rounded-lg bg-gray-900 hover:bg-black text-white font-bold h-9 px-4 flex items-center gap-2 shadow-sm transition-all text-xs"
                                    >
                                        <Plus size={16} />
                                        New Quote
                                    </Button>
                                </div>

                                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                                    <ProjectQuotesTable 
                                        quotes={project.quotes}
                                        currentSort={currentSort}
                                        currentDir={currentDir}
                                        toggleSort={toggleSort}
                                        renderSortIcon={renderSortIcon}
                                        onUpdate={(id, diff) => {
                                            setProjects(prev => prev.map(p => {
                                                if (p.id !== project.id) return p;
                                                return {
                                                    ...p,
                                                    quotes: p.quotes.map(q => q.id === id ? { ...q, ...diff } : q)
                                                };
                                            }));
                                        }}
                                        onDuplicate={(quote) => handleDuplicateQuoteClick(project.id, quote)}
                                        onCreateRevision={(id) => handleCreateRevision(project.id, id)}
                                        onDelete={(id) => handleDeleteQuote(project.id, id)}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <DuplicateQuoteDialog
                isOpen={duplicateDialog.isOpen}
                onClose={() => setDuplicateDialog({ ...duplicateDialog, isOpen: false })}
                onDuplicate={handleDuplicateConfirm}
                initialClientName={duplicateDialog.clientName}
                initialClientCompany={duplicateDialog.clientCompany}
                initialProjectName={duplicateDialog.initialProjectName}
            />

            <LinkDealModal 
                isOpen={isLinkModalOpen} 
                onClose={() => {
                    setIsLinkModalOpen(false);
                    setLinkingProjectId(null);
                }} 
                onSelect={handleLinkDeal} 
            />
        </div>
    );
}
