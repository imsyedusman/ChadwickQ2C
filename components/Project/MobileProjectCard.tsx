'use client';

import { 
    Briefcase, 
    Building2, 
    ChevronRight, 
    MoreVertical, 
    Calendar,
    DollarSign,
    Layers
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { format, parseISO, isBefore, addDays, differenceInDays } from 'date-fns';
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';

const getInitials = (name: string | null) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].substring(0, 1).toUpperCase();
    return (parts[0][0] + (parts[parts.length - 1]?.[0] || '')).toUpperCase();
};

interface Project {
    id: string;
    projectName: string;
    clientName: string | null;
    companyName: string | null;
    projectStatus: string;
    createdAt: string;
    updatedAt: string;
    dealValue: number | null;
    quotes: { 
        updatedAt: string;
        creator: { id: string; name: string | null; email: string | null } | null 
    }[];
    pipedriveOwnerName?: string | null;
    _count?: {
        quotes: number;
    };
    expectedCloseDate?: string | Date | null;
}

interface GroupedProject {
    name: string;
    normalizedName: string;
    projects: Project[];
    totalDealValue: number;
    totalQuotes: number;
    latestActivity: Date;
    clients: Set<string>;
    companies: Set<string>;
}

interface MobileProjectCardProps {
    project: Project;
    onEdit?: (project: Project) => void;
    onDelete?: (project: Project) => void;
}

