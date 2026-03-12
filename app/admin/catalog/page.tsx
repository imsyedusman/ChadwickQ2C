'use client';

import CatalogManager from '@/components/Catalog/CatalogManager';
import { Database, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function AdminCatalogPage() {
    return (
        <div className="min-h-screen bg-[#f8fafc] py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <Link href="/admin" className="p-2 hover:bg-white rounded-full transition-colors">
                                <ArrowLeft className="w-5 h-5 text-slate-400" />
                            </Link>
                            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Catalog Management</h1>
                        </div>
                        <p className="text-slate-500">
                            Upload and manage supplier pricelists and external catalog data.
                        </p>
                    </div>
                </div>

                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-8">
                        <CatalogManager />
                    </div>
                </div>
            </div>
        </div>
    );
}
