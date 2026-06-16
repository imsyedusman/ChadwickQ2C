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
import { LogOut, User, Shield, ChevronDown, FileText, Briefcase, Settings, Menu, X, Search } from 'lucide-react';
import { useState } from 'react';

export default function Navbar() {
    const pathname = usePathname();
    const { data: session } = useSession();
    const user = session?.user as any;
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const isQuotePage = pathname?.startsWith('/quote');
    const isSettings = pathname?.startsWith('/settings');
    const isProjects = pathname?.startsWith('/projects');
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

    if (pathname === '/login' || pathname?.startsWith('/shared-quote/')) {
        return null;
    }

    return (
        <nav className={cn(
            "bg-white border-b border-gray-200 sticky top-0 z-50 transition-all duration-300",
            isQuotePage ? "h-10" : "h-16"
        )}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full">
                <div className="flex justify-between items-center h-full">
                    <div className="flex items-center gap-2 sm:gap-4">
                        <Link href="/" className="flex-shrink-0 flex items-center gap-2">
                            <Image
                                src="/chadwick-logo.svg"
                                alt="Chadwick Logo"
                                width={120}
                                height={40}
                                className={cn("w-auto transition-all", isQuotePage ? "h-6" : "h-8")}
                                priority
                                suppressHydrationWarning
                            />
                            {!isQuotePage && <span className="font-bold text-lg sm:text-xl text-gray-900 tracking-tight">Q2C</span>}
                        </Link>

                        {/* Desktop Nav - Hidden on Quote Pages */}
                        {!isQuotePage && (
                            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                                <Link
                                    href="/"
                                    className={cn(
                                        "inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors h-16 gap-2",
                                        isDashboard
                                            ? "border-blue-500 text-gray-900"
                                            : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                                    )}
                                >
                                    <FileText size={18} />
                                    Quotes
                                </Link>
                                <Link
                                    href="/projects"
                                    className={cn(
                                        "inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors h-16 gap-2",
                                        isProjects
                                            ? "border-blue-500 text-gray-900"
                                            : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                                    )}
                                >
                                    <Briefcase size={18} />
                                    Projects
                                </Link>
                                <Link
                                    href="/settings"
                                    className={cn(
                                        "inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors h-16 gap-2",
                                        isSettings
                                            ? "border-blue-500 text-gray-900"
                                            : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                                    )}
                                >
                                    <Settings size={18} />
                                    Settings
                                </Link>
                                {user?.role === 'ADMIN' && (
                                    <Link
                                        href="/admin"
                                        className={cn(
                                            "inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors h-16 gap-2",
                                            isAdmin
                                                ? "border-blue-500 text-gray-900"
                                                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                                        )}
                                    >
                                        <Shield size={18} />
                                        Admin
                                    </Link>
                                )}
                            </div>
                        )}

                        {/* Compact Nav - Inline Links for Quote Pages (Desktop) */}
                        {isQuotePage && (
                            <div className="hidden sm:flex items-center gap-4 ml-6 border-l border-gray-200 pl-6 h-4">
                                <Link
                                    href="/"
                                    className="flex items-center gap-1 text-xs font-medium text-gray-400 hover:text-gray-900 transition-colors"
                                >
                                    <FileText size={12} />
                                    Quotes
                                </Link>
                                <Link
                                    href="/projects"
                                    className="flex items-center gap-1 text-xs font-medium text-gray-400 hover:text-gray-900 transition-colors"
                                >
                                    <Briefcase size={12} />
                                    Projects
                                </Link>
                                <Link
                                    href="/settings"
                                    className="flex items-center gap-1 text-xs font-medium text-gray-400 hover:text-gray-900 transition-colors"
                                >
                                    <Settings size={12} />
                                    Settings
                                </Link>
                                {user?.role === 'ADMIN' && (
                                    <Link
                                        href="/admin"
                                        className="flex items-center gap-1 text-xs font-medium text-gray-400 hover:text-gray-900 transition-colors"
                                    >
                                        <Shield size={12} />
                                        Admin
                                    </Link>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Search Button */}
                        <button
                            onClick={() => window.dispatchEvent(new Event('open-command-palette'))}
                            className={cn(
                                "hidden sm:flex items-center gap-2 text-sm text-gray-500 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg px-3 transition-colors",
                                isQuotePage ? "h-6 py-1" : "h-9 py-1.5 mr-2"
                            )}
                        >
                            <Search size={14} className="text-gray-400" />
                            <span className="font-medium mr-4">Search...</span>
                            <kbd className="hidden md:inline-flex h-5 items-center gap-1 rounded border bg-white px-1.5 font-mono text-[10px] font-medium text-gray-500 opacity-100">
                                <span className="text-xs">⌘</span>K
                            </kbd>
                        </button>

                        <div className="flex-shrink-0">
                            {user && (
                                <DropdownMenu>
                                    <DropdownMenuTrigger className="focus:outline-none">
                                        <div className="flex items-center gap-2 group cursor-pointer">
                                            <div className={cn(
                                                "rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700 transition-all border border-blue-200 ring-0 group-hover:ring-2 group-hover:ring-blue-100",
                                                isQuotePage ? "h-6 w-6" : "h-9 w-9"
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
                                            {!isQuotePage && <ChevronDown className="h-4 w-4 text-gray-400 transition-transform group-hover:text-gray-600 hidden sm:block" />}
                                        </div>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-56 mt-2 shadow-xl border-gray-100 rounded-2xl">
                                        <DropdownMenuLabel className="font-normal">
                                            <div className="flex flex-col space-y-1">
                                                <p className="text-sm font-semibold leading-none">{user.name}</p>
                                                <p className="text-xs leading-none text-gray-500">{user.email}</p>
                                            </div>
                                        </DropdownMenuLabel>
                                        <DropdownMenuSeparator />
                                        <Link href="/profile">
                                            <DropdownMenuItem className="cursor-pointer rounded-lg py-2">
                                                <User className="mr-2 h-4 w-4 text-gray-500" />
                                                <span>Profile Settings</span>
                                            </DropdownMenuItem>
                                        </Link>
                                        {user.role === 'ADMIN' && (
                                            <Link href="/admin">
                                                <DropdownMenuItem className="cursor-pointer rounded-lg py-2">
                                                    <Shield className="mr-2 h-4 w-4 text-gray-500" />
                                                    <span>Admin Panel</span>
                                                </DropdownMenuItem>
                                            </Link>
                                        )}
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                            className="text-red-600 cursor-pointer focus:text-red-600 focus:bg-red-50 rounded-lg py-2"
                                            onClick={() => signOut({ callbackUrl: '/login' })}
                                        >
                                            <LogOut className="mr-2 h-4 w-4" />
                                            <span>Log out</span>
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}
                        </div>

                        {/* Mobile Menu Button */}
                        {!isQuotePage && (
                            <button
                                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                                className="sm:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors ml-1"
                            >
                                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Mobile Navigation Drawer */}
            {isMobileMenuOpen && !isQuotePage && (
                <div className="sm:hidden absolute top-16 left-0 right-0 bg-white border-b border-gray-200 shadow-xl z-50 animate-in slide-in-from-top-4 duration-200">
                    <div className="px-4 py-6 space-y-3">
                        <Link
                            href="/"
                            onClick={() => setIsMobileMenuOpen(false)}
                            className={cn(
                                "flex items-center gap-4 px-4 py-3 rounded-xl font-bold transition-all",
                                isDashboard ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-50"
                            )}
                        >
                            <FileText size={20} />
                            Quotes
                        </Link>
                        <Link
                            href="/projects"
                            onClick={() => setIsMobileMenuOpen(false)}
                            className={cn(
                                "flex items-center gap-4 px-4 py-3 rounded-xl font-bold transition-all",
                                isProjects ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-50"
                            )}
                        >
                            <Briefcase size={20} />
                            Projects
                        </Link>
                        <Link
                            href="/settings"
                            onClick={() => setIsMobileMenuOpen(false)}
                            className={cn(
                                "flex items-center gap-4 px-4 py-3 rounded-xl font-bold transition-all",
                                isSettings ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-50"
                            )}
                        >
                            <Settings size={20} />
                            Settings
                        </Link>
                        {user?.role === 'ADMIN' && (
                            <Link
                                href="/admin"
                                onClick={() => setIsMobileMenuOpen(false)}
                                className={cn(
                                    "flex items-center gap-4 px-4 py-3 rounded-xl font-bold transition-all",
                                    isAdmin ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-50"
                                )}
                            >
                                <Shield size={20} />
                                Admin Panel
                            </Link>
                        )}
                    </div>
                </div>
            )}
        </nav>
    );
}
