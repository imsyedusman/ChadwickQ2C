'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

import { computeBusbarPrice } from '@/utils/pricing/copperPricing';
import { calculateQuoteTotals } from '@/lib/pricing';
import { isAutoManaged } from '@/lib/system-definitions';
import { formatQuoteNumber } from '@/lib/utils';
export interface QuoteSettings {
    labourRate: number;
    consumablesPct: number;
    overheadPct: number;
    engineeringPct: number;
    targetMarginPct: number;
    gstPct: number;
    roundingIncrement: number;
    minMarginAlertPct: number;
    copperPricePerKg: number; // New setting
}

export interface QuoteOverrides {
    overrideLabourRate?: number | null;
    overrideOverheadPct?: number | null;
    overrideEngineeringPct?: number | null;
    overrideTargetMarginPct?: number | null;
    overrideConsumablesPct?: number | null;
    overrideGstPct?: number | null;
    overrideRoundingIncrement?: number | null;
    overrideCopperPricePerKg?: number | null; // New override
}

export interface Item {
    id: string;
    boardId: string;
    category: string;
    subcategory: string | null;
    name: string;
    description: string | null;
    quantity: number;
    unitPrice: number;
    labourHours: number;
    cost: number;
    notes: string | null;
    isDefault?: boolean;
    isSheetmetal?: boolean;
    isSystemManaged?: boolean;
    productFrame?: string | null;
    systemTag?: string | null;
    partNumber?: string | null;
    systemRuleType?: string | null; // Provenance Rule ID
    mergeable?: boolean;

    // Dynamic Pricing (Optional)
    totalCopperWeightKgPerMeter?: number | null;
    isCopperPriced?: boolean;
}

// ...

export interface Board {
    id: string;
    quoteId: string;
    name: string;
    type: string;
    description: string | null;
    internalNotes: string | null;
    useCustomDescription: boolean;
    hideAutoDescription: boolean;
    customDescription: string | null;
    descriptionOptions?: any;
    config?: any;
    items: Item[];
}

export interface BoardTotals {
    baseMaterialCost: number;
    materialCost: number;
    labourHours: number;
    labourCost: number;
    consumablesCost: number;
    costBase: number;
    overheadAmount: number;
    engineeringCost: number;
    totalCost: number;
    profit: number;
    sellPrice: number;
    sellPriceRounded: number;
    sheetmetalSubtotal: number;
    sheetmetalUplift: number;
    cubicSubtotal: number;
}

export interface CalculatedTotals {
    grandTotals: {
        baseMaterialCost: number;
        materialCost: number;
        labourHours: number;
        labourCost: number;
        consumablesCost: number;
        costBase: number;
        overheadAmount: number;
        engineeringCost: number;
        totalCost: number;
        profit: number;
        sellPrice: number;
        sellPriceRounded: number;
        gst: number;
        finalSellPrice: number;
        sheetmetalSubtotal: number;
        sheetmetalUplift: number;
        cubicSubtotal: number;
    };
    boardTotals: Record<string, BoardTotals>;
    effectiveSettings: QuoteSettings;
}

