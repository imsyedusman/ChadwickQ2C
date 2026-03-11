'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, FileText, Trash2, Copy, Search, ChevronDown, ChevronRight, Hash } from 'lucide-react';
import { format } from 'date-fns';
import { cn, formatQuoteNumber } from '@/lib/utils';
import { calculateQuoteTotals, PricingSettings, PricingBoard } from '@/lib/pricing';

interface Quote {
    id: string;
    quoteNumber: string;
    revision: number;
    clientName: string | null;
    projectRef: string | null;
    description: string | null;
    status: string;
    updatedAt: string;
    boards: PricingBoard[];
    overrideLabourRate?: number | null;
    overrideOverheadPct?: number | null;
    overrideEngineeringPct?: number | null;
    overrideTargetMarginPct?: number | null;
    overrideConsumablesPct?: number | null;
    overrideGstPct?: number | null;
    overrideRoundingIncrement?: number | null;
    overrideCopperPricePerKg?: number | null;
}

// Global settings snapshot may not be needed if we assume global settings for dashboard
// But if quote has overrides, we use them.

export default function QuoteList() {
    const [quotes, setQuotes] = useState<Quote[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [settings, setSettings] = useState<PricingSettings | null>(null);
    const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
    const router = useRouter();

    useEffect(() => {
        fetchQuotes();
        fetchSettings();
    }, []);

    const fetchQuotes = async () => {
        try {
            const res = await fetch('/api/quotes');
            const data = await res.json();
            setQuotes(data);
        } catch (error) {
            console.error('Failed to fetch quotes', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchSettings = async () => {
        try {
            const res = await fetch('/api/settings');
            const data = await res.json();
            setSettings(data);
        } catch (error) {
            console.error('Failed to fetch settings', error);
        }
    };

    const calculateQuoteTotal = (quote: Quote): number => {
        if (!settings) return 0;

        // Merge global settings with quote overrides
        const effectiveSettings: PricingSettings = {
            labourRate: quote.overrideLabourRate ?? settings.labourRate,
            consumablesPct: quote.overrideConsumablesPct ?? settings.consumablesPct,
            overheadPct: quote.overrideOverheadPct ?? settings.overheadPct,
            engineeringPct: quote.overrideEngineeringPct ?? settings.engineeringPct,
            targetMarginPct: quote.overrideTargetMarginPct ?? settings.targetMarginPct,
            gstPct: quote.overrideGstPct ?? settings.gstPct,
            roundingIncrement: quote.overrideRoundingIncrement ?? settings.roundingIncrement,
            copperPricePerKg: quote.overrideCopperPricePerKg ?? settings.copperPricePerKg,
        };

        const { grandTotals } = calculateQuoteTotals(quote.boards, effectiveSettings);
        return grandTotals.sellPriceRounded;
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

    const handleCreate = async () => {
        try {
            const res = await fetch('/api/quotes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    clientName: 'New Client',
                    projectRef: 'New Project',
                    description: 'New Quote',
                }),
            });
            const newQuote = await res.json();
            router.push(`/quote/${newQuote.id}`);
        } catch (error) {
            console.error('Failed to create quote', error);
        }
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (!confirm('Are you sure you want to delete this quote?')) return;

        try {
            await fetch(`/api/quotes/${id}`, { method: 'DELETE' });
            setQuotes(quotes.filter((q) => q.id !== id));
        } catch (error) {
            console.error('Failed to delete quote', error);
        }
    };

    const handleDuplicate = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();

        try {
            const res = await fetch(`/api/quotes/${id}/duplicate`, {
                method: 'POST',
            });

            if (!res.ok) {
                throw new Error('Failed to duplicate quote');
            }

            const newQuote = await res.json();

            // Refresh the quotes list
            await fetchQuotes();

            // Navigate to the new quote
            router.push(`/quote/${newQuote.id}`);
        } catch (error) {
            console.error('Failed to duplicate quote', error);
            alert('Failed to duplicate quote. Please try again.');
        }
    };

    const filteredQuotes = Array.isArray(quotes) ? quotes.filter((q) =>
        (q.clientName || '').toLowerCase().includes(search.toLowerCase()) ||
        (q.projectRef || '').toLowerCase().includes(search.toLowerCase()) ||
        (q.quoteNumber || '').toLowerCase().includes(search.toLowerCase())
    ) : [];

    interface QuoteGroup {
        quoteNumber: string;
        parent: Quote;
        children: Quote[];
        latestUpdate: string;
        highestRevision: number;
    }

    const groupedQuotes = useMemo(() => {
        const getBaseQuoteNumber = (num: string) => {
            // Standard format is QYY-NNNN or QYY-NNNN-SUFFIX
            const match = num.match(/^(Q\d{2}-\d{4})/);
            return match ? match[1] : num;
        };

        const groups: Record<string, Quote[]> = {};
        filteredQuotes.forEach(q => {
            const base = getBaseQuoteNumber(q.quoteNumber);
            if (!groups[base]) {
                groups[base] = [];
            }
            groups[base].push(q);
        });

        const result: QuoteGroup[] = Object.entries(groups).map(([baseNumber, quotesInGroup]) => {
            // Sort by revision ascending to find the lowest (parent)
            const sortedByRev = [...quotesInGroup].sort((a, b) => (a.revision || 0) - (b.revision || 0));
            const parent = sortedByRev[0];

            // All others are children, sorted by revision descending (newest first)
            const children = sortedByRev.slice(1).sort((a, b) => (b.revision || 0) - (a.revision || 0));

            // Find highest revision and latest update
            const highestRevision = Math.max(...quotesInGroup.map(q => q.revision || 0));
            const latestUpdate = quotesInGroup.reduce((latest, q) =>
                new Date(q.updatedAt) > new Date(latest) ? q.updatedAt : latest
                , quotesInGroup[0].updatedAt);

            return {
                quoteNumber: baseNumber,
                parent,
                children,
                latestUpdate,
                highestRevision
            };
        });

        // Sort groups by latest update descending
        return result.sort((a, b) => new Date(b.latestUpdate).getTime() - new Date(a.latestUpdate).getTime());
    }, [filteredQuotes]);

    const toggleGroup = (e: React.MouseEvent, quoteNumber: string) => {
        e.stopPropagation();
        setCollapsedGroups(prev => ({
            ...prev,
            [quoteNumber]: !prev[quoteNumber]
        }));
    };

    if (loading) {
        return <div className="p-8 text-center text-gray-500">Loading quotes...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-gray-900">Quotes</h1>
                <button
                    onClick={handleCreate}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                >
                    <Plus size={20} />
                    New Quote
                </button>
            </div>

            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                    type="text"
                    placeholder="Search quotes..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow text-gray-900 placeholder:text-gray-500"
                />
            </div>

            <div className="grid gap-6">
                {groupedQuotes.map((group) => {
                    const isCollapsed = collapsedGroups[group.quoteNumber] || false;
                    const parent = group.parent;
                    const totalPrice = calculateQuoteTotal(parent);
                    const updatedDate = new Date(parent.updatedAt);

                    return (
                        <div key={group.quoteNumber} className="space-y-2">
                            {/* Parent Row */}
                            <div
                                onClick={() => router.push(`/quote/${parent.id}`)}
                                className="group bg-white p-5 rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer flex items-center justify-between shadow-sm"
                            >
                                <div className="flex items-start gap-4">
                                    <div className="flex items-center gap-2 mt-1">
                                        {group.children.length > 0 && (
                                            <button
                                                onClick={(e) => toggleGroup(e, group.quoteNumber)}
                                                className="p-1 hover:bg-gray-100 rounded text-gray-400"
                                            >
                                                {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                                            </button>
                                        )}
                                        <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-100 transition-colors">
                                            <FileText size={20} />
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-3">
                                            <h3 className="font-semibold text-gray-900 text-lg">{parent.projectRef || 'Untitled Project'}</h3>
                                            <span className="text-sm font-bold px-2.5 py-0.5 bg-gray-100 text-gray-700 rounded-lg border border-gray-200">
                                                {formatQuoteNumber(parent.quoteNumber, parent.revision)}
                                            </span>
                                            {parent.revision === group.highestRevision && group.children.length > 0 && (
                                                <span className="text-[10px] font-bold px-2 py-0.5 bg-green-100 text-green-700 rounded-full uppercase tracking-wider">
                                                    Latest
                                                </span>
                                            )}
                                            <span className={cn(
                                                "text-xs font-medium px-2 py-0.5 rounded-full",
                                                getStatusDisplay(parent.status).className
                                            )}>
                                                {getStatusDisplay(parent.status).label}
                                            </span>
                                        </div>
                                        <p className="text-gray-500 text-sm mt-0.5">{parent.clientName || 'No Client Name'}</p>

                                        <div className="flex items-center gap-4 mt-2.5 text-xs text-gray-500">
                                            <span>
                                                Updated {format(updatedDate, 'MMM d, yyyy')} at {format(updatedDate, 'h:mm a')}
                                            </span>
                                            <span className="font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                                                ${totalPrice.toLocaleString()} ex GST
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={(e) => handleDuplicate(e, parent.id)}
                                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                        title="Duplicate"
                                    >
                                        <Copy size={18} />
                                    </button>
                                    <button
                                        onClick={(e) => handleDelete(e, parent.id)}
                                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Delete"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>

                            {/* Child Rows */}
                            {!isCollapsed && group.children.length > 0 && (
                                <div className="ml-12 space-y-2 border-l-2 border-gray-100 pl-4">
                                    {group.children.map((child) => {
                                        const childTotal = calculateQuoteTotal(child);
                                        const childUpdate = new Date(child.updatedAt);
                                        return (
                                            <div
                                                key={child.id}
                                                onClick={() => router.push(`/quote/${child.id}`)}
                                                className="group bg-white p-3.5 rounded-xl border border-gray-100 hover:border-blue-200 hover:shadow-sm transition-all cursor-pointer flex items-center justify-between"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="text-gray-300">
                                                        <Hash size={14} />
                                                    </div>
                                                    <span className="text-sm font-semibold text-gray-700">
                                                        {formatQuoteNumber(child.quoteNumber, child.revision)}
                                                    </span>
                                                    {child.revision === group.highestRevision && (
                                                        <span className="text-[9px] font-bold px-1.5 py-0.25 bg-green-50 text-green-600 rounded-full border border-green-100 uppercase tracking-tight">
                                                            Latest
                                                        </span>
                                                    )}
                                                    <div className="h-3 w-px bg-gray-200 mx-1" />
                                                    <span className="text-xs text-gray-500">
                                                        Updated {format(childUpdate, 'MMM d, h:mm a')}
                                                    </span>
                                                    <span className="text-xs font-medium text-gray-900 ml-2">
                                                        ${childTotal.toLocaleString()}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={(e) => handleDuplicate(e, child.id)}
                                                        className="p-1.5 text-gray-400 hover:text-blue-600 rounded-md transition-colors"
                                                        title="Duplicate"
                                                    >
                                                        <Copy size={16} />
                                                    </button>
                                                    <button
                                                        onClick={(e) => handleDelete(e, child.id)}
                                                        className="p-1.5 text-gray-400 hover:text-red-600 rounded-md transition-colors"
                                                        title="Delete"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}

                {groupedQuotes.length === 0 && (
                    <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                        No quotes found. Create one to get started.
                    </div>
                )}
            </div>
        </div>
    );
}
