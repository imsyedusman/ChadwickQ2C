'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { FileText, Building2, Calendar, Hash, CheckCircle2, DollarSign, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export default function SharedQuoteView() {
    const params = useParams();
    const token = params?.token as string;
    
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchQuote();
    }, [token]);

    const fetchQuote = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/public/quote/${token}`);
            if (!res.ok) {
                const err = await res.json();
                setError(err.error || 'Failed to load quote');
                return;
            }
            const quoteData = await res.json();
            setData(quoteData);
        } catch (err) {
            setError('An error occurred while loading the quote.');
        } finally {
            setLoading(false);
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-gray-500 font-medium">Loading secure quote...</p>
        </div>
    );

    if (error) return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="bg-white p-8 rounded-3xl shadow-xl max-w-sm w-full text-center border border-red-50">
                <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <XCircle size={32} />
                </div>
                <h2 className="text-2xl font-black text-gray-900 mb-2">Access Denied</h2>
                <p className="text-gray-500 mb-6">{error}</p>
                <button 
                    onClick={() => window.location.reload()}
                    className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 transition-all active:scale-95"
                >
                    Retry
                </button>
            </div>
        </div>
    );

    const { quote, grandTotals, boardTotals } = data;

    return (
        <div className="min-h-screen bg-gray-50/50 py-12 px-4 selection:bg-blue-100">
            <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
                {/* Header Card */}
                <div className="bg-white p-10 rounded-[40px] shadow-sm border border-gray-100 overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 -mr-16 -mt-16 rounded-full opacity-50" />
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-indigo-50 -ml-12 -mb-12 rounded-full opacity-50" />
                    
                    <div className="relative">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                            <div>
                                <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-[11px] font-black uppercase tracking-widest mb-4 border border-blue-100/50">
                                    <Clock size={12} />
                                    Official Quote
                                </div>
                                <h1 className="text-4xl md:text-5xl font-black text-gray-900 leading-tight">
                                    {quote.projectRef}
                                </h1>
                            </div>
                            <div className="text-left md:text-right">
                                <div className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-1">Quote Number</div>
                                <div className="text-2xl font-black text-blue-600">{quote.quoteNumber}</div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 p-6 bg-gray-50 rounded-3xl border border-gray-100">
                            <InfoItem icon={<Building2 size={18} className="text-blue-500" />} label="Client Name" value={quote.clientName} />
                            <InfoItem icon={<FileText size={18} className="text-indigo-500" />} label="Company" value={quote.clientCompany || '---'} />
                            <InfoItem icon={<Calendar size={18} className="text-purple-500" />} label="Issued On" value={format(new Date(quote.updatedAt), 'MMMM d, yyyy')} />
                        </div>
                    </div>
                </div>

                {/* Description */}
                {quote.description && (
                    <div className="bg-white p-8 rounded-[32px] shadow-sm border border-gray-100">
                        <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-3">Project Description</h3>
                        <p className="text-gray-700 text-lg leading-relaxed">{quote.description}</p>
                    </div>
                )}

                {/* Boards Summary */}
                <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-8 border-b border-gray-50">
                        <h3 className="text-xl font-bold text-gray-900">Breakdown</h3>
                    </div>
                    <div className="divide-y divide-gray-50">
                        {boardTotals.map((bt: any) => (
                            <div key={bt.boardId} className="p-8 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                                <div>
                                    <div className="font-bold text-gray-900 text-lg uppercase tracking-tight">{bt.boardName}</div>
                                    <div className="text-xs text-gray-400 font-bold uppercase tracking-wider mt-1">{bt.boardType || 'GENERAL BOARD'}</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-xl font-black text-gray-900">${bt.totalSell.toLocaleString()}</div>
                                    <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Excl. GST</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Final Total */}
                <div className="bg-gradient-to-br from-gray-900 to-blue-950 p-10 rounded-[40px] shadow-2xl text-white relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full -mr-32 -mt-32 blur-3xl group-hover:bg-blue-500/20 transition-all duration-1000" />
                    
                    <div className="relative flex flex-col md:flex-row items-center justify-between gap-8">
                        <div>
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-[10px] font-black uppercase tracking-widest mb-4">
                                <DollarSign size={12} />
                                Total Investment
                            </div>
                            <div className="text-sm text-gray-400 font-medium max-w-xs">
                                Professional quotation calculated including all specified components and assembly.
                            </div>
                        </div>
                        <div className="text-center md:text-right">
                            <div className="text-[11px] font-black text-blue-400 uppercase tracking-[0.3em] mb-2">Grand Total Incl. GST</div>
                            <div className="text-6xl md:text-7xl font-black tracking-tighter shadow-blue-500/20 drop-shadow-2xl">
                                ${grandTotals.sellPriceInclGst.toLocaleString()}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <footer className="text-center pt-8 pb-12">
                    <p className="text-gray-400 text-sm font-medium">Secure Quote Portal powered by Chadwick Q2C</p>
                    <div className="flex items-center justify-center gap-4 mt-6">
                        <CheckCircle2 className="text-green-500" size={16} />
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Verified and Secured</span>
                    </div>
                </footer>
            </div>
        </div>
    );
}

function InfoItem({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
    return (
        <div className="flex items-start gap-4">
            <div className="mt-1">{icon}</div>
            <div>
                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{label}</div>
                <div className="text-gray-900 font-bold leading-tight">{value}</div>
            </div>
        </div>
    );
}

function XCircle({ size }: { size: number }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
    );
}
