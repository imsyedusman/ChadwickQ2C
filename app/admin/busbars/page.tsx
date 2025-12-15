'use client';

import CatalogManager from '@/components/Admin/CatalogManager';

export default function ManageBusbarsPage() {
    return (
        <div className="min-h-screen bg-[#f9fafb] p-8">
            <div className="max-w-7xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Manage Busbar Items</h1>
                    <p className="text-gray-500">Edit and manage busbar components, copper, and labour rates.</p>
                </div>

                <CatalogManager
                    category="Busbar"
                    title="Busbar Catalog"
                    description="Manage busbar part numbers, copper pricing, and standard labour hours."
                />
            </div>
        </div>
    );
}
