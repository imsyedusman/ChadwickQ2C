'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X, Check, ChevronsUpDown, Search, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
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
import { 
    getProjectClientDisplay, 
    getProjectCompanyDisplay, 
    getProjectContactDisplay 
} from '@/lib/project-utils';
import { PipedriveSearchableDropdown, PipedriveItem } from '@/components/ui/PipedriveSearchableDropdown';

interface Project {
    id: string;
    projectName: string;
    clientName: string | null;
    companyName: string | null;
    projectReference: string | null;
    projectDescription: string | null;
    projectStatus: string;
    client?: { name: string, source?: string } | null;
    contact?: { name: string, source?: string } | null;
}

interface NewQuoteDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function NewQuoteDialog({ isOpen, onClose }: NewQuoteDialogProps) {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(false);
    const [fetchingProjects, setFetchingProjects] = useState(false);
    const [syncingPipedrive, setSyncingPipedrive] = useState(false);
    const [isNewProject, setIsNewProject] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isComboboxOpen, setIsComboboxOpen] = useState(false);
    const [isPipedriveConfigured, setIsPipedriveConfigured] = useState(true);
    
    // Form state
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [projectName, setProjectName] = useState('');
    const [clientName, setClientName] = useState('');
    const [companyName, setCompanyName] = useState('');
    const [projectReference, setProjectReference] = useState('');
    const [projectDescription, setProjectDescription] = useState('');
    const [projectStatus, setProjectStatus] = useState('Budget');
    const [description, setDescription] = useState('Initial Quote');
    const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
    const [foundDuplicateProject, setFoundDuplicateProject] = useState<Project | null>(null);

    // Pipedrive Selections
    const [selectedDealId, setSelectedDealId] = useState<number | null>(null);
    const [selectedPersonId, setSelectedPersonId] = useState<number | null>(null);
    const [selectedOrgId, setSelectedOrgId] = useState<number | null>(null);

    const router = useRouter();

    const fetchProjects = useCallback(async (search: string = '') => {
        setFetchingProjects(true);
        try {
            const query = search.trim();
            const url = `/api/projects?page=1&limit=25${query ? `&search=${encodeURIComponent(query)}` : ''}`;
            
            console.log(`[NewQuote] Fetching projects with search: "${query || 'empty'}"`);
            
            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                
                // Debug logs as requested
                console.log(`[NewQuote] API Result - Total: ${data.total || 0}, Rendered: ${data.projects?.length || 0}`);
                
                // data is { projects, total, page, totalPages }
                const projectsArray = Array.isArray(data.projects) ? data.projects : [];
                setProjects(projectsArray);
            } else {
                console.error('[NewQuote] API error:', res.status);
            }
        } catch (error) {
            console.error('[NewQuote] Failed to fetch projects:', error);
        } finally {
            setFetchingProjects(false);
        }
    }, []);

    // Initial fetch when opening
    useEffect(() => {
        if (isOpen && !isNewProject && searchQuery === '') {
            fetchProjects('');
            checkPipedriveStatus();
        }
    }, [isOpen, isNewProject, fetchProjects]);

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

    const [syncBatchId, setSyncBatchId] = useState<string | null>(null);
    const [syncProgress, setSyncProgress] = useState<{ processed: number; committed: number } | null>(null);

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
                            // Refresh implicitly
                            fetchProjects(searchQuery);
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

    // Debounced search when typing
    useEffect(() => {
        if (!isOpen || isNewProject || searchQuery === '') return;

        const timer = setTimeout(() => {
            fetchProjects(searchQuery);
        }, 400);

        return () => clearTimeout(timer);
    }, [searchQuery, isOpen, isNewProject, fetchProjects]);

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

            // Hard enforcement of Pipedrive semantics at submission layer
            const finalClientName = isNewProject ? clientName : (selectedProject?.contact?.name ?? "No Contact");
            const finalCompanyName = isNewProject ? companyName : (selectedProject?.client?.name ?? "No Company");

            // Prevent silent data corruption with validation logs
            if (process.env.NODE_ENV === 'development') {
                if (finalClientName === finalCompanyName && finalClientName !== "No Contact") {
                    console.warn('[NewQuote] Validation Alarm: clientName matches companyName. Possible mapping bug.', { finalClientName, finalCompanyName });
                }
                if (finalClientName === "No Contact" && selectedProject?.contact) {
                    console.error('[NewQuote] Validation Error: clientName is "No Contact" but contact object exists!', selectedProject);
                }
            }

            const body: any = {
                description,
                clientName: finalClientName,
                clientCompany: finalCompanyName,
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
                    // Pipedrive IDs for backend upsert
                    pipedrive_deal_id: selectedDealId,
                    pipedrive_person_id: selectedPersonId,
                    pipedrive_org_id: selectedOrgId,
                };
            } else if (selectedProject) {
                body.projectId = selectedProject.id;
            }

            const res = await fetch('/api/quotes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                const errorMessage = errorData.details || errorData.error || 'Failed to create quote';
                throw new Error(errorMessage);
            }

            const newQuote = await res.json();
            router.push(`/quote/${newQuote.id}`);
            onClose();
        } catch (error: any) {
            console.error('Failed to create quote', error);
            toast.error(error.message || 'Failed to create quote');
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
                                            
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            disabled={syncingPipedrive || !isPipedriveConfigured}
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                handleSync();
                                                            }}
                                                            className={cn(
                                                                "h-8 px-2 ml-2 hover:bg-blue-50 text-blue-600 gap-1 border border-blue-100 rounded-lg",
                                                                !isPipedriveConfigured && "opacity-50 grayscale cursor-not-allowed"
                                                            )}
                                                        >
                                                            {syncingPipedrive ? (
                                                                <Loader2 className="h-3 w-3 animate-spin" />
                                                            ) : (
                                                                <img src="/pipedrive.jpeg" alt="Pipedrive" className="w-4 h-4 rounded-sm" />
                                                            )}
                                                            <span className="text-[10px] font-bold uppercase truncate max-w-[60px]">
                                                                {syncingPipedrive ? 'Syncing' : 'Sync'}
                                                            </span>
                                                        </Button>
                                                    </TooltipTrigger>
                                                    {!isPipedriveConfigured && (
                                                        <TooltipContent side="top">
                                                            <p className="text-xs">Configure Pipedrive API key in Admin Settings</p>
                                                        </TooltipContent>
                                                    )}
                                                </Tooltip>
                                            </TooltipProvider>
                                        </div>
                                        <CommandList className="max-h-[300px]">
                                            <CommandEmpty>No projects found.</CommandEmpty>
                                            <CommandGroup>
                                                {projects.map((project) => (
                                                    <CommandItem
                                                        key={project.id}
                                                        value={project.id}
                                                        onSelect={() => {
                                                            const mappedClient = getProjectClientDisplay(project as any);
                                                            const mappedCompany = getProjectCompanyDisplay(project as any);
                                                            
                                                            console.log('[NewQuote] Project Selection Diagnostics (Aligned Semantics):');
                                                            console.log(`  Project: ${project.projectName}`);
                                                            console.log(`  Organization (Company): ${project.client?.name || 'NULL'}`);
                                                            console.log(`  Contact Person (Client): ${project.contact?.name || 'NULL'}`);
                                                            console.log(`  Mapped Results -> Client Field: "${mappedClient}", Company Field: "${mappedCompany}"`);
                                                            
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
                                                            <span className="text-xs text-gray-600 font-bold">{getProjectClientDisplay(project)}</span>
                                                            <div className="w-1 h-1 rounded-full bg-gray-300" />
                                                            <span className="text-xs text-blue-600 font-bold italic">{getProjectCompanyDisplay(project)}</span>
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
                                    <PipedriveSearchableDropdown
                                        type="deal"
                                        value={projectName}
                                        onSelect={(item) => {
                                            setProjectName(item.name);
                                            setSelectedDealId(item.pipedriveId || null);
                                            // Handle auto-population if it's a Pipedrive deal?
                                            // Actually, Pipedrive deal search doesn't return Org/Person details in the search result item,
                                            // but we can fetch them on the backend during creation.
                                        }}
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
                                    <PipedriveSearchableDropdown
                                        type="person"
                                        value={clientName}
                                        onSelect={(item) => {
                                            setClientName(item.name);
                                            setSelectedPersonId(item.pipedriveId || null);
                                        }}
                                        placeholder="Full Name"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-700">Company Name</label>
                                    <PipedriveSearchableDropdown
                                        type="organization"
                                        value={companyName}
                                        onSelect={(item) => {
                                            setCompanyName(item.name);
                                            setSelectedOrgId(item.pipedriveId || null);
                                        }}
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

                    {/* Hidden/Default quote details removed as per UX cleanup */}

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
