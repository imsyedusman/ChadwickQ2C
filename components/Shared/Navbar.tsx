'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useSession, signOut } from 'next-auth/react';
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuLabel, 
    DropdownMenuSeparator, 
    DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { LogOut, User, Shield, ChevronDown } from 'lucide-react';

export default function Navbar() {
    const pathname = usePathname();
    const { data: session } = useSession();
    const user = session?.user as any;

    const isQuotePage = pathname?.startsWith('/quote');
    const isSettings = pathname?.startsWith('/settings');
    const isAdmin = pathname === '/admin' || pathname?.startsWith('/admin/');
    const isProfile = pathname === '/profile';
    
    // Dashboard is active if we are at root or not in other specific sections
    const isDashboard = pathname === '/' || (!isSettings && !isQuotePage && !isAdmin && !isProfile);

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);
    };

    return (
        <nav className={cn(
            "bg-white border-b border-gray-200 sticky top-0 z-50 transition-all duration-300",
            isQuotePage ? "h-10" : "h-16"
        )}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full">
                <div className="flex justify-between items-center h-full">
                    <div className="flex items-center gap-4">
                        <Link href="/" className="flex-shrink-0 flex items-center gap-2">
                            <Image
                                src="/chadwick-logo.svg"
                                alt="Chadwick Logo"
                                width={120}
                                height={40}
                                className={cn("w-auto transition-all", isQuotePage ? "h-6" : "h-8")}
                                suppressHydrationWarning
                            />
                            {!isQuotePage && <span className="font-bold text-xl text-gray-900 tracking-tight">Q2C</span>}
                        </Link>

                        {/* Desktop Nav - Hidden on Quote Pages */}
                        {!isQuotePage && (
                            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                                <Link
                                    href="/"
                                    className={cn(
                                        "inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors h-16",
                                        isDashboard
                                            ? "border-blue-500 text-gray-900"
                                            : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                                    )}
                                >
                                    Dashboard
                                </Link>
                                <Link
                                    href="/settings"
                                    className={cn(
                                        "inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors h-16",
                                        isSettings
                                            ? "border-blue-500 text-gray-900"
                                            : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                                    )}
                                >
                                    Settings
                                </Link>
                                {user?.role === 'ADMIN' && (
                                    <Link
                                        href="/admin"
                                        className={cn(
                                            "inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors h-16",
                                            isAdmin
                                                ? "border-blue-500 text-gray-900"
                                                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                                        )}
                                    >
                                        Admin
                                    </Link>
                                )}
                            </div>
                        )}

                        {/* Compact Nav - Inline Links for Quote Pages */}
                        {isQuotePage && (
                            <div className="flex items-center gap-4 ml-6 border-l border-gray-200 pl-6 h-4">
                                <Link
                                    href="/"
                                    className="text-xs font-medium text-gray-400 hover:text-gray-900 transition-colors"
                                >
                                    Dashboard
                                </Link>
                                <Link
                                    href="/settings"
                                    className="text-xs font-medium text-gray-400 hover:text-gray-900 transition-colors"
                                >
                                    Settings
                                </Link>
                                {user?.role === 'ADMIN' && (
                                    <Link
                                        href="/admin"
                                        className="text-xs font-medium text-gray-400 hover:text-gray-900 transition-colors"
                                    >
                                        Admin
                                    </Link>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="flex items-center">
                        <div className="flex-shrink-0">
                            {user && (
                                <DropdownMenu>
                                    <DropdownMenuTrigger className="focus:outline-none">
                                        <div className="flex items-center gap-2 group cursor-pointer">
                                            <div className={cn(
                                                "rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700 transition-all border border-blue-200 ring-0 group-hover:ring-2 group-hover:ring-blue-100",
                                                isQuotePage ? "h-7 w-7" : "h-9 w-9"
                                            )}>
                                                {getInitials(user.name || user.email || 'User')}
                                            </div>
                                            {!isQuotePage && (
                                                <div className="hidden md:flex flex-col items-start mr-1">
                                                    <span className="text-sm font-semibold text-gray-700 leading-none mb-0.5">
                                                        {user.name || 'User'}
                                                    </span>
                                                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded uppercase tracking-wider">
                                                        {user.role}
                                                    </span>
                                                </div>
                                            )}
                                            <ChevronDown className={cn("h-4 w-4 text-gray-400 transition-transform group-hover:text-gray-600", isQuotePage && "hidden")} />
                                        </div>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-56 mt-2 shadow-xl border-gray-100">
                                        <DropdownMenuLabel className="font-normal">
                                            <div className="flex flex-col space-y-1">
                                                <p className="text-sm font-semibold leading-none">{user.name}</p>
                                                <p className="text-xs leading-none text-gray-500">{user.email}</p>
                                            </div>
                                        </DropdownMenuLabel>
                                        <DropdownMenuSeparator />
                                        <Link href="/profile">
                                            <DropdownMenuItem className="cursor-pointer">
                                                <User className="mr-2 h-4 w-4 text-gray-500" />
                                                <span>Profile Settings</span>
                                            </DropdownMenuItem>
                                        </Link>
                                        {user.role === 'ADMIN' && (
                                            <Link href="/admin">
                                                <DropdownMenuItem className="cursor-pointer">
                                                    <Shield className="mr-2 h-4 w-4 text-gray-500" />
                                                    <span>Admin Panel</span>
                                                </DropdownMenuItem>
                                            </Link>
                                        )}
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem 
                                            className="text-red-600 cursor-pointer focus:text-red-600 focus:bg-red-50"
                                            onClick={() => signOut({ callbackUrl: '/login' })}
                                        >
                                            <LogOut className="mr-2 h-4 w-4" />
                                            <span>Log out</span>
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </nav>
    );
}
