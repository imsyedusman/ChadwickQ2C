'use client';

import PipedriveImporter from '@/components/Admin/PipedriveImporter';
import Link from 'next/link';
import { ChevronLeft, Briefcase } from 'lucide-react';

export default function PipedriveImportPage() {
    return (
        <div className="min-h-screen bg-[#f8fafc]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Breadcrumbs */}
                <nav className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest mb-8">
                    <Link href="/admin" className="hover:text-blue-600 transition-colors flex items-center gap-1">
                        <ChevronLeft className="w-3 h-3" />
                        Admin Dashboard
                    </Link>
                    <span>/</span>
                    <span className="text-slate-600">Pipedrive Integration</span>
                </nav>

                {/* Page Content */}
                <PipedriveImporter />
            </div>
        </div>
    );
}