interface QuoteContextType {
    quoteId: string;
    quoteNumber: string;
    revision: number;
    revisionGroupId: string;
    formattedQuoteNumber: string;
    clientName: string;
    clientCompany: string;
    projectRef: string;
    pipedriveOwnerName: string | null;
    description: string;
    status: string;
    projectStatus: string | null;
    creator?: { name?: string; email?: string } | null;
    boards: Board[];
    globalSettings: QuoteSettings;
    quoteSnapshot: Partial<QuoteSettings> | null;
    overrides: QuoteOverrides; // Quote-specific overrides
    effectiveSettings: QuoteSettings; // Merged settings (Global + Snapshot + Overrides)
    loading: boolean;
    saving: boolean;
    isSyncing: boolean; // True during optimistic updates
    serverTotals: CalculatedTotals | null; // Definitive source of truth from backend
    totals: BoardTotals;
    allBoardTotals: Record<string, BoardTotals>;
    grandTotals: CalculatedTotals['grandTotals'];
    selectedBoardId: string | null;
    setSelectedBoardId: (id: string | null) => void;
    addBoard: (boardData: { name: string; type: string; config?: any; internalNotes?: string }) => Promise<void>;
    addItemToBoard: (boardId: string, item: any) => Promise<void>;
    updateItem: (itemId: string, updates: Partial<Item>) => Promise<void>;
    removeItem: (itemId: string) => Promise<void>;
    refreshQuote: () => Promise<void>;
    updateOverrides: (overrides: Partial<QuoteOverrides>) => Promise<void>;
    resetToGlobalDefaults: () => Promise<void>;
    updateMetadata: (data: { 
        quoteNumber?: string; 
        clientName?: string; 
        clientCompany?: string; 
        projectRef?: string; 
        description?: string;
        pipedrive_org_id?: number | null;
        pipedrive_person_id?: number | null;
    }) => Promise<void>;
    updateStatus: (status: string) => Promise<void>;
    updateProjectStatus: (status: string) => Promise<void>;
    updateUiState: (key: string, value: any) => void;
    updateBoardConfig: (boardId: string, config: any) => Promise<void>;
    updateBoardDetails: (boardId: string, updates: Partial<Board>) => Promise<void>;
    viewMode: 'raw' | 'consolidated';
    setViewMode: (mode: 'raw' | 'consolidated') => void;
    presentationMode: 'standard' | 'estimator';
    setPresentationMode: (mode: 'standard' | 'estimator') => void;
}

const QuoteContext = createContext<QuoteContextType | undefined>(undefined);

