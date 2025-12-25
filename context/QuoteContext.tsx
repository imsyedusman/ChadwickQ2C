'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Updated interfaces to match new settings structure
export interface QuoteSettings {
    labourRate: number;
    consumablesPct: number;
    overheadPct: number;
    engineeringPct: number;
    targetMarginPct: number;
    gstPct: number;
    roundingIncrement: number;
    minMarginAlertPct: number;
}

export interface QuoteOverrides {
    overrideLabourRate?: number | null;
    overrideOverheadPct?: number | null;
    overrideEngineeringPct?: number | null;
    overrideTargetMarginPct?: number | null;
    overrideConsumablesPct?: number | null;
    overrideGstPct?: number | null;
    overrideRoundingIncrement?: number | null;
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
    notes: string | null;
    isDefault?: boolean;
    isSheetmetal?: boolean;
}

// ...

export interface Board {
    id: string;
    quoteId: string;
    name: string;
    description: string | null;
    config?: any;
    items: Item[];
}

export interface BoardTotals {
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

interface QuoteContextType {
    quoteId: string;
    quoteNumber: string;
    clientName: string;
    clientCompany: string;
    projectRef: string;
    description: string;
    status: string;
    boards: Board[];
    settings: QuoteSettings; // Global settings
    overrides: QuoteOverrides; // Quote-specific overrides
    effectiveSettings: QuoteSettings; // Merged settings (Global + Overrides)
    loading: boolean;
    saving: boolean;
    totals: BoardTotals;
    allBoardTotals: Record<string, BoardTotals>;
    grandTotals: {
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
    selectedBoardId: string | null;
    setSelectedBoardId: (id: string | null) => void;
    addBoard: (boardData: { name: string; type: string; config?: any }) => Promise<void>;
    addItemToBoard: (boardId: string, item: any) => Promise<void>;
    updateItem: (itemId: string, updates: Partial<Item>) => Promise<void>;
    removeItem: (itemId: string) => Promise<void>;
    refreshQuote: () => Promise<void>;
    updateSettings: (settings: Partial<QuoteSettings>) => void;
    updateOverrides: (overrides: Partial<QuoteOverrides>) => Promise<void>;
    updateMetadata: (data: { quoteNumber?: string; clientName?: string; clientCompany?: string; projectRef?: string; description?: string }) => Promise<void>;
    updateStatus: (status: string) => Promise<void>;
    updateUiState: (key: string, value: any) => void;
    updateBoardConfig: (boardId: string, config: any) => Promise<void>;
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
    const [metadata, setMetadata] = useState({
        quoteNumber: '',
        clientName: '',
        clientCompany: '',
        projectRef: '',
        description: '',
        status: 'DRAFT',
    });
    const [saving, setSaving] = useState(false);
    const [settings, setSettings] = useState<QuoteSettings>({
        labourRate: 100,
        consumablesPct: 0.03,
        overheadPct: 0.20,
        engineeringPct: 0.20,
        targetMarginPct: 0.18,
        gstPct: 0.10,
        roundingIncrement: 100,
        minMarginAlertPct: 0.05,
    });
    const [overrides, setOverrides] = useState<QuoteOverrides>({});
    const [loading, setLoading] = useState(true);

    const fetchQuoteData = async () => {
        try {
            const res = await fetch(`/api/quotes/${quoteId}`);
            if (!res.ok) throw new Error('Failed to fetch quote');
            const data = await res.json();

            if (data) {
                setMetadata({
                    quoteNumber: data.quoteNumber || '',
                    clientName: data.clientName || '',
                    clientCompany: data.clientCompany || '',
                    projectRef: data.projectRef || '',
                    description: data.description || '',
                    status: data.status || 'DRAFT',
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
                });
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
            }

            if (data.settingsSnapshot) {
                try {
                    const parsed = JSON.parse(data.settingsSnapshot);
                    setSettings(prev => ({ ...prev, ...parsed }));
                } catch (e) {
                    console.error("Failed to parse settings", e);
                }
            }

            // Fetch global settings if no snapshot exists
            if (!data.settingsSnapshot) {
                try {
                    const settingsRes = await fetch('/api/settings');
                    if (settingsRes.ok) {
                        const globalSettings = await settingsRes.json();
                        setSettings(prev => ({ ...prev, ...globalSettings }));
                    }
                } catch (e) {
                    console.error("Failed to fetch global settings", e);
                }
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

    // Calculate effective settings (Global + Overrides)
    const effectiveSettings: QuoteSettings = {
        labourRate: overrides.overrideLabourRate ?? settings.labourRate,
        consumablesPct: overrides.overrideConsumablesPct ?? settings.consumablesPct,
        overheadPct: overrides.overrideOverheadPct ?? settings.overheadPct,
        engineeringPct: overrides.overrideEngineeringPct ?? settings.engineeringPct,
        targetMarginPct: overrides.overrideTargetMarginPct ?? settings.targetMarginPct,
        gstPct: overrides.overrideGstPct ?? settings.gstPct,
        roundingIncrement: overrides.overrideRoundingIncrement ?? settings.roundingIncrement,
        minMarginAlertPct: settings.minMarginAlertPct, // No override for this yet
    };

    const calculateTotals = () => {
        const emptyTotals: BoardTotals = {
            materialCost: 0, labourHours: 0, labourCost: 0, consumablesCost: 0,
            costBase: 0, overheadAmount: 0, engineeringCost: 0, totalCost: 0, profit: 0,
            sellPrice: 0, sellPriceRounded: 0, sheetmetalSubtotal: 0, sheetmetalUplift: 0, cubicSubtotal: 0
        };

        if (!settings) return {
            boardTotals: emptyTotals,
            allBoardTotals: {},
            grandTotals: {
                ...emptyTotals,
                gst: 0, finalSellPrice: 0
            }
        };

        const calculateForItems = (items: Item[], applySheetmetalUplift: boolean): BoardTotals => {
            // 1. Base Costs
            const baseMaterialCost = items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
            const labourHours = items.reduce((sum, item) => sum + (item.labourHours * item.quantity), 0);

            // Sheetmetal Logic
            const sheetmetalSubtotal = items.reduce((sum, item) => {
                if (item.isSheetmetal) {
                    return sum + (item.unitPrice * item.quantity);
                }
                return sum;
            }, 0);

            // Cubic Logic
            const CUBIC_SUBCATEGORY = 'Cubic Switchboard Enclosures (includes busbar supports)';
            const cubicSubtotal = items.reduce((sum, item) => {
                if (item.subcategory === CUBIC_SUBCATEGORY) {
                    return sum + (item.unitPrice * item.quantity);
                }
                return sum;
            }, 0);

            const sheetmetalUplift = applySheetmetalUplift ? sheetmetalSubtotal * 0.04 : 0;

            // Total Material = Base + Uplift
            const materialCost = baseMaterialCost + sheetmetalUplift;

            // 2. Labour Cost
            const labourRate = effectiveSettings.labourRate || 0; // fallback
            const labourCost = labourHours * labourRate;

            // 3. Consumables
            const consumablesCost = materialCost * effectiveSettings.consumablesPct;

            // 4. Cost Base (Prime Cost)
            const costBase = materialCost + labourCost + consumablesCost;

            // 5. Overheads
            const overheadAmount = costBase * effectiveSettings.overheadPct;

            // 6. Engineering
            const engineeringCost = costBase * effectiveSettings.engineeringPct;

            // Total Cost
            const totalCost = costBase + overheadAmount + engineeringCost;

            // 7. Sell Price = Total Cost / (1 - Target Margin)
            const marginFactor = 1 - effectiveSettings.targetMarginPct;
            const sellPrice = marginFactor > 0 ? totalCost / marginFactor : totalCost;

            // 8. Profit/Margin
            const profit = sellPrice - totalCost;

            // 9. Rounded Sell Price
            const sellPriceRounded = Math.round(sellPrice / effectiveSettings.roundingIncrement) * effectiveSettings.roundingIncrement;

            return {
                materialCost,
                labourHours,
                labourCost,
                consumablesCost,
                costBase,
                overheadAmount,
                engineeringCost,
                totalCost,
                profit,
                sellPrice,
                sellPriceRounded,
                sheetmetalSubtotal,
                sheetmetalUplift,
                cubicSubtotal
            };
        };

        // 1. Selected Board Totals
        const selectedBoard = boards.find(b => b.id === selectedBoardId);

        let selectedBoardConfig: any = {};
        if (selectedBoard && selectedBoard.config) {
            try {
                selectedBoardConfig = typeof selectedBoard.config === 'string' ? JSON.parse(selectedBoard.config) : selectedBoard.config;
            } catch (e) {
                console.error("Failed to parse selected board config", e);
            }
        }

        const isCustom = selectedBoardConfig?.enclosureType === 'Custom';

        // 1. Map all boards to their totals
        const allBoardTotals: Record<string, BoardTotals> = {};
        const boardResults = boards.map(board => {
            let config: any = {};
            if (board.config) {
                try {
                    config = typeof board.config === 'string' ? JSON.parse(board.config) : board.config;
                } catch (e) { /* ignore */ }
            }
            const isBoardCustom = config?.enclosureType === 'Custom';
            const totals = calculateForItems(board.items || [], isBoardCustom);
            allBoardTotals[board.id] = totals;
            return totals;
        });

        // 2. Selected Board Totals (retrieve from map)
        const boardTotals = selectedBoardId && allBoardTotals[selectedBoardId]
            ? allBoardTotals[selectedBoardId]
            : emptyTotals;

        // Sum up all fields
        const grandTotalBase = boardResults.reduce((acc, curr) => ({
            materialCost: acc.materialCost + curr.materialCost,
            labourHours: acc.labourHours + curr.labourHours,
            labourCost: acc.labourCost + curr.labourCost,
            consumablesCost: acc.consumablesCost + curr.consumablesCost,
            costBase: acc.costBase + curr.costBase,
            overheadAmount: acc.overheadAmount + curr.overheadAmount,
            engineeringCost: acc.engineeringCost + curr.engineeringCost,
            totalCost: acc.totalCost + curr.totalCost,
            profit: acc.profit + curr.profit,
            sellPrice: acc.sellPrice + curr.sellPrice,
            sellPriceRounded: acc.sellPriceRounded + curr.sellPriceRounded,
            sheetmetalSubtotal: acc.sheetmetalSubtotal + curr.sheetmetalSubtotal,
            sheetmetalUplift: acc.sheetmetalUplift + curr.sheetmetalUplift,
            cubicSubtotal: acc.cubicSubtotal + curr.cubicSubtotal
        }), {
            materialCost: 0, labourHours: 0, labourCost: 0, consumablesCost: 0,
            costBase: 0, overheadAmount: 0, engineeringCost: 0, totalCost: 0, profit: 0,
            sellPrice: 0, sellPriceRounded: 0, sheetmetalSubtotal: 0, sheetmetalUplift: 0, cubicSubtotal: 0
        });

        // Use rounded price for GST calculation
        const gst = grandTotalBase.sellPriceRounded * effectiveSettings.gstPct;
        const finalSellPrice = grandTotalBase.sellPriceRounded + gst;

        const grandTotals = {
            ...grandTotalBase,
            gst,
            finalSellPrice
        };

        return { boardTotals, allBoardTotals, grandTotals };
    };

    const { boardTotals, allBoardTotals, grandTotals } = calculateTotals();

    const addBoard = async (boardData: { name: string; type: string; config?: any }) => {
        try {
            const res = await fetch(`/api/quotes/${quoteId}/boards`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(boardData),
            });

            if (res.ok) {
                const newBoard = await res.json();
                await fetchQuoteData();

                // Explicitly select and persist the new board
                setSelectedBoardId(newBoard.id); // This now auto-persists via our wrapper
            }
        } catch (error) {
            console.error('Failed to add board', error);
        }
    };

    const addItemToBoard = async (boardId: string, item: any) => {
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
                await fetchQuoteData();
            }
        } catch (error) {
            console.error('Failed to add item', error);
        }
    };

    const updateItem = async (itemId: string, updates: Partial<Item>) => {
        try {
            const res = await fetch(`/api/quotes/${quoteId}/items/${itemId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates),
            });

            if (res.ok) {
                await fetchQuoteData();
            }
        } catch (error) {
            console.error('Failed to update item', error);
        }
    };

    const removeItem = async (itemId: string) => {
        try {
            const res = await fetch(`/api/quotes/${quoteId}/items/${itemId}`, {
                method: 'DELETE',
            });

            if (res.ok) {
                await fetchQuoteData();
            }
        } catch (error) {
            console.error('Failed to remove item', error);
        }
    };

    const updateSettings = async (newSettings: Partial<QuoteSettings>) => {
        const updated = { ...settings, ...newSettings };
        setSettings(updated);

        // Persist to DB
        try {
            await fetch(`/api/quotes/${quoteId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ settingsSnapshot: JSON.stringify(updated) }),
            });
        } catch (error) {
            console.error("Failed to save settings", error);
        }
    };

