'use client';

import { useState } from 'react';
import { Plus, Trash2, Settings } from 'lucide-react';
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
    config?: string | null; // JSON string
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
                {boards.map((board) => (
                    <div
                        key={board.id}
                        onClick={() => onSelectBoard(board.id)}
                        className={cn(
                            "group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all",
                            selectedBoardId === board.id
                                ? "bg-blue-50 border-blue-200 text-blue-700 shadow-sm ring-1 ring-blue-200"
                                : "hover:bg-gray-100 text-gray-700 border border-transparent"
                        )}
                    >
                        <div className="flex flex-col truncate">
                            <span className="font-medium truncate">{board.name}</span>
                            <span className="text-xs opacity-70">{board.type || 'Generic'}</span>
                        </div>

                        <div className={cn(
                            "flex items-center gap-1 opacity-0 transition-opacity",
                            selectedBoardId === board.id ? "opacity-100" : "group-hover:opacity-100"
                        )}>
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
                ))}

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
                initialConfig={editingBoard?.config ? JSON.parse(editingBoard.config) : undefined}
            />
        </div>
    );
}
