'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    Search,
    ChevronRight,
    ChevronLeft,
    AlertCircle,
    RefreshCcw,
    User,
    Briefcase,
    Loader2,
    MoreVertical,
    Edit2,
    Trash2,
    Building2,
    Calendar,
    FileText,
    Settings2,
    Layers,
    Info,
    ExternalLink,
    Table2,
    LayoutGrid,
    ChevronUp,
    ChevronDown,
    X
} from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import MobileProjectCard, { MobileGroupedProjectCard } from '@/components/Project/MobileProjectCard';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuCheckboxItem,
    DropdownMenuSeparator,
    DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
    getProjectClientDisplay,
    getProjectCompanyDisplay,
    getProjectContactDisplay,
    normalizeProjectName
} from '@/lib/project-utils';
import { useMemo } from 'react';

interface Estimator {
    id: string;
    name: string | null;
    email: string | null;
}

interface Project {
    id: string;
    projectName: string;
    clientName: string | null;
    companyName: string | null;
    projectReference: string | null;
    projectDescription: string | null;
    projectStatus: string;
    createdAt: string;
    updatedAt: string;
    pipedrive_deal_id: number | null;
    dealValue: number | null;
    currency: string | null;
    dealCreatedAt: string | null;
    expectedCloseDate: string | null;
    quoteFolder: string | null;
    pipedriveDealUrl: string | null;
    pipedriveOwnerName: string | null;
    pipedriveOwnerId: number | null;
    client?: { name: string } | null;
    contact?: { name: string } | null;
    quotes: { 
        updatedAt: string;
        creator: Estimator | null 
    }[];
    _count?: {
        quotes: number;
    };
}

function getInitials(name: string | null) {
    if (!name) return '?';
    const upperName = name.trim().toUpperCase();
    if (upperName.includes('CHRISF@') || upperName.includes('CHRIS F')) return 'CF';
    
    const parts = name.trim().split(' ');
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].substring(0, 1).toUpperCase();
    return (parts[0][0] + (parts[parts.length - 1]?.[0] || '')).toUpperCase();
}

function OwnerBadge({ name }: { name: string | null }) {
    if (!name) return <span className="text-gray-300 italic text-[10px]">Unassigned</span>;

    const colors = [
        'bg-emerald-50 text-emerald-700 border-emerald-100',
        'bg-blue-50 text-blue-700 border-blue-100',
        'bg-amber-50 text-amber-700 border-amber-100',
        'bg-purple-50 text-purple-700 border-purple-100',
        'bg-rose-50 text-rose-700 border-rose-100',
        'bg-slate-50 text-slate-700 border-slate-100'
    ];

    const getColor = (name: string) => {
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        return colors[Math.abs(hash) % colors.length];
    };

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className={cn(
                        "w-7 h-7 rounded-full border flex items-center justify-center text-[10px] font-black shadow-sm shrink-0 cursor-help",
                        getColor(name)
                    )}>
                        {getInitials(name)}
                    </div>
                </TooltipTrigger>
                <TooltipContent side="top">
                    <p className="font-bold">{name}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}

function EstimatorBadges({ quotes, limit = 2 }: { quotes: { creator: Estimator | null }[], limit?: number }) {
    // Extract unique creators
    const creators = Array.from(new Map(
        quotes
            .filter(q => q.creator)
            .map(q => [q.creator?.id, q.creator])
    ).values()) as Estimator[];

    if (creators.length === 0) return <span className="text-gray-300 italic text-[10px]">No Estimator</span>;

    const displayLimit = limit;
    const items = creators.slice(0, displayLimit);
    const overflow = creators.length - displayLimit;

    const colors = [
        'bg-blue-50 text-blue-700 border-blue-100',
        'bg-emerald-50 text-emerald-700 border-emerald-100',
        'bg-amber-50 text-amber-700 border-amber-100',
        'bg-purple-50 text-purple-700 border-purple-100',
        'bg-rose-50 text-rose-700 border-rose-100',
        'bg-slate-50 text-slate-700 border-slate-100'
    ];

    const getColor = (id: string) => {
        let hash = 0;
        for (let i = 0; i < id.length; i++) {
            hash = id.charCodeAt(i) + ((hash << 5) - hash);
        }
        return colors[Math.abs(hash) % colors.length];
    };

    return (
        <div className="flex items-center -space-x-1.5">
            {items.map((creator) => (
                <TooltipProvider key={creator.id}>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className={cn(
                                "w-7 h-7 rounded-full border border-white flex items-center justify-center text-[10px] font-bold shadow-sm cursor-help transition-transform hover:scale-110",
                                getColor(creator.id)
                            )}>
                                {getInitials(creator.name)}
                            </div>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                            <div className="space-y-0.5">
                                <p className="font-bold text-gray-900">{creator.name || 'Unknown'}</p>
                                <p className="text-[10px] text-gray-500 font-medium">{creator.email}</p>
                                <p className="text-[9px] text-blue-600 font-bold uppercase tracking-wider pt-1">Estimator</p>
                            </div>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            ))}
            {overflow > 0 && (
                <div className="w-7 h-7 rounded-full border border-white bg-white flex items-center justify-center text-[10px] font-bold text-gray-500 shadow-sm">
                    +{overflow}
                </div>
            )}
        </div>
    );
}

