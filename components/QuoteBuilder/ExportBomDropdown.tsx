import React from 'react';
import { FileText, FileSpreadsheet, ChevronDown } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ExportBomDropdownProps {
    quoteId: string;
    boardId: string;
}

export function ExportBomDropdown({ quoteId, boardId }: ExportBomDropdownProps) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    className="text-[10px] font-medium text-gray-500 hover:text-blue-600 hover:bg-blue-50 px-2 py-1 rounded transition-colors flex items-center gap-1 outline-none ring-0 focus:ring-2 focus:ring-blue-100"
                    title="Download Engineering BOM"
                >
                    <FileText size={10} />
                    Export BOM
                    <ChevronDown size={10} className="text-gray-400 group-hover:text-blue-500" />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 bg-white shadow-lg border border-gray-100 p-1">
                <DropdownMenuLabel className="text-[10px] text-gray-400 uppercase tracking-wider px-2 py-1.5">Current Board BOM</DropdownMenuLabel>
                
                <DropdownMenuItem
                    onClick={() => window.open(`/api/quotes/${quoteId}/boards/${boardId}/export-bom?format=pdf`, '_blank')}
                    className="gap-2 cursor-pointer focus:bg-gray-50 rounded-sm px-2 py-1.5 outline-none"
                >
                    <FileText size={14} className="text-red-600" />
                    <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-700">Export PDF</span>
                        <span className="text-[10px] text-gray-400">Engineering document (A4)</span>
                    </div>
                </DropdownMenuItem>

                <DropdownMenuItem
                    onClick={() => window.open(`/api/quotes/${quoteId}/boards/${boardId}/export-bom?format=human`, '_blank')}
                    className="gap-2 cursor-pointer focus:bg-gray-50 rounded-sm px-2 py-1.5 outline-none"
                >
                    <FileSpreadsheet size={14} className="text-blue-600" />
                    <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-700">Export CSV</span>
                        <span className="text-[10px] text-gray-400">Detailed list (Excel ready)</span>
                    </div>
                </DropdownMenuItem>

                <DropdownMenuSeparator className="-mx-1 my-1 h-px bg-gray-100" />
                <DropdownMenuLabel className="text-[10px] text-gray-400 uppercase tracking-wider px-2 py-1.5">Full Quote BOM (All Boards)</DropdownMenuLabel>

                <DropdownMenuItem
                    onClick={() => window.open(`/api/quotes/${quoteId}/export-bom?format=pdf`, '_blank')}
                    className="gap-2 cursor-pointer focus:bg-gray-50 rounded-sm px-2 py-1.5 outline-none"
                >
                    <FileText size={14} className="text-red-600" />
                    <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-700">Export Full PDF</span>
                        <span className="text-[10px] text-gray-400">All boards as individual sections</span>
                    </div>
                </DropdownMenuItem>

                <DropdownMenuItem
                    onClick={() => window.open(`/api/quotes/${quoteId}/export-bom?format=human`, '_blank')}
                    className="gap-2 cursor-pointer focus:bg-gray-50 rounded-sm px-2 py-1.5 outline-none"
                >
                    <FileSpreadsheet size={14} className="text-blue-600" />
                    <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-700">Export Full CSV</span>
                        <span className="text-[10px] text-gray-400">Flat table with 'Board' column</span>
                    </div>
                </DropdownMenuItem>
                
                <DropdownMenuSeparator className="-mx-1 my-1 h-px bg-gray-100" />
                <DropdownMenuItem
                    onClick={() => window.open(`/api/quotes/${quoteId}/boards/${boardId}/export-bom?format=erp`, '_blank')}
                    className="gap-2 cursor-pointer focus:bg-gray-50 rounded-sm px-2 py-1.5 outline-none opacity-50 hover:opacity-100"
                >
                    <FileSpreadsheet size={14} className="text-green-600" />
                    <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-700">ERP Export (CSV)</span>
                        <span className="text-[10px] text-gray-400">Strict machine format</span>
                    </div>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
