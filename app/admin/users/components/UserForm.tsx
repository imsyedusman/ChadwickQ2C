'use client';

import { useState, useEffect } from 'react';
import { 
    X, 
    Mail, 
    User, 
    Lock, 
    Shield, 
    Loader2,
    AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface Role {
    id: string;
    name: string;
}

interface UserFormProps {
    user: any | null;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function UserForm({ user, isOpen, onClose, onSuccess }: UserFormProps) {
    const [roles, setRoles] = useState<Role[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isFetchingRoles, setIsFetchingRoles] = useState(true);
    
    const [formData, setFormData] = useState({
        name: user?.name || '',
        email: user?.email || '',
        password: '',
        roleId: user?.role?.id || '',
    });

    useEffect(() => {
        const fetchRoles = async () => {
            try {
                const res = await fetch('/api/admin/roles');
                if (!res.ok) throw new Error('Failed to fetch roles');
                const data = await res.json();
                setRoles(data);
                
                // Set default role if creating new user
                if (!user && data.length > 0) {
                    setFormData(prev => ({ ...prev, roleId: data.find((r: Role) => r.name === 'ESTIMATOR')?.id || data[0].id }));
                }
            } catch (error) {
                toast.error('Could not load roles');
            } finally {
                setIsFetchingRoles(false);
            }
        };

        fetchRoles();
    }, [user]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const endpoint = user ? `/api/admin/users/${user.id}` : '/api/admin/users';
            const method = user ? 'PATCH' : 'POST';
            
            const payload = { ...formData };
            if (user && !payload.password) {
                delete (payload as any).password;
            }

            // Client-side domain validation for NEW users
            if (!user && !payload.email.toLowerCase().endsWith('@chadwickswitchboards.com.au')) {
                throw new Error('User accounts must use a @chadwickswitchboards.com.au email address.');
            }

            const res = await fetch(endpoint, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Something went wrong');
            }

            toast.success(user ? 'User updated successfully' : 'User created successfully');
            onSuccess();
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden border-none rounded-3xl shadow-2xl">
                <div className="bg-blue-600 p-8 text-white relative">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                            {user ? <User className="w-6 h-6" /> : <PlusCircle className="w-6 h-6" />}
                            {user ? 'Edit User Profile' : 'Register New User'}
                        </DialogTitle>
                        <DialogDescription className="text-blue-100 mt-1">
                            {user 
                                ? "Update account details and permissions." 
                                : "Create a new team member account for the system."}
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6 bg-white">
                    <div className="space-y-4">
                        {/* Name Field */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Full Name</label>
                            <div className="relative group">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-2.5 pl-11 pr-4 text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium"
                                    placeholder="e.g. John Doe"
                                />
                            </div>
                        </div>

                        {/* Email Field */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Email Address</label>
                            <div className="relative group">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                                <input
                                    type="email"
                                    required
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-2.5 pl-11 pr-4 text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium"
                                    placeholder="john.doe@chadwickswitchboards.com.au"
                                />
                            </div>
                            <p className="text-[10px] text-gray-400 mt-1 ml-1 font-medium italic">
                                Domain restricted to @chadwickswitchboards.com.au
                            </p>
                        </div>

                        {/* Role Field */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">System Role</label>
                            <div className="relative group">
                                <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-600 transition-colors pointer-events-none" />
                                <select
                                    required
                                    disabled={isFetchingRoles}
                                    value={formData.roleId}
                                    onChange={(e) => setFormData({ ...formData, roleId: e.target.value })}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-2.5 pl-11 pr-4 text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium appearance-none cursor-pointer"
                                >
                                    {isFetchingRoles ? (
                                        <option>Loading roles...</option>
                                    ) : (
                                        roles.map(role => (
                                            <option key={role.id} value={role.id}>{role.name}</option>
                                        ))
                                    )}
                                </select>
                            </div>
                        </div>

                        {/* Password Field */}
                        <div className="space-y-1.5">
                            <div className="flex justify-between items-center ml-1">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                    {user ? 'Reset Password' : 'Account Password'}
                                </label>
                                {user && (
                                    <span className="text-[10px] text-gray-400 italic font-medium">Leave blank to keep current</span>
                                )}
                            </div>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                                <input
                                    type="password"
                                    required={!user}
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-2.5 pl-11 pr-4 text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium"
                                    placeholder={user ? "••••••••" : "Min 8 characters"}
                                />
                            </div>
                        </div>
                    </div>

                    {user && user.role.name === 'ADMIN' && (
                        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100 flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-amber-700 font-medium">
                                You are editing an Administrator account. Ensure all changes are authorized.
                            </p>
                        </div>
                    )}

                    <div className="flex gap-3 pt-2">
                        <Button 
                            type="button" 
                            variant="secondary" 
                            onClick={onClose}
                            className="flex-1 rounded-2xl py-6 h-auto font-bold bg-gray-100 hover:bg-gray-200 text-gray-700 border-none"
                        >
                            Cancel
                        </Button>
                        <Button 
                            type="submit" 
                            disabled={isLoading || isFetchingRoles}
                            className="flex-2 rounded-2xl py-6 h-auto font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 border-none"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                user ? 'Save Changes' : 'Create Account'
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function PlusCircle(props: any) {
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
            <path d="M8 12h8" />
            <path d="M12 8v8" />
        </svg>
    )
}