export default function MobileProjectCard({ 
    project, 
    onEdit, 
    onDelete 
}: MobileProjectCardProps) {
    const renderUrgencyDate = (date: Date | string | null) => {
        if (!date) return <span className="text-gray-300 italic">—</span>;
        
        const d = typeof date === 'string' ? parseISO(date) : date;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const diff = differenceInDays(d, today);
        const absDiff = Math.abs(diff);
        
        let dotColor = "";
        let urgencyText = "";
        let urgencyColor = "";

        if (diff < 0) {
            dotColor = "bg-rose-500";
            urgencyText = absDiff === 1 ? "Overdue by 1 day" : `Overdue by ${absDiff} days`;
            urgencyColor = "text-rose-800";
        } else if (diff === 0) {
            dotColor = "bg-amber-500 animate-pulse";
            urgencyText = "Due today";
            urgencyColor = "text-amber-700";
        } else if (diff <= 3) {
            dotColor = "bg-amber-500";
            urgencyText = `Due in ${diff} days`;
            urgencyColor = "text-amber-700";
        } else if (diff <= 14) {
            dotColor = "bg-blue-400";
            urgencyText = `In ${diff} days`;
            urgencyColor = "text-slate-500";
        } else if (diff <= 30) {
            urgencyText = `In ${diff} days`;
            urgencyColor = "text-slate-400";
        } else {
            urgencyText = "";
        }

        return (
            <div className="flex flex-col items-end gap-0">
                <div className="flex items-center gap-1.5">
                    {dotColor && <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", dotColor)} />}
                    <span className="text-[11px] font-bold text-gray-700 tracking-tight">
                        {format(d, 'MMM d, yyyy')}
                    </span>
                </div>
                {urgencyText && (
                    <span className={cn("text-[9px] font-medium leading-none opacity-80", urgencyColor)}>
                        {urgencyText}
                    </span>
                )}
            </div>
        );
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'Budget': return 'bg-purple-50 text-purple-700 border-purple-100';
            case 'Tender': return 'bg-orange-50 text-orange-700 border-orange-100';
            case 'Live': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
            default: return 'bg-gray-50 text-gray-700 border-gray-100';
        }
    };


    const latestEstimator = [...project.quotes]
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .find(q => q.creator)?.creator;

    return (
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm mb-3">
            <div className="flex justify-between items-start mb-2">
                <div className="flex-1 pr-4">
                    <h3 className="text-sm font-extrabold text-gray-900 line-clamp-2 leading-tight mb-1">
                        {project.projectName}
                    </h3>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center text-[11px] text-gray-500 min-w-0">
                            <Building2 size={12} className="mr-1 shrink-0" />
                            <span className="truncate">{project.companyName || project.clientName || 'No Company'}</span>
                        </div>
                        {latestEstimator && (
                            <div className="flex items-center gap-1 shrink-0">
                                <div className="w-5 h-5 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-[8px] font-bold text-blue-600">
                                    {getInitials(latestEstimator.name)}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <DropdownMenu>
                    <DropdownMenuTrigger className="p-1 hover:bg-gray-50 rounded-full">
                        <MoreVertical size={18} className="text-gray-400" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-xl">
                        <DropdownMenuItem onClick={() => onEdit?.(project)}>
                            Edit Project
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-rose-600" onClick={() => onDelete?.(project)}>
                            Delete
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4 mt-3">
                <div className="bg-gray-50/50 p-2 rounded-xl border border-gray-50">
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Value</p>
                    <p className="text-xs font-bold text-gray-900">{formatCurrency(project.dealValue || 0, 0)}</p>
                </div>
                <div className="bg-gray-50/50 p-2 rounded-xl border border-gray-50 overflow-hidden">
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Deal Owner</p>
                    <p className={cn(
                        "text-xs font-bold truncate",
                        project.pipedriveOwnerName ? "text-emerald-600" : "text-gray-300 italic"
                    )}>
                        {project.pipedriveOwnerName || 'Unassigned'}
                    </p>
                </div>
                <div className="bg-gray-50/50 p-2 rounded-xl border border-gray-50 col-span-2 flex items-center justify-between">
                    <div className="flex flex-col">
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Quotes</p>
                        <div className="flex items-center gap-1.5">
                            <Layers size={10} className="text-blue-500" />
                            <p className="text-xs font-bold text-gray-900">{project._count?.quotes || 0} Quotes</p>
                        </div>
                    </div>
                    {project.expectedCloseDate && (
                        <div className="flex flex-col items-end">
                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-0.5 text-right">Exp. Close</p>
                            {renderUrgencyDate(project.expectedCloseDate)}
                        </div>
                    )}
                </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                <div className={cn(
                    "text-[10px] font-bold px-2.5 py-1 rounded-full border",
                    getStatusStyle(project.projectStatus)
                )}>
                    {project.projectStatus}
                </div>
                <div className="flex items-center text-[10px] text-gray-400">
                    <Calendar size={12} className="mr-1" />
                    {format(new Date(project.createdAt), 'MMM d, yyyy')}
                </div>
            </div>
        </div>
    );
}

export function MobileGroupedProjectCard({ 
    group, 
    onClick 
}: { 
    group: GroupedProject;
    onClick: () => void;
}) {
    const renderUrgencyDate = (date: Date | string | null) => {
        if (!date) return <span className="text-gray-300 italic">—</span>;
        
        const d = typeof date === 'string' ? parseISO(date) : date;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const threeDaysFromNow = addDays(today, 3);
        const fourteenDaysFromNow = addDays(today, 14);
        const thirtyDaysFromNow = addDays(today, 30);
        
        let dotColor = "";
        let textColor = "";
        let label = "";

        if (isBefore(d, today)) {
            dotColor = "bg-rose-500";
            textColor = "text-rose-600";
            label = "Overdue";
        } else if (isBefore(d, addDays(today, 1))) {
            dotColor = "bg-amber-500";
            textColor = "text-amber-600";
            label = "Today";
        } else if (isBefore(d, threeDaysFromNow)) {
            dotColor = "bg-amber-500 animate-pulse";
            textColor = "text-amber-600 font-bold";
            label = "Soon";
        } else if (isBefore(d, fourteenDaysFromNow)) {
            dotColor = "bg-blue-400";
            textColor = "text-slate-600 font-medium";
            label = "";
        } else if (isBefore(d, thirtyDaysFromNow)) {
            textColor = "text-slate-500";
            label = "";
        } else {
            textColor = "text-slate-400 font-normal";
            label = "";
        }

        return (
            <div className="inline-flex items-center gap-1">
                {dotColor && <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", dotColor)} />}
                <span className={cn("text-[10px] whitespace-nowrap", textColor)}>
                    {format(d, 'MMM d, yyyy')}
                    {label && <span className="ml-1 opacity-60 text-[8px] uppercase font-bold text-gray-500">({label})</span>}
                </span>
            </div>
        );
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'Budget': return 'bg-purple-50 text-purple-700 border-purple-100';
            case 'Tender': return 'bg-orange-50 text-orange-700 border-orange-100';
            case 'Live': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
            default: return 'bg-gray-50 text-gray-700 border-gray-100';
        }
    };

    const latestProject = group.projects[0];
    const firstCompany = group.companies.size > 0 ? Array.from(group.companies)[0] : 'No Company';

    return (
        <div 
            onClick={onClick}
            className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm mb-3 active:scale-[0.99] transition-transform"
        >
            <div className="flex justify-between items-start mb-2">
                <div className="flex-1 pr-4">
                    <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-extrabold text-gray-900 line-clamp-2 leading-tight">
                            {group.name}
                        </h3>
                        {group.projects.length > 1 && (
                            <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 text-[8px] font-bold uppercase tracking-tight rounded border border-blue-100 shrink-0">
                                Group
                            </span>
                        )}
                    </div>
                    <div className="flex items-center text-[11px] text-gray-500">
                        <Building2 size={12} className="mr-1 shrink-0" />
                        <span className="truncate">
                            {firstCompany}
                            {group.companies.size > 1 && <span className="ml-1 text-blue-500">+{group.companies.size - 1} more</span>}
                        </span>
                    </div>
                </div>
                <ChevronRight size={18} className="text-gray-300 mt-1" />
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4 mt-3">
                <div className="bg-blue-50/30 p-2 rounded-xl border border-blue-50/50">
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Aggregated Value</p>
                    <p className="text-xs font-bold text-blue-700">{formatCurrency(group.totalDealValue || 0, 0)}</p>
                </div>
                <div className="bg-emerald-50/30 p-2 rounded-xl border border-emerald-50/50 overflow-hidden">
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Deal Owner</p>
                    <p className={cn(
                        "text-xs font-bold truncate",
                        latestProject.pipedriveOwnerName ? "text-emerald-700" : "text-gray-300 italic"
                    )}>
                        {latestProject.pipedriveOwnerName || 'Unassigned'}
                    </p>
                </div>
                <div className="bg-gray-50/50 p-2 rounded-xl border border-gray-50 col-span-2 flex items-center justify-between">
                    <div className="flex flex-col">
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Projects / Quotes</p>
                        <p className="text-xs font-bold text-gray-900">
                            {group.companies.size} Co / {group.clients.size} Cl / {group.totalQuotes} Q
                        </p>
                    </div>
                    {group.projects.some(p => p.expectedCloseDate) && (
                        <div className="flex flex-col items-end">
                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-0.5 text-right">Exp. Close</p>
                            {renderUrgencyDate(group.projects[0].expectedCloseDate)}
                        </div>
                    )}
                </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                <div className="flex items-center gap-3">
                    <div className={cn(
                        "text-[10px] font-bold px-2.5 py-1 rounded-full border",
                        getStatusStyle(latestProject.projectStatus)
                    )}>
                        {latestProject.projectStatus}
                    </div>
                    {(() => {
                        const allQuotes = group.projects.flatMap(p => p.quotes || []);
                        const latestEstimator = [...allQuotes]
                            .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
                            .find(q => q.creator)?.creator;
                        
                        if (!latestEstimator) return null;
                        return (
                            <div className="flex items-center gap-1.5">
                                <span className="text-[8px] font-bold text-gray-300 uppercase tracking-tighter">By</span>
                                <div className="w-5 h-5 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-[8px] font-bold text-blue-600">
                                    {getInitials(latestEstimator.name)}
                                </div>
                            </div>
                        );
                    })()}
                </div>
                <div className="flex items-center text-[10px] text-gray-400">
                    <Calendar size={12} className="mr-1" />
                    {format(new Date(group.latestActivity), 'MMM d, yyyy')}
                </div>
            </div>
        </div>
    );
}