export default function ProjectsPage() {
    const router = useRouter();
    const searchParams = useSearchParams();

    // URL-based state
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('limit') || '27');
    const search = searchParams.get('search') || '';
    const estimatorId = searchParams.get('estimatorId') || 'all';
    const dealOwner = searchParams.get('dealOwner') || 'all';
    const closeDateFilter = searchParams.get('closeDateFilter') || 'all';
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc';

    const [projects, setProjects] = useState<Project[]>([]);
    const [estimators, setEstimators] = useState<Estimator[]>([]);
    const [owners, setOwners] = useState<string[]>([]);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
    const [totalProjects, setTotalProjects] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [loading, setLoading] = useState(true);
    const [isGrouped, setIsGrouped] = useState(true);
    const [searchInput, setSearchInput] = useState(search);
    const [viewMode, setViewMode] = useState<'TABLE' | 'CARD'>('TABLE');

    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [editForm, setEditForm] = useState({
        projectName: '',
        clientName: '',
        companyName: '',
        projectReference: '',
        projectDescription: '',
        projectStatus: '',
    });
    const [actionLoading, setActionLoading] = useState(false);

    // Sync state
    const [syncingPipedrive, setSyncingPipedrive] = useState(false);
    const [syncBatchId, setSyncBatchId] = useState<string | null>(null);
    const [syncProgress, setSyncProgress] = useState<{ processed: number; committed: number } | null>(null);
    const [isPipedriveConfigured, setIsPipedriveConfigured] = useState(true);

    // Column Visibility State
    const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
        client: true,
        company: true,
        dealOwner: true,
        dealValue: true,
        created: true,
    });

    // Refs for Synced Scrollbar
    const tableContainerRef = useRef<HTMLDivElement>(null);
    const scrollbarRef = useRef<HTMLDivElement>(null);
    const [tableScrollWidth, setTableScrollWidth] = useState(0);

    // Load column visibility from localStorage
    useEffect(() => {
        const saved = localStorage.getItem('projects_table_columns');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setVisibleColumns(prev => ({ ...prev, ...parsed }));
            } catch (e) {
                console.error('Failed to parse saved columns', e);
            }
        }
    }, []);

    // Load view mode from localStorage
    useEffect(() => {
        const saved = localStorage.getItem('projects_view_mode');
        if (saved === 'TABLE' || saved === 'CARD') {
            setViewMode(saved);
        }
    }, []);

    const toggleViewMode = (mode: 'TABLE' | 'CARD') => {
        setViewMode(mode);
        localStorage.setItem('projects_view_mode', mode);
    };

    // Save column visibility to localStorage
    const toggleColumn = (column: string) => {
        const newState = { ...visibleColumns, [column]: !visibleColumns[column] };
        setVisibleColumns(newState);
        localStorage.setItem('projects_table_columns', JSON.stringify(newState));
    };

    // Sync Scrollbar logic
    const handleTableScroll = () => {
        if (tableContainerRef.current && scrollbarRef.current) {
            scrollbarRef.current.scrollLeft = tableContainerRef.current.scrollLeft;
        }
    };

    const handleScrollbarScroll = () => {
        if (tableContainerRef.current && scrollbarRef.current) {
            tableContainerRef.current.scrollLeft = scrollbarRef.current.scrollLeft;
        }
    };

    // Keep scrollbar width in sync with table
    useEffect(() => {
        if (!tableContainerRef.current) return;

        const updateWidth = () => {
            if (tableContainerRef.current) {
                // Find the table element inside the container
                const table = tableContainerRef.current.querySelector('table');
                if (table) {
                    setTableScrollWidth(table.scrollWidth);
                }
            }
        };

        const observer = new ResizeObserver(updateWidth);
        const table = tableContainerRef.current.querySelector('table');
        if (table) {
            observer.observe(table);
            observer.observe(tableContainerRef.current);
        }

        updateWidth();
        window.addEventListener('resize', updateWidth);

        return () => {
            observer.disconnect();
            window.removeEventListener('resize', updateWidth);
        };
    }, [projects, visibleColumns]);

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
                            fetchProjects(); // Refresh table when done
                            if (data.status === 'SUCCESS') toast.success('Pipedrive sync completed');
                            else toast.error('Pipedrive sync failed');
                        }
                    }
                } catch (error) {
                    console.error('Status polling error', error);
                }
            }, 1500);
        }
        return () => clearInterval(interval);
    }, [syncingPipedrive, syncBatchId]);

    const handleSync = async (mode: 'quick' | 'full', force: boolean = false) => {
        setSyncingPipedrive(true);
        setSyncProgress(null);
        try {
            const res = await fetch('/api/admin/pipedrive/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mode, force }),
            });

            if (res.ok) {
                const data = await res.json();
                setSyncBatchId(data.batchId);
                toast.success(`Pipedrive ${mode} sync started`);
            } else if (res.status === 409) {
                const data = await res.json();
                setSyncBatchId(data.conflict.id);
                toast.info(
                    <div className="flex flex-col gap-2">
                        <p>A synchronization is already in progress.</p>
                        <Button
                            variant="outline"
                            size="sm"
                            className="bg-white hover:bg-slate-50 border-slate-200 text-slate-700 h-8 font-bold"
                            onClick={() => handleSync(mode, true)}
                        >
                            Force Sync New Batch
                        </Button>
                    </div>,
                    { duration: 6000 }
                );
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

    // Sync search input with URL if needed (e.g. browser back)
    useEffect(() => {
        setSearchInput(search);
    }, [search]);

    useEffect(() => {
        fetchProjects();
        checkPipedriveStatus();
    }, [page, pageSize, search, estimatorId, dealOwner]);

    const checkPipedriveStatus = async () => {
        try {
            const res = await fetch('/api/admin/pipedrive/status');
            if (res.ok) {
                const data = await res.json();
                setIsPipedriveConfigured(data.isConfigured);
            }
        } catch (error) {
            console.error('Failed to check Pipedrive status', error);
        }
    };

    // Internal debounced search effect that updates URL
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchInput !== search) {
                updateUrl({ search: searchInput, page: 1 });
            }
        }, 400);
        return () => clearTimeout(timer);
    }, [searchInput]);

    const updateUrl = (updates: Record<string, any>) => {
        const params = new URLSearchParams(searchParams.toString());
        Object.entries(updates).forEach(([key, value]) => {
            if (value === null || value === undefined || value === 'all') {
                params.delete(key);
            } else {
                params.set(key, String(value));
            }
        });
        router.push(`/projects?${params.toString()}`, { scroll: false });
    };

    const fetchProjects = async () => {
        setLoading(true);
        try {
            let url = `/api/projects?page=${page}&limit=${pageSize}`;
            if (search) url += `&search=${encodeURIComponent(search)}`;
            if (estimatorId && estimatorId !== 'all') url += `&estimatorId=${estimatorId}`;
            if (dealOwner && dealOwner !== 'all') url += `&dealOwner=${dealOwner}`;
            if (closeDateFilter && closeDateFilter !== 'all') url += `&closeDateFilter=${closeDateFilter}`;
            if (sortBy) url += `&sortBy=${sortBy}`;
            if (sortOrder) url += `&sortOrder=${sortOrder}`;

            const res = await fetch(url);
            const data = await res.json();

            setProjects(data.projects || []);
            setEstimators(data.estimators || []);
            setOwners(data.owners || []);
            setTotalProjects(data.total || 0);
            setTotalPages(data.totalPages || 0);

            if (data.totalPages > 0 && page > data.totalPages) {
                updateUrl({ page: 1 });
            }
        } catch (error) {
            console.error('Failed to fetch projects', error);
        } finally {
            setLoading(false);
        }
    };
    
    // Grouping Logic
    const groupedProjects = useMemo(() => {
        if (!isGrouped) return [];
        
        const groups = new Map<string, {
            name: string;
            normalizedName: string;
            projects: Project[];
            totalDealValue: number;
            totalQuotes: number;
            latestActivity: Date;
            expectedCloseDate: Date | null;
            clients: Set<string>;
            companies: Set<string>;
        }>();

        projects.forEach(project => {
            const normalized = normalizeProjectName(project.projectName);
            const existing = groups.get(normalized);
            
            const projectDate = new Date(project.createdAt);
            const expectedClose = project.expectedCloseDate ? new Date(project.expectedCloseDate) : null;
            const dealVal = Number(project.dealValue) || 0;
            const quoteCount = project._count?.quotes || 0;
            
            const client = getProjectClientDisplay(project);
            const company = getProjectCompanyDisplay(project);

            if (existing) {
                existing.projects.push(project);
                existing.totalDealValue += dealVal;
                existing.totalQuotes += quoteCount;
                if (projectDate > existing.latestActivity) {
                    existing.latestActivity = projectDate;
                    existing.name = project.projectName; // Use most recent name
                }
                if (expectedClose && (!existing.expectedCloseDate || expectedClose > existing.expectedCloseDate)) {
                    existing.expectedCloseDate = expectedClose;
                }
                if (client && client !== 'No Contact') existing.clients.add(client);
                if (company && company !== 'No Company') existing.companies.add(company);
            } else {
                groups.set(normalized, {
                    name: project.projectName,
                    normalizedName: normalized,
                    projects: [project],
                    totalDealValue: dealVal,
                    totalQuotes: quoteCount,
                    latestActivity: projectDate,
                    expectedCloseDate: expectedClose,
                    clients: new Set(client && client !== 'No Contact' ? [client] : []),
                    companies: new Set(company && company !== 'No Company' ? [company] : [])
                });
            }
        });

        return Array.from(groups.values()).sort((a, b) => {
            if (sortBy === 'expectedCloseDate') {
                if (!a.expectedCloseDate && !b.expectedCloseDate) return b.latestActivity.getTime() - a.latestActivity.getTime();
                if (!a.expectedCloseDate) return 1;
                if (!b.expectedCloseDate) return -1;
                
                const factor = sortOrder === 'asc' ? 1 : -1;
                return factor * (a.expectedCloseDate.getTime() - b.expectedCloseDate.getTime());
            }
            
            // Default Sort: Latest Activity (createdAt)
            return b.latestActivity.getTime() - a.latestActivity.getTime();
        });
    }, [projects, isGrouped]);

    const handleSort = (field: string) => {
        if (sortBy === field) {
            updateUrl({ sortOrder: sortOrder === 'asc' ? 'desc' : 'asc' });
        } else {
            updateUrl({ sortBy: field, sortOrder: 'asc' });
        }
    };

    const handleEditOpen = (project: Project) => {
        setSelectedProject(project);
        setEditForm({
            projectName: project.projectName,
            clientName: project.clientName || '',
            companyName: project.companyName || '',
            projectReference: project.projectReference || '',
            projectDescription: project.projectDescription || '',
            projectStatus: project.projectStatus,
        });
        setIsEditDialogOpen(true);
    };

    const handleUpdate = async () => {
        if (!selectedProject) return;
        setActionLoading(true);
        try {
            const res = await fetch(`/api/projects/${selectedProject.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editForm),
            });
            if (res.ok) {
                fetchProjects();
                setIsEditDialogOpen(false);
            }
        } catch (error) {
            console.error('Failed to update project', error);
        } finally {
            setActionLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!selectedProject) return;
        setActionLoading(true);
        try {
            const res = await fetch(`/api/projects/${selectedProject.id}`, {
                method: 'DELETE',
            });
            if (res.ok) {
                fetchProjects();
                setIsDeleteDialogOpen(false);
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to delete project');
            }
        } catch (error) {
            console.error('Failed to delete project', error);
        } finally {
            setActionLoading(false);
        }
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === projects.length && projects.length > 0) {
            setSelectedIds([]);
        } else {
            setSelectedIds(projects.map(p => p.id));
        }
    };

    const toggleSelect = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleBulkDelete = async () => {
        if (selectedIds.length === 0) return;
        setActionLoading(true);
        try {
            const res = await fetch('/api/projects', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: selectedIds }),
            });
            if (res.ok) {
                setSelectedIds([]);
                fetchProjects();
                setIsBulkDeleteDialogOpen(false);
                toast.success('Successfully deleted selected projects');
            } else {
                const data = await res.json();
                toast.error(data.error || 'Failed to delete projects');
            }
        } catch (error) {
            console.error('Failed to delete projects', error);
            toast.error('An error occurred during deletion');
        } finally {
            setActionLoading(false);
        }
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'Budget': return 'bg-purple-50 text-purple-700 border-purple-200';
            case 'Tender': return 'bg-orange-50 text-orange-700 border-orange-200';
            case 'Live': return 'bg-green-50 text-green-700 border-green-200';
            default: return 'bg-gray-50 text-gray-700 border-gray-200';
        }
    };

    return (
        <div className="max-w-[1600px] mx-auto px-4 py-6 sm:py-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
                <div className="space-y-1">
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">Project Management</h1>
                    <p className="hidden sm:block text-sm text-gray-500">Track opportunities, manage statuses, and view quote history.</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200/50 shadow-sm">
                        <button
                            onClick={() => setIsGrouped(true)}
                            className={cn(
                                "px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-widest rounded-lg transition-all",
                                isGrouped ? "bg-white text-blue-600 shadow-sm" : "text-gray-400 hover:text-gray-600"
                            )}
                        >
                            Grouped
                        </button>
                        <button
                            onClick={() => setIsGrouped(false)}
                            className={cn(
                                "px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-widest rounded-lg transition-all",
                                !isGrouped ? "bg-white text-blue-600 shadow-sm" : "text-gray-400 hover:text-gray-600"
                            )}
                        >
                            List
                        </button>
                    </div>

                    <div className="hidden lg:flex bg-gray-100 p-1 rounded-xl border border-gray-200/50 shadow-sm">
                        <button
                            onClick={() => toggleViewMode('TABLE')}
                            className={cn(
                                "p-1.5 rounded-lg transition-all",
                                viewMode === 'TABLE' ? "bg-white text-blue-600 shadow-sm" : "text-gray-400 hover:text-gray-600"
                            )}
                            title="Table View"
                        >
                            <Table2 size={18} />
                        </button>
                        <button
                            onClick={() => toggleViewMode('CARD')}
                            className={cn(
                                "p-1.5 rounded-lg transition-all",
                                viewMode === 'CARD' ? "bg-white text-blue-600 shadow-sm" : "text-gray-400 hover:text-gray-600"
                            )}
                            title="Card View"
                        >
                            <LayoutGrid size={18} />
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                <div className="flex flex-wrap items-center gap-2">
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="outline"
                                    onClick={() => handleSync('quick')}
                                    disabled={syncingPipedrive || !isPipedriveConfigured}
                                    className={cn(
                                        "flex-1 sm:flex-none flex items-center justify-center gap-2 border-gray-200 rounded-xl h-11 px-4 sm:px-5 shadow-sm hover:bg-slate-50 transition-all font-bold text-slate-600 text-xs sm:text-sm",
                                        !isPipedriveConfigured && "opacity-50 grayscale cursor-not-allowed"
                                    )}
                                >
                                    {syncingPipedrive ? (
                                        <Loader2 className="animate-spin text-blue-500" size={18} />
                                    ) : (
                                        <RefreshCcw size={18} className={cn("text-emerald-500", !isPipedriveConfigured && "text-gray-400")} />
                                    )}
                                    <span className="hidden xs:inline">Sync Recent</span>
                                    <span className="xs:hidden">Quick</span>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>{isPipedriveConfigured ? "Faster, limited to latest 50 deals" : "Please configure Pipedrive API key in Admin Settings"}</p>
                            </TooltipContent>
                        </Tooltip>

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="outline"
                                    onClick={() => handleSync('full')}
                                    disabled={syncingPipedrive || !isPipedriveConfigured}
                                    className={cn(
                                        "flex-1 sm:flex-none flex items-center justify-center gap-2 border-gray-200 rounded-xl h-11 px-4 sm:px-5 shadow-sm hover:bg-slate-50 transition-all font-bold text-slate-600 text-xs sm:text-sm",
                                        !isPipedriveConfigured && "opacity-50 grayscale cursor-not-allowed"
                                    )}
                                >
                                    {syncingPipedrive ? (
                                        <Loader2 className="animate-spin text-blue-500" size={18} />
                                    ) : (
                                        <div className={cn(
                                            "w-5 h-5 rounded-md overflow-hidden flex items-center justify-center bg-blue-50",
                                            !isPipedriveConfigured && "bg-gray-100"
                                        )}>
                                            <img src="/pipedrive.jpeg" alt="Pipedrive" className="w-full h-full object-cover" />
                                        </div>
                                    )}
                                    <span className="hidden xs:inline">Sync All</span>
                                    <span className="xs:hidden">Full</span>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>{isPipedriveConfigured ? "Slower, syncs entire Pipedrive dataset" : "Please configure Pipedrive API key in Admin Settings"}</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>

                    {syncingPipedrive && syncProgress && (
                        <div className="flex items-center gap-2 animate-pulse bg-blue-50 px-3 py-2 rounded-xl border border-blue-100 shadow-sm">
                            <Loader2 className="animate-spin text-blue-600 w-3.5 h-3.5" />
                            <span className="text-[10px] font-bold text-blue-700 uppercase tracking-widest whitespace-nowrap">
                                Syncing: {syncProgress.processed} processed
                            </span>
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col mb-6">
                <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex flex-1 items-center gap-3 max-w-5xl w-full">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder="Search projects, clients, or companies..."
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm italic shadow-sm"
                            />
                        </div>

                        <div className="w-[180px] shrink-0">
                            <Select
                                value={dealOwner}
                                onValueChange={(val) => updateUrl({ dealOwner: val, page: 1 })}
                            >
                                <SelectTrigger className={cn(
                                    "w-full h-10 rounded-xl border-gray-200 bg-white font-bold italic shadow-sm text-xs transition-all",
                                    dealOwner !== 'all' ? "border-emerald-500 bg-emerald-50/50 text-emerald-700 ring-1 ring-emerald-500/20" : "text-slate-700"
                                )}>
                                    <div className="flex items-center gap-2">
                                        <Briefcase size={14} className={dealOwner !== 'all' ? "text-emerald-600" : "text-emerald-500"} />
                                        <SelectValue placeholder="All Owners" />
                                    </div>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all" className="font-bold italic">All Deal Owners</SelectItem>
                                    <SelectItem value="unassigned" className="font-medium text-gray-400 italic">Unassigned</SelectItem>
                                    {owners.map(owner => (
                                        <SelectItem key={owner} value={owner} className="font-medium">
                                            {owner}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="w-[180px] shrink-0">
                            <Select
                                value={estimatorId}
                                onValueChange={(val) => updateUrl({ estimatorId: val, page: 1 })}
                            >
                                <SelectTrigger className={cn(
                                    "w-full h-10 rounded-xl border-gray-200 bg-white font-bold italic shadow-sm text-xs transition-all",
                                    estimatorId !== 'all' ? "border-blue-500 bg-blue-50/50 text-blue-700 ring-1 ring-blue-500/20" : "text-slate-700"
                                )}>
                                    <div className="flex items-center gap-2">
                                        <User size={14} className={estimatorId !== 'all' ? "text-blue-600" : "text-blue-500"} />
                                        <SelectValue placeholder="All Estimators" />
                                    </div>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all" className="font-bold italic">All Estimators</SelectItem>
                                    {estimators.map(est => (
                                        <SelectItem key={est.id} value={est.id} className="font-medium">
                                            {est.name || est.email}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="w-[180px] shrink-0">
                            <Select
                                value={closeDateFilter}
                                onValueChange={(val) => updateUrl({ closeDateFilter: val, page: 1 })}
                            >
                                <SelectTrigger className={cn(
                                    "w-full h-10 rounded-xl border-gray-200 bg-white font-bold italic shadow-sm text-xs transition-all",
                                    closeDateFilter !== 'all' ? "border-amber-500 bg-amber-50/50 text-amber-700 ring-1 ring-amber-500/20" : "text-slate-700"
                                )}>
                                    <div className="flex items-center gap-2">
                                        <Calendar size={14} className={closeDateFilter !== 'all' ? "text-amber-600" : "text-amber-500"} />
                                        <SelectValue placeholder="All Close Dates" />
                                    </div>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all" className="font-bold italic">All Close Dates</SelectItem>
                                    <SelectItem value="overdue" className="text-rose-600 font-bold">Overdue</SelectItem>
                                    <SelectItem value="today">Today</SelectItem>
                                    <SelectItem value="this_week">This Week</SelectItem>
                                    <SelectItem value="next_30_days">Next 30 Days</SelectItem>
                                    <SelectItem value="future">Future</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {(dealOwner !== 'all' || estimatorId !== 'all' || closeDateFilter !== 'all' || search) && (
                            <Button
                                variant="ghost"
                                onClick={() => {
                                    setSearchInput('');
                                    updateUrl({ 
                                        dealOwner: 'all', 
                                        estimatorId: 'all', 
                                        closeDateFilter: 'all', 
                                        search: '', 
                                        page: 1 
                                    });
                                }}
                                className="h-10 px-3 text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all flex items-center gap-1.5"
                            >
                                <X size={14} />
                                <span className="text-xs font-bold uppercase tracking-tight">Clear</span>
                            </Button>
                        )}
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
                        <div className="flex items-center gap-2 border border-gray-200 bg-white rounded-xl px-3 py-1.5 shadow-sm">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">Show</span>
                            <select
                                value={pageSize}
                                onChange={(e) => updateUrl({ limit: parseInt(e.target.value), page: 1 })}
                                className="text-xs font-bold text-gray-700 bg-transparent focus:outline-none cursor-pointer"
                            >
                                <option value="10">10</option>
                                <option value="25">25</option>
                                <option value="50">50</option>
                                <option value="100">100</option>
                            </select>
                        </div>

                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={fetchProjects}
                            disabled={loading}
                            className="text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl font-bold flex items-center gap-2 px-3 h-9"
                        >
                            {loading ? <Loader2 className="animate-spin w-4 h-4" /> : <RefreshCcw className="w-4 h-4" />}
                            <span className="hidden sm:inline">Refresh</span>
                        </Button>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="rounded-xl border-gray-200 h-9 font-bold text-gray-700 flex items-center gap-2">
                                    <Settings2 size={16} />
                                    <span>Columns</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                                <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuCheckboxItem
                                    checked={visibleColumns.dealOwner}
                                    onCheckedChange={() => toggleColumn('dealOwner')}
                                >
                                    Deal Owner
                                </DropdownMenuCheckboxItem>
                                <DropdownMenuCheckboxItem
                                    checked={visibleColumns.created}
                                    onCheckedChange={() => toggleColumn('created')}
                                >
                                    Expected Close
                                </DropdownMenuCheckboxItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                <div
                    ref={tableContainerRef}
                    onScroll={handleTableScroll}
                    className={cn(
                        "hidden overflow-x-auto min-h-[400px] relative",
                        viewMode === 'TABLE' ? "lg:block" : "hidden"
                    )}
                >
                    <table className="w-full text-left table-fixed min-w-full">
                        <thead>
                            <tr className="bg-gray-50/50 border-b border-gray-100">
                                <th className="px-6 py-4 w-[50px]">
                                    <input
                                        type="checkbox"
                                        checked={projects.length > 0 && selectedIds.length === projects.length}
                                        onChange={toggleSelectAll}
                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                    />
                                </th>
                                {visibleColumns.dealOwner && <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest w-[110px] text-center">Owner</th>}
                                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest w-[80px] text-center">Est.</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Project</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest w-[130px] text-center">Status</th>
                                <th 
                                    className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest w-[200px] text-right whitespace-nowrap cursor-pointer hover:text-slate-600 transition-colors group"
                                    onClick={() => handleSort('expectedCloseDate')}
                                >
                                    <div className="flex items-center justify-end gap-2">
                                        {sortBy === 'expectedCloseDate' && (
                                            sortOrder === 'asc' ? <ChevronUp size={14} className="text-blue-500" /> : <ChevronDown size={14} className="text-blue-500" />
                                        )}
                                        Expected Close Date
                                    </div>
                                </th>
                                <th className="px-6 py-4 w-[70px] sticky right-0 z-10 bg-gray-50/50 shadow-[-4px_0_8px_rgba(0,0,0,0.02)]"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading && projects.length === 0 ? (
                                <tr>
                                    <td colSpan={visibleColumns.dealOwner ? 6 : 5} className="px-6 py-20 text-center">
                                        <Loader2 className="animate-spin inline-block text-blue-500 mb-2" size={32} />
                                        <p className="text-gray-400 font-medium">Loading projects...</p>
                                    </td>
                                </tr>
                            ) : projects.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center text-gray-300">
                                                <Search size={24} />
                                            </div>
                                            <p className="text-gray-500 font-bold">
                                                {search ? "No results match your search" : "No projects found"}
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            ) : isGrouped ? (
                                // Grouped View
                                groupedProjects.map((group) => (
                                    <tr key={group.normalizedName} className={cn(
                                        "hover:bg-[#f8faff] transition-colors group cursor-pointer",
                                        loading && "opacity-50 pointer-events-none"
                                    )} onClick={() => router.push(`/projects/group/${encodeURIComponent(group.normalizedName)}`)}>
                                        <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                                            <div className="w-4 h-4 rounded border border-gray-200 bg-gray-50/50" />
                                        </td>
                                        {visibleColumns.dealOwner && (
                                            <td className="px-6 py-4">
                                                <div className="flex justify-center">
                                                    <OwnerBadge name={group.projects[0].pipedriveOwnerName} />
                                                </div>
                                            </td>
                                        )}
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex justify-center">
                                                {(() => {
                                                    // Flatten all quotes from all projects in this group
                                                    const allQuotes = group.projects.flatMap(p => p.quotes);
                                                    // Sort by updatedAt desc to ensure the "most recent" estimator is first
                                                    const sortedQuotes = [...allQuotes].sort((a, b) => 
                                                        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
                                                    );
                                                    return (
                                                        <EstimatorBadges quotes={sortedQuotes} limit={1} />
                                                    );
                                                })()}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-slate-50 text-slate-400 rounded-lg group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors shadow-sm shrink-0">
                                                    <Briefcase size={18} />
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <div className="flex items-center gap-2 mb-0.5">
                                                        <span className="font-extrabold text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                                                            {group.name}
                                                        </span>
                                                        {group.projects.length > 1 && (
                                                            <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 text-[9px] font-bold uppercase tracking-tight rounded border border-blue-100 whitespace-nowrap">
                                                                Grouped Project
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <span className="text-[10px] text-gray-400 font-medium flex items-center gap-1 cursor-help hover:text-blue-500 transition-colors">
                                                                        <Building2 size={10} />
                                                                        {group.companies.size} {group.companies.size === 1 ? 'Company' : 'Companies'}
                                                                    </span>
                                                                </TooltipTrigger>
                                                                <TooltipContent className="p-3 max-w-[300px] bg-white border-blue-100 shadow-xl">
                                                                    <div className="space-y-1.5">
                                                                        <p className="font-bold text-gray-900 border-b border-gray-100 pb-1 mb-1">
                                                                            {group.companies.size === 1 ? 'Company Name:' : 'Company Names:'}
                                                                        </p>
                                                                        {Array.from(group.companies).map((c, i) => (
                                                                            <div key={i} className="flex items-center gap-2 text-xs text-gray-600">
                                                                                <Building2 size={10} className="text-gray-400" />
                                                                                {c || 'No Company'}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                        <span className="text-[10px] text-gray-300">•</span>
                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <span className="text-[10px] text-gray-400 font-medium flex items-center gap-1 cursor-help hover:text-blue-500 transition-colors">
                                                                        <User size={10} />
                                                                        {group.clients.size} {group.clients.size === 1 ? 'Client' : 'Clients'}
                                                                    </span>
                                                                </TooltipTrigger>
                                                                <TooltipContent className="p-3 max-w-[300px] bg-white border-blue-100 shadow-xl">
                                                                    <div className="space-y-1.5">
                                                                        <p className="font-bold text-gray-900 border-b border-gray-100 pb-1 mb-1">
                                                                            {group.clients.size === 1 ? 'Client Name:' : 'Client Names:'}
                                                                        </p>
                                                                        {Array.from(group.clients).map((c, i) => (
                                                                            <div key={i} className="flex items-center gap-2 text-xs text-gray-600">
                                                                                <User size={10} className="text-gray-400" />
                                                                                {c || 'No Contact'}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                        <span className="text-[10px] text-gray-300">•</span>
                                                        <span className="text-[10px] text-gray-400 font-medium flex items-center gap-1">
                                                            <FileText size={10} />
                                                            {group.totalQuotes} Quotes
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex justify-center">
                                                <span className={cn(
                                                    "px-3 py-1 rounded-full text-[10px] font-bold border uppercase tracking-widest shadow-sm",
                                                    getStatusStyle(group.projects[0].projectStatus)
                                                )}>
                                                    {group.projects[0].projectStatus}
                                                </span>
                                            </div>
                                        </td>
                                        {visibleColumns.created && (
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex flex-col items-end">
                                                    <span className="text-sm font-semibold text-gray-700">
                                                        {group.expectedCloseDate ? format(group.expectedCloseDate, 'dd MMM yyyy') : '—'}
                                                    </span>
                                                </div>
                                            </td>
                                        )}
                                        <td className="px-6 py-4 sticky right-0 z-10 bg-white group-hover:bg-[#f8faff] transition-colors shadow-[-4px_0_8px_rgba(0,0,0,0.02)]">
                                            <div className="flex justify-center">
                                                <div className="p-2 hover:bg-white hover:shadow-sm rounded-lg text-gray-400 hover:text-blue-600 transition-all border border-transparent">
                                                    <ChevronRight size={20} />
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                // Original Individual View
                                projects.map((project) => (
                                    <tr key={project.id} className={cn(
                                        "hover:bg-[#f8faff] transition-colors group",
                                        loading && "opacity-50 pointer-events-none",
                                        selectedIds.includes(project.id) && "bg-blue-50/50"
                                    )}>
                                        <td className="px-6 py-4">
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.includes(project.id)}
                                                onChange={() => toggleSelect(project.id)}
                                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                            />
                                        </td>
                                        {visibleColumns.dealOwner && (
                                            <td className="px-6 py-4">
                                                <div className="flex justify-center">
                                                    <OwnerBadge name={project.pipedriveOwnerName} />
                                                </div>
                                            </td>
                                        )}
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex justify-center">
                                                <EstimatorBadges quotes={project.quotes} />
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-100 transition-colors shadow-sm shrink-0">
                                                    <Briefcase size={18} />
                                                </div>
                                                <div
                                                    className="cursor-pointer group/link w-full overflow-hidden"
                                                    onClick={() => router.push(`/projects/${project.id}`)}
                                                >
                                                    {(() => {
                                                        const isTruncated = (project.projectName || '').length > 40;
                                                        const projectDisplay = (
                                                            <div className="font-bold text-gray-900 leading-tight group-hover/link:text-blue-600 transition-all whitespace-normal line-clamp-2 overflow-hidden text-ellipsis cursor-pointer break-words" title={!isTruncated ? project.projectName : undefined}>
                                                                {project.projectName}
                                                            </div>
                                                        );

                                                        if (isTruncated) {
                                                            return (
                                                                <TooltipProvider>
                                                                    <Tooltip>
                                                                        <TooltipTrigger asChild>
                                                                            {projectDisplay}
                                                                        </TooltipTrigger>
                                                                        <TooltipContent side="right" className="p-3 max-w-[400px] border-blue-100 bg-white shadow-xl">
                                                                            <div className="space-y-1">
                                                                                <div className="font-semibold text-gray-900 leading-tight">{project.projectName}</div>
                                                                                {project.companyName && (
                                                                                    <div className="text-xs text-gray-500 flex items-center gap-1.5">
                                                                                        <Building2 size={12} />
                                                                                        {project.companyName}
                                                                                    </div>
                                                                                )}
                                                                                {project.clientName && (
                                                                                    <div className="text-xs text-gray-500 flex items-center gap-1.5">
                                                                                        <User size={12} />
                                                                                        {project.clientName}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </TooltipContent>
                                                                    </Tooltip>
                                                                </TooltipProvider>
                                                            );
                                                        }
                                                        return projectDisplay;
                                                    })()}
                                                </div>
                                                <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                                    {project.pipedriveDealUrl && (
                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <a
                                                                        href={project.pipedriveDealUrl}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        onClick={(e) => e.stopPropagation()}
                                                                        className="p-1 hover:bg-blue-100 text-blue-600 rounded-md transition-colors"
                                                                    >
                                                                        <div className="w-3.5 h-3.5 rounded-sm overflow-hidden">
                                                                            <img src="/pipedrive.jpeg" alt="Pipedrive" className="w-full h-full object-cover" />
                                                                        </div>
                                                                    </a>
                                                                </TooltipTrigger>
                                                                <TooltipContent>Open Pipedrive Deal</TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                    )}
                                                    {project.quoteFolder && (
                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <a
                                                                        href={project.quoteFolder.startsWith('http') ? project.quoteFolder : `https://${project.quoteFolder}`}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        onClick={(e) => e.stopPropagation()}
                                                                        className="p-1 hover:bg-blue-100 text-slate-500 hover:text-blue-700 rounded-md transition-colors"
                                                                    >
                                                                        <div className="w-3.5 h-3.5 rounded-sm overflow-hidden shrink-0">
                                                                            <img src="/sharepoint.svg" alt="Sharepoint" className="w-full h-full object-contain" />
                                                                        </div>
                                                                    </a>
                                                                </TooltipTrigger>
                                                                <TooltipContent>Open Quote Folder</TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex justify-center">
                                                <span className={cn(
                                                    "px-3 py-1 rounded-full text-[10px] font-bold border uppercase tracking-widest shadow-sm",
                                                    getStatusStyle(project.projectStatus)
                                                )}>
                                                    {project.projectStatus}
                                                </span>
                                            </div>
                                        </td>
                                        {visibleColumns.created && (
                                            <td className="px-6 py-4 text-right whitespace-nowrap">
                                                <div className="text-sm font-semibold text-gray-700">
                                                    {project.expectedCloseDate ? format(new Date(project.expectedCloseDate), 'dd MMM yyyy') : '—'}
                                                </div>
                                            </td>
                                        )}
                                        <td className="px-6 py-4 sticky right-0 z-10 bg-white group-hover:bg-[#f8faff] transition-colors shadow-[-4px_0_8px_rgba(0,0,0,0.02)]">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <button className="p-2 hover:bg-white hover:shadow-sm rounded-lg text-gray-400 hover:text-gray-600 transition-all border border-transparent">
                                                        <MoreVertical size={18} />
                                                    </button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-48">
                                                    <DropdownMenuItem onClick={() => handleEditOpen(project)} className="cursor-pointer font-medium">
                                                        <Edit2 className="mr-2 h-4 w-4 text-gray-400" />
                                                        Edit Project
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => {
                                                        setSelectedProject(project);
                                                        setIsDeleteDialogOpen(true);
                                                    }} className="text-red-600 cursor-pointer font-medium">
                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                        Delete Project
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Sticky Horizontal Scrollbar */}
                <div
                    ref={scrollbarRef}
                    onScroll={handleScrollbarScroll}
                    className="overflow-x-auto h-2 bg-gray-50 border-t border-gray-100 sticky bottom-0 z-20"
                >
                    <div style={{ width: `${tableScrollWidth}px`, height: '1px' }} />
                </div>

                {/* Card View (Desktop) */}
                <div className={cn(
                    "hidden px-4 py-6",
                    viewMode === 'CARD' ? "lg:block" : "hidden"
                )}>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {isGrouped ? (
                            groupedProjects.map(group => (
                                <MobileGroupedProjectCard 
                                    key={group.normalizedName} 
                                    group={group as any}
                                    onClick={() => router.push(`/projects/group/${encodeURIComponent(group.normalizedName)}`)}
                                />
                            ))
                        ) : (
                            projects.map(project => (
                                <MobileProjectCard 
                                    key={project.id} 
                                    project={project as any}
                                    onEdit={handleEditOpen as any}
                                    onDelete={((p: any) => {
                                        setSelectedProject(p as any);
                                        setIsDeleteDialogOpen(true);
                                    }) as any}
                                />
                            ))
                        )}
                    </div>
                    {projects.length === 0 && !loading && (
                        <div className="py-20 text-center bg-white rounded-2xl border border-dashed border-gray-200">
                            <Briefcase className="mx-auto w-12 h-12 text-gray-300 mb-4" />
                            <p className="text-gray-500 font-medium">No projects found.</p>
                        </div>
                    )}
                </div>

                {/* Pagination Footer */}
                <div className="hidden lg:flex px-6 py-4 border-t border-gray-100 bg-gray-50/30 items-center justify-between">
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                        {totalProjects > 0 ? (
                            <>
                                Showing <span className="text-gray-900">{Math.min((page - 1) * pageSize + 1, totalProjects)}</span> – <span className="text-gray-900">{Math.min(page * pageSize, totalProjects)}</span> of <span className="text-gray-900">{totalProjects}</span> projects
                            </>
                        ) : (
                            "No projects to display"
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={page <= 1 || loading}
                            onClick={() => updateUrl({ page: page - 1 })}
                            className="rounded-xl h-9 px-4 border-gray-200 text-gray-600 font-bold hover:bg-white hover:text-blue-600 disabled:opacity-30 transition-all flex items-center gap-2"
                        >
                            <ChevronLeft size={16} />
                            Previous
                        </Button>
                        <div className="flex items-center gap-1 mx-2">
                            <span className="text-xs font-bold text-gray-900">{page}</span>
                            <span className="text-xs font-bold text-gray-400">/</span>
                            <span className="text-xs font-bold text-gray-400">{totalPages || 1}</span>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={page >= totalPages || loading}
                            onClick={() => updateUrl({ page: page + 1 })}
                            className="rounded-xl h-9 px-4 border-gray-200 text-gray-600 font-bold hover:bg-white hover:text-blue-600 disabled:opacity-30 transition-all flex items-center gap-2"
                        >
                            Next
                            <ChevronRight size={16} />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Mobile View */}
            <div className="lg:hidden">
                {loading && projects.length === 0 ? (
                    <div className="py-20 text-center bg-white rounded-2xl border border-gray-100">
                        <Loader2 className="animate-spin w-8 h-8 text-blue-500 mx-auto mb-4" />
                        <p className="text-gray-500 font-medium">Loading projects...</p>
                    </div>
                ) : (
                    <>
                        <div className="space-y-1">
                            {isGrouped ? (
                                groupedProjects.map(group => (
                                    <MobileGroupedProjectCard 
                                        key={group.normalizedName} 
                                        group={group as any}
                                        onClick={() => router.push(`/projects/group/${encodeURIComponent(group.normalizedName)}`)}
                                    />
                                ))
                            ) : (
                                projects.map(project => (
                                    <MobileProjectCard 
                                        key={project.id} 
                                        project={project as any}
                                        onEdit={handleEditOpen as any}
                                        onDelete={((p: any) => {
                                            setSelectedProject(p as any);
                                            setIsDeleteDialogOpen(true);
                                        }) as any}
                                    />
                                ))
                            )}
                        </div>

                        {projects.length === 0 && !loading && (
                            <div className="py-20 text-center bg-white rounded-2xl border border-dashed border-gray-200">
                                <Briefcase className="mx-auto w-12 h-12 text-gray-300 mb-4" />
                                <p className="text-gray-500 font-medium">No projects found.</p>
                            </div>
                        )}

                        {/* Mobile Pagination */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-between pt-4 pb-8 px-1">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => updateUrl({ page: page - 1 })}
                                    disabled={page === 1}
                                    className="rounded-xl h-10 border-gray-200 font-bold text-gray-600 bg-white"
                                >
                                    <ChevronLeft size={16} />
                                    Prev
                                </Button>
                                <span className="text-xs font-bold text-gray-500">
                                    Page {page} of {totalPages}
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => updateUrl({ page: page + 1 })}
                                    disabled={page === totalPages}
                                    className="rounded-xl h-10 border-gray-200 font-bold text-gray-600 bg-white"
                                >
                                    Next
                                    <ChevronRight size={16} />
                                </Button>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Edit Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Edit Project Details</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold">Project Name</label>
                                <input
                                    value={editForm.projectName}
                                    onChange={(e) => setEditForm({ ...editForm, projectName: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold">Status</label>
                                <Select
                                    value={editForm.projectStatus}
                                    onValueChange={(val) => setEditForm({ ...editForm, projectStatus: val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Budget">Budget</SelectItem>
                                        <SelectItem value="Tender">Tender</SelectItem>
                                        <SelectItem value="Live">Live</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold">Client Name</label>
                                <input
                                    value={editForm.clientName}
                                    onChange={(e) => setEditForm({ ...editForm, clientName: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold">Company Name</label>
                                <input
                                    value={editForm.companyName}
                                    onChange={(e) => setEditForm({ ...editForm, companyName: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold">Project Reference</label>
                            <input
                                value={editForm.projectReference}
                                onChange={(e) => setEditForm({ ...editForm, projectReference: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold">Description</label>
                            <textarea
                                value={editForm.projectDescription}
                                onChange={(e) => setEditForm({ ...editForm, projectDescription: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg min-h-[100px]"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
                        <Button
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                            onClick={handleUpdate}
                            disabled={actionLoading}
                        >
                            {actionLoading ? <Loader2 className="animate-spin" /> : 'Save Changes'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Bulk Delete Dialog */}
            <Dialog open={isBulkDeleteDialogOpen} onOpenChange={setIsBulkDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="text-red-600 flex items-center gap-2">
                            <AlertCircle /> Delete Multiple Projects?
                        </DialogTitle>
                        <DialogDescription className="py-2">
                            <div className="space-y-3">
                                <p className="font-bold text-gray-900 border-l-4 border-red-500 pl-4 bg-red-50 py-2">
                                    WARNING: You are about to delete {selectedIds.length} projects.
                                </p>
                                <p>Deleting these projects will <span className="font-bold underline">permanently delete all associated quotes</span>. This action cannot be undone.</p>
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
                            {actionLoading ? <Loader2 className="animate-spin" /> : `Delete ${selectedIds.length} Projects`}
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
                        <span className="text-sm font-medium">Projects Selected</span>
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
                            Delete Selected
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
