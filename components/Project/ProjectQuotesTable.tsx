'use client';

import { ChevronUp, ChevronDown } from 'lucide-react';
import QuoteRow from '@/components/Project/QuoteRow';
import { cn } from '@/lib/utils';

interface ProjectQuotesTableProps {
    quotes: any[];
    currentSort: string;
    currentDir: 'asc' | 'desc';
    toggleSort: (column: string) => void;
    renderSortIcon: (column: string) => React.ReactNode;
    onUpdate: (id: string, diff: any) => void;
    onDuplicate: (quote: any) => void;
    onCreateRevision: (id: string) => void;
    onDelete: (id: string) => void;
}

export default function ProjectQuotesTable({
    quotes,
    currentSort,
    currentDir,
    toggleSort,
    renderSortIcon,
    onUpdate,
    onDuplicate,
    onCreateRevision,
    onDelete
}: ProjectQuotesTableProps) {

    const parseQuoteNumberForSort = (quoteNumber: string) => {
        const match = quoteNumber.match(/Q(\d+)-(\d+)/);
        if (match) {
            return parseInt(match[1]) * 1000000 + parseInt(match[2]);
        }
        return 0;
    };

    const sortedQuotes = (() => {
        let sorted = [...quotes].sort((a: any, b: any) => {
            let aVal, bVal;
            
            switch (currentSort) {
                case 'total':
                    aVal = a.totalExGST || 0;
                    bVal = b.totalExGST || 0;
                    break;
                case 'status':
                    aVal = a.status || '';
                    bVal = b.status || '';
                    break;
                case 'estimator':
                    aVal = a.modifier?.name || '';
                    bVal = b.modifier?.name || '';
                    break;
                case 'quoteNumber':
                    aVal = parseQuoteNumberForSort(a.quoteNumber);
                    bVal = parseQuoteNumberForSort(b.quoteNumber);
                    break;
                case 'updatedAt':
                default:
                    aVal = new Date(a.updatedAt).getTime();
                    bVal = new Date(b.updatedAt).getTime();
            }

            if (aVal < bVal) return currentDir === 'asc' ? -1 : 1;
            if (aVal > bVal) return currentDir === 'asc' ? 1 : -1;
            return 0;
        });

        // Revision grouping logic
        const groups = sorted.reduce((acc, quote) => {
            const groupId = quote.revisionGroupId || quote.id;
            if (!acc[groupId]) acc[groupId] = [];
            acc[groupId].push(quote);
            return acc;
        }, {} as Record<string, any[]>);

        const flat: any[] = [];
        const processedGroups = new Set();
        
        for (const quote of sorted) {
            const groupId = quote.revisionGroupId || quote.id;
            
            if (processedGroups.has(groupId)) continue;
            processedGroups.add(groupId);

            const group = groups[groupId];
            // Parent remains the one with the earliest createdAt
            group.sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
            
            if (group.length > 0) {
                flat.push({ ...group[0], _isChild: false });
                for (let i = 1; i < group.length; i++) {
                    flat.push({ ...group[i], _isChild: true });
                }
            }
        }
        return flat;
    })();

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead>
                    <tr className="bg-gray-50/50">
                        <th className="px-6 py-2.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest border-r border-gray-100/50 w-[80px]">Est.</th>
                        <th 
                            className="px-6 py-2.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest border-r border-gray-100/50 min-w-[160px] whitespace-nowrap cursor-pointer hover:bg-gray-100 transition-colors"
                            onClick={() => toggleSort('quoteNumber')}
                        >
                            <div className="flex items-center gap-2">
                                Quote Number
                                {renderSortIcon('quoteNumber')}
                            </div>
                        </th>
                        <th className="px-6 py-2.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest border-r border-gray-100/50 min-w-[200px]">Project Name</th>
                        <th className="px-6 py-2.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest border-r border-gray-100/50 min-w-[120px]">Company</th>
                        <th className="px-6 py-2.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest border-r border-gray-100/50 min-w-[120px]">Client</th>
                        <th 
                            className="px-6 py-2.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest border-r border-gray-100/50 w-[110px] cursor-pointer hover:bg-gray-100 transition-colors"
                            onClick={() => toggleSort('status')}
                        >
                            <div className="flex items-center gap-2">
                                Status
                                {renderSortIcon('status')}
                            </div>
                        </th>
                        <th 
                            className="px-6 py-2.5 text-right text-[10px] font-bold text-gray-400 uppercase tracking-widest border-r border-gray-100/50 min-w-[140px] whitespace-nowrap cursor-pointer hover:bg-gray-100 transition-colors"
                            onClick={() => toggleSort('total')}
                        >
                            <div className="flex items-center justify-end gap-2">
                                Total (ex GST)
                                {renderSortIcon('total')}
                            </div>
                        </th>
                        <th className="px-6 py-2.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Notes</th>
                        <th className="px-6 py-2.5 text-right text-[10px] font-bold text-gray-400 uppercase tracking-widest w-[80px]"></th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {sortedQuotes.map((quote: any) => (
                        <QuoteRow 
                            key={quote.id} 
                            quote={quote} 
                            isChild={quote._isChild}
                            onUpdate={onUpdate}
                            onDuplicate={onDuplicate}
                            onCreateRevision={onCreateRevision}
                            onDelete={onDelete}
                        />
                    ))}
                    {quotes.length === 0 && (
                        <tr>
                            <td colSpan={9} className="px-6 py-12 text-center text-gray-500 font-medium italic">
                                No quotes found for this project.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}
