'use client';

import { useState, useEffect } from 'react';
import { 
    TrendingUp, 
    BarChart3, 
    Users, 
    DollarSign, 
    Target, 
    ArrowUpRight, 
    ArrowDownRight,
    Loader2,
    Calendar,
    Trophy,
    Briefcase
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from '@/components/ui/card';

interface EstimatorStat {
    name: string;
    sent: number;
    won: number;
    lost: number;
    value: number;
}

interface AnalyticsData {
    total: number;
    sent: number;
    won: number;
    lost: number;
    draft: number;
    createdToday: number;
    createdThisWeek: number;
    winRate: number;
    totalValueWon: number;
    monthlyWon: Record<string, number>;
    estimatorStats: Record<string, EstimatorStat>;
}

export default function AnalyticsPage() {
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                const res = await fetch('/api/admin/analytics');
                if (!res.ok) throw new Error('Failed to fetch analytics');
                const result = await res.json();
                setData(result);
            } catch (error) {
                toast.error('Failed to load analytics data');
            } finally {
                setIsLoading(false);
            }
        };

        fetchAnalytics();
    }, []);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
                <p className="text-gray-500 font-medium animate-pulse">Analyzing system performance...</p>
            </div>
        );
    }

    if (!data) return null;

    const formatter = new Intl.NumberFormat('en-AU', {
        style: 'currency',
        currency: 'AUD',
        maximumFractionDigits: 0
    });

    const estimatorArray = Object.values(data.estimatorStats).sort((a, b) => b.value - a.value);
    const maxRevenue = Math.max(...Object.values(data.monthlyWon), 1000);

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-700">
            {/* Header section */}
            <div className="mb-8">
                <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Performance Analytics</h1>
                <p className="text-gray-500 mt-1">Real-time overview of your quoting pipeline and team performance.</p>
            </div>

            {/* Metric Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <MetricCard 
                    title="Total Pipeline Value" 
                    value={formatter.format(data.totalValueWon)} 
                    subvalue="Closed Won Revenue"
                    icon={<DollarSign className="w-6 h-6 text-blue-600" />}
                    trend="+12% vs last month"
                    trendUp={true}
                />
                <MetricCard 
                    title="Success Rate" 
                    value={`${data.winRate.toFixed(1)}%`} 
                    subvalue="Won vs Lost Ratio"
                    icon={<Target className="w-6 h-6 text-purple-600" />}
                />
                <MetricCard 
                    title="Created This Week" 
                    value={data.createdThisWeek.toString()} 
                    subvalue="New quotes added"
                    icon={<Calendar className="w-6 h-6 text-amber-600" />}
                />
                <MetricCard 
                    title="Created Today" 
                    value={data.createdToday.toString()} 
                    subvalue="Recent activity"
                    icon={<TrendingUp className="w-6 h-6 text-green-600" />}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Revenue Trend Chart */}
                <Card className="lg:col-span-2 border-none shadow-xl shadow-gray-200/50 rounded-3xl overflow-hidden">
                    <CardHeader className="bg-white border-b border-gray-100 p-6">
                        <div className="flex justify-between items-center">
                            <div>
                                <CardTitle className="text-xl font-bold text-gray-900">Revenue Trajectory</CardTitle>
                                <CardDescription>Monthly value of finalized contracts</CardDescription>
                            </div>
                            <Calendar className="w-5 h-5 text-gray-400" />
                        </div>
                    </CardHeader>
                    <CardContent className="p-8">
                        <div className="h-64 flex items-end justify-between gap-4">
                            {Object.entries(data.monthlyWon).map(([month, val]) => (
                                <div key={month} className="flex-1 flex flex-col items-center gap-4 group">
                                    <div className="relative w-full">
                                        <div 
                                            className="w-full bg-blue-600 rounded-t-xl transition-all duration-1000 ease-out group-hover:bg-blue-500 shadow-lg shadow-blue-500/20"
                                            style={{ height: `${(val / maxRevenue) * 100}%` }}
                                        >
                                            <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] font-bold py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                                {formatter.format(val)}
                                            </div>
                                        </div>
                                    </div>
                                    <span className="text-xs font-bold text-gray-500 uppercase tracking-tighter">{month}</span>
                                </div>
                            ))}
                            {Object.entries(data.monthlyWon).length === 0 && (
                                <div className="w-full h-full flex items-center justify-center text-gray-400 italic">
                                    No finalized quotes recorded yet
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Team Leaderboard */}
                <Card className="border-none shadow-xl shadow-gray-200/50 rounded-3xl overflow-hidden">
                    <CardHeader className="bg-white border-b border-gray-100 p-6">
                        <div className="flex justify-between items-center">
                            <div>
                                <CardTitle className="text-xl font-bold text-gray-900">Top Estimators</CardTitle>
                                <CardDescription>Performance by revenue</CardDescription>
                            </div>
                            <Trophy className="w-5 h-5 text-amber-500" />
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y divide-gray-50">
                            {estimatorArray.map((est, i) => (
                                <div key={est.name} className="p-5 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold",
                                            i === 0 ? "bg-amber-100 text-amber-600" : "bg-gray-100 text-gray-500"
                                        )}>
                                            #{i + 1}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-900">{est.name}</p>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{est.won} Won / {est.sent} Sent</p>
                                        </div>
                                    </div>
                                    <p className="text-sm font-extrabold text-blue-600">{formatter.format(est.value)}</p>
                                </div>
                            ))}
                            {estimatorArray.length === 0 && (
                                <div className="p-12 text-center text-gray-400 italic">
                                    No data available
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Secondary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8">
                <Card className="border-none shadow-lg shadow-gray-200/40 rounded-3xl p-6 flex flex-col items-center text-center">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center mb-4">
                        <Briefcase className="w-6 h-6 text-blue-600" />
                    </div>
                    <h3 className="text-gray-900 font-bold mb-1">Pipeline Volume</h3>
                    <p className="text-3xl font-black text-gray-900">{data.total}</p>
                    <p className="text-xs text-gray-500 font-medium">Total registered quotes</p>
                </Card>
                <Card className="border-none shadow-lg shadow-gray-200/40 rounded-3xl p-6 flex flex-col items-center text-center">
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center mb-4">
                        <TrendingUp className="w-6 h-6 text-amber-600" />
                    </div>
                    <h3 className="text-gray-900 font-bold mb-1">Avg. Quote Value</h3>
                    <p className="text-3xl font-black text-gray-900">
                        {data.won > 0 ? formatter.format(data.totalValueWon / data.won) : '$0'}
                    </p>
                    <p className="text-xs text-gray-500 font-medium">Based on won deals</p>
                </Card>
                <Card className="border-none shadow-lg shadow-gray-200/40 rounded-3xl p-6 flex flex-col items-center text-center">
                    <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
                        <XCircle className="w-6 h-6 text-red-600" />
                    </div>
                    <h3 className="text-gray-900 font-bold mb-1">Draft Quotes</h3>
                    <p className="text-3xl font-black text-gray-900">{data.draft}</p>
                    <p className="text-xs text-gray-500 font-medium">In-progress work</p>
                </Card>
            </div>
        </div>
    );
}

function MetricCard({ title, value, subvalue, icon, trend, trendUp }: any) {
    return (
        <Card className="border-none shadow-xl shadow-gray-200/50 rounded-3xl overflow-hidden group hover:scale-[1.02] transition-transform">
            <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center group-hover:bg-white transition-colors">
                        {icon}
                    </div>
                    {trend && (
                        <div className={cn(
                            "flex items-center text-[10px] font-bold px-2 py-1 rounded-full",
                            trendUp ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
                        )}>
                            {trendUp ? <ArrowUpRight className="w-3 h-3 mr-0.5" /> : <ArrowDownRight className="w-3 h-3 mr-0.5" />}
                            {trend}
                        </div>
                    )}
                </div>
                <h3 className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-1">{title}</h3>
                <p className="text-3xl font-black text-gray-900 mb-1">{value}</p>
                <p className="text-xs text-gray-400 font-bold tracking-tight">{subvalue}</p>
            </CardContent>
        </Card>
    );
}

function XCircle(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <circle cx="12" cy="12" r="10" />
            <path d="m15 9-6 6" />
            <path d="m9 9 6 6" />
        </svg>
    )
}
