'use client';

import { useState, useEffect } from 'react';
import { 
    Share2, 
    Link, 
    Copy, 
    Check, 
    Trash2, 
    ExternalLink, 
    Clock, 
    ShieldCheck,
    Loader2,
    Calendar,
    XCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ShareLink {
    id: string;
    token: string;
    expiresAt: string | null;
    createdAt: string;
    active: boolean;
}

interface ShareDialogProps {
    quoteId: string;
    isOpen: boolean;
    onClose: () => void;
}

export default function ShareDialog({ quoteId, isOpen, onClose }: ShareDialogProps) {
    const [links, setLinks] = useState<ShareLink[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const fetchLinks = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`/api/quotes/${quoteId}/share`);
            if (!res.ok) throw new Error('Failed to fetch links');
            const data = await res.json();
            setLinks(data);
        } catch (error) {
            toast.error('Failed to load share links');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchLinks();
        }
    }, [isOpen, quoteId]);

    const handleCreateLink = async () => {
        setIsCreating(true);
        try {
            const res = await fetch(`/api/quotes/${quoteId}/share`, {
                method: 'POST'
            });
            if (!res.ok) throw new Error('Failed to create link');
            toast.success('New share link generated');
            fetchLinks();
        } catch (error) {
            toast.error('Failed to generate link');
        } finally {
            setIsCreating(false);
        }
    };

    const handleDisableLink = async (tokenId: string) => {
        try {
            const res = await fetch(`/api/quotes/${quoteId}/share/inline/${tokenId}`, {
                method: 'DELETE'
            });
            if (!res.ok) throw new Error('Failed to disable link');
            toast.success('Link disabled successfully');
            setLinks(links.filter(l => l.id !== tokenId));
        } catch (error) {
            toast.error('Failed to disable link');
        }
    };

    const copyToClipboard = (token: string, id: string) => {
        const url = `${window.location.origin}/shared-quote/${token}`;
        navigator.clipboard.writeText(url);
        setCopiedId(id);
        toast.success('Link copied to clipboard');
        setTimeout(() => setCopiedId(null), 2000);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[540px] p-0 overflow-hidden border-none rounded-3xl shadow-2xl">
                <div className="bg-blue-600 p-8 text-white">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold flex items-center gap-3">
                            <div className="p-2 bg-white/10 rounded-xl">
                                <Share2 className="w-6 h-6" />
                            </div>
                            Share Quote Access
                        </DialogTitle>
                        <DialogDescription className="text-blue-100 mt-2 font-medium">
                            Generate secure, read-only links to share this quote with clients or contractors.
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <div className="p-8 space-y-8 bg-white max-h-[70vh] overflow-y-auto">
                    {/* Security Note */}
                    <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100 flex items-start gap-4">
                        <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                            <p className="text-xs font-bold text-blue-900 uppercase tracking-wider">Secure Access Only</p>
                            <p className="text-xs text-blue-700 leading-relaxed font-medium">
                                Recipients can view board details and calculations but cannot edit any data or access internal notes.
                            </p>
                        </div>
                    </div>

                    {/* Action */}
                    <Button 
                        onClick={handleCreateLink}
                        disabled={isCreating}
                        className="w-full h-auto py-5 rounded-2xl bg-gray-900 hover:bg-gray-800 text-white font-bold flex items-center justify-center gap-3 shadow-xl transition-all border-none"
                    >
                        {isCreating ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <Link className="w-5 h-5" />
                        )}
                        Generate New Shareable Link
                    </Button>

                    {/* Links List */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between px-1">
                            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Active Links</h3>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">{links.length} Total</span>
                        </div>

                        {isLoading ? (
                            <div className="py-12 flex flex-col items-center justify-center gap-2">
                                <Loader2 className="w-8 h-8 text-gray-300 animate-spin" />
                                <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Synchronizing links...</p>
                            </div>
                        ) : links.length === 0 ? (
                            <div className="py-12 border-2 border-dashed border-gray-100 rounded-3xl flex flex-col items-center justify-center text-center">
                                <XCircle className="w-10 h-10 text-gray-100 mb-3" />
                                <p className="text-sm font-bold text-gray-400">No active share links</p>
                                <p className="text-xs text-gray-500 max-w-[200px] mt-1">Generate a link above to share this quote.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {links.map((link) => (
                                    <div key={link.id} className="p-4 rounded-2xl bg-gray-50 border border-gray-100 group hover:border-blue-200 transition-all">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-white border border-gray-100 flex items-center justify-center shadow-sm">
                                                    <Calendar className="w-4 h-4 text-gray-400" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Generated</span>
                                                    <span className="text-sm font-bold text-gray-700">{format(new Date(link.createdAt), 'MMM d, yyyy')}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-green-50 text-green-600 border border-green-100">
                                                <Clock className="w-3.5 h-3.5" />
                                                <span className="text-[10px] font-bold uppercase tracking-widest">Valid 30 Days</span>
                                            </div>
                                        </div>

                                        <div className="flex gap-2">
                                            <div className="flex-1 px-3 py-2.5 bg-white border border-gray-100 rounded-xl text-[10px] font-mono text-gray-400 truncate flex items-center gap-2">
                                                <ExternalLink className="w-3 h-3" />
                                                .../shared-quote/{link.token.substring(0, 8)}...
                                            </div>
                                            <Button 
                                                variant="ghost"
                                                onClick={() => copyToClipboard(link.token, link.id)}
                                                className={cn(
                                                    "h-auto p-2.5 rounded-xl transition-all duration-300",
                                                    copiedId === link.id ? "bg-green-600 text-white" : "bg-white border border-gray-100 text-gray-600 hover:bg-gray-50"
                                                )}
                                            >
                                                {copiedId === link.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                            </Button>
                                            <Button 
                                                variant="ghost"
                                                onClick={() => handleDisableLink(link.id)}
                                                className="h-auto p-2.5 rounded-xl bg-white border border-gray-100 text-gray-400 hover:text-red-600 hover:bg-red-50 hover:border-red-100"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="pt-4 flex justify-end">
                        <Button 
                            variant="secondary" 
                            onClick={onClose}
                            className="rounded-xl px-8 font-bold bg-gray-100 text-gray-600 hover:bg-gray-200 border-none h-12"
                        >
                            Dismiss
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
