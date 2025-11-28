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
    settings: QuoteSettings;
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
    updateMetadata: (data: { quoteNumber?: string; clientName?: string; clientCompany?: string; projectRef?: string; description?: string }) => Promise<void>;
    updateStatus: (status: string) => Promise<void>;
}

const QuoteContext = createContext<QuoteContextType | undefined>(undefined);

export function QuoteProvider({ children, quoteId }: { children: ReactNode; quoteId: string }) {
    const [boards, setBoards] = useState<Board[]>([]);
    const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);
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
            }

            if (data.boards) {
                setBoards(data.boards);
                // Select first board if none selected
                if (!selectedBoardId && data.boards.length > 0) {
                    setSelectedBoardId(data.boards[0].id);
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
            const labourCost = labourHours * settings.labourRate;

            // 2. Consumables Cost (percentage of material cost)
            const consumablesCost = materialCost * settings.consumablesPct;

            // 3. Cost Base = Material + Labour + Consumables
            const costBase = materialCost + labourCost + consumablesCost;

            // 4. Overhead Cost (percentage of cost base)
            const overheadAmount = costBase * settings.overheadPct;

            // 5. Engineering Cost (percentage of cost base)
            const engineeringCost = costBase * settings.engineeringPct;

            // 6. Total Cost = Cost Base + Overhead + Engineering
            const totalCost = costBase + overheadAmount + engineeringCost;

            // 7. Sell Price = Total Cost / (1 - Target Margin)
            const marginFactor = 1 - settings.targetMarginPct;
            const sellPrice = marginFactor > 0 ? totalCost / marginFactor : totalCost;

            // 8. Profit/Margin
            const profit = sellPrice - totalCost;

            // 9. Rounded Sell Price
            const sellPriceRounded = Math.round(sellPrice / settings.roundingIncrement) * settings.roundingIncrement;

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
        const boardTotals = calculateForItems(selectedBoard?.items || []);

        // 2. Grand Totals (All Boards)
        const allItems = boards.flatMap(b => b.items || []);
        const grandTotalBase = calculateForItems(allItems);

        // Use rounded price for GST calculation
        const gst = grandTotalBase.sellPriceRounded * settings.gstPct;
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
                setSelectedBoardId(newBoard.id);
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
                updateMetadata,
                updateStatus,
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
