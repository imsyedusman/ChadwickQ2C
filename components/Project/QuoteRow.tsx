'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, ArrowUpRight, Check, X, Pencil, MoreHorizontal, Copy, Trash2, ChevronRight, CornerDownRight } from 'lucide-react';
import { format } from 'date-fns';
import { cn, formatQuoteNumber } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

interface QuoteRowProps {
    quote: any;
    isChild?: boolean;
    onUpdate: (id: string, diff: any) => void;
    onDuplicate: (id: string) => void;
    onDelete: (id: string) => void;
}

const STATUS_OPTIONS = [
    { value: 'DRAFT', label: 'Draft', colorClass: 'bg-yellow-100 text-yellow-700' },
    { value: 'SENT', label: 'Sent', colorClass: 'bg-blue-100 text-blue-700' },
    { value: 'WON', label: 'Won', colorClass: 'bg-green-100 text-green-700' },
    { value: 'LOST', label: 'Lost', colorClass: 'bg-red-100 text-red-700' },
];

export default function QuoteRow({ quote, isChild, onUpdate, onDuplicate, onDelete }: QuoteRowProps) {
    const router = useRouter();
    const [isEditingStatus, setIsEditingStatus] = useState(false);
    const [isEditingNotes, setIsEditingNotes] = useState(false);
    
    const [statusValue, setStatusValue] = useState(quote.status);
    const [notesValue, setNotesValue] = useState(quote.gridInternalNotes || '');
    
    const notesInputRef = useRef<HTMLInputElement>(null);

    // Sync state if props change (unlikely since we do optimistic, but good practice)
    useEffect(() => {
        setStatusValue(quote.status);
        setNotesValue(quote.gridInternalNotes || '');
    }, [quote.status, quote.gridInternalNotes]);

    useEffect(() => {
        if (isEditingNotes && notesInputRef.current) {
            notesInputRef.current.focus();
        }
    }, [isEditingNotes]);

    const handleSaveStatus = async (newStatus: string) => {
        if (newStatus === quote.status) {
            setIsEditingStatus(false);
            return;
        }
        
        // Optimistic update
        setStatusValue(newStatus);
        setIsEditingStatus(false);
        onUpdate(quote.id, { status: newStatus });
        
        try {
            const res = await fetch(`/api/quotes/${quote.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
            });
            if (!res.ok) throw new Error('Failed to update status');
        } catch (err) {
            // Revert on error could be handled via a toast or callback, 
            // but for simplicity we assume success or user will retry
            setStatusValue(quote.status);
            onUpdate(quote.id, { status: quote.status });
        }
    };

    const handleSaveNotes = async () => {
        const trimmed = notesValue.trim();
        setIsEditingNotes(false);
        if (trimmed === (quote.gridInternalNotes || '').trim()) return;

        // Optimistic update
        onUpdate(quote.id, { gridInternalNotes: trimmed });
        
        try {
            const res = await fetch(`/api/quotes/${quote.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ gridInternalNotes: trimmed }),
            });
            if (!res.ok) throw new Error('Failed to update notes');
        } catch (err) {
            setNotesValue(quote.gridInternalNotes || '');
            onUpdate(quote.id, { gridInternalNotes: quote.gridInternalNotes });
        }
    };

    const handleKeyDownNotes = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleSaveNotes();
        if (e.key === 'Escape') {
            setNotesValue(quote.gridInternalNotes || '');
            setIsEditingNotes(false);
        }
    };

    const currentStatusConfig = STATUS_OPTIONS.find(s => s.value === statusValue) || { label: statusValue, colorClass: 'bg-gray-100 text-gray-700' };

    return (
        <tr className={cn(
            "hover:bg-blue-50/20 transition-colors group border-b border-gray-50",
            isChild ? "bg-slate-50/30" : "bg-white"
        )}>
            {/* Quote Number */}
            <td className="px-6 py-4" onClick={() => router.push(`/quote/${quote.id}`)}>
                <div className={cn(
                    "font-bold text-gray-900 text-sm flex items-center gap-2 cursor-pointer group-hover:text-blue-600 transition-colors",
                    isChild && "pl-6 text-gray-600"
                )}>
                    {isChild && <CornerDownRight size={14} className="text-gray-300" />}
                    {formatQuoteNumber(quote.quoteNumber, quote.revision)}
                </div>
            </td>

            {/* Status */}
            <td className="px-6 py-4">
                {isEditingStatus ? (
                    <div className="relative isolate" onBlur={(e) => {
                        if (!e.currentTarget.contains(e.relatedTarget)) setIsEditingStatus(false);
                    }}>
                        <select 
                            autoFocus
                            value={statusValue}
                            onChange={(e) => handleSaveStatus(e.target.value)}
                            className="bg-white border border-blue-200 text-xs font-bold rounded-lg px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-sm cursor-pointer min-w-[100px]"
                        >
                            {STATUS_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 group/status cursor-pointer" onClick={() => setIsEditingStatus(true)}>
                        <span className={cn(
                            "px-2.5 py-1 text-[10px] font-bold rounded-full border uppercase tracking-tighter transition-colors group-hover/status:ring-2 ring-blue-100 ring-offset-1",
                            currentStatusConfig.colorClass
                        )}>
                            {currentStatusConfig.label}
                        </span>
                        <Pencil size={12} className="text-gray-300 opacity-0 group-hover/status:opacity-100 group-hover/status:text-blue-500 transition-all" />
                    </div>
                )}
            </td>

            {/* Inline Notes */}
            <td className="px-6 py-4">
                {isEditingNotes ? (
                    <div className="flex items-center group/input relative">
                        <input 
                            ref={notesInputRef}
                            type="text"
                            value={notesValue}
                            onChange={(e) => setNotesValue(e.target.value)}
                            onBlur={handleSaveNotes}
                            onKeyDown={handleKeyDownNotes}
                            className="w-full text-sm text-gray-900 bg-white border border-blue-200 rounded-lg px-2.5 py-1 focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-sm pr-6 transition-all"
                            placeholder="Add a note..."
                        />
                    </div>
                ) : (
                    <div 
                        className="flex items-center gap-2 group/notes cursor-pointer min-h-[28px] w-full px-2 -ml-2 rounded-lg hover:bg-white hover:shadow-sm hover:ring-1 hover:ring-gray-200 transition-all" 
                        onClick={() => setIsEditingNotes(true)}
                    >
                        <span className={cn(
                            "text-sm flex-1 truncate",
                            notesValue ? "text-gray-700" : "text-gray-400 italic"
                        )}>
                            {notesValue || "Add note..."}
                        </span>
                        <Pencil size={12} className="text-gray-300 opacity-0 group-hover/notes:opacity-100 group-hover/notes:text-blue-500 transition-all shrink-0" />
                    </div>
                )}
            </td>

            {/* Total */}
            <td className="px-6 py-4 cursor-pointer" onClick={() => router.push(`/quote/${quote.id}`)}>
                <div className="text-sm font-semibold text-gray-900">
                    ${(quote.totalExGST || quote.total || 0).toLocaleString()}
                </div>
            </td>

            {/* Date Created */}
            <td className="px-6 py-4 cursor-pointer" onClick={() => router.push(`/quote/${quote.id}`)}>
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Calendar size={12} className="text-gray-400" />
                    {quote.createdAt ? format(new Date(quote.createdAt), 'dd/MM/yy') : '--/--/--'}
                </div>
            </td>

            {/* Activity */}
            <td className="px-6 py-4 cursor-pointer" onClick={() => router.push(`/quote/${quote.id}`)}>
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center text-[9px] font-bold text-blue-600 border border-blue-100 shrink-0">
                        {(quote.modifier?.name || '??').substring(0, 2).toUpperCase()}
                    </div>
                    <div className="flex flex-col min-w-0">
                        <span className="text-[10px] font-bold text-gray-900 uppercase tracking-tighter truncate">
                            {quote.modifier?.name || 'System'}
                        </span>
                        <span className="text-[9px] text-gray-400 truncate">
                            {quote.updatedAt ? format(new Date(quote.updatedAt), 'MMM d, h:mm a') : 'Unknown'}
                        </span>
                    </div>
                </div>
            </td>

            {/* Actions */}
            <td className="px-6 py-4 text-right">
                <div className="flex items-center justify-end gap-1">
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg group-hover:opacity-100 opacity-50 transition-all font-bold"
                        onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/quote/${quote.id}`);
                        }}
                    >
                        <ArrowUpRight size={16} />
                    </Button>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-gray-900 bg-transparent hover:bg-gray-100 rounded-lg group-hover:opacity-100 opacity-50 transition-all">
                                <MoreHorizontal size={16} />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40 font-medium">
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDuplicate(quote.id); }} className="cursor-pointer">
                                <Copy size={14} className="mr-2 text-gray-400" />
                                Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(quote.id); }} className="cursor-pointer text-red-600 focus:text-red-700 focus:bg-red-50">
                                <Trash2 size={14} className="mr-2 text-red-500" />
                                Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </td>
        </tr>
    );
}