    const updateOverrides = async (newOverrides: Partial<QuoteOverrides>) => {
        const updated = { ...overrides, ...newOverrides };
        setOverrides(updated);
        setSaving(true);

        try {
            await fetch(`/api/quotes/${quoteId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updated),
            });
        } catch (error) {
            console.error("Failed to save overrides", error);
        } finally {
            setSaving(false);
        }
    };

    const updateMetadata = async (data: { quoteNumber?: string; clientName?: string; clientCompany?: string; projectRef?: string; description?: string }) => {
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

    const updateBoardConfig = async (boardId: string, config: any) => {
        try {
            const response = await fetch(`/api/quotes/${quoteId}/boards/${boardId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ config })
            });

            if (!response.ok) throw new Error('Failed to update board config');

            await fetchQuoteData();
        } catch (error) {
            console.error('Error updating board config:', error);
            throw error;
        }
    };

    return (
        <QuoteContext.Provider
            value={{
                quoteId,
                quoteNumber: metadata.quoteNumber,
                clientName: metadata.clientName,
                clientCompany: metadata.clientCompany,
                projectRef: metadata.projectRef,
                description: metadata.description,
                status: metadata.status,
                boards,
                settings,
                overrides,
                effectiveSettings,
                loading,
                saving,
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
                updateSettings,
                updateOverrides,
                updateMetadata,
                updateStatus,
                updateUiState,
                updateBoardConfig,
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
