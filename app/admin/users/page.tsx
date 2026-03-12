'use client';

import { useState, useEffect } from 'react';
import { 
    Plus, 
    Search, 
    MoreVertical, 
    UserPlus, 
    Mail, 
    Shield, 
    Calendar,
    Settings2,
    CheckCircle2,
    XCircle,
    Loader2,
    RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import UserForm from './components/UserForm';

interface User {
    id: string;
    name: string | null;
    email: string;
    role: {
        id: string;
        name: string;
    };
    status: 'ACTIVE' | 'DISABLED';
    createdAt: string;
    lastLogin: string | null;
}

export default function UserManagementPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);

    const fetchUsers = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/admin/users');
            if (!res.ok) throw new Error('Failed to fetch users');
            const data = await res.json();
            setUsers(data);
        } catch (error) {
            toast.error('Could not load users');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const toggleUserStatus = async (user: User) => {
        const newStatus = user.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
        try {
            const res = await fetch(`/api/admin/users/${user.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
            });
            if (!res.ok) throw new Error('Failed to update status');
            
            toast.success(`User ${newStatus === 'ACTIVE' ? 'enabled' : 'disabled'} successfully`);
            fetchUsers();
        } catch (error) {
            toast.error('Failed to update user status');
        }
    };

    const handleEdit = (user: User) => {
        setEditingUser(user);
        setIsFormOpen(true);
    };

    const handleAdd = () => {
        setEditingUser(null);
        setIsFormOpen(true);
    };

    const filteredUsers = users.filter(user => 
        user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getInitials = (name: string | null, email: string) => {
        if (!name) return email[0].toUpperCase();
        return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-500">
            {/* Header section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">User Management</h1>
                    <p className="text-gray-500 mt-1">Manage team members, roles and access permissions.</p>
                </div>
                <Button 
                    onClick={handleAdd}
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-5 py-6 h-auto shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                    <Plus className="w-5 h-5 mr-2" />
                    Add New User
                </Button>
            </div>

            {/* Stats section */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-sm font-medium text-gray-500 mb-1">Total Users</p>
                    <p className="text-2xl font-bold text-gray-900">{users.length}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-sm font-medium text-green-600 mb-1">Active</p>
                    <p className="text-2xl font-bold text-gray-900">{users.filter(u => u.status === 'ACTIVE').length}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-sm font-medium text-red-600 mb-1">Disabled</p>
                    <p className="text-2xl font-bold text-gray-900">{users.filter(u => u.status === 'DISABLED').length}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-sm font-medium text-blue-600 mb-1">Admins</p>
                    <p className="text-2xl font-bold text-gray-900">{users.filter(u => u.role.name === 'ADMIN').length}</p>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="bg-white rounded-3xl border border-gray-200 shadow-xl shadow-gray-200/50 overflow-hidden">
                {/* Table Toolbar */}
                <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search users..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-white border border-gray-200 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={fetchUsers} 
                            disabled={isLoading}
                            className="rounded-xl border-gray-200 text-gray-600"
                        >
                            <RefreshCw className={cn("w-4 h-4 mr-2", isLoading && "animate-spin")} />
                            Refresh
                        </Button>
                    </div>
                </div>

                {/* Table Container */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50/50 border-b border-gray-100">
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">User Info</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Role</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Status</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Joined Date</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {isLoading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={5} className="px-6 py-4">
                                            <div className="h-10 bg-gray-100 rounded-lg"></div>
                                        </td>
                                    </tr>
                                ))
                            ) : filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-2">
                                                <Search className="w-6 h-6 text-gray-400" />
                                            </div>
                                            <p className="text-gray-500 font-medium">No users found</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredUsers.map((user) => (
                                    <tr key={user.id} className="hover:bg-gray-50/80 transition-colors group">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs ring-0 group-hover:ring-4 group-hover:ring-blue-100 transition-all">
                                                    {getInitials(user.name, user.email)}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                                                        {user.name || 'Anonymous User'}
                                                    </span>
                                                    <span className="text-xs text-gray-500 flex items-center gap-1">
                                                        <Mail className="w-3 h-3" />
                                                        {user.email}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className={cn(
                                                "inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider",
                                                user.role.name === 'ADMIN' 
                                                    ? "bg-purple-100 text-purple-700 border border-purple-200"
                                                    : user.role.name === 'ESTIMATOR'
                                                    ? "bg-blue-100 text-blue-700 border border-blue-200"
                                                    : "bg-gray-100 text-gray-600 border border-gray-200"
                                            )}>
                                                <Shield className="w-3 h-3 mr-1" />
                                                {user.role.name}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className={cn(
                                                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold",
                                                user.status === 'ACTIVE'
                                                    ? "text-green-700 bg-green-50"
                                                    : "text-red-700 bg-red-50"
                                            )}>
                                                {user.status === 'ACTIVE' ? (
                                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                                ) : (
                                                    <XCircle className="w-3.5 h-3.5" />
                                                )}
                                                {user.status}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                                                <Calendar className="w-3.5 h-3.5" />
                                                {format(new Date(user.createdAt), 'MMM d, yyyy')}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg hover:bg-white hover:shadow-md border border-transparent hover:border-gray-100">
                                                        <MoreVertical className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-48 shadow-xl border-gray-100">
                                                    <DropdownMenuLabel className="text-xs text-gray-400">Actions</DropdownMenuLabel>
                                                    <DropdownMenuItem onClick={() => handleEdit(user)} className="cursor-pointer">
                                                        <Settings2 className="w-4 h-4 mr-2 text-gray-400" />
                                                        Edit Profile
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => toggleUserStatus(user)} className="cursor-pointer">
                                                        {user.status === 'ACTIVE' ? (
                                                            <>
                                                                <XCircle className="w-4 h-4 mr-2 text-red-400" />
                                                                <span className="text-red-600">Disable Account</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <CheckCircle2 className="w-4 h-4 mr-2 text-green-400" />
                                                                <span className="text-green-600">Enable Account</span>
                                                            </>
                                                        )}
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Components */}
            {isFormOpen && (
                <UserForm 
                    user={editingUser} 
                    isOpen={isFormOpen} 
                    onClose={() => {
                        setIsFormOpen(false);
                        setEditingUser(null);
                    }}
                    onSuccess={() => {
                        setIsFormOpen(false);
                        setEditingUser(null);
                        fetchUsers();
                    }}
                />
            )}
        </div>
    );
}
