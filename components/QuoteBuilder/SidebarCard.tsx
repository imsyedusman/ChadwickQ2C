import { ReactNode } from 'react';

interface SidebarCardProps {
    title: string;
    children: ReactNode;
    className?: string; // Allow extra styling if needed
}

export default function SidebarCard({ title, children, className = '' }: SidebarCardProps) {
    return (
        <div className={`bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden ${className}`}>
            <div className="bg-gray-50 px-3 py-2 border-b border-gray-100">
                <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">{title}</h3>
            </div>
            <div className="p-3">
                {children}
            </div>
        </div>
    );
}
