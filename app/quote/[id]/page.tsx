'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import BoardList from '@/components/QuoteBuilder/BoardList';
import ItemSelection from '@/components/QuoteBuilder/ItemSelection';
import BoardContent from '@/components/QuoteBuilder/BoardContent';
import CostingView from '@/components/QuoteBuilder/CostingView';
import GrandTotalView from '@/components/QuoteBuilder/GrandTotalView';
import { QuoteProvider, useQuote } from '@/context/QuoteContext';
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react';

function QuoteBuilderContent() {
    const { boards, loading, quoteNumber, clientName, projectRef, updateMetadata, quoteId, selectedBoardId, setSelectedBoardId } = useQuote();
    const [leftCollapsed, setLeftCollapsed] = useState(false);
    const [rightCollapsed, setRightCollapsed] = useState(false);

    if (loading) {
        return (
            <div className="flex h-[calc(100vh-64px)] items-center justify-center">
                <Loader2 className="animate-spin text-blue-600" size={32} />
            </div>
        );
    }

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

                <div className="flex items-center gap-2 text-sm text-gray-500">
                    <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-green-500" />
                        Draft Saved
                    </span>
                </div>
            </div>

            {/* Resizable 3-Panel Layout */}
            <div className="flex-1 overflow-hidden">
                <PanelGroup direction="horizontal">
                    {/* Panel 1: Board List (Collapsible) */}
                    {!leftCollapsed && (
                        <>
                            <Panel defaultSize={20} minSize={15} maxSize={30}>
                                <div className="h-full border-r border-gray-200 bg-gray-50 flex flex-col">
                                    <BoardList
                                        boards={boards as any}
                                        selectedBoardId={selectedBoardId}
                                        onSelectBoard={setSelectedBoardId}
                                        quoteId={quoteId}
                                        onUpdate={() => window.location.reload()}
                                    />
                                </div>
                            </Panel>
                            <PanelResizeHandle className="w-1 bg-gray-200 hover:bg-blue-500 transition-colors relative group">
                                <button
                                    onClick={() => setLeftCollapsed(true)}
                                    className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 bg-white border border-gray-300 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-gray-50"
                                    title="Collapse sidebar"
                                >
                                    <ChevronLeft size={14} />
                                </button>
                            </PanelResizeHandle>
                        </>
                    )}

                    {/* Collapsed Left Sidebar Toggle */}
                    {leftCollapsed && (
                        <button
                            onClick={() => setLeftCollapsed(false)}
                            className="w-8 bg-gray-100 hover:bg-gray-200 border-r border-gray-300 flex items-center justify-center transition-colors"
                            title="Expand sidebar"
                        >
                            <ChevronRight size={16} />
                        </button>
                    )}

                    {/* Panel 2: Board Content & Item Selection (Vertically Resizable) */}
                    <Panel defaultSize={60} minSize={40}>
                        <PanelGroup direction="vertical">
                            {/* Top: Selected Items */}
                            <Panel defaultSize={45} minSize={20} maxSize={80}>
                                <div className="h-full border-b border-gray-200 overflow-hidden">
                                    <BoardContent />
                                </div>
                            </Panel>

                            <PanelResizeHandle className="h-1 bg-gray-200 hover:bg-blue-500 transition-colors" />

                            {/* Bottom: Catalog */}
                            <Panel defaultSize={55} minSize={20}>
                                <div className="h-full overflow-hidden flex flex-col">
                                    <ItemSelection />
                                </div>
                            </Panel>
                        </PanelGroup>
                    </Panel>

                    <PanelResizeHandle className="w-1 bg-gray-200 hover:bg-blue-500 transition-colors relative group">
                        <button
                            onClick={() => setRightCollapsed(true)}
                            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 bg-white border border-gray-300 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-gray-50"
                            title="Collapse sidebar"
                        >
                            <ChevronRight size={14} />
                        </button>
                    </PanelResizeHandle>

                    {/* Panel 3: Costing View (Collapsible) */}
                    {!rightCollapsed && (
                        <Panel defaultSize={20} minSize={15} maxSize={30}>
                            <div className="h-full bg-white flex flex-col shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.1)] z-10 overflow-y-auto">
                                <div className="flex-1">
                                    <CostingView />
                                </div>
                                <div className="p-4 border-t border-gray-200 bg-gray-50">
                                    <GrandTotalView />
                                </div>
                            </div>
                        </Panel>
                    )}

                    {/* Collapsed Right Sidebar Toggle */}
                    {rightCollapsed && (
                        <button
                            onClick={() => setRightCollapsed(false)}
                            className="w-8 bg-gray-100 hover:bg-gray-200 border-l border-gray-300 flex items-center justify-center transition-colors"
                            title="Expand sidebar"
                        >
                            <ChevronLeft size={16} />
                        </button>
                    )}
                </PanelGroup>
            </div>
        </div>
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
