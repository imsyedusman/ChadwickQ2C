import React from 'react';
import { cn } from '@/lib/utils';
import { FileSpreadsheet } from 'lucide-react';

interface ViewModeToggleProps {
    presentationMode: 'standard' | 'estimator';
    setPresentationMode: (mode: 'standard' | 'estimator') => void;
}

export function ViewModeToggle({ presentationMode, setPresentationMode }: ViewModeToggleProps) {
    return (
        <div className="flex bg-gray-100/80 p-0.5 rounded-lg border border-gray-200 shadow-inner shrink-0">
            <button
                onClick={() => setPresentationMode('standard')}
                className={cn(
                    "px-4 py-1.5 text-xs font-semibold rounded-md transition-all duration-200 flex items-center gap-2",
                    presentationMode === 'standard' 
                        ? "bg-white text-gray-900 shadow-sm ring-1 ring-black/5" 
                        : "text-gray-500 hover:text-gray-700 hover:bg-gray-200/50"
                )}
            >
                Standard
            </button>
            <button
                onClick={() => setPresentationMode('estimator')}
                className={cn(
                    "px-4 py-1.5 text-xs font-semibold rounded-md transition-all duration-200 flex items-center gap-2",
                    presentationMode === 'estimator' 
                        ? "bg-white text-gray-900 shadow-sm ring-1 ring-black/5" 
                        : "text-gray-500 hover:text-gray-700 hover:bg-gray-200/50"
                )}
            >
                <FileSpreadsheet 
                    size={14} 
                    className={presentationMode === 'estimator' ? "text-green-600" : "text-gray-400"} 
                />
                Estimator
            </button>
        </div>
    );
}
