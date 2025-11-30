'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import BackupManager from '@/components/Admin/BackupManager';

export default function BackupPage() {
    return (
        <div className="min-h-screen bg-[#f9fafb] p-8">
            <div className="max-w-5xl mx-auto">
                <div className="mb-6">
                    <Link
                        href="/settings"
                        className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors mb-4"
                    >
                        <ArrowLeft size={16} />
                        Back to Settings
                    </Link>
                    <h1 className="text-3xl font-bold text-gray-900">Backup & Restore</h1>
                    <p className="text-gray-600 mt-2">
                        Manage full system backups for Catalog and Quotes data.
                    </p>
                </div>

                <BackupManager />
            </div>
        </div>
    );
}
