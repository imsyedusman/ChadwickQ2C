'use client';

import { useState } from 'react';
import { Plus, Trash2, Settings, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import PreSelectionWizard from './PreSelectionWizard';
import { BoardConfig } from '@/lib/board-item-service';
import { useQuote } from '@/context/QuoteContext';

interface Board {
    id: string;
    name: string;
    type: string | null;
    order: number;
    items?: any[];
    config?: any; // Object or JSON string
}

interface BoardListProps {
    boards: Board[];
    selectedBoardId: string | null;
    onSelectBoard: (id: string) => void;
    quoteId: string;
    onUpdate: () => void;
}

export default function BoardList({ boards, selectedBoardId, onSelectBoard, quoteId, onUpdate }: BoardListProps) {
    const { addBoard } = useQuote();
    const [isWizardOpen, setIsWizardOpen] = useState(false);
    const [editingBoard, setEditingBoard] = useState<Board | null>(null);

    const handleCreateBoard = async (config: BoardConfig) => {
        try {
            if (editingBoard) {
                // Update existing board
                await fetch(`/api/quotes/${quoteId}/boards/${editingBoard.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: config.name,
                        type: config.type,
                        config: config
                    }),
                });
                setEditingBoard(null);
            } else {
                // Create new board
                await addBoard({
                    name: config.name,
                    type: config.type,
                    config: config // Store full config
                });
            }
            onUpdate();
        } catch (error) {
            console.error('Failed to save board', error);
        }
    };

    const handleEditBoard = (e: React.MouseEvent, board: Board) => {
        e.stopPropagation();
        setEditingBoard(board);
        setIsWizardOpen(true);
    };

    const handleCloseWizard = () => {
        setIsWizardOpen(false);
        setEditingBoard(null);
    };

    const handleDeleteBoard = async (e: React.MouseEvent, boardId: string) => {
        e.stopPropagation();
        if (!confirm('Delete this board and all its items?')) return;

        try {
            await fetch(`/api/quotes/${quoteId}/boards/${boardId}`, { method: 'DELETE' });

            // Smart Fallback if we deleted the selected board
            if (selectedBoardId === boardId) {
                const remaining = boards.filter(b => b.id !== boardId);
                if (remaining.length > 0) {
                    // Try to select the previous one, or the first one
                    const deletedIndex = boards.findIndex(b => b.id === boardId);
                    const fallback = remaining[Math.max(0, deletedIndex - 1)];
                    onSelectBoard(fallback.id);
                } else {
                    onSelectBoard('');
                }
            }
            onUpdate();
        } catch (error) {
            console.error('Failed to delete board', error);
        }
    };

    const getBoardStatus = (board: Board) => {
        const itemCount = board.items?.length || 0;

        // Gray: Empty
        if (itemCount === 0) return 'gray';

        // Orange: Known Warnings
        // 1. Width > 4m
        const config = typeof board.config === 'string' ? JSON.parse(board.config) : (board.config || {});
        if ((config.boardWidth || 0) > 4000) return 'orange';

        // Green: Good
        return 'green';
    };

    const getBoardSubtotal = (board: Board) => {
        if (!board.items) return 0;
        return board.items.reduce((sum, item) => {
            // Use cost if available, otherwise calc from unitPrice/qty
            const cost = item.cost !== undefined ? item.cost : (item.unitPrice * item.quantity);
            return sum + (cost || 0);
        }, 0);
    };

    return (
        <div className="flex flex-col h-full">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
                <h2 className="font-semibold text-gray-700">Switchboards</h2>
                <button
                    onClick={() => {
                        setEditingBoard(null);
                        setIsWizardOpen(true);
                    }}
                    className="p-1.5 hover:bg-gray-200 rounded-md text-gray-600 transition-colors"
                    title="Add Board"
                >
                    <Plus size={18} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {boards.map((board) => {
                    const status = getBoardStatus(board);
                    const subtotal = getBoardSubtotal(board);
                    const isSelected = selectedBoardId === board.id;

                    return (
                        <div
                            key={board.id}
                            onClick={() => onSelectBoard(board.id)}
                            className={cn(
                                "group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all border-l-4",
                                isSelected
                                    ? "bg-blue-50 border-blue-500 text-blue-900 shadow-sm"
                                    : "hover:bg-gray-100 border-transparent text-gray-700"
                            )}
                        >
                            <div className="flex flex-col min-w-0 flex-1 mr-2">
                                <div className="flex items-center gap-2">
                                    {/* Status Dot */}
                                    <div
                                        className={cn(
                                            "w-2 h-2 rounded-full shrink-0",
                                            status === 'green' && "bg-green-500",
                                            status === 'orange' && "bg-orange-500",
                                            status === 'gray' && "bg-gray-300"
                                        )}
                                        title={status === 'orange' ? "Has Warnings" : (status === 'gray' ? "Empty" : "Ready")}
                                    />
                                    <span className={cn("font-medium truncate", isSelected ? "text-blue-900" : "text-gray-900")}>
                                        {board.name}
                                    </span>
                                </div>
                                <div className="pl-4 flex flex-col">
                                    <span className="text-xs opacity-70 truncate">{board.type || 'Generic'}</span>
                                    <span className={cn("text-xs font-medium mt-0.5", isSelected ? "text-blue-700" : "text-gray-500")}>
                                        {new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(subtotal)}
                                    </span>
                                </div>
                            </div>

                            <div className={cn(
                                "flex items-center gap-1 opacity-0 transition-opacity shrink-0",
                                isSelected ? "opacity-100" : "group-hover:opacity-100"
                            )}>
                                {status === 'orange' && (
                                    <span className="text-orange-500 mr-1" title="Warnings present">
                                        <AlertCircle size={14} />
                                    </span>
                                )}
                                <button
                                    onClick={(e) => handleEditBoard(e, board)}
                                    className="p-1.5 hover:bg-blue-100 hover:text-blue-600 rounded-md"
                                    title="Edit Configuration"
                                >
                                    <Settings size={14} />
                                </button>
                                <button
                                    onClick={(e) => handleDeleteBoard(e, board.id)}
                                    className="p-1.5 hover:bg-red-100 hover:text-red-600 rounded-md"
                                    title="Delete Board"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    );
                })}

                {boards.length === 0 && (
                    <div className="text-center py-8 text-xs text-gray-400 italic">
                        No boards yet. Click + to add one.
                    </div>
                )}
            </div>

            <PreSelectionWizard
                isOpen={isWizardOpen}
                onClose={handleCloseWizard}
                onConfirm={handleCreateBoard}
                initialConfig={typeof editingBoard?.config === 'string'
                    ? JSON.parse(editingBoard.config)
                    : (editingBoard?.config || {})}
            />
        </div>
    );
}
