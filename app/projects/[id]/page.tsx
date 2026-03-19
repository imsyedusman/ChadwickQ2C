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
    Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { cn, formatQuoteNumber } from '@/lib/utils';

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
    client?: { name: string } | null;
    contact?: { name: string } | null;
    quotes: {
        id: string;
        quoteNumber: string;
        revision: number;
        status: string;
        total: number;
        totalIncGst: number;
        createdAt: string;
        updatedAt: string;
        modifier?: { name: string };
    }[];
}

export default function ProjectDetail() {
    const params = useParams();
    const router = useRouter();
    const [project, setProject] = useState<Project | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProject = async () => {
            try {
                const url = `/api/projects/${params.id}`;
                const res = await fetch(url);
                if (!res.ok) throw new Error('Failed to fetch project');
                const result = await res.json();
                // result is { project, quotes }
                setProject({ ...result.project, quotes: result.quotes });
            } catch (error) {
                console.error('Failed to fetch project:', error);
            } finally {
                setLoading(false);
            }
        };

        if (params.id) {
            fetchProject();
        }
    }, [params.id]);

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
        <main className="max-w-[1200px] mx-auto px-6 py-8 animate-in fade-in duration-500">
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
                                <span className={cn(
                                    "px-3 py-1 text-xs font-bold rounded-full border uppercase tracking-widest shadow-sm",
                                    getProjectStatusDisplay(project.projectStatus).className
                                )}>
                                    {project.projectStatus}
                                </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-6 text-sm text-gray-500">
                                <div className="flex items-center gap-2">
                                    <User size={16} className="text-gray-400" />
                                    <span className="font-bold text-gray-800">{getProjectClientDisplay(project)}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Building2 size={16} className="text-gray-400" />
                                    <span className="font-bold text-gray-800 italic">{getProjectCompanyDisplay(project)}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Calendar size={16} className="text-gray-400" />
                                    <span className="font-medium">Created {project.createdAt ? format(new Date(project.createdAt), 'MMMM d, yyyy') : 'Recently'}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                                    <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">{getProjectContactDisplay(project)}</span>
                                </div>
                            </div>
                        </div>
                        
                        <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2 h-11 px-6 rounded-xl shadow-lg shadow-blue-200 transition-all hover:scale-[1.02] active:scale-[0.98]">
                            <Plus size={20} />
                            New Project Quote
                        </Button>
                    </div>
                </div>

                {/* Project Stats/Overview */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Total Quotes</p>
                        <p className="text-2xl font-bold text-gray-900">{project.quotes.length}</p>
                    </div>
                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Combined Value</p>
                        <p className="text-2xl font-bold text-gray-900">
                            ${(project.quotes?.reduce((acc, q) => acc + (q.totalIncGst || 0), 0) || 0).toLocaleString()}
                        </p>
                    </div>
                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Latest Activity</p>
                        <p className="text-sm font-medium text-gray-700 mt-1">
                            {project.quotes.length > 0 
                                ? format(new Date(project.quotes[0].updatedAt), 'MMM d, h:mm a')
                                : 'No activity yet'}
                        </p>
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
                        <table className="w-full text-left">
                            <thead className="bg-gray-50/50">
                                <tr>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Quote Number</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total (Sell)</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Date Created</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-10">Activity</th>
                                    <th className="px-6 py-4"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {project.quotes.map((quote) => (
                                    <tr 
                                        key={quote.id} 
                                        className="hover:bg-gray-50/50 transition-colors cursor-pointer group"
                                        onClick={() => router.push(`/quote/${quote.id}`)}
                                    >
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-gray-900 text-sm">
                                                {formatQuoteNumber(quote.quoteNumber, quote.revision)}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={cn(
                                                "px-2.5 py-1 text-[10px] font-bold rounded-full border uppercase tracking-tighter",
                                                getStatusDisplay(quote.status).className
                                            )}>
                                                {getStatusDisplay(quote.status).label}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-semibold text-gray-900">
                                                ${(quote.totalIncGst || 0).toLocaleString()}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                                <Calendar size={12} className="text-gray-400" />
                                                {quote.createdAt ? format(new Date(quote.createdAt), 'dd/MM/yy') : '--/--/--'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 pl-10">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-[10px] font-bold text-blue-600 border border-blue-100">
                                                    {(quote.modifier?.name || '??').substring(0, 2).toUpperCase()}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-bold text-gray-900 uppercase tracking-tighter">
                                                        {quote.modifier?.name || 'System'}
                                                    </span>
                                                    <span className="text-[10px] text-gray-400">
                                                        {quote.updatedAt ? format(new Date(quote.updatedAt), 'MMM d, h:mm a') : 'Unknown'}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="p-2 text-gray-300 group-hover:text-blue-500 transition-colors">
                                                <ArrowUpRight size={18} />
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {project.quotes.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                            No quotes found for this project.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
    );
}
