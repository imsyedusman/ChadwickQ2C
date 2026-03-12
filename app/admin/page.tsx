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
    FileText,
    DollarSign
} from 'lucide-react';
import { cn } from '@/lib/utils';

const ADMIN_SECTIONS = [
    {
        title: 'Security & Permissions',
        tools: [
            {
                title: 'User Management',
                description: 'Create, edit, and manage system users and their access roles.',
                href: '/admin/users',
                icon: <Users className="w-6 h-6 text-blue-600" />,
                color: 'bg-blue-50',
            },
            {
                title: 'Permissions Matrix',
                description: 'Review role-based permissions and module access for all system roles.',
                href: '/admin/permissions',
                icon: <ShieldCheck className="w-6 h-6 text-green-600" />,
                color: 'bg-green-50',
            }
        ]
    },
    {
        title: 'Catalog Configuration',
        tools: [
            {
                title: 'Catalog Basics',
                description: 'Manage internal pricing for basic components and hardware.',
                href: '/admin/basics',
                icon: <Database className="w-6 h-6 text-blue-600" />,
                color: 'bg-blue-50',
            },
            {
                title: 'External Catalogs',
                description: 'Upload and manage supplier pricelists (Schneider, etc.).',
                href: '/admin/catalog',
                icon: <ClipboardList className="w-6 h-6 text-cyan-600" />,
                color: 'bg-cyan-50',
            },
            {
                title: 'Busbar Config',
                description: 'Configure copper weights and labour formulas.',
                href: '/admin/busbars',
                icon: <Settings className="w-6 h-6 text-indigo-600" />,
                color: 'bg-indigo-50',
            }
        ]
    },
    {
        title: 'System Administration',
        tools: [
            {
                title: 'Costing Defaults',
                description: 'Set global profit margins, labour rates, and overheads.',
                href: '/admin/costing',
                icon: <DollarSign className="w-6 h-6 text-emerald-600" />,
                color: 'bg-emerald-50',
            },
            {
                title: 'Audit Logs',
                description: 'Monitor all system activity, including logins and data changes.',
                href: '/admin/audit',
                icon: <ClipboardList className="w-6 h-6 text-amber-600" />,
                color: 'bg-amber-50',
            }
        ]
    },
    {
        title: 'Analytics & Monitoring',
        tools: [
            {
                title: 'Performance Analytics',
                description: 'View real-time statistics on quotes and pipeline value.',
                href: '/admin/analytics',
                icon: <BarChart3 className="w-6 h-6 text-purple-600" />,
                color: 'bg-purple-50',
            }
        ]
    },
    {
        title: 'Export Templates',
        tools: [
            {
                title: 'Tender Templates',
                description: 'Manage DOCX templates for tender generation.',
                href: '/admin/templates',
                icon: <FileText className="w-6 h-6 text-rose-600" />,
                color: 'bg-rose-50',
            }
        ]
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

                <div className="space-y-12">
                    {ADMIN_SECTIONS.map((section) => (
                        <div key={section.title}>
                            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
                                <span className="h-px bg-slate-200 flex-1" />
                                {section.title}
                                <span className="h-px bg-slate-200 flex-1" />
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {section.tools.map((tool) => (
                                    <Link 
                                        key={tool.title} 
                                        href={tool.href}
                                        className="group block"
                                    >
                                        <div className="h-full bg-white rounded-3xl p-6 border border-slate-200 shadow-sm hover:shadow-xl hover:border-blue-200 transition-all duration-300 relative overflow-hidden">
                                            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-5 transition-transform group-hover:scale-110 duration-300", tool.color)}>
                                                {tool.icon}
                                            </div>
                                            
                                            <h3 className="text-lg font-bold text-slate-900 mb-2">{tool.title}</h3>
                                            <p className="text-xs text-slate-500 leading-relaxed mb-6">
                                                {tool.description}
                                            </p>
                                            
                                            <div className="flex items-center text-blue-600 font-bold text-xs group-hover:translate-x-1 transition-transform uppercase tracking-wider">
                                                Open Module
                                                <ArrowRight className="ml-2 w-3 h-3" />
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
