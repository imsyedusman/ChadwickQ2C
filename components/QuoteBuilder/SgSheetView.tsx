'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { SG_CBS_LAYOUT, SectionDef, RowDef } from './sheet-data/sg-cbs';
import { SG_SPECIAL_CBS_LAYOUT, SpecialSectionDef, SpecialRowDef } from './sheet-data/sg-special-cbs';
import { useQuote } from '@/context/QuoteContext';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface CatalogItem {
    id: string;
    brand: string;
    category: string;
    subcategory: string;
    partNumber: string;
    description: string;
    unitPrice: number;
    labourHours: number;
    meterType?: string | null;
    isCopperPriced?: boolean;
    totalCopperWeightKgPerMeter?: number | null;
}

interface SgSheetViewProps {
    onAdd: (item: CatalogItem, qty: number, unitPriceOverride?: number) => void;
}

function CellInput({ item, existingQty, onAdd }: { item: CatalogItem, existingQty: number, onAdd: any }) {
    const [qty, setQty] = useState(existingQty > 0 ? existingQty.toString() : "");

    useEffect(() => {
        if (existingQty > 0) {
            setQty(existingQty.toString());
        } else {
            setQty("");
        }
    }, [existingQty]);

    const handleAction = (valStr: string) => {
        const val = parseFloat(valStr);
        const finalQty = isNaN(val) ? 0 : val;
        if (finalQty > 0) {
            onAdd(item, finalQty);
        }
    };

    return (
        <input
            type="text"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            onKeyDown={(e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAction(e.currentTarget.value);
                }
            }}
            onBlur={(e) => {
                handleAction(e.currentTarget.value);
            }}
            className="w-14 h-8 text-center text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white border border-gray-300 rounded shadow-sm text-gray-900"
        />
    );
}

