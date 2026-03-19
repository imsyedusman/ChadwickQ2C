'use client';

import { useState, useEffect } from 'react';
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
    FileText
} from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
    projectReference: string | null;
    projectDescription: string | null;
    projectStatus: string;
    createdAt: string;
    client?: { name: string } | null;
    contact?: { name: string } | null;
    _count?: {
        quotes: number;
    };
}

export default function ProjectsPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    
    // URL-based state
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('limit') || '25');
    const search = searchParams.get('search') || '';

    const [projects, setProjects] = useState<Project[]>([]);
    const [totalProjects, setTotalProjects] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [loading, setLoading] = useState(true);
    const [searchInput, setSearchInput] = useState(search);
    
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

    // Sync search input with URL if needed (e.g. browser back)
    useEffect(() => {
        setSearchInput(search);
    }, [search]);

    useEffect(() => {
        fetchProjects();
    }, [page, pageSize, search]);

    // Internal debounced search effect that updates URL
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchInput !== search) {
                updateUrl({ search: searchInput, page: 1 });
            }
        }, 400);
        return () => clearTimeout(timer);
    }, [searchInput]);

    const updateUrl = (updates: { page?: number; limit?: number; search?: string }) => {
        const params = new URLSearchParams(searchParams.toString());
        if (updates.page !== undefined) params.set('page', updates.page.toString());
        if (updates.limit !== undefined) params.set('limit', updates.limit.toString());
        if (updates.search !== undefined) {
            if (updates.search) params.set('search', updates.search);
            else params.delete('search');
        }
        router.push(`/projects?${params.toString()}`, { scroll: false });
    };

    const fetchProjects = async () => {
        setLoading(true);
        try {
            const url = `/api/projects?page=${page}&limit=${pageSize}${search ? `&search=${encodeURIComponent(search)}` : ''}`;
            const res = await fetch(url);
            const data = await res.json();
            
            // data is { projects, total, page, totalPages }
            setProjects(data.projects || []);
            setTotalProjects(data.total || 0);
            setTotalPages(data.totalPages || 0);

            // Handle out of bounds
            if (data.totalPages > 0 && page > data.totalPages) {
                updateUrl({ page: 1 });
            }
        } catch (error) {
            console.error('Failed to fetch projects', error);
        } finally {
            setLoading(false);
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

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'Budget': return 'bg-purple-50 text-purple-700 border-purple-200';
            case 'Tender': return 'bg-orange-50 text-orange-700 border-orange-200';
            case 'Live': return 'bg-green-50 text-green-700 border-green-200';
            default: return 'bg-gray-50 text-gray-700 border-gray-200';
        }
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex justify-between items-end mb-8">
                <div className="space-y-1">
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Project Management</h1>
                    <p className="text-gray-500">Track opportunities, manage statuses, and view quote history.</p>
                </div>
                {/* 
                   We don't need a Create Project button here because projects are primarily created 
                   via the New Quote flow. But we can add it if needed.
                */}
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
                <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="relative flex-1 max-w-md w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search projects, clients, or companies..."
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm italic shadow-sm"
                        />
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
                    </div>
                </div>

                <div className="overflow-x-auto min-h-[400px]">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50/50 border-b border-gray-100">
                                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Project/Client</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-center">Status</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-center">Quotes</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-center">Contact</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Details</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Created</th>
                                <th className="px-6 py-4 w-10"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 relative">
                            {loading && projects.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-20 text-center">
                                        <Loader2 className="animate-spin inline-block text-blue-500 mb-2" size={32} />
                                        <p className="text-gray-400 font-medium">Loading projects...</p>
                                    </td>
                                </tr>
                            ) : projects.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center text-gray-300">
                                                <Search size={24} />
                                            </div>
                                            <p className="text-gray-500 font-bold">
                                                {search ? "No results match your search" : "No projects found"}
                                            </p>
                                            {search && (
                                                <Button 
                                                    variant="link" 
                                                    className="text-blue-600 h-auto p-0"
                                                    onClick={() => updateUrl({ search: '', page: 1 })}
                                                >
                                                    Clear filters
                                                </Button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                projects.map((project) => (
                                    <tr key={project.id} className={cn(
                                        "hover:bg-blue-50/30 transition-colors group",
                                        loading && "opacity-50 pointer-events-none"
                                    )}>
                                        <td className="px-6 py-4">
                                            <div className="flex items-start gap-3">
                                                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-100 transition-colors shadow-sm">
                                                    <Briefcase size={20} />
                                                </div>
                                                <div>
                                                <div 
                                                    className="cursor-pointer group/link"
                                                    onClick={() => router.push(`/projects/${project.id}`)}
                                                >
                                                    <div className="font-bold text-gray-900 leading-tight group-hover/link:text-blue-600 group-hover/link:underline decoration-blue-200 transition-all">{project.projectName}</div>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="text-xs text-gray-500 font-medium">
                                                            {getProjectClientDisplay(project)}
                                                        </span>
                                                        {(project.companyName || project.client?.name) && (
                                                            <>
                                                                <div className="w-1 h-1 rounded-full bg-gray-300" />
                                                                <span className="text-xs text-blue-600 font-semibold italic">
                                                                    {getProjectCompanyDisplay(project)}
                                                                </span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
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
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col items-center">
                                                <span className="text-sm font-bold text-gray-900">{project._count?.quotes || 0}</span>
                                                <span className="text-[10px] text-gray-400 uppercase tracking-tighter">Quotes</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex flex-col items-center">
                                                <div className="flex items-center gap-1.5 text-xs font-bold text-gray-700">
                                                    <User size={12} className="text-gray-400" />
                                                    {getProjectContactDisplay(project)}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                {project.projectReference && (
                                                    <div className="text-[10px] text-gray-400 uppercase tracking-tighter font-bold flex items-center gap-1">
                                                        REF: <span className="text-gray-600 font-medium">{project.projectReference}</span>
                                                    </div>
                                                )}
                                                <div className="text-xs text-gray-500 truncate max-w-[200px] italic">
                                                    {project.projectDescription || 'No description provided'}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="text-sm font-medium text-gray-700">
                                                {format(new Date(project.createdAt), 'dd MMM yyyy')}
                                            </div>
                                            <div className="text-[10px] text-gray-400 uppercase">{format(new Date(project.createdAt), 'h:mm a')}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <button className="p-2 hover:bg-white hover:shadow-sm rounded-lg text-gray-400 hover:text-gray-600 transition-all border border-transparent">
                                                        <MoreVertical size={18} />
                                                    </button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-48">
                                                    <DropdownMenuItem onClick={() => handleEditOpen(project)} className="cursor-pointer">
                                                        <Edit2 className="mr-2 h-4 w-4 text-gray-400" />
                                                        Edit Details
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => {
                                                        setSelectedProject(project);
                                                        setIsDeleteDialogOpen(true);
                                                    }} className="text-red-600 cursor-pointer">
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

                {/* Pagination Footer */}
                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/30 flex items-center justify-between">
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

            {/* Delete Dialog */}
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="text-red-600 flex items-center gap-2">
                            <AlertCircle /> Delete Project?
                        </DialogTitle>
                        <DialogDescription className="py-2">
                            {selectedProject?._count?.quotes && selectedProject._count.quotes > 0 ? (
                                <div className="space-y-3">
                                    <p className="font-bold text-gray-900 border-l-4 border-red-500 pl-4 bg-red-50 py-2">
                                        WARNING: This project has {selectedProject._count.quotes} associated quote{selectedProject._count.quotes > 1 ? 's' : ''}.
                                    </p>
                                    <p>Deleting this project will <span className="font-bold underline">permanently delete all associated quotes</span>. This action cannot be undone.</p>
                                </div>
                            ) : (
                                <p>Are you sure you want to delete <span className="font-bold">{selectedProject?.projectName}</span>? This action cannot be undone.</p>
                            )}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="ghost" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
                        <Button 
                            variant="destructive" 
                            onClick={handleDelete}
                            disabled={actionLoading}
                        >
                            {actionLoading ? <Loader2 className="animate-spin" /> : 'Delete Permanently'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
