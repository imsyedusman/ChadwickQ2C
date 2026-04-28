'use client';

import { CheckCircle2, Circle, CircleDot, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuote } from '@/context/QuoteContext';

export type StepStatus = 'Not Started' | 'In Progress' | 'Complete';

interface Step {
    id: string;
    label: string;
}

const STEPS: Step[] = [
    { id: 'switchgear', label: 'Switchgear' },
    { id: 'miscellaneous', label: 'Misc' },
    { id: 'busbars', label: 'Busbars' },
];

interface StepIndicatorProps {
    onStepClick: (stepId: string) => void;
    currentStepId?: string;
    className?: string;
}

export default function StepIndicator({ onStepClick, currentStepId, className }: StepIndicatorProps) {
    const { boards, selectedBoardId } = useQuote();
    const selectedBoard = boards.find(b => b.id === selectedBoardId);

    const getStepStatus = (stepId: string): StepStatus => {
        if (!selectedBoard) return 'Not Started';

        const items = selectedBoard.items || [];

        switch (stepId) {
            case 'switchgear': {
                const swItems = items.filter(i => i.category === 'Switchboard');
                const hasBreakers = swItems.some(i => 
                    (i.subcategory?.includes('Circuit Breaker') || i.subcategory?.includes('Switch')) &&
                    !i.subcategory?.includes('Miscellaneous')
                );
                if (hasBreakers) return 'Complete';
                if (swItems.length > 0) return 'In Progress';
                return 'Not Started';
            }
            case 'miscellaneous': {
                const miscItems = items.filter(i => 
                    i.subcategory?.includes('Miscellaneous') || 
                    (i.category === 'Switchboard' && !i.subcategory?.includes('Circuit Breaker') && !i.subcategory?.includes('Switch'))
                );
                if (miscItems.length > 0) return 'Complete';
                return 'Not Started';
            }
            case 'busbars': {
                const busItems = items.filter(i => i.category === 'Busbar');
                if (busItems.length > 0) {
                    const hasMainBars = busItems.some(i => i.subcategory?.includes('Main Bars'));
                    return hasMainBars ? 'Complete' : 'In Progress';
                }
                return 'Not Started';
            }
            default:
                return 'Not Started';
        }
    };

    const renderStatusIcon = (status: StepStatus, isActive: boolean) => {
        switch (status) {
            case 'Complete':
                return <CheckCircle2 className={cn("w-3.5 h-3.5", isActive ? "text-blue-600" : "text-green-500")} />;
            case 'In Progress':
                return <CircleDot className={cn("w-3.5 h-3.5 text-amber-500 animate-pulse")} />;
            case 'Not Started':
                return <Circle className={cn("w-3.5 h-3.5 text-gray-300")} />;
        }
    };

    return (
        <div className={cn("flex items-center gap-3 text-[11px] font-bold tracking-tight", className)}>
            {STEPS.map((step, index) => {
                const status = getStepStatus(step.id);
                const isActive = currentStepId === step.id;

                return (
                    <div key={step.id} className="flex items-center gap-3">
                        <button
                            onClick={() => onStepClick(step.id)}
                            className={cn(
                                "group relative py-1 transition-all flex items-center gap-2 rounded-md px-2 -ml-2 hover:bg-gray-100/50",
                                isActive 
                                    ? "text-blue-700 bg-blue-50/50" 
                                    : (status === 'Not Started' ? "text-gray-400" : "text-gray-600 hover:text-gray-900")
                            )}
                        >
                            <span className="shrink-0 transition-transform group-hover:scale-110 duration-200">
                                {renderStatusIcon(status, isActive)}
                            </span>
                            <span className={cn(
                                "transition-colors"
                            )}>
                                {step.label}
                            </span>
                        </button>
                        
                        {index < STEPS.length - 1 && (
                            <span className="text-gray-200 font-light select-none tracking-[-0.2em] opacity-50">──────</span>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
