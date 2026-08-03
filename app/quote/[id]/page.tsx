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
import { Loader2, ChevronLeft, ChevronRight, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SlimCostingRail from '@/components/QuoteBuilder/SlimCostingRail';
import RevisionSelector from '@/components/QuoteBuilder/RevisionSelector';
import ShareDialog from '@/components/QuoteBuilder/ShareDialog';
import { Share2 } from 'lucide-react';
import { PipedriveSearchableDropdown } from '@/components/ui/PipedriveSearchableDropdown';

function QuoteBuilderContent() {
    const { boards, loading, saving, quoteNumber, revisionGroupId, formattedQuoteNumber, clientName, clientCompany, projectRef, pipedriveOwnerName, status, projectStatus, pipedriveDealStatus, creator, updateMetadata, updateStatus, updateProjectStatus, quoteId, selectedBoardId, setSelectedBoardId, refreshQuote } = useQuote();
    const [leftCollapsed, setLeftCollapsed] = useState(false);
    const [rightCollapsed, setRightCollapsed] = useState(false);
    const [isItemDrawerOpen, setIsItemDrawerOpen] = useState(false);
    const [drawerCategory, setDrawerCategory] = useState<'Basics' | 'Switchboard' | 'Busbar' | undefined>(undefined);
    const [drawerL1, setDrawerL1] = useState<string | undefined>(undefined);
    const [drawerL2, setDrawerL2] = useState<string | undefined>(undefined);
    const [drawerL3, setDrawerL3] = useState<string | undefined>(undefined);
    const [isHeaderExpanded, setIsHeaderExpanded] = useState(false);
    const [isShareOpen, setIsShareOpen] = useState(false);
    const [activeStep, setActiveStep] = useState<string | undefined>('switchgear');

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

    const getProjectStatusColor = (status: string) => {
        switch (status) {
            case 'Budget': return 'bg-purple-50 text-purple-700 border-purple-200';
            case 'Tender': return 'bg-orange-50 text-orange-700 border-orange-200';
            case 'Live': return 'bg-green-50 text-green-700 border-green-200';
            default: return 'bg-gray-50 text-gray-700 border-gray-200';
        }
    };

    return (
        <div className="h-[calc(100vh-64px)] flex flex-col">
            <RevisionSelector currentId={quoteId} revisionGroupId={revisionGroupId} />
            {/* Quote Header */}
            <div className={cn(
                "bg-white border-b border-gray-200 transition-all duration-200 ease-in-out z-10",
                isHeaderExpanded ? "py-3 shadow-sm" : "h-12 flex items-center shadow-sm hover:bg-gray-50 cursor-pointer"
            )}
                onClick={(e) => {
                    if (!isHeaderExpanded) setIsHeaderExpanded(true);
                }}
            >
                {!isHeaderExpanded ? (
                    // ----------------------------------------------------------------------
                    // COMPACT VIEW
                    // ----------------------------------------------------------------------
                    <div className="w-full px-6 flex items-center gap-6 text-sm">
                        <div className="flex items-center gap-2 text-gray-400">
                            <ChevronDown size={14} />
                            <span className="text-xs uppercase tracking-wider font-semibold">Quote</span>
                        </div>

                        <div className="flex items-center gap-2">
                            <div className="font-bold text-gray-900">{formattedQuoteNumber || 'Q-...'}</div>
                        </div>
                        <div className="h-4 w-px bg-gray-200" />

                        {/* Client */}
                        <div className="text-gray-700 font-medium truncate max-w-[200px]" title={clientName}>
                            {clientName || <span className="text-gray-400 italic">No Client Name</span>}
                        </div>
                        <div className="h-4 w-px bg-gray-200" />

                        {/* Deal Owner */}
                        <div className="text-gray-500 text-xs font-semibold truncate max-w-[150px]" title={`Deal Owner: ${pipedriveOwnerName || 'Unassigned'}`}>
                            {pipedriveOwnerName ? (
                                <span className="flex items-center gap-1.5">
                                    <span className="text-[10px] text-gray-400 uppercase tracking-tighter">Deal Owner:</span>
                                    {pipedriveOwnerName}
                                </span>
                            ) : (
                                <span className="text-gray-300 italic">Unassigned</span>
                            )}
                        </div>
                        <div className="h-4 w-px bg-gray-200" />

                        {/* Estimator */}
                        <div className="text-gray-500 text-xs font-semibold truncate max-w-[150px]" title={`Estimator: ${creator?.name || 'Unassigned'}`}>
                            <span className="flex items-center gap-1.5">
                                <span className="text-[10px] text-gray-400 uppercase tracking-tighter">Estimator:</span>
                                {creator?.name || <span className="text-gray-300 italic">Unassigned</span>}
                            </span>
                        </div>

                        <div className="flex-1" />

                        {/* Status & Save State */}
                        <div className="flex items-center gap-4">
                            {projectStatus && (
                                <span className={cn(
                                    "text-[9px] font-bold px-2 py-0.25 rounded border uppercase tracking-tighter",
                                    getProjectStatusColor(projectStatus)
                                )}>
                                    {projectStatus}
                                </span>
                            )}
                            <span className={cn(
                                "text-xs font-medium px-2 py-0.5 rounded-full border",
                                getStatusColor(status)
                            )}>
                                {status}
                            </span>
                            {saving ? (
                                <Loader2 className="w-3 h-3 animate-spin text-blue-500" />
                            ) : (
                                <Check className="w-3 h-3 text-green-500" />
                            )}
                        </div>
                    </div>
                ) : (
                    // ----------------------------------------------------------------------
                    // EXPANDED VIEW (Original)
                    // ----------------------------------------------------------------------
                    <div className="px-6 flex items-center gap-6">
                        <div className="flex-1 flex items-center gap-4">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsHeaderExpanded(false);
                                }}
                                className="p-1 -ml-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
                            >
                                <ChevronUp size={16} />
                            </button>

                            <div className="group relative flex-1 max-w-md">
                                <label className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold absolute -top-2 left-0 bg-white px-1 z-10">
                                    Project
                                </label>
                                <PipedriveSearchableDropdown
                                    type="deal"
                                    value={projectRef ?? ""}
                                    onSelect={(item) => { updateMetadata({ projectRef: item.name }); }}
                                    placeholder="Project Reference"
                                    className="text-sm font-medium text-gray-800 bg-transparent border-b border-transparent hover:border-gray-300 focus-within:border-blue-500 focus-within:outline-none w-full transition-colors h-9"
                                />
                            </div>

                            <div className="h-8 w-px bg-gray-200" />

                            <div className="group relative flex-1 max-w-xs">
                                <label className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold absolute -top-2 left-0 bg-white px-1 z-10">
                                    Client
                                </label>
                                <PipedriveSearchableDropdown
                                    type="person"
                                    value={clientName ?? ""}
                                    onSelect={(item) => { updateMetadata({ clientName: item.name, pipedrive_person_id: item.pipedriveId }); }}
                                    placeholder="Client Name"
                                    className="text-sm font-medium text-gray-800 bg-transparent border-b border-transparent hover:border-gray-300 focus-within:border-blue-500 focus-within:outline-none w-full transition-colors h-9"
                                />
                            </div>

                            <div className="h-8 w-px bg-gray-200" />

                            <div className="group relative flex-1 max-w-[200px]">
                                <label className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold absolute -top-2 left-0 bg-white px-1 z-10">
                                    Deal Owner
                                </label>
                                <div className="text-sm font-medium text-gray-400 bg-transparent border-b border-transparent h-9 flex items-center px-1 truncate" title={pipedriveOwnerName || ""}>
                                    {pipedriveOwnerName || <span className="text-gray-300 italic text-xs">Unassigned</span>}
                                </div>
                            </div>

                            <div className="h-8 w-px bg-gray-200" />

                            <div className="group relative flex-1 max-w-[180px]">
                                <label className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold absolute -top-2 left-0 bg-white px-1 z-10">
                                    Estimator
                                </label>
                                <div className="text-sm font-medium text-gray-400 bg-transparent border-b border-transparent h-9 flex items-center px-1 truncate" title={creator?.name || ""}>
                                    {creator?.name || <span className="text-gray-300 italic text-xs">Unassigned</span>}
                                </div>
                            </div>

                            <div className="h-8 w-px bg-gray-200" />

                            <div className="group relative flex items-center gap-3 pr-4">
                                <div className="relative">
                                    <label className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold absolute -top-2 left-0 bg-white px-1">
                                        Quote No
                                    </label>
                                    <div className="flex items-baseline">
                                        <input
                                            type="text"
                                            value={quoteNumber ?? ""}
                                            onChange={(e) => updateMetadata({ quoteNumber: e.target.value })}
                                            className="text-base font-bold text-gray-900 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none w-32 transition-colors"
                                            placeholder="Q-..."
                                        />
                                    </div>
                                </div>
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

                            {/* Project Status Badge (Editable) */}
                            {projectStatus && (
                                <div className="relative group">
                                    <label className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold absolute -top-2 left-0 bg-white px-1 z-10">
                                        Proj Status
                                    </label>
                                    <select
                                        value={projectStatus}
                                        onChange={(e) => updateProjectStatus(e.target.value)}
                                        className={cn(
                                            "text-[10px] font-bold px-3 py-1.5 rounded-md border uppercase tracking-widest bg-white cursor-pointer transition-colors focus:ring-2 focus:ring-blue-500 focus:outline-none",
                                            getProjectStatusColor(projectStatus)
                                        )}
                                    >
                                        <option value="Budget">Budget</option>
                                        <option value="Tender">Tender</option>
                                        <option value="Live">Live</option>
                                    </select>
                                </div>
                            )}

                            {/* Deal Status Badge (Read-only) */}
                            {pipedriveDealStatus && pipedriveDealStatus.trim() !== '' && (
                                <div className="relative group">
                                    <label className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold absolute -top-2 left-0 bg-white px-1 z-10 whitespace-nowrap">
                                        DEAL STATUS
                                    </label>
                                    <div
                                        className={cn(
                                            "text-[10px] font-bold px-3 py-1.5 rounded-md border tracking-widest flex items-center h-full",
                                            pipedriveDealStatus.toLowerCase() === 'open' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                                            pipedriveDealStatus.toLowerCase() === 'won' ? 'bg-green-100 text-green-700 border-green-200' :
                                            pipedriveDealStatus.toLowerCase() === 'lost' ? 'bg-red-100 text-red-700 border-red-200' :
                                            pipedriveDealStatus.toLowerCase() === 'deleted' ? 'bg-gray-100 text-gray-600 border-gray-200' :
                                            'bg-gray-100 text-gray-600 border-gray-200'
                                        )}
                                    >
                                        {pipedriveDealStatus.charAt(0).toUpperCase() + pipedriveDealStatus.slice(1).toLowerCase()}
                                    </div>
                                </div>
                            )}

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
                )}
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
                    <BoardContent
                        activeStep={activeStep}
                        onStepClick={(stepId) => {
                            setActiveStep(stepId);
                            if (stepId === 'switchgear') {
                                setDrawerCategory('Switchboard');
                                setDrawerL1(undefined);
                                setIsItemDrawerOpen(true);
                            } else if (stepId === 'miscellaneous') {
                                setDrawerCategory('Switchboard');
                                setDrawerL1('Miscellaneous');
                                setIsItemDrawerOpen(true);
                            } else if (stepId === 'busbars') {
                                setDrawerCategory('Busbar');
                                setDrawerL1(undefined);
                                setIsItemDrawerOpen(true);
                            }
                        }}
                        onAddItems={(cat: any, l1?: string, l2?: string, l3?: string) => {
                            setDrawerCategory(cat);
                            setDrawerL1(l1);
                            setDrawerL2(l2);
                            setDrawerL3(l3);
                            setIsItemDrawerOpen(true);
                            // Sync active step
                            if (cat === 'Switchboard') setActiveStep('switchgear');
                            else if (cat === 'Busbar') setActiveStep('busbars');
                        }}
                    />
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
                                {boards.length > 1 && <CostingView />}
                                <div className={cn(
                                    boards.length > 1 ? "border-t-4 border-gray-200" : ""
                                )}>
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
                        {/* WIDTH ADJUSTMENT: Change w-[60%] to w-1/2 or other values to adjust drawer width */}
                        <div className="relative w-[60%] bg-white shadow-2xl h-full flex flex-col animate-in slide-in-from-right duration-300">
                            <ItemSelection
                                onClose={() => {
                                    setIsItemDrawerOpen(false);
                                    setDrawerL1(undefined);
                                    setDrawerL2(undefined);
                                    setDrawerL3(undefined);
                                }}
                                initialCategory={drawerCategory}
                                initialL1={drawerL1}
                                initialL2={drawerL2}
                                initialL3={drawerL3}
                            />
                        </div>
                    </div>
                )
            }

            {/* Share Dialog */}
            <ShareDialog
                quoteId={quoteId}
                isOpen={isShareOpen}
                onClose={() => setIsShareOpen(false)}
            />
        </div >
    );
}

export default function QuoteBuilderPage() {
    const params = useParams();
    const id = params?.id as string;

    return (
        <QuoteProvider quoteId={id}>
            <QuoteBuilderContent />
        </QuoteProvider>
    );
}
