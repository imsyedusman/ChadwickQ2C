'use client';

import Link from 'next/link';
import { 
    Users, 
    BarChart3, 
    ShieldCheck, 
    ClipboardList, 
    ArrowRight,
    Search,
    Settings,
    Database,
    FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';

const ADMIN_TOOLS = [
    {
        title: 'User Management',
        description: 'Create, edit, and manage system users and their access roles.',
        href: '/admin/users',
        icon: <Users className="w-6 h-6 text-blue-600" />,
        color: 'bg-blue-50',
    },
    {
        title: 'Performance Analytics',
        description: 'View real-time statistics on quotes, estimator performance, and pipeline value.',
        href: '/admin/analytics',
        icon: <BarChart3 className="w-6 h-6 text-purple-600" />,
        color: 'bg-purple-50',
    },
    {
        title: 'Audit Logs',
        description: 'Monitor all system activity, including logins, quote exports, and data changes.',
        href: '/admin/audit',
        icon: <ClipboardList className="w-6 h-6 text-amber-600" />,
        color: 'bg-amber-50',
    },
    {
        title: 'Permissions Matrix',
        description: 'Review role-based permissions and module access for all system roles.',
        href: '/admin/permissions',
        icon: <ShieldCheck className="w-6 h-6 text-green-600" />,
        color: 'bg-green-50',
    }
];

const SECONDARY_TOOLS = [
    {
        title: 'Catalog Basics',
        description: 'Manage internal pricing for basic components and hardware.',
        href: '/admin/basics',
        icon: <Database className="w-4 h-4" />
    },
    {
        title: 'Busbar Config',
        description: 'Configure copper weights and labour formulas.',
        href: '/admin/busbars',
        icon: <Settings className="w-4 h-4" />
    },
    {
        title: 'Export Templates',
        description: 'Manage DOCX templates for tender generation.',
        href: '/admin/templates',
        icon: <FileText className="w-4 h-4" />
    }
];

export default function AdminDashboard() {
    return (
        <div className="min-h-screen bg-[#f8fafc]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {/* Header */}
                <div className="mb-12">
                    <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-3">Admin Control Center</h1>
                    <p className="text-lg text-slate-600 max-w-2xl">
                        Centralized management for Chadwick Quoting System. Monitor performance, manage security, and streamline operations.
                    </p>
                </div>

                {/* Primary Tools Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                    {ADMIN_TOOLS.map((tool) => (
                        <Link 
                            key={tool.title} 
                            href={tool.href}
                            className="group block"
                        >
                            <div className="h-full bg-white rounded-3xl p-8 border border-slate-200 shadow-sm hover:shadow-xl hover:border-blue-200 transition-all duration-300 relative overflow-hidden">
                                {/* Accent Gradient */}
                                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-bl-full -mr-8 -mt-8" />
                                
                                <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110 duration-300", tool.color)}>
                                    {tool.icon}
                                </div>
                                
                                <h3 className="text-xl font-bold text-slate-900 mb-2">{tool.title}</h3>
                                <p className="text-sm text-slate-600 leading-relaxed mb-6">
                                    {tool.description}
                                </p>
                                
                                <div className="flex items-center text-blue-600 font-semibold text-sm group-hover:translate-x-1 transition-transform">
                                    Launch Module
                                    <ArrowRight className="ml-2 w-4 h-4" />
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>

                {/* Secondary Quick Access */}
                <div>
                    <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-6">System Management</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {SECONDARY_TOOLS.map((tool) => (
                            <Link 
                                key={tool.title} 
                                href={tool.href}
                                className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/30 transition-all"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="text-slate-400">
                                        {tool.icon}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-900">{tool.title}</p>
                                        <p className="text-xs text-slate-500">{tool.description}</p>
                                    </div>
                                </div>
                                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500" />
                            </Link>
                        ))}
                    </div>
                </div>

                {/* Search / Filter Overlay (Decorative for now) */}
                <div className="mt-12 p-8 bg-slate-900 rounded-3xl text-white overflow-hidden relative">
                    <div className="absolute top-0 right-0 opacity-10 -mr-20 -mt-20">
                        <Search size={300} strokeWidth={1} />
                    </div>
                    <div className="relative z-10">
                        <h2 className="text-2xl font-bold mb-2">Need a specific tool?</h2>
                        <p className="text-slate-400 mb-6 max-w-md">Search across all administrative modules and settings from a single command bar.</p>
                        <div className="flex gap-2">
                            <span className="px-3 py-1.5 bg-white/10 rounded-lg text-xs font-mono">⌘ + K</span>
                            <span className="text-xs text-slate-500 self-center">Coming soon in Phase 3</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
