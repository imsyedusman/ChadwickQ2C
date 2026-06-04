import React from 'react';
import { MoreHorizontal, FileText, RefreshCw } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface BoardMoreActionsProps {
    onOpenDocxDescription?: () => void;
    onRefreshPrices?: () => void;
}

export function BoardMoreActions({ onOpenDocxDescription, onRefreshPrices }: BoardMoreActionsProps) {
    if (!onOpenDocxDescription && !onRefreshPrices) return null;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    className="text-gray-400 hover:text-gray-700 hover:bg-gray-100 p-1.5 rounded transition-colors outline-none focus:ring-2 focus:ring-gray-200"
                    title="More actions"
                >
                    <MoreHorizontal size={16} />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-white shadow-lg border border-gray-100 p-1">
                {onOpenDocxDescription && (
                    <DropdownMenuItem
                        onClick={() => onOpenDocxDescription()}
                        className="gap-2 cursor-pointer focus:bg-gray-50 rounded-sm px-2 py-1.5 outline-none"
                    >
                        <FileText size={14} className="text-blue-600" />
                        <div className="flex flex-col">
                            <span className="text-sm font-medium text-gray-700">DOCX Description</span>
                            <span className="text-[10px] text-gray-400">Edit proposal bullets</span>
                        </div>
                    </DropdownMenuItem>
                )}
                {onRefreshPrices && (
                    <DropdownMenuItem
                        onClick={() => onRefreshPrices()}
                        className="gap-2 cursor-pointer focus:bg-gray-50 rounded-sm px-2 py-1.5 outline-none"
                    >
                        <RefreshCw size={14} className="text-gray-500" />
                        <div className="flex flex-col">
                            <span className="text-sm font-medium text-gray-700">Refresh Prices</span>
                            <span className="text-[10px] text-gray-400">Update from catalog</span>
                        </div>
                    </DropdownMenuItem>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
