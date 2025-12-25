'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import BoardList from '@/components/QuoteBuilder/BoardList';
import ItemSelection from '@/components/QuoteBuilder/ItemSelection';
import BoardContent from '@/components/QuoteBuilder/BoardContent';
import CostingView from '@/components/QuoteBuilder/CostingView';
import GrandTotalView from '@/components/QuoteBuilder/GrandTotalView';
import QuoteCostingOverrides from '@/components/QuoteBuilder/QuoteCostingOverrides';
import { QuoteProvider, useQuote } from '@/context/QuoteContext';
import { Loader2, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import SlimCostingRail from '@/components/QuoteBuilder/SlimCostingRail';

function QuoteBuilderContent() {
    const { boards, loading, saving, quoteNumber, clientName, clientCompany, projectRef, status, updateMetadata, updateStatus, quoteId, selectedBoardId, setSelectedBoardId, refreshQuote } = useQuote();
    const [leftCollapsed, setLeftCollapsed] = useState(false);
    const [rightCollapsed, setRightCollapsed] = useState(false);
    const [isItemDrawerOpen, setIsItemDrawerOpen] = useState(false);

    // Load persisted preferences on mount
    useEffect(() => {
        if (quoteId) {
            try {
                const prefs = localStorage.getItem(`quote_builder_prefs_${quoteId}`);
                if (prefs) {
                    const { left, right } = JSON.parse(prefs);
                    setLeftCollapsed(left ?? false);
                    setRightCollapsed(right ?? false);
                }
            } catch (e) {
                console.warn("Failed to load layout preferences", e);
            }
        }
    }, [quoteId]);

    // Save preferences on change
    useEffect(() => {
        if (quoteId) {
            const prefs = JSON.stringify({ left: leftCollapsed, right: rightCollapsed });
            localStorage.setItem(`quote_builder_prefs_${quoteId}`, prefs);
        }
    }, [leftCollapsed, rightCollapsed, quoteId]);

    if (loading) {
        return (
            <div className="flex h-[calc(100vh-64px)] items-center justify-center">
                <Loader2 className="animate-spin text-blue-600" size={32} />
            </div>
        );
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'DRAFT': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
            case 'SENT': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'WON': return 'bg-green-100 text-green-700 border-green-200';
            case 'LOST': return 'bg-red-100 text-red-700 border-red-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    return (
        <div className="h-[calc(100vh-64px)] flex flex-col">
            {/* Quote Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-6 shadow-sm z-10">
                <div className="flex-1 flex items-center gap-4">
                    <div className="group relative">
                        <label className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold absolute -top-2 left-0 bg-white px-1">
                            Quote No
                        </label>
                        <input
                            type="text"
                            value={quoteNumber}
                            onChange={(e) => updateMetadata({ quoteNumber: e.target.value })}
                            className="text-xl font-bold text-gray-900 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none w-32 transition-colors"
                            placeholder="Q-..."
                        />
                    </div>

                    <div className="h-8 w-px bg-gray-200" />

                    <div className="group relative flex-1 max-w-xs">
                        <label className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold absolute -top-2 left-0 bg-white px-1">
                            Client
                        </label>
                        <input
                            type="text"
                            value={clientName}
                            onChange={(e) => updateMetadata({ clientName: e.target.value })}
                            className="text-lg font-medium text-gray-800 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none w-full transition-colors"
                            placeholder="Client Name"
                        />
                    </div>

                    <div className="h-8 w-px bg-gray-200" />

                    <div className="group relative flex-1 max-w-xs">
                        <label className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold absolute -top-2 left-0 bg-white px-1">
                            Company
                        </label>
                        <input
                            type="text"
                            value={clientCompany}
                            onChange={(e) => updateMetadata({ clientCompany: e.target.value })}
                            className="text-lg font-medium text-gray-800 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none w-full transition-colors"
                            placeholder="Client Company"
                        />
                    </div>

                    <div className="h-8 w-px bg-gray-200" />

                    <div className="group relative flex-1 max-w-md">
                        <label className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold absolute -top-2 left-0 bg-white px-1">
                            Project
                        </label>
                        <input
                            type="text"
                            value={projectRef}
                            onChange={(e) => updateMetadata({ projectRef: e.target.value })}
                            className="text-lg font-medium text-gray-800 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none w-full transition-colors"
                            placeholder="Project Reference"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {/* Status Dropdown */}
                    <div className="relative group">
                        <label className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold absolute -top-2 left-0 bg-white px-1 z-10">
                            Status
                        </label>
                        <select
                            value={status}
                            onChange={(e) => updateStatus(e.target.value)}
                            className={`text-sm font-medium px-3 py-1.5 rounded-md border cursor-pointer transition-colors ${getStatusColor(status)}`}
                        >
                            <option value="DRAFT">Draft</option>
                            <option value="SENT">Sent</option>
                            <option value="WON">Won</option>
                            <option value="LOST">Lost</option>
                        </select>
                    </div>

                    {/* Autosave Indicator */}
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                        {saving ? (
                            <span className="flex items-center gap-1.5">
                                <Loader2 className="w-3 h-3 animate-spin text-blue-500" />
                                Saving...
                            </span>
                        ) : (
                            <span className="flex items-center gap-1.5">
                                <Check className="w-3 h-3 text-green-500" />
                                All changes saved
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* 3-Column CSS Grid Layout */}
            <div
                className="flex-1 overflow-hidden grid transition-[grid-template-columns] duration-300 ease-in-out"
                style={{
                    gridTemplateColumns: `${leftCollapsed ? '64px' : '320px'} minmax(0, 1fr) ${rightCollapsed ? '64px' : '360px'}`
                }}
            >
                {/* Panel 1: Board List (Collapsible) */}
                <div className="h-full min-h-0 border-r border-gray-200 bg-gray-50 flex flex-col relative group/panel overflow-hidden">
                    <BoardList
                        boards={boards as any}
                        selectedBoardId={selectedBoardId}
                        onSelectBoard={setSelectedBoardId}
                        quoteId={quoteId}
                        onUpdate={refreshQuote}
                        collapsed={leftCollapsed}
                    />

                    {/* Collapse/Expand Toggle */}
                    <button
                        onClick={() => setLeftCollapsed(!leftCollapsed)}
                        className={cn(
                            "absolute top-3 z-50 h-8 w-8 flex items-center justify-center bg-white border border-gray-200 shadow-sm rounded-md text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-all",
                            leftCollapsed ? "left-1/2 -translate-x-1/2" : "right-3"
                        )}
                        title={leftCollapsed ? "Expand Board List" : "Collapse Board List"}
                    >
                        {leftCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                    </button>
                </div>

                {/* Panel 2: Board Content (Center) */}
                <div className="h-full min-h-0 bg-white flex flex-col min-w-0">
                    <BoardContent onAddItems={() => setIsItemDrawerOpen(true)} />
                </div>

                {/* Panel 3: Costing View (Collapsible) */}
                <div className="h-full min-h-0 bg-gray-50 flex flex-col shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.1)] z-10 border-l border-gray-200 relative group/panel overflow-hidden">
                    {/* Collapse/Expand Toggle (Always Visible) */}
                    <button
                        onClick={() => setRightCollapsed(!rightCollapsed)}
                        className={cn(
                            "absolute top-3 z-50 h-8 w-8 flex items-center justify-center bg-white border border-gray-200 shadow-sm rounded-md text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-all",
                            rightCollapsed ? "left-1/2 -translate-x-1/2" : "left-3"
                        )}
                        title={rightCollapsed ? "Expand Summary" : "Collapse Summary"}
                    >
                        {rightCollapsed ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
                    </button>

                    {rightCollapsed ? (
                        <SlimCostingRail />
                    ) : (
                        <>
                            <QuoteCostingOverrides />
                            {/* Scrollable Container */}
                            <div className="flex-1 overflow-y-auto">
                                <CostingView />
                                <div className="border-t-4 border-gray-200">
                                    <GrandTotalView />
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Item Selection Drawer */}
            {
                isItemDrawerOpen && (
                    <div className="fixed inset-0 z-50 flex justify-end">
                        {/* Backdrop */}
                        <div
                            className="fixed inset-0 bg-black/20 backdrop-blur-sm transition-opacity"
                            onClick={() => setIsItemDrawerOpen(false)}
                        />

                        {/* Slide-over Panel */}
                        <div className="relative w-1/2 bg-white shadow-2xl h-full flex flex-col animate-in slide-in-from-right duration-300">
                            <ItemSelection onClose={() => setIsItemDrawerOpen(false)} />
                        </div>
                    </div>
                )
            }
        </div >
    );
}

export default function QuoteBuilderPage() {
    const params = useParams();
    const id = params.id as string;

    return (
        <QuoteProvider quoteId={id}>
            <QuoteBuilderContent />
        </QuoteProvider>
    );
}
