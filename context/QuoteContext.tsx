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
}

export interface Board {
    id: string;
    quoteId: string;
    name: string;
    description: string | null;
    items: Item[];
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
    totals: {
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
    };
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
                setBoards(data.boards);

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
        // Helper to calculate costs for a list of items
        const calculateForItems = (items: Item[]) => {
            let materialCost = 0;
            let labourHours = 0;

            items.forEach(item => {
                materialCost += (item.unitPrice || 0) * (item.quantity || 0);
                labourHours += (item.labourHours || 0) * (item.quantity || 0);
            });

            // 1. Labour Cost
            const labourCost = labourHours * effectiveSettings.labourRate;

            // 2. Consumables Cost (percentage of material cost)
            const consumablesCost = materialCost * effectiveSettings.consumablesPct;

            // 3. Cost Base = Material + Labour + Consumables
            const costBase = materialCost + labourCost + consumablesCost;

            // 4. Overhead Cost (percentage of cost base)
            const overheadAmount = costBase * effectiveSettings.overheadPct;

            // 5. Engineering Cost (percentage of cost base)
            const engineeringCost = costBase * effectiveSettings.engineeringPct;

            // 6. Total Cost = Cost Base + Overhead + Engineering
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
            };
        };

        // 1. Selected Board Totals
        const selectedBoard = boards.find(b => b.id === selectedBoardId);
        // Fallback for totals calculation if selected ID is invalid/stale (though main UI handles this via render checks)
        const boardTotals = calculateForItems(selectedBoard?.items || []);

        // 2. Grand Totals (All Boards)
        const allItems = boards.flatMap(b => b.items || []);
        const grandTotalBase = calculateForItems(allItems);

        // Use rounded price for GST calculation
        const gst = grandTotalBase.sellPriceRounded * effectiveSettings.gstPct;
        const finalSellPrice = grandTotalBase.sellPriceRounded + gst;

        const grandTotals = {
            ...grandTotalBase,
            gst,
            finalSellPrice
        };

        return { boardTotals, grandTotals };
    };

    const { boardTotals, grandTotals } = calculateTotals();

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
