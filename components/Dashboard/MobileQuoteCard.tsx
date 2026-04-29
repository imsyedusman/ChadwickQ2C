'use client';

import { 
    FileText, 
    ChevronRight, 
    MoreVertical, 
    Clock, 
    Briefcase,
    Building2,
    Layers
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { useRouter } from 'next/navigation';
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';

interface Quote {
    id: string;
    quoteNumber: string;
    revision: number;
    clientName: string | null;
    clientCompany: string | null;
    projectRef: string | null;
    status: string;
    updatedAt: string;
    totalExGST?: number;
    project?: {
        projectName: string;
    } | null;
    creator?: { name: string | null } | null;
    modifier?: { name: string | null } | null;
}

interface MobileQuoteCardProps {
    quote: Quote;
    onDelete?: (id: string) => void;
    onDuplicate?: (quote: Quote) => void;
    onRevision?: (id: string) => void;
}

export default function MobileQuoteCard({ 
    quote, 
    onDelete, 
    onDuplicate, 
    onRevision 
}: MobileQuoteCardProps) {
    const router = useRouter();

    const getInitials = (name: string | null) => {
        if (!name) return '?';
        const parts = name.trim().split(' ');
        if (parts.length === 0) return '?';
        if (parts.length === 1) return parts[0].substring(0, 1).toUpperCase();
        return (parts[0][0] + (parts[parts.length - 1]?.[0] || '')).toUpperCase();
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'DRAFT': return 'bg-amber-50 text-amber-700 border-amber-100';
            case 'SENT': return 'bg-blue-50 text-blue-700 border-blue-100';
            case 'WON': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
            case 'LOST': return 'bg-rose-50 text-rose-700 border-rose-100';
            default: return 'bg-gray-50 text-gray-700 border-gray-100';
        }
    };

    return (
        <div 
            onClick={() => router.push(`/quote/${quote.id}`)}
            className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm mb-3 active:scale-[0.98] transition-all"
        >
            <div className="flex justify-between items-start mb-2">
                <div className="flex flex-col">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md uppercase tracking-tight">
                            {quote.quoteNumber}
                        </span>
                        {quote.revision > 0 && (
                            <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-0.5 rounded-md uppercase tracking-tight">
                                Rev {quote.revision}
                            </span>
                        )}
                    </div>
                    <h3 className="text-sm font-extrabold text-gray-900 line-clamp-2 leading-snug">
                        {quote.project?.projectName || quote.projectRef || 'Untitled Project'}
                    </h3>
                </div>
                
                <DropdownMenu>
                    <DropdownMenuTrigger onClick={(e) => e.stopPropagation()} className="p-1 hover:bg-gray-50 rounded-full">
                        <MoreVertical size={18} className="text-gray-400" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-xl">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onRevision?.(quote.id); }}>
                            <Layers className="w-4 h-4 mr-2" /> Create Revision
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDuplicate?.(quote); }}>
                            <Briefcase className="w-4 h-4 mr-2" /> Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                            className="text-rose-600" 
                            onClick={(e) => { e.stopPropagation(); onDelete?.(quote.id); }}
                        >
                            <FileText className="w-4 h-4 mr-2" /> Delete
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            <div className="flex flex-col gap-1.5 mb-3">
                <div className="flex items-center text-[11px] text-gray-500">
                    <Building2 size={12} className="mr-1.5 shrink-0" />
                    <span className="truncate">{quote.clientCompany || quote.clientName || 'No Client'}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-gray-500">
                    <div className="flex items-center truncate mr-2">
                        <Clock size={12} className="mr-1.5 shrink-0" />
                        <span className="truncate">Updated {formatDistanceToNow(new Date(quote.updatedAt), { addSuffix: true }).replace('about ', '')}</span>
                    </div>
                    {(quote.modifier?.name || quote.creator?.name) && (
                        <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                            <span className="text-[8px] font-bold text-gray-300 uppercase tracking-tighter">By</span>
                            <div className="w-5 h-5 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-[8px] font-bold text-blue-600">
                                {getInitials(quote.modifier?.name || quote.creator?.name || null)}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                <div className={cn(
                    "text-[10px] font-bold px-2.5 py-1 rounded-full border",
                    getStatusStyle(quote.status)
                )}>
                    {quote.status}
                </div>
                <div className="text-sm font-extrabold text-gray-900">
                    {formatCurrency(quote.totalExGST || 0)}
                </div>
            </div>
        </div>
    );
}
