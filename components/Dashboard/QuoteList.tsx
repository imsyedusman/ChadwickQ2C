'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, FileText, Trash2, Copy, Search } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface Quote {
    id: string;
    quoteNumber: string;
    clientName: string | null;
    projectRef: string | null;
    description: string | null;
    status: string;
    updatedAt: string;
    boards: any[];
}

export default function QuoteList() {
    const [quotes, setQuotes] = useState<Quote[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const router = useRouter();

    useEffect(() => {
        fetchQuotes();
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

    const filteredQuotes = quotes.filter((q) =>
        (q.clientName || '').toLowerCase().includes(search.toLowerCase()) ||
        (q.projectRef || '').toLowerCase().includes(search.toLowerCase()) ||
        (q.quoteNumber || '').toLowerCase().includes(search.toLowerCase())
    );

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
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                />
            </div>

            <div className="grid gap-4">
                {filteredQuotes.map((quote) => (
                    <div
                        key={quote.id}
                        onClick={() => router.push(`/quote/${quote.id}`)}
                        className="group bg-white p-6 rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer flex items-center justify-between"
                    >
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-100 transition-colors">
                                <FileText size={24} />
                            </div>
                            <div>
                                <div className="flex items-center gap-3">
                                    <h3 className="font-semibold text-gray-900">{quote.projectRef || 'Untitled Project'}</h3>
                                    <span className="text-xs font-medium px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                                        {quote.quoteNumber}
                                    </span>
                                    <span className={cn(
                                        "text-xs font-medium px-2 py-0.5 rounded-full",
                                        quote.status === 'DRAFT' ? "bg-yellow-100 text-yellow-700" :
                                            quote.status === 'SENT' ? "bg-blue-100 text-blue-700" :
                                                "bg-green-100 text-green-700"
                                    )}>
                                        {quote.status}
                                    </span>
                                </div>
                                <p className="text-gray-500 text-sm mt-1">{quote.clientName || 'No Client Name'}</p>
                                <p className="text-gray-400 text-xs mt-2">
                                    Updated {format(new Date(quote.updatedAt), 'MMM d, yyyy')}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                                onClick={(e) => { e.stopPropagation(); /* Duplicate logic */ }}
                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Duplicate"
                            >
                                <Copy size={18} />
                            </button>
                            <button
                                onClick={(e) => handleDelete(e, quote.id)}
                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    </div>
                ))}

                {filteredQuotes.length === 0 && (
                    <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                        No quotes found. Create one to get started.
                    </div>
                )}
            </div>
        </div>
    );
}