export function QuoteProvider({ children, quoteId }: { children: ReactNode; quoteId: string }) {
    const [boards, setBoards] = useState<Board[]>([]);

    // UI State Helper
    const updateUiState = (key: string, value: any) => {
        try {
            const storageKey = `chadwick_ui_state_${quoteId}`;
            const existing = localStorage.getItem(storageKey);
            const state = existing ? JSON.parse(existing) : {};
            state[key] = value;
            localStorage.setItem(storageKey, JSON.stringify(state));
        } catch (e) {
            console.error("Failed to save UI state", e);
        }
    };

    const [selectedBoardId, _setSelectedBoardId] = useState<string | null>(null);

    const setSelectedBoardId = (id: string | null) => {
        _setSelectedBoardId(id);
        updateUiState('lastSelectedBoardId', id);
    };

    const [viewMode, _setViewMode] = useState<'raw' | 'consolidated'>('consolidated');

    const setViewMode = (mode: 'raw' | 'consolidated') => {
        _setViewMode(mode);
        updateUiState('viewMode', mode);
    };

    const [presentationMode, _setPresentationMode] = useState<'standard' | 'estimator'>('standard');

    const setPresentationMode = (mode: 'standard' | 'estimator') => {
        _setPresentationMode(mode);
        updateUiState('presentationMode', mode);
    };
    const [metadata, setMetadata] = useState({
        quoteNumber: '',
        revision: 0,
        revisionGroupId: '',
        clientName: '',
        clientCompany: '',
        projectRef: '',
        pipedriveOwnerName: null as string | null,
        description: '',
        status: 'DRAFT',
        projectStatus: null as string | null,
        creator: null as { name?: string; email?: string } | null,
    });
    const [saving, setSaving] = useState(false);
    const [globalSettings, setGlobalSettings] = useState<QuoteSettings>({
        labourRate: 100,
        consumablesPct: 0.03,
        overheadPct: 0.20,
        engineeringPct: 0.20,
        targetMarginPct: 0.18,
        gstPct: 0.10,
        roundingIncrement: 100,
        minMarginAlertPct: 0.05,
        copperPricePerKg: 15.0,
    });
    const [quoteSnapshot, setQuoteSnapshot] = useState<Partial<QuoteSettings> | null>(null);
    const [overrides, setOverrides] = useState<QuoteOverrides>({});
    const [loading, setLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [serverTotals, setServerTotals] = useState<CalculatedTotals | null>(null);

    const fetchQuoteData = async () => {
        try {
            // 1. Always fetch global settings first to ensure they are fresh
            try {
                const settingsRes = await fetch('/api/settings');
                if (settingsRes.ok) {
                    const freshGlobalSettings = await settingsRes.json();
                    setGlobalSettings(freshGlobalSettings);
                }
            } catch (e) {
                console.error("Failed to fetch fresh global settings", e);
            }

            const res = await fetch(`/api/quotes/${quoteId}`);
            if (!res.ok) throw new Error('Failed to fetch quote');
            const data = await res.json();

            if (data) {
                setMetadata({
                    quoteNumber: data.quoteNumber || '',
                    revision: data.revision || 0,
                    revisionGroupId: data.revisionGroupId || '',
                    clientName: data.clientName || '',
                    clientCompany: data.clientCompany || '',
                    projectRef: data.projectRef || '',
                    pipedriveOwnerName: data.project?.pipedriveOwnerName || null,
                    description: data.description || '',
                    status: data.status || 'DRAFT',
                    projectStatus: data.project?.projectStatus || null,
                    creator: data.creator || null,
                });

                // Load overrides
                setOverrides({
                    overrideLabourRate: data.overrideLabourRate,
                    overrideOverheadPct: data.overrideOverheadPct,
                    overrideEngineeringPct: data.overrideEngineeringPct,
                    overrideTargetMarginPct: data.overrideTargetMarginPct,
                    overrideConsumablesPct: data.overrideConsumablesPct,
                    overrideGstPct: data.overrideGstPct,
                    overrideRoundingIncrement: data.overrideRoundingIncrement,
                    overrideCopperPricePerKg: data.overrideCopperPricePerKg,
                });

                // Load snapshot if it exists
                if (data.settingsSnapshot) {
                    try {
                        const parsed = typeof data.settingsSnapshot === 'string'
                            ? JSON.parse(data.settingsSnapshot)
                            : data.settingsSnapshot;
                        setQuoteSnapshot(parsed);
                    } catch (e) {
                        console.error("Failed to parse settings snapshot", e);
                        setQuoteSnapshot(null);
                    }
                } else {
                    setQuoteSnapshot(null);
                }

                // Load server-calculated totals
                if (data.calculatedTotals) {
                    setServerTotals(data.calculatedTotals);
                }
            }

            if (data.boards) {
                // Parse config strings to objects
                const boardsWithParsedConfig = data.boards.map((b: any) => {
                    let parsedConfig = {};
                    if (b.config) {
                        try {
                            parsedConfig = typeof b.config === 'string' ? JSON.parse(b.config) : b.config;
                            // Critical: Ensure result is an object to prevent spread errors
                            if (typeof parsedConfig !== 'object' || parsedConfig === null) {
                                parsedConfig = {};
                            }
                        } catch (e) {
                            console.error('Failed to parse board config', e);
                            parsedConfig = {};
                        }
                    }
                    return { ...b, config: parsedConfig };
                });

                setBoards(boardsWithParsedConfig);

                // Persistence Logic: Restore last selected board
                let boardToSelect = null;
                try {
                    const storageKey = `chadwick_ui_state_${quoteId}`;
                    const savedState = localStorage.getItem(storageKey);
                    if (savedState) {
                        const parsed = JSON.parse(savedState);
                        if (parsed.lastSelectedBoardId) {
                            const found = data.boards.find((b: any) => b.id === parsed.lastSelectedBoardId);
                            if (found) boardToSelect = found.id;
                        }
                    }
                } catch (e) {
                    console.error("Failed to load UI state", e);
                }

                // Fallback to first board if no valid saved state
                if (!boardToSelect && data.boards.length > 0) {
                    boardToSelect = data.boards[0].id;
                }

                // Only change if different (avoids loops if we already have one selected, though usually this runs on fresh load)
                if (selectedBoardId !== boardToSelect) {
                    setSelectedBoardId(boardToSelect);
                }

                // Restore viewMode and presentationMode
                try {
                    const storageKey = `chadwick_ui_state_${quoteId}`;
                    const savedState = localStorage.getItem(storageKey);
                    if (savedState) {
                        const parsed = JSON.parse(savedState);
                        if (parsed.viewMode) {
                            _setViewMode(parsed.viewMode);
                        }
                        if (parsed.presentationMode) {
                            _setPresentationMode(parsed.presentationMode);
                        }
                    }
                } catch (e) {}
            }
        } catch (error) {
            console.error('Failed to fetch quote data', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchQuoteData();
    }, [quoteId]);

    // Calculate effective settings (Overrides > Snapshot > Global)
    const effectiveSettings: QuoteSettings = {
        labourRate: overrides.overrideLabourRate ?? quoteSnapshot?.labourRate ?? globalSettings.labourRate,
        consumablesPct: overrides.overrideConsumablesPct ?? quoteSnapshot?.consumablesPct ?? globalSettings.consumablesPct,
        overheadPct: overrides.overrideOverheadPct ?? quoteSnapshot?.overheadPct ?? globalSettings.overheadPct,
        engineeringPct: overrides.overrideEngineeringPct ?? quoteSnapshot?.engineeringPct ?? globalSettings.engineeringPct,
        targetMarginPct: overrides.overrideTargetMarginPct ?? quoteSnapshot?.targetMarginPct ?? globalSettings.targetMarginPct,
        gstPct: overrides.overrideGstPct ?? quoteSnapshot?.gstPct ?? globalSettings.gstPct,
        roundingIncrement: overrides.overrideRoundingIncrement ?? quoteSnapshot?.roundingIncrement ?? globalSettings.roundingIncrement,
        minMarginAlertPct: globalSettings.minMarginAlertPct,
        copperPricePerKg: overrides.overrideCopperPricePerKg ?? quoteSnapshot?.copperPricePerKg ?? globalSettings.copperPricePerKg
    };

    const calculateTotals = () => {
        const emptyTotals: BoardTotals = {
            baseMaterialCost: 0, materialCost: 0, labourHours: 0, labourCost: 0, consumablesCost: 0,
            costBase: 0, overheadAmount: 0, engineeringCost: 0, totalCost: 0, profit: 0,
            sellPrice: 0, sellPriceRounded: 0, sheetmetalSubtotal: 0, sheetmetalUplift: 0, cubicSubtotal: 0
        };

        const emptyGrandTotals = {
            ...emptyTotals,
            gst: 0, finalSellPrice: 0
        };

        // 1. Prioritize Server Totals if available and NOT currently syncing an override
        if (serverTotals && !isSyncing) {
            const boardTotals = selectedBoardId && serverTotals.boardTotals[selectedBoardId]
                ? serverTotals.boardTotals[selectedBoardId]
                : emptyTotals;
            
            return { 
                boardTotals, 
                allBoardTotals: serverTotals.boardTotals, 
                grandTotals: serverTotals.grandTotals 
            };
        }

        // 2. Fallback to local calculation for Optimistic UI
        if (!globalSettings) return {
            boardTotals: emptyTotals,
            allBoardTotals: {},
            grandTotals: emptyGrandTotals
        };

        const { boardTotals: allBoardTotals, grandTotals } = calculateQuoteTotals(boards as any, effectiveSettings as any);

        // Selected Board Totals (retrieve from map)
        const boardTotals = selectedBoardId && (allBoardTotals as any)[selectedBoardId]
            ? (allBoardTotals as any)[selectedBoardId]
            : emptyTotals;

        return { boardTotals, allBoardTotals: allBoardTotals as Record<string, BoardTotals>, grandTotals: grandTotals as any };
    };

    const totalsResult = calculateTotals();
    const boardTotals = totalsResult.boardTotals;
    const allBoardTotals = totalsResult.allBoardTotals;
    const grandTotals = totalsResult.grandTotals;

    const addBoard = async (boardData: { name: string; type: string; config?: any; internalNotes?: string }) => {
        try {
            const res = await fetch(`/api/quotes/${quoteId}/boards`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(boardData),
            });

            if (res.ok) {
                const data = await res.json();
                // data = { board, calculatedTotals }
                setServerTotals(data.calculatedTotals);
                await fetchQuoteData();

                // Explicitly select and persist the new board
                setSelectedBoardId(data.board.id); 
            }
        } catch (error) {
            console.error('Failed to add board', error);
        }
    };

    const addItemToBoard = async (boardId: string, item: any) => {
        setIsSyncing(true);
        try {
            const res = await fetch(`/api/quotes/${quoteId}/items`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    boardId,
                    ...item
                }),
            });

            if (res.ok) {
                const data = await res.json();
                setServerTotals(data.calculatedTotals);
                setBoards(prev => prev.map(b => {
                    if (b.id === boardId) {
                        return { ...b, items: data.items };
                    }
                    return b;
                }));
            }
        } catch (error) {
            console.error('Failed to add item', error);
        } finally {
            setIsSyncing(false);
        }
    };

    const updateItem = async (itemId: string, updates: Partial<Item>) => {
        setIsSyncing(true);
        const previousBoards = JSON.parse(JSON.stringify(boards));
        let boardId: string | null = null;

        setBoards(prev => prev.map(board => {
            const hasItem = board.items.some(item => item.id === itemId);
            if (hasItem) boardId = board.id;
            return {
                ...board,
                items: board.items.map(item =>
                    item.id === itemId ? { ...item, ...updates } : item
                )
            };
        }));

        try {
            const res = await fetch(`/api/quotes/${quoteId}/items/${itemId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates),
            });

            if (!res.ok) throw new Error('Failed to update item');

            const data = await res.json();
            if (data.items && Array.isArray(data.items) && boardId) {
                const finalBoardId = boardId;
                setServerTotals(data.calculatedTotals);
                setBoards(prev => prev.map(b =>
                    b.id === finalBoardId ? { ...b, items: data.items } : b
                ));
            }
        } catch (error) {
            console.error('Failed to update item', error);
            setBoards(previousBoards);
        } finally {
            setIsSyncing(false);
        }
    };

    const removeItem = async (itemId: string) => {
        setIsSyncing(true);
        let boardId: string | null = null;
        for (const board of boards) {
            if (board.items.some(i => i.id === itemId)) {
                boardId = board.id;
                break;
            }
        }

        const previousBoards = JSON.parse(JSON.stringify(boards));

        setBoards(prev => prev.map(board => ({
            ...board,
            items: board.items.filter(item => item.id !== itemId)
        })));

        try {
            const res = await fetch(`/api/quotes/${quoteId}/items/${itemId}`, {
                method: 'DELETE',
            });

            if (!res.ok) throw new Error('Failed to remove item');
            
            const data = await res.json();
            if (data.success && Array.isArray(data.items)) {
                setServerTotals(data.calculatedTotals);
                setBoards(prev => prev.map(b => {
                    if (boardId && b.id === boardId) {
                        return { ...b, items: data.items };
                    }
                    return b;
                }));
            }
        } catch (error) {
            console.error('Failed to remove item', error);
            setBoards(previousBoards);
        } finally {
            setIsSyncing(false);
        }
    };


    const updateOverrides = async (newOverrides: Partial<QuoteOverrides>) => {
        setIsSyncing(true);
        const updated = { ...overrides, ...newOverrides };
        setOverrides(updated);
        setSaving(true);

        try {
            const res = await fetch(`/api/quotes/${quoteId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updated),
            });
            if (res.ok) {
                const data = await res.json();
                setServerTotals(data.calculatedTotals);
            }
        } catch (error) {
            console.error("Failed to save overrides", error);
        } finally {
            setSaving(false);
            setIsSyncing(false);
        }
    };

    const resetToGlobalDefaults = async () => {
        setSaving(true);
        try {
            // Prepare reset payload (nullify all overrides and the snapshot)
            const resetPayload = {
                settingsSnapshot: null,
                overrideLabourRate: null,
                overrideOverheadPct: null,
                overrideEngineeringPct: null,
                overrideTargetMarginPct: null,
                overrideConsumablesPct: null,
                overrideGstPct: null,
                overrideRoundingIncrement: null,
                overrideCopperPricePerKg: null
            };

            const res = await fetch(`/api/quotes/${quoteId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(resetPayload),
            });

            if (res.ok) {
                // Clear local state
                setQuoteSnapshot(null);
                setOverrides({});
                // Refetch everything to be absolutely sync'd
                await fetchQuoteData();
            } else {
                throw new Error('Failed to reset settings');
            }
        } catch (error) {
            console.error("Failed to reset settings", error);
            alert("Failed to reset settings to global defaults.");
        } finally {
            setSaving(false);
        }
    };

    const updateMetadata = async (data: { 
        quoteNumber?: string; 
        clientName?: string; 
        clientCompany?: string; 
        projectRef?: string; 
        description?: string;
        pipedrive_org_id?: number | null;
        pipedrive_person_id?: number | null;
    }) => {
        setMetadata(prev => ({ ...prev, ...data }));
        setSaving(true);

        try {
            await fetch(`/api/quotes/${quoteId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
        } catch (error) {
            console.error("Failed to update metadata", error);
        } finally {
            setSaving(false);
        }
    };

    const updateStatus = async (status: string) => {
        setMetadata(prev => ({ ...prev, status }));
        setSaving(true);
        try {
            await fetch(`/api/quotes/${quoteId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status }),
            });
        } catch (error) {
            console.error("Failed to update status", error);
        } finally {
            setSaving(false);
        }
    };

    const updateProjectStatus = async (status: string) => {
        setMetadata(prev => ({ ...prev, projectStatus: status }));
        setSaving(true);

        try {
            // Find the project ID first (we should probably have it in metadata)
            const res = await fetch(`/api/quotes/${quoteId}`);
            const data = await res.json();
            const projectId = data.projectId;

            if (projectId) {
                await fetch(`/api/projects/${projectId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ projectStatus: status }),
                });
            }
        } catch (error) {
            console.error("Failed to update project status", error);
        } finally {
            setSaving(false);
        }
    };

    const updateBoardConfig = async (boardId: string, config: any) => {
        setIsSyncing(true);
        try {
            const response = await fetch(`/api/quotes/${quoteId}/boards/${boardId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ config })
            });

            if (!response.ok) throw new Error('Failed to update board config');

            const data = await response.json();
            // data = { ...board, calculatedTotals }
            setServerTotals(data.calculatedTotals);
            
            await fetchQuoteData();
        } catch (error) {
            console.error('Error updating board config:', error);
            throw error;
        } finally {
            setIsSyncing(false);
        }
    };

    const updateBoardDetails = async (boardId: string, updates: Partial<Board>) => {
        setIsSyncing(true);
        try {
            const response = await fetch(`/api/quotes/${quoteId}/boards/${boardId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });

            if (!response.ok) throw new Error('Failed to update board details');

            const data = await response.json();
            // data = { ...board, calculatedTotals }
            setServerTotals(data.calculatedTotals);

            await fetchQuoteData();
        } catch (error) {
            console.error('Error updating board details:', error);
            throw error;
        } finally {
            setIsSyncing(false);
        }
    };

    return (
        <QuoteContext.Provider
            value={{
                quoteId,
                quoteNumber: metadata.quoteNumber,
                revision: metadata.revision,
                revisionGroupId: metadata.revisionGroupId,
                formattedQuoteNumber: formatQuoteNumber(metadata.quoteNumber, metadata.revision, quoteId, metadata.revisionGroupId),
                clientName: metadata.clientName,
                clientCompany: metadata.clientCompany,
                projectRef: metadata.projectRef,
                pipedriveOwnerName: metadata.pipedriveOwnerName,
                description: metadata.description,
                status: metadata.status,
                projectStatus: metadata.projectStatus,
                creator: metadata.creator,
                boards,
                globalSettings,
                quoteSnapshot,
                overrides,
                effectiveSettings,
                loading,
                saving,
                isSyncing,
                serverTotals,
                totals: boardTotals,
                allBoardTotals,
                grandTotals,
                selectedBoardId,
                setSelectedBoardId,
                addBoard,
                addItemToBoard,
                updateItem,
                removeItem,
                refreshQuote: fetchQuoteData,
                updateOverrides,
                resetToGlobalDefaults,
                updateMetadata,
                updateStatus,
                updateProjectStatus,
                updateUiState,
                updateBoardConfig,
                updateBoardDetails,
                viewMode,
                setViewMode,
                presentationMode,
                setPresentationMode,
            }}
        >
            {children}
        </QuoteContext.Provider>
    );
}

export function useQuote() {
    const context = useContext(QuoteContext);
    if (context === undefined) {
        throw new Error('useQuote must be used within a QuoteProvider');
    }
    return context;
}
