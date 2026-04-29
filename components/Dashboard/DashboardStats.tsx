'use client';

import { useState, useEffect } from 'react';
import { 
    FileText, 
    TrendingUp, 
    CheckCircle2, 
    Clock, 
    DollarSign,
    ArrowUpRight,
    ArrowDownRight,
    Info
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';

interface StatsData {
    activeQuotes: number;
    totalValue: number;
    wonCount: number;
    pendingValue: number;
    avgTurnaround: number;
    trends: {
        activeQuotes: number;
        totalValue: number;
    };
}

export default function DashboardStats() {
    const [stats, setStats] = useState<StatsData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await fetch('/api/dashboard/stats');
                if (res.ok) {
                    const data = await res.json();
                    setStats(data);
                }
            } catch (error) {
                console.error('Failed to fetch dashboard stats', error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    const statCards = [
        {
            label: 'Active Quotes',
            value: stats?.activeQuotes || 0,
            icon: FileText,
            color: 'text-blue-600',
            bgColor: 'bg-blue-50',
            trend: stats?.trends.activeQuotes || 0,
            description: 'Total number of quotes currently in the system (excluding Trash).',
            format: (v: number) => v.toString()
        },
        {
            label: 'Total Pipeline',
            value: stats?.pendingValue || 0,
            icon: DollarSign,
            color: 'text-emerald-600',
            bgColor: 'bg-emerald-50',
            trend: stats?.trends.totalValue || 0,
            description: 'Aggregated Sell Price (Ex-GST) of all Draft and Sent quotes.',
            format: (v: number) => formatCurrency(v, 0)
        },
        {
            label: 'Won (Month)',
            value: stats?.wonCount || 0,
            icon: CheckCircle2,
            color: 'text-purple-600',
            bgColor: 'bg-purple-50',
            trend: 0,
            description: 'Number of quotes marked as "Won" within the current calendar month.',
            format: (v: number) => v.toString()
        },
        {
            label: 'Avg. Turnaround',
            value: stats?.avgTurnaround || 0,
            icon: Clock,
            color: 'text-amber-600',
            bgColor: 'bg-amber-50',
            trend: 0,
            description: 'Average number of days between a quote being created and being marked as "Won".',
            format: (v: number) => v === 0 ? '—' : `${v} days`
        }
    ];

    if (loading) {
        return (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-24 bg-gray-100 animate-pulse rounded-2xl" />
                ))}
            </div>
        );
    }

    return (
        <TooltipProvider>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-8">
                {statCards.map((card, idx) => (
                    <div 
                        key={idx} 
                        className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow"
                    >
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <div className={cn("p-2 rounded-xl", card.bgColor)}>
                                    <card.icon className={cn("w-5 h-5", card.color)} />
                                </div>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <button className="text-gray-300 hover:text-gray-400 transition-colors">
                                            <Info size={14} />
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="max-w-[200px] text-center">
                                        <p className="text-[11px] font-medium leading-relaxed">{card.description}</p>
                                    </TooltipContent>
                                </Tooltip>
                            </div>
                            {card.trend !== 0 && (
                                <div className={cn(
                                    "flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                                    card.trend > 0 ? "text-emerald-600 bg-emerald-50" : "text-rose-600 bg-rose-50"
                                )}>
                                    {card.trend > 0 ? <ArrowUpRight size={10} className="mr-0.5" /> : <ArrowDownRight size={10} className="mr-0.5" />}
                                    {Math.abs(card.trend)}%
                                </div>
                            )}
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{card.label}</p>
                            <p className="text-xl font-extrabold text-gray-900 leading-tight">
                                {card.format(card.value)}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </TooltipProvider>
    );
}