export default function SgSheetView({ onAdd }: SgSheetViewProps) {
    const { boards, selectedBoardId } = useQuote();
    const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'cbs' | 'special-cbs'>('cbs');

    const activeLayout: (SectionDef | SpecialSectionDef)[] = activeTab === 'cbs' ? SG_CBS_LAYOUT : SG_SPECIAL_CBS_LAYOUT;

    useEffect(() => {
        let isMounted = true;
        const fetchCatalog = async () => {
            try {
                setLoading(true);
                const res = await fetch('/api/catalog?category=Switchboard&take=100000');
                if (res.ok) {
                    const data = await res.json();
                    if (isMounted) setCatalogItems(data);
                }
            } catch (err) {
                console.error('Failed to fetch catalog', err);
            } finally {
                if (isMounted) setLoading(false);
            }
        };
        fetchCatalog();
        return () => { isMounted = false; };
    }, []);

    const catalogMap = useMemo(() => {
        const map = new Map<string, CatalogItem>();
        catalogItems.forEach(item => {
            if (item.partNumber) {
                map.set(item.partNumber.toLowerCase().trim(), item);
            }
        });
        return map;
    }, [catalogItems]);

    const boardItemsMap = useMemo(() => {
        const map = new Map<string, number>();
        const activeBoard = boards.find(b => b.id === selectedBoardId);
        if (activeBoard && activeBoard.items) {
            activeBoard.items.forEach((item: any) => {
                if (item.partNumber) {
                    const key = item.partNumber.toLowerCase().trim();
                    const qty = Number(item.quantity);
                    map.set(key, (map.get(key) || 0) + qty);
                }
            });
        }
        return map;
    }, [boards, selectedBoardId]);

    const renderPart = (partNumber: string, isTrip: boolean = false, basePart?: string) => {
        const key = partNumber.toLowerCase().trim();
        const item = catalogMap.get(key);
        const existingQty = boardItemsMap.get(key) || 0;

        if (!item) {
            return (
                <div className="flex items-center justify-between px-4 py-2 opacity-60 bg-gray-50 border-b border-gray-100 h-full">
                    <div className="flex flex-col flex-1 pr-4">
                        <div className="text-sm text-gray-900 break-words">
                            Not found in catalog
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="font-mono text-xs text-gray-500">{partNumber}</span>
                        </div>
                        {isTrip && basePart && (
                            <span className="text-[10px] text-gray-400 mt-1 flex items-center gap-1 font-medium uppercase tracking-wider flex-wrap">
                                Base: {basePart} <span className="bg-gray-200 text-gray-500 px-1 rounded text-[9px]">AUTO</span>
                            </span>
                        )}
                    </div>
                    <div className="shrink-0 w-14 h-8 bg-gray-200 rounded shadow-inner" title="Cannot add missing item" />
                </div>
            );
        }

        return (
            <div className={cn(
                "flex items-center justify-between px-4 py-2 border-b border-gray-100 transition-colors h-full",
                existingQty > 0 ? "bg-blue-50/30 hover:bg-blue-50/50" : "bg-white hover:bg-gray-50"
            )}>
                <div className="flex flex-col flex-1 pr-4">
                    <div className="text-sm text-gray-900 break-words">
                        {item.description}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="font-mono text-xs text-gray-500">{item.partNumber}</span>
                        {existingQty > 0 && (
                            <span className="inline-flex items-center rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">
                                {existingQty} on board
                            </span>
                        )}
                    </div>
                    {isTrip && basePart && (
                        <span className="text-[10px] text-gray-500 mt-1 flex items-center gap-1 font-medium uppercase tracking-wider flex-wrap">
                            Base: {basePart} <span className="bg-blue-100 text-blue-700 px-1 rounded text-[9px]">AUTO</span>
                        </span>
                    )}
                </div>
                <div className="shrink-0">
                    <CellInput item={item} existingQty={existingQty} onAdd={onAdd} />
                </div>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center bg-gray-50">
                <Loader2 className="animate-spin text-blue-500 mb-2" size={24} />
                <span className="text-sm text-gray-500 font-medium">Loading catalog data...</span>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-white">
            <div className="bg-gray-50 border-b border-gray-200 px-6 pt-3 flex items-center shadow-sm z-10 gap-2">
                <button
                    onClick={() => setActiveTab('cbs')}
                    className={cn(
                        "px-4 py-2 border-b-2 font-semibold text-sm rounded-t-md transition-colors",
                        activeTab === 'cbs' 
                            ? "border-blue-600 text-blue-700 bg-white" 
                            : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                    )}
                >
                    CBs
                </button>
                <button
                    onClick={() => setActiveTab('special-cbs')}
                    className={cn(
                        "px-4 py-2 border-b-2 font-semibold text-sm rounded-t-md transition-colors",
                        activeTab === 'special-cbs' 
                            ? "border-blue-600 text-blue-700 bg-white" 
                            : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                    )}
                >
                    Special CBs
                </button>
            </div>
            
            <div className="flex-1 overflow-y-auto bg-gray-50">
                <div className="flex flex-col w-full bg-white">
                    {activeLayout.map((section, sIdx) => (
                        <div key={sIdx} className="flex flex-col">
                            <div className="px-4 py-2 bg-gray-100 border-y border-gray-200 font-bold text-sm text-gray-800">
                                {section.heading}
                            </div>
                            <div className="flex flex-col">
                                {section.rows.map((row: RowDef | SpecialRowDef, rIdx) => {
                                    if (row.type === 'spacer') {
                                        return <div key={rIdx} className="h-3 w-full bg-white" />;
                                    } else if (row.type === 'single') {
                                        return (
                                            <div key={rIdx} className="w-full">
                                                {renderPart(row.partNumber)}
                                            </div>
                                        );
                                    } else if (row.type === 'paired') {
                                        return (
                                            <div key={rIdx} className="w-full">
                                                {renderPart(row.tripPartNumber, true, row.basePartNumber)}
                                            </div>
                                        );
                                    } else if (row.type === 'sideBySide') {
                                        return (
                                            <div key={rIdx} className="flex w-full">
                                                <div className="w-1/2 border-r border-gray-200">
                                                    {renderPart(row.partNumberA)}
                                                </div>
                                                <div className="w-1/2">
                                                    {renderPart(row.partNumberB)}
                                                </div>
                                            </div>
                                        );
                                    }
                                    return null;
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
