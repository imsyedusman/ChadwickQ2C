'use client';

import CatalogManager from '@/components/Admin/CatalogManager';

export default function ManageBasicsPage() {
    return (
        <div className="min-h-screen bg-[#f9fafb] p-8">
            <div className="max-w-7xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Manage Basic Items</h1>
                    <p className="text-gray-500">Edit, update, and manage your internal Basic items catalog. These are separate from external supplier pricelists.</p>
                </div>

                <CatalogManager
                    category="Basics"
                    title="Basic Items Catalog"
                    description="Manage core system items like Tiers, Base, Hardware, etc."
                />
            </div>
        </div>
    );
}
