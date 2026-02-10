'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export default function Navbar() {
    const pathname = usePathname();

    const isQuotePage = pathname?.startsWith('/quote');

    // Check if we are in the settings section
    const isSettings = pathname?.startsWith('/settings');
    // Dashboard is active if we are at root or not in settings (and not in other future top-level pages if added)
    const isDashboard = pathname === '/' || (!isSettings && !isQuotePage);

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
                            </div>
                        )}
                    </div>

                    <div className="flex items-center">
                        <div className="flex-shrink-0">
                            <div className={cn(
                                "rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600 transition-all",
                                isQuotePage ? "h-6 w-6" : "h-8 w-8"
                            )}>
                                JD
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </nav>
    );
}
