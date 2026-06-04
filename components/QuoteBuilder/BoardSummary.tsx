'use client';

import { useQuote } from '@/context/QuoteContext';
import { formatCurrency } from '@/lib/utils';
import { Info, Zap } from 'lucide-react';

export default function BoardSummary() {
    const { totals, boards, selectedBoardId } = useQuote();
    const selectedBoard = boards.find(b => b.id === selectedBoardId);

    // Parse config safely
    let config: any = {};
    if (selectedBoard?.config) {
        try {
            config = typeof selectedBoard.config === 'string' ? JSON.parse(selectedBoard.config) : selectedBoard.config;
        } catch (e) {
            console.error("Failed to parse board config for summary", e);
        }
    }

    const enclosureType = config?.enclosureType;
    
    const ipRating = config?.ipRating ? (config.ipRating.startsWith('IP') ? config.ipRating : `IP${config.ipRating}`) : null;
    const faultRating = config?.faultRating ? (config.faultRating.toLowerCase().endsWith('ka') ? config.faultRating : `${config.faultRating}kA`) : null;
    const form = config?.form ? config.form.replace(/^Form\s*/i, '') : null;
    const currentRating = config?.currentRating ? (config.currentRating.endsWith('A') ? config.currentRating : `${config.currentRating}A`) : null;
    
    const hasIdentityProps = ipRating || faultRating || form || currentRating;
    const hasPricingSummary = enclosureType === 'Custom' || enclosureType === 'Cubic';

    if (!hasIdentityProps && !hasPricingSummary) {
        return null;
    }

    return (
        <div className="flex items-center w-full text-xs pr-8">
            {/* Group 1: Identity Information (Left) */}
            <div className="flex-1 flex justify-start">
                <div className="flex items-center gap-1.5 text-gray-700 font-mono tracking-tight">
                {hasIdentityProps ? (
                    <>
                        <Zap size={14} className="text-amber-500 shrink-0 mr-1" />
                        {[ipRating, faultRating, form, currentRating].filter(Boolean).map((val, i) => (
                            <span key={i} className="flex items-center">
                                {i > 0 && <span className="mx-2 text-gray-300">·</span>}
                                <span className="font-semibold">{val}</span>
                            </span>
                        ))}
                    </>
                ) : (
                    <span className="text-gray-400 italic">No Identity Info</span>
                )}
                </div>
            </div>
            
            {/* Group 2: Pricing Summary (Center) */}
            <div className="flex-1 flex justify-center pr-8">
                {enclosureType === 'Custom' && (
                    <div className="flex items-center gap-1.5 text-blue-900 font-medium whitespace-nowrap">
                        <Info size={14} className="text-blue-700 shrink-0" />
                        <span>Sheetmetal Summary</span>
                        <span className="text-gray-300 mx-1">|</span>
                        <span className="text-gray-600 font-normal">Base: <span className="font-semibold text-gray-900">{formatCurrency(totals.sheetmetalSubtotal)}</span></span>
                        <span className="text-gray-300 mx-1">|</span>
                        <span className="text-blue-700 font-semibold">Quoted: {formatCurrency(totals.sheetmetalSubtotal + totals.sheetmetalUplift)}</span>
                    </div>
                )}

                {enclosureType === 'Cubic' && (
                    <div className="flex items-center gap-1.5 text-indigo-900 font-medium whitespace-nowrap">
                        <Info size={14} className="text-indigo-700 shrink-0" />
                        <span>Cubic Summary</span>
                        <span className="text-gray-300 mx-1">|</span>
                        <span className="text-gray-600 font-normal">Base: <span className="font-semibold text-indigo-900">{formatCurrency(totals.cubicSubtotal)}</span></span>
                        <span className="text-gray-300 mx-1">|</span>
                        <span className="text-indigo-700 font-semibold">Quoted: {formatCurrency(totals.cubicSubtotal)}</span>
                    </div>
                )}
            </div>
        </div>
    );
}
