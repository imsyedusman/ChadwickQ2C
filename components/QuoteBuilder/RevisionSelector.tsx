'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { cn, formatQuoteNumber } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface Revision {
    id: string;
    quoteNumber: string;
    revision: number;
}

interface RevisionSelectorProps {
    currentId: string;
    revisionGroupId: string;
}

export default function RevisionSelector({ currentId, revisionGroupId }: RevisionSelectorProps) {
    const [revisions, setRevisions] = useState<Revision[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        async function fetchRevisions() {
            if (!revisionGroupId) {
                setLoading(false);
                return;
            }

            try {
                const res = await fetch(`/api/quotes?revisionGroupId=${revisionGroupId}`);
                if (res.ok) {
                    const result = await res.json();
                    const data = result.data || [];
                    // Sort by revision descending (newest first)
                    const sorted = (data as Revision[]).sort((a, b) => (b.revision || 0) - (a.revision || 0));
                    setRevisions(sorted);
                }
            } catch (error) {
                console.error('Failed to fetch revisions', error);
            } finally {
                setLoading(false);
            }
        }

        fetchRevisions();
    }, [revisionGroupId]);

    // Handle initial state and single-version fallback
    const displayRevisions = revisions.length > 0 ? revisions : [];
    
    if (loading) {
        return (
            <div className="h-10 flex items-center px-6 border-b border-gray-100 bg-gray-50/50">
                <Loader2 className="w-4 h-4 animate-spin text-gray-400 mr-2" />
                <span className="text-xs text-gray-400">Loading versions...</span>
            </div>
        );
    }

    // If we're not loading and have no revisions, we don't show the strip
    // UNLESS we want to show at least the current one.
    // The user requested: "If no other revisions exist, the selector should still show the current quote" 
    // but the list comes from the API. We can manually add the current quote if the list is empty or doesn't contain it.
    
    // However, if we're on a page with a quoteId, we should at least have that one in revisions if filtering by revisionGroupId works.
    if (!loading && displayRevisions.length === 0) return null;

    return (
        <div className="bg-white border-b border-gray-200 py-1 px-6 flex items-center gap-2 overflow-x-auto no-scrollbar shadow-sm">
            <span className="text-[10px] uppercase tracking-wider font-bold text-gray-400 mr-2 whitespace-nowrap">
                Quote Versions
            </span>
            <div className="flex items-center gap-1">
                {displayRevisions.map((rev, index) => {
                    const isActive = rev.id === currentId;
                    const formattedDisplay = formatQuoteNumber(rev.quoteNumber, rev.revision);

                    return (
                        <div key={rev.id} className="flex items-center">
                            <button
                                onClick={() => isActive ? null : router.push(`/quote/${rev.id}`)}
                                className={cn(
                                    "px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer",
                                    isActive
                                        ? "bg-blue-600 text-white shadow-sm scale-105"
                                        : "text-gray-600 hover:bg-gray-200 hover:text-gray-900"
                                )}
                            >
                                {formattedDisplay}
                            </button>
                            {index < displayRevisions.length - 1 && (
                                <span className="text-gray-300 mx-1 text-xs">|</span>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
