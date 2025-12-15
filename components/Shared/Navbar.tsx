'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export default function Navbar() {
    const pathname = usePathname();

    // Check if we are in the settings section
    const isSettings = pathname?.startsWith('/settings');
    // Dashboard is active if we are at root or not in settings (and not in other future top-level pages if added)
    const isDashboard = pathname === '/' || pathname?.startsWith('/quote') || (!isSettings && pathname !== '/');

    return (
        <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    <div className="flex">
                        <Link href="/" className="flex-shrink-0 flex items-center gap-3">
                            <Image
                                src="/chadwick-logo.svg"
                                alt="Chadwick Logo"
                                width={120}
                                height={40}
                                className="h-10 w-auto"
                                suppressHydrationWarning
                            />
                            <span className="font-bold text-xl text-gray-900 tracking-tight">Q2C</span>
                        </Link>
                        <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                            <Link
                                href="/"
                                className={cn(
                                    "inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors",
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
                                    "inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors",
                                    isSettings
                                        ? "border-blue-500 text-gray-900"
                                        : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                                )}
                            >
                                Settings
                            </Link>
                        </div>
                    </div>
                    <div className="flex items-center">
                        <div className="flex-shrink-0">
                            <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-600">
                                JD
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </nav>
    );
}
