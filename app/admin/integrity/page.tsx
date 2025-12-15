'use client';

import IntegrityReport from '@/components/Admin/IntegrityReport';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';

export default function IntegrityPage() {
    return (
        <div className="min-h-screen bg-[#f9fafb] p-8">
            <div className="max-w-7xl mx-auto">
                <div className="mb-6 flex items-center gap-4">
                    <Link href="/settings" className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors">
                        <ChevronLeft size={20} />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-1">Catalog Integrity</h1>
                        <p className="text-gray-500 text-sm">Run health checks on your catalog data.</p>
                    </div>
                </div>

                <div className="max-w-4xl">
                    <IntegrityReport />
                </div>
            </div>
        </div>
    );
}
