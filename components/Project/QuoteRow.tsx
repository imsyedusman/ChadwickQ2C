'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, ArrowUpRight, Check, X, Pencil, MoreHorizontal, Copy, Trash2, ChevronRight, CornerDownRight, Loader2 } from 'lucide-react';
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
    onDuplicate: (quote: any) => void;
    onCreateRevision: (id: string) => void;
    onDelete: (id: string) => void;
}

const STATUS_OPTIONS = [
    { value: 'DRAFT', label: 'Draft', colorClass: 'bg-yellow-100 text-yellow-700' },
    { value: 'SENT', label: 'Sent', colorClass: 'bg-blue-100 text-blue-700' },
    { value: 'WON', label: 'Won', colorClass: 'bg-green-100 text-green-700' },
    { value: 'LOST', label: 'Lost', colorClass: 'bg-red-100 text-red-700' },
];

export default function QuoteRow({ quote, isChild, onUpdate, onDuplicate, onCreateRevision, onDelete }: QuoteRowProps) {
    const router = useRouter();
    const [isEditingStatus, setIsEditingStatus] = useState(false);
    const [isEditingNotes, setIsEditingNotes] = useState(false);
    
    const [statusValue, setStatusValue] = useState(quote.status);
    const [notesValue, setNotesValue] = useState(quote.gridInternalNotes || '');
    const notesInputRef = useRef<HTMLInputElement>(null);
    const [isSavingNotes, setIsSavingNotes] = useState(false);
    const [notesError, setNotesError] = useState(false);

    const getInitials = (name?: string) => {
        if (!name) return 'SYS';
        const parts = name.trim().split(/\s+/);
        if (parts.length >= 2) {
            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    };

    // Use a ref to track the last saved notes for rollback
    const lastSavedNotes = useRef(quote.gridInternalNotes || '');

    // Sync state if props change
    useEffect(() => {
        setStatusValue(quote.status);
        setNotesValue(quote.gridInternalNotes || '');
        lastSavedNotes.current = quote.gridInternalNotes || '';
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
            setStatusValue(quote.status);
            onUpdate(quote.id, { status: quote.status });
        }
    };

    const handleSaveNotes = async () => {
        const trimmed = notesValue.trim();
        if (trimmed === lastSavedNotes.current) {
            setIsEditingNotes(false);
            return;
        }

        setIsSavingNotes(true);
        setNotesError(false);
        
        try {
            const res = await fetch(`/api/quotes/${quote.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ gridInternalNotes: trimmed }),
            });
            
            if (!res.ok) throw new Error('Failed to update notes');
            
            lastSavedNotes.current = trimmed;
            onUpdate(quote.id, { gridInternalNotes: trimmed });
            setIsEditingNotes(false);
        } catch (err) {
            setNotesError(true);
            // Wait a bit then rollback
            setTimeout(() => {
                setNotesValue(lastSavedNotes.current);
                setNotesError(false);
                setIsEditingNotes(false);
            }, 2000);
        } finally {
            setIsSavingNotes(false);
        }
    };

    const handleKeyDownNotes = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleSaveNotes();
        if (e.key === 'Escape') {
            setNotesValue(lastSavedNotes.current);
            setIsEditingNotes(false);
        }
    };

    const currentStatusConfig = STATUS_OPTIONS.find(s => s.value === statusValue) || { label: statusValue, colorClass: 'bg-gray-100 text-gray-700' };

    return (
        <tr className={cn(
            "hover:bg-blue-50/20 transition-colors group border-b border-gray-100",
            isChild ? "bg-slate-50/20" : "bg-white"
        )}>
            {/* Est. Initials */}
            <td className="px-6 py-2 border-r border-gray-50/50 w-[80px]">
                <div 
                    className="w-7 h-7 rounded bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-600 border border-slate-200"
                    title={quote.modifier?.name || 'System'}
                >
                    {getInitials(quote.modifier?.name)}
                </div>
            </td>

            {/* Quote Number - High Priority */}
            <td className="px-6 py-2 border-r border-gray-50/50 w-[160px]" onClick={() => router.push(`/quote/${quote.id}`)}>
                <div className={cn(
                    "font-bold text-gray-900 text-xs whitespace-nowrap flex items-center gap-2 cursor-pointer group-hover:text-blue-600 transition-colors",
                    isChild && "pl-4 text-gray-500 font-medium"
                )}>
                    {isChild && <CornerDownRight size={12} className="text-gray-300" />}
                    {formatQuoteNumber(quote.quoteNumber, quote.revision)}
                </div>
            </td>

            {/* Project Name - Medium Priority */}
            <td className="px-6 py-2 border-r border-gray-50/50 cursor-pointer min-w-[200px]" onClick={() => router.push(`/quote/${quote.id}`)}>
                <div className="text-xs text-gray-700 truncate max-w-[250px]" title={quote.projectRef}>
                    {quote.projectRef || "—"}
                </div>
            </td>

            {/* Company - Low Priority */}
            <td className="px-6 py-2 border-r border-gray-50/50 cursor-pointer min-w-[120px]" onClick={() => router.push(`/quote/${quote.id}`)}>
                <div className="text-xs text-gray-600 truncate max-w-[150px]" title={quote.clientCompany}>
                    {quote.clientCompany || "—"}
                </div>
            </td>

            {/* Client - Low Priority */}
            <td className="px-6 py-2 border-r border-gray-50/50 cursor-pointer min-w-[120px]" onClick={() => router.push(`/quote/${quote.id}`)}>
                <div className="text-xs text-gray-600 truncate max-w-[150px]" title={quote.clientName}>
                    {quote.clientName || "—"}
                </div>
            </td>

            {/* Status - High/Medium Priority */}
            <td className="px-6 py-2 border-r border-gray-50/50 w-[110px]">
                {isEditingStatus ? (
                    <select 
                        autoFocus
                        value={statusValue}
                        onChange={(e) => handleSaveStatus(e.target.value)}
                        onBlur={() => setIsEditingStatus(false)}
                        className="bg-white border border-blue-200 text-[10px] font-bold rounded-md px-1.5 py-0.5 focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-sm cursor-pointer w-full"
                    >
                        {STATUS_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                ) : (
                    <div className="flex items-center gap-2 group/status cursor-pointer h-6" onClick={() => setIsEditingStatus(true)}>
                        <span className={cn(
                            "px-2 py-0.5 text-[9px] font-bold rounded border uppercase tracking-tighter transition-colors",
                            currentStatusConfig.colorClass
                        )}>
                            {currentStatusConfig.label}
                        </span>
                        <Pencil size={10} className="text-gray-300 opacity-0 group-hover/status:opacity-100 transition-all" />
                    </div>
                )}
            </td>

            {/* Total - High Priority */}
            <td className="px-6 py-2 border-r border-gray-50/50 text-right cursor-pointer w-[140px]" onClick={() => router.push(`/quote/${quote.id}`)}>
                <div className="text-xs font-bold text-gray-900 whitespace-nowrap">
                    ${(quote.totalExGST || quote.total || 0).toLocaleString()}
                </div>
            </td>

            {/* Notes - High Priority Flexible */}
            <td className="px-6 py-2 border-r border-gray-50/50 group/notes min-w-0 relative">
                {isEditingNotes ? (
                    <div className="relative flex items-center">
                        <input 
                            ref={notesInputRef}
                            type="text"
                            value={notesValue}
                            onChange={(e) => setNotesValue(e.target.value)}
                            onBlur={handleSaveNotes}
                            onKeyDown={handleKeyDownNotes}
                            disabled={isSavingNotes}
                            className={cn(
                                "w-full text-xs text-gray-900 bg-white border rounded px-2 py-1 focus:ring-2 focus:outline-none shadow-sm transition-all",
                                notesError ? "border-red-500 focus:ring-red-500" : "border-blue-200 focus:ring-blue-500"
                            )}
                            placeholder="Add a note..."
                        />
                        {isSavingNotes && (
                            <div className="absolute right-2">
                                <Loader2 size={12} className="animate-spin text-blue-500" />
                            </div>
                        )}
                        {notesError && (
                            <div className="absolute right-2 text-red-500">
                                <X size={12} />
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="relative">
                        <div 
                            className="flex items-start gap-2 cursor-pointer min-h-[32px] w-full px-2 -ml-1 rounded border border-transparent hover:border-indigo-100/50 hover:bg-indigo-50/40 bg-indigo-50/10 transition-all group/notearea" 
                            onClick={() => setIsEditingNotes(true)}
                        >
                            <span className={cn(
                                "text-[11px] leading-tight flex-1 line-clamp-2 break-words",
                                notesValue ? "text-gray-700 font-medium" : "text-gray-400 italic"
                            )}>
                                {notesValue || "Add note..."}
                            </span>
                            <Pencil size={10} className="mt-1 text-gray-300 opacity-0 group-hover/notearea:opacity-100 transition-all shrink-0" />
                        </div>

                        {/* Stable Hover Preview Popover */}
                        {notesValue && notesValue.length > 50 && (
                            <div className="absolute z-50 invisible group-hover/notearea:visible opacity-0 group-hover/notearea:opacity-100 transition-all duration-200 -top-2 left-full ml-2 w-64 p-3 bg-slate-900 text-white text-[11px] leading-relaxed rounded-xl shadow-2xl border border-slate-700 pointer-events-none after:content-[''] after:absolute after:top-4 after:-left-1 after:w-2 after:h-2 after:bg-slate-900 after:border-l after:border-b after:border-slate-700 after:rotate-45">
                                {notesValue}
                            </div>
                        )}
                    </div>
                )}
            </td>

            {/* Actions */}
            <td className="px-6 py-2 text-right">
                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                        onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/quote/${quote.id}`);
                        }}
                    >
                        <ArrowUpRight size={14} />
                    </Button>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded">
                                <MoreHorizontal size={14} />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onCreateRevision(quote.id); }} className="cursor-pointer text-xs font-medium">
                                <Copy size={12} className="mr-2 text-blue-500" />
                                Create Revision
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDuplicate(quote); }} className="cursor-pointer text-xs font-medium">
                                <Copy size={12} className="mr-2 text-gray-400" />
                                Duplicate Quote
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(quote.id); }} className="cursor-pointer text-xs font-medium text-red-600">
                                <Trash2 size={12} className="mr-2 text-red-500" />
                                Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </td>
        </tr>
    );
}
