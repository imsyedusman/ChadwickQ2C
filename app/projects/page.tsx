'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
    Search, 
    Plus, 
    MoreVertical, 
    Edit2, 
    Trash2, 
    ExternalLink, 
    Briefcase,
    Users,
    Building2,
    Calendar,
    FileText,
    Loader2,
    ChevronRight,
    AlertCircle
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

interface Project {
    id: string;
    projectName: string;
    clientName: string | null;
    companyName: string | null;
    projectReference: string | null;
    projectDescription: string | null;
    projectStatus: string;
    createdAt: string;
    _count?: {
        quotes: number;
    };
}

export default function ProjectsPage() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
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
    const router = useRouter();

    useEffect(() => {
        fetchProjects();
    }, []);

    const fetchProjects = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/projects');
            const data = await res.json();
            setProjects(data);
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

    const filteredProjects = projects.filter(p => 
        p.projectName.toLowerCase().includes(search.toLowerCase()) ||
        (p.clientName || '').toLowerCase().includes(search.toLowerCase()) ||
        (p.companyName || '').toLowerCase().includes(search.toLowerCase())
    );

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
                <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                    <div className="relative w-full max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search projects, clients, or companies..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm italic"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50/50 border-b border-gray-100">
                                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Project/Client</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-center">Status</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-center">Quotes</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Details</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Created</th>
                                <th className="px-6 py-4 w-10"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-20 text-center">
                                        <Loader2 className="animate-spin inline-block text-blue-500 mb-2" size={32} />
                                        <p className="text-gray-400 font-medium">Loading projects...</p>
                                    </td>
                                </tr>
                            ) : filteredProjects.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-20 text-center text-gray-400">
                                        No projects found.
                                    </td>
                                </tr>
                            ) : (
                                filteredProjects.map((project) => (
                                    <tr key={project.id} className="hover:bg-blue-50/30 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-start gap-3">
                                                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-100 transition-colors">
                                                    <Briefcase size={20} />
                                                </div>
                                                <div>
                                                <div 
                                                    className="cursor-pointer group/link"
                                                    onClick={() => router.push(`/projects/${project.id}`)}
                                                >
                                                    <div className="font-bold text-gray-900 leading-tight group-hover/link:text-blue-600 group-hover/link:underline decoration-blue-200 transition-all">{project.projectName}</div>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="text-xs text-gray-500 font-medium">{project.clientName || '---'}</span>
                                                        {project.companyName && (
                                                            <>
                                                                <div className="w-1 h-1 rounded-full bg-gray-300" />
                                                                <span className="text-xs text-blue-600 font-semibold">{project.companyName}</span>
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
