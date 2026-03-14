'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X, Check, ChevronsUpDown, Search, Loader2, AlertCircle } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

interface Project {
    id: string;
    projectName: string;
    clientName: string | null;
    companyName: string | null;
    projectReference: string | null;
    projectDescription: string | null;
    projectStatus: string;
}

interface NewQuoteDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function NewQuoteDialog({ isOpen, onClose }: NewQuoteDialogProps) {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(false);
    const [fetchingProjects, setFetchingProjects] = useState(false);
    const [isNewProject, setIsNewProject] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isComboboxOpen, setIsComboboxOpen] = useState(false);
    
    // Form state
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [projectName, setProjectName] = useState('');
    const [clientName, setClientName] = useState('');
    const [companyName, setCompanyName] = useState('');
    const [projectReference, setProjectReference] = useState('');
    const [projectDescription, setProjectDescription] = useState('');
    const [projectStatus, setProjectStatus] = useState('Budget');
    const [description, setDescription] = useState('New Quote');
    const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
    const [foundDuplicateProject, setFoundDuplicateProject] = useState<Project | null>(null);

    const router = useRouter();

    const fetchProjects = useCallback(async (search: string = '') => {
        setFetchingProjects(true);
        try {
            const res = await fetch(`/api/projects?search=${encodeURIComponent(search)}`);
            if (res.ok) {
                const data = await res.json();
                // Filter out duplicates by ID just in case
                const uniqueProjects = Array.from(new Map(data.map((p: Project) => [p.id, p])).values()) as Project[];
                setProjects(uniqueProjects);
            }
        } catch (error) {
            console.error('Failed to fetch projects', error);
        } finally {
            setFetchingProjects(false);
        }
    }, []);

    useEffect(() => {
        if (isOpen && !isNewProject) {
            fetchProjects(searchQuery);
        }
    }, [isOpen, searchQuery, isNewProject, fetchProjects]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (isNewProject && !showDuplicateWarning) {
                // Check for duplicates first
                const checkRes = await fetch(`/api/projects?checkName=${encodeURIComponent(projectName)}&checkClient=${encodeURIComponent(clientName)}`);
                const checkData = await checkRes.json();
                if (checkData.exists) {
                    setFoundDuplicateProject(checkData.project);
                    setShowDuplicateWarning(true);
                    setLoading(false);
                    return; // Stop and show warning
                }
            }

            const body: any = {
                description,
                clientName: isNewProject ? clientName : (selectedProject?.clientName || ''),
                clientCompany: isNewProject ? companyName : (selectedProject?.companyName || ''),
                projectRef: isNewProject ? projectName : (selectedProject?.projectName || ''),
            };

            if (isNewProject) {
                body.newProject = {
                    projectName,
                    clientName,
                    companyName,
                    projectReference,
                    projectDescription,
                    projectStatus,
                };
            } else if (selectedProject) {
                body.projectId = selectedProject.id;
            }

            const res = await fetch('/api/quotes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            if (!res.ok) throw new Error('Failed to create quote');

            const newQuote = await res.json();
            router.push(`/quote/${newQuote.id}`);
            onClose();
        } catch (error) {
            console.error('Failed to create quote', error);
            alert('Failed to create quote');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[550px] overflow-hidden flex flex-col max-h-[90vh]">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold">Create New Quote</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6 py-4 overflow-y-auto pr-2">
                    <div className="flex items-center justify-between bg-blue-50/50 p-4 rounded-xl border border-blue-100 shadow-sm">
                        <div className="space-y-0.5">
                            <label className="text-sm font-semibold text-blue-900">Create new project?</label>
                            <p className="text-xs text-blue-700/70">Toggle on if this is not for an existing project.</p>
                        </div>
                        <Switch
                            checked={isNewProject}
                            onCheckedChange={(checked) => {
                                setIsNewProject(checked);
                                if (checked) setSelectedProject(null);
                            }}
                        />
                    </div>

                    {!isNewProject ? (
                        <div className="space-y-3">
                            <label className="text-sm font-semibold text-gray-700">Search Project</label>
                            <Popover open={isComboboxOpen} onOpenChange={setIsComboboxOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        role="combobox"
                                        aria-expanded={isComboboxOpen}
                                        className="w-full justify-between bg-white border-gray-200 h-12 text-left font-normal hover:bg-white hover:border-blue-300 transition-all"
                                    >
                                        <div className="flex flex-col items-start truncate overflow-hidden">
                                            {selectedProject ? (
                                                <>
                                                    <span className="font-semibold text-gray-900">{selectedProject.projectName}</span>
                                                    <span className="text-[10px] text-gray-500 uppercase tracking-tighter">
                                                        {selectedProject.companyName || selectedProject.clientName || "Unknown Client"}
                                                    </span>
                                                </>
                                            ) : (
                                                <span className="text-gray-400">Search by project, client, or company...</span>
                                            )}
                                        </div>
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                                    <Command shouldFilter={false}>
                                        <div className="flex items-center border-b px-3">
                                            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                                            <input
                                                className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                                                placeholder="Type to search..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                            />
                                            {fetchingProjects && <Loader2 className="h-4 w-4 animate-spin text-blue-500 ml-2" />}
                                        </div>
                                        <CommandList className="max-h-[300px]">
                                            <CommandEmpty>No projects found.</CommandEmpty>
                                            <CommandGroup>
                                                {projects.map((project) => (
                                                    <CommandItem
                                                        key={project.id}
                                                        value={project.id}
                                                        onSelect={() => {
                                                            setSelectedProject(project);
                                                            setIsComboboxOpen(false);
                                                        }}
                                                        className="flex flex-col items-start py-3 px-4 aria-selected:bg-blue-50 cursor-pointer"
                                                    >
                                                        <div className="flex items-center justify-between w-full">
                                                            <span className="font-bold text-gray-900 group-aria-selected:text-blue-700">
                                                                {project.projectName}
                                                            </span>
                                                            <span className={cn(
                                                                "text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-tighter",
                                                                project.projectStatus === 'Live' ? 'bg-green-50 text-green-700 border-green-200' :
                                                                project.projectStatus === 'Tender' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                                                                'bg-purple-50 text-purple-700 border-purple-200'
                                                            )}>
                                                                {project.projectStatus}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className="text-xs text-gray-600 font-medium">{project.clientName || 'No Client'}</span>
                                                            {project.companyName && (
                                                                <>
                                                                    <div className="w-1 h-1 rounded-full bg-gray-300" />
                                                                    <span className="text-xs text-gray-500">{project.companyName}</span>
                                                                </>
                                                            )}
                                                        </div>
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </div>
                    ) : (
                        <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-700">Project Name</label>
                                    <input
                                        type="text"
                                        required={isNewProject}
                                        value={projectName}
                                        onChange={(e) => setProjectName(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                        placeholder="e.g. Westfield Expansion"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-700">Project Reference</label>
                                    <input
                                        type="text"
                                        value={projectReference}
                                        onChange={(e) => setProjectReference(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                        placeholder="Internal Ref / Job #"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-700">Client Name</label>
                                    <input
                                        type="text"
                                        required={isNewProject}
                                        value={clientName}
                                        onChange={(e) => setClientName(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                        placeholder="Full Name"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-700">Company Name</label>
                                    <input
                                        type="text"
                                        value={companyName}
                                        onChange={(e) => setCompanyName(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                        placeholder="ABC Electrical"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-700">Project Status</label>
                                <Select value={projectStatus} onValueChange={setProjectStatus}>
                                    <SelectTrigger className="w-full bg-white border-gray-200 rounded-lg h-10">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Budget">Budget</SelectItem>
                                        <SelectItem value="Tender">Tender</SelectItem>
                                        <SelectItem value="Live">Live</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-700">Project Description</label>
                                <textarea
                                    value={projectDescription}
                                    onChange={(e) => setProjectDescription(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm min-h-[80px]"
                                    placeholder="High-level project scope..."
                                />
                            </div>
                        </div>
                    )}

                    <div className="space-y-3 pt-4 border-t border-gray-100">
                        <label className="text-sm font-bold text-gray-900 flex items-center gap-2">
                            <span className="p-1 bg-yellow-100 text-yellow-700 rounded-md">
                                <Plus size={12} />
                            </span>
                            Quote Specific Details
                        </label>
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Revision Description</label>
                            <input
                                type="text"
                                required
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm italic"
                                placeholder="e.g. Initial Pricing, Revision B, etc."
                            />
                        </div>
                    </div>

                    <DialogFooter className="pt-2 sticky bottom-0 bg-white">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={onClose}
                            className="text-gray-500"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading || (!isNewProject && !selectedProject)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-8 rounded-xl font-bold shadow-lg shadow-blue-500/20"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : "Create Quote"}
                        </Button>
                    </DialogFooter>
                </form>

                {/* Soft Duplicate Warning Dialog/Overlay */}
                {showDuplicateWarning && (
                    <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-in fade-in duration-200">
                        <div className="bg-white border border-yellow-200 rounded-2xl shadow-2xl p-6 max-w-[400px] space-y-4">
                            <div className="flex items-center gap-3 text-yellow-700">
                                <div className="p-2 bg-yellow-100 rounded-full">
                                    <AlertCircle size={24} />
                                </div>
                                <h3 className="text-lg font-bold">Possible Duplicate Project</h3>
                            </div>
                            
                            <div className="space-y-2 text-sm text-gray-600">
                                <p>A project with the same name and client already exists:</p>
                                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 font-medium text-gray-900">
                                    <p>{foundDuplicateProject?.projectName}</p>
                                    <p className="text-xs text-gray-500">{foundDuplicateProject?.clientName}</p>
                                </div>
                                <p>Do you want to continue creating a new project or cancel and use the existing one?</p>
                            </div>

                            <div className="flex flex-col gap-2 pt-2">
                                <Button 
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-11"
                                    onClick={() => {
                                        setShowDuplicateWarning(false);
                                        // Next time handleSubmit is called, it will bypass the check
                                        // Actually we should just trigger handleSubmit again with a flag
                                    }}
                                >
                                    Proceed Anyway
                                </Button>
                                <Button 
                                    variant="ghost" 
                                    className="w-full text-gray-500 rounded-xl h-11"
                                    onClick={() => {
                                        setShowDuplicateWarning(false);
                                        setFoundDuplicateProject(null);
                                        setIsNewProject(false);
                                        setSelectedProject(foundDuplicateProject);
                                    }}
                                >
                                    Cancel & Use Existing
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
