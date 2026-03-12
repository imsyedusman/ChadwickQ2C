'use client';

import { useState, useEffect } from 'react';
import { 
    Shield, 
    Check, 
    X, 
    Info, 
    Lock,
    Users,
    Key,
    ChevronRight,
    Loader2,
    Settings
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';

interface PermissionRecord {
    id: string;
    action: string;
}

interface RoleRecord {
    id: string;
    name: string;
    description: string | null;
    permissions: PermissionRecord[];
}

interface PermissionsData {
    roles: RoleRecord[];
    categories: Record<string, string[]>;
}

export default function PermissionsPage() {
    const [data, setData] = useState<PermissionsData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchPermissions = async () => {
            try {
                const res = await fetch('/api/admin/permissions');
                if (!res.ok) throw new Error('Failed to fetch permissions');
                const result = await res.json();
                setData(result);
            } catch (error) {
                toast.error('Failed to load permissions matrix');
            } finally {
                setIsLoading(false);
            }
        };

        fetchPermissions();
    }, []);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
                <p className="text-gray-500 font-medium animate-pulse">Mapping security protocols...</p>
            </div>
        );
    }

    if (!data) return null;

    const hasPermission = (role: RoleRecord, action: string) => {
        return role.permissions.some(p => p.action === action);
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-700">
            {/* Header section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Permissions Matrix</h1>
                    <p className="text-gray-500 mt-1">Overview of role-based access control and system permissions.</p>
                </div>
                <div className="flex items-center gap-2 p-1.5 bg-blue-50 border border-blue-100 rounded-2xl">
                    <div className="px-4 py-2 bg-white rounded-xl shadow-sm border border-blue-100 flex items-center gap-2">
                        <Lock className="w-4 h-4 text-blue-600" />
                        <span className="text-xs font-bold text-gray-900 uppercase tracking-widest">Read-Only View</span>
                    </div>
                </div>
            </div>

            {/* Matrix Table */}
            <div className="bg-white rounded-[2rem] border border-gray-100 shadow-2xl shadow-gray-200/40 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50">
                                <th className="px-8 py-8 w-64 border-b border-r border-gray-100">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-xl bg-blue-600 text-white">
                                            <Shield className="w-5 h-5" />
                                        </div>
                                        <span className="text-sm font-black text-gray-900 uppercase tracking-widest">Modules</span>
                                    </div>
                                </th>
                                {data.roles.map((role) => (
                                    <th key={role.id} className="px-8 py-8 border-b border-gray-100 text-center">
                                        <div className="flex flex-col items-center gap-2">
                                            <span className={cn(
                                                "text-xs font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full",
                                                role.name === 'ADMIN' ? "bg-purple-100 text-purple-700" : 
                                                role.name === 'ESTIMATOR' ? "bg-blue-100 text-blue-700" : 
                                                "bg-gray-100 text-gray-500"
                                            )}>
                                                {role.name}
                                            </span>
                                            <p className="text-[10px] text-gray-400 font-medium max-w-[120px] line-clamp-2">
                                                {role.description || `Access for ${role.name.toLowerCase()} users.`}
                                            </p>
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {Object.entries(data.categories).map(([category, actions], catIdx) => (
                                <>
                                    <tr key={category} className="bg-gray-50/30">
                                        <td colSpan={data.roles.length + 1} className="px-8 py-3 border-b border-gray-100">
                                            <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em] font-sans">
                                                {category}
                                            </span>
                                        </td>
                                    </tr>
                                    {actions.map((action, actionIdx) => (
                                        <tr key={action} className="group hover:bg-gray-50 transition-colors">
                                            <td className="px-8 py-4 border-r border-gray-100 group-last:border-b">
                                                <div className="flex items-center gap-2">
                                                    <ChevronRight className="w-3 h-3 text-gray-300 group-hover:text-blue-500 transition-colors" />
                                                    <span className="text-sm font-bold text-gray-700">{action.split(':').pop()?.replace(/_/g, ' ')}</span>
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger>
                                                                <Info className="w-3 h-3 text-gray-300 hover:text-gray-500 cursor-help" />
                                                            </TooltipTrigger>
                                                            <TooltipContent className="bg-gray-900 text-white border-none rounded-lg p-2 max-w-xs">
                                                                <p className="text-[10px] font-bold">System ID: {action}</p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                </div>
                                            </td>
                                            {data.roles.map((role) => (
                                                <td key={`${role.id}-${action}`} className="px-8 py-4 text-center group-last:border-b">
                                                    <div className="flex justify-center">
                                                        {hasPermission(role, action) ? (
                                                            <div className="h-8 w-8 rounded-full bg-green-50 flex items-center justify-center text-green-600 ring-4 ring-green-100/50 shadow-sm animate-in zoom-in duration-300">
                                                                <Check className="w-5 h-5 stroke-[3]" />
                                                            </div>
                                                        ) : (
                                                            <div className="h-8 w-8 rounded-full bg-red-50/50 flex items-center justify-center text-red-200/50 group-hover:bg-red-50 group-hover:text-red-300 transition-colors">
                                                                <X className="w-4 h-4" />
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Help / Notes section */}
            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="p-6 bg-white rounded-3xl border border-gray-100 shadow-lg shadow-gray-200/30 flex gap-4">
                    <div className="h-10 w-10 shrink-0 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
                        <Key className="w-5 h-5" />
                    </div>
                    <div>
                        <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-1">RBAC Model</h4>
                        <p className="text-xs text-gray-500 font-medium leading-relaxed">System follows Role-Based Access Control logic ensuring granular security across all endpoints.</p>
                    </div>
                </div>
                <div className="p-6 bg-white rounded-3xl border border-gray-100 shadow-lg shadow-gray-200/30 flex gap-4">
                    <div className="h-10 w-10 shrink-0 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600">
                        <Users className="w-5 h-5" />
                    </div>
                    <div>
                        <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-1">Immutable Roles</h4>
                        <p className="text-xs text-gray-500 font-medium leading-relaxed">Standard roles are currently locked. Custom role definition will be available in the next platform release.</p>
                    </div>
                </div>
                <div className="p-6 bg-white rounded-3xl border border-gray-100 shadow-lg shadow-gray-200/30 flex gap-4">
                    <div className="h-10 w-10 shrink-0 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600">
                        <Settings className="w-5 h-5" />
                    </div>
                    <div>
                        <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-1">Audit Policy</h4>
                        <p className="text-xs text-gray-500 font-medium leading-relaxed">Any attempt to bypass these restrictions is automatically flagged in the security audit logs.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
