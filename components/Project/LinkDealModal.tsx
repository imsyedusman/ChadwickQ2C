'use client';

import { useState } from 'react';
import { 
    Search, 
    X, 
    Loader2, 
    Briefcase, 
    Building2, 
    User, 
    Link as LinkIcon 
} from 'lucide-react';
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle,
    DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface PipedriveDeal {
    id: number;
    title: string;
    organization_name?: string;
    organization_id?: number;
    person_name?: string;
    person_id?: number;
    status: string;
    value: number;
    currency: string;
}

interface LinkDealModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (deal: PipedriveDeal) => void;
}

export default function LinkDealModal({ isOpen, onClose, onSelect }: LinkDealModalProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [deals, setDeals] = useState<PipedriveDeal[]>([]);
    const [loading, setLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);

    const handleSearch = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!searchTerm.trim()) return;

        setLoading(true);
        setHasSearched(true);
        try {
            const res = await fetch(`/api/pipedrive/search?term=${encodeURIComponent(searchTerm)}`);
            if (res.ok) {
                const data = await res.json();
                setDeals(data.deals || []);
            } else {
                toast.error('Failed to search deals');
            }
        } catch (error) {
            console.error('Search error:', error);
            toast.error('Error searching Pipedrive deals');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden border-none rounded-3xl shadow-2xl">
                <DialogHeader className="p-8 bg-slate-900 text-white">
                    <DialogTitle className="text-2xl font-bold flex items-center gap-3">
                        <LinkIcon className="text-blue-400" />
                        Link Pipedrive Deal
                    </DialogTitle>
                    <DialogDescription className="text-slate-400 mt-2">
                        Search and select a Pipedrive deal to link with this project.
                    </DialogDescription>
                </DialogHeader>

                <div className="p-8 space-y-6">
                    <form onSubmit={handleSearch} className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={20} />
                        <input
                            type="text"
                            placeholder="Search by deal title or ID..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:ring-0 focus:border-blue-500 transition-all text-slate-900 font-medium outline-none"
                            autoFocus
                        />
                        <Button 
                            type="submit"
                            disabled={loading || !searchTerm.trim()}
                            className="absolute right-2 top-1/2 -translate-y-1/2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-10 px-4"
                        >
                            {loading ? <Loader2 className="animate-spin" size={18} /> : "Search"}
                        </Button>
                    </form>

                    <div className="max-h-[400px] overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                                <Loader2 className="animate-spin mb-4 text-blue-500" size={32} />
                                <p className="font-bold uppercase tracking-widest text-xs">Searching Pipedrive...</p>
                            </div>
                        ) : deals.length > 0 ? (
                            deals.map((deal) => (
                                <button
                                    key={deal.id}
                                    onClick={() => onSelect(deal)}
                                    className="w-full text-left p-6 bg-white border-2 border-slate-50 rounded-2xl hover:border-blue-200 hover:bg-blue-50/30 transition-all group"
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-2">
                                            <div className="p-2 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors text-blue-600">
                                                <Briefcase size={18} />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-900 leading-tight">{deal.title}</h4>
                                                <p className="text-xs text-slate-400 font-mono mt-0.5">#{deal.id}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-bold text-slate-900">
                                                ${deal.value.toLocaleString()}
                                            </p>
                                            <span className="inline-block px-2 py-0.5 bg-slate-100 text-[10px] font-bold text-slate-500 rounded uppercase mt-1">
                                                {deal.status}
                                            </span>
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100/50">
                                        <div className="flex items-center gap-2 text-xs text-slate-500">
                                            <Building2 size={14} className="text-slate-400" />
                                            <span className="truncate">{deal.organization_name || 'No Org'}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-slate-500">
                                            <User size={14} className="text-slate-400" />
                                            <span className="truncate">{deal.person_name || 'No Contact'}</span>
                                        </div>
                                    </div>
                                </button>
                            ))
                        ) : hasSearched ? (
                            <div className="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-100">
                                <Search className="mx-auto w-12 h-12 text-slate-200 mb-4" />
                                <p className="text-slate-500 font-medium">No deals found for "{searchTerm}"</p>
                            </div>
                        ) : (
                            <div className="text-center py-20">
                                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <LinkIcon className="text-blue-400" size={32} />
                                </div>
                                <p className="text-slate-500 font-medium">Search for a deal to get started</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                    <Button variant="ghost" onClick={onClose} className="rounded-xl font-bold text-slate-500">
                        Cancel
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
