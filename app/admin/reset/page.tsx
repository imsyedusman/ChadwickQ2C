'use client';

import { useState } from 'react';
import { 
    Trash2, 
    AlertTriangle, 
    RefreshCcw, 
    Database, 
    Briefcase,
    Loader2,
    ShieldAlert,
    ChevronLeft
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { 
    Card, 
    CardHeader, 
    CardTitle, 
    CardDescription, 
    CardContent,
    CardFooter
} from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function DataResetPage() {
    const [isResettingQuotes, setIsResettingQuotes] = useState(false);
    const [isResettingProjects, setIsResettingProjects] = useState(false);
    const [quoteConfirmation, setQuoteConfirmation] = useState('');
    const [projectConfirmation, setProjectConfirmation] = useState('');
    const [isQuoteDialogOpen, setIsQuoteDialogOpen] = useState(false);
    const [isProjectDialogOpen, setIsProjectDialogOpen] = useState(false);

    const handleResetQuotes = async () => {
        if (quoteConfirmation !== 'DELETE QUOTES') return;
        
        setIsResettingQuotes(true);
        try {
            const res = await fetch('/api/admin/reset', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'RESET_QUOTES' }),
            });
            const data = await res.json();
            
            if (data.success) {
                toast.success('Successfully reset all quotes.');
                setIsQuoteDialogOpen(false);
                setQuoteConfirmation('');
            } else {
                throw new Error(data.error || 'Failed to reset quotes.');
            }
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsResettingQuotes(false);
        }
    };

    const handleResetProjects = async () => {
        if (projectConfirmation !== 'DELETE PROJECTS') return;
        
        setIsResettingProjects(true);
        try {
            const res = await fetch('/api/admin/reset', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'RESET_PROJECTS_FULL' }),
            });
            const data = await res.json();
            
            if (data.success) {
                toast.success('Successfully reset all projects and related data.');
                setIsProjectDialogOpen(false);
                setProjectConfirmation('');
            } else {
                throw new Error(data.error || 'Failed to reset projects.');
            }
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsResettingProjects(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#f8fafc]">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-in fade-in duration-500">
                {/* Breadcrumb/Back link */}
                <Link 
                    href="/admin" 
                    className="flex items-center text-sm font-bold text-slate-500 hover:text-blue-600 mb-8 transition-colors group"
                >
                    <ChevronLeft className="w-4 h-4 mr-1 transition-transform group-hover:-translate-x-1" />
                    Back to Admin Center
                </Link>

                {/* Header */}
                <div className="mb-12">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center shadow-sm border border-red-100">
                            <ShieldAlert className="w-8 h-8 text-red-600" />
                        </div>
                        <div>
                            <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Data Management & Reset</h1>
                            <p className="text-slate-500 font-medium mt-1">Irreversible system-wide reset controls for testing and purification.</p>
                        </div>
                    </div>
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex gap-3 items-start">
                        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                        <p className="text-sm text-amber-800 font-medium leading-relaxed">
                            <strong>Use with extreme caution:</strong> These actions bypass standard safety checks and will permanently purge data from the production database. Each execution is logged to the system audit trail.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-8">
                    {/* Reset Quotes Card */}
                    <Card className="border-slate-200 shadow-xl shadow-slate-200/50 rounded-[2rem] overflow-hidden group hover:border-blue-200 transition-all duration-300">
                        <CardHeader className="bg-white p-8 pb-4">
                            <div className="flex items-center gap-4 mb-2">
                                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                                    <Database className="w-5 h-5 text-blue-600" />
                                </div>
                                <CardTitle className="text-2xl font-bold text-slate-900">Quotes Reset</CardTitle>
                            </div>
                            <CardDescription className="text-slate-500 text-base">Wipe all quoting records, boards, and pricing snapshots while maintaining commercial context.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-8 pt-4">
                            <div className="space-y-4">
                                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Entities to be purged</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-6">
                                    {[
                                        'All Quotes & Revisions',
                                        'Board Configurations',
                                        'BOM Line Items',
                                        'Commercial Adjustments',
                                        'Active Share Links',
                                        'Historical Snapshots'
                                    ].map((item) => (
                                        <div key={item} className="flex items-center text-sm text-slate-600 font-bold">
                                            <div className="w-2 h-2 rounded-full bg-blue-500 mr-3 shadow-sm shadow-blue-500/40" />
                                            {item}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="bg-slate-50/50 border-t border-slate-100 p-8 flex justify-end">
                            <Dialog open={isQuoteDialogOpen} onOpenChange={setIsQuoteDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="destructive" className="group h-12 rounded-xl px-8 font-black uppercase tracking-wider shadow-lg shadow-red-500/20 active:scale-95 transition-all">
                                        <Trash2 className="w-4 h-4 mr-2 group-hover:shake" />
                                        Reset All Quotes
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-md rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden">
                                    <div className="bg-red-600 p-8 text-white">
                                        <DialogHeader>
                                            <DialogTitle className="text-3xl font-black tracking-tight leading-none mb-2">CRITICAL ACTION</DialogTitle>
                                            <DialogDescription className="text-red-100 text-lg font-medium">
                                                Confirm you want to purge <span className="underline decoration-white underline-offset-4">all quoting data</span>.
                                            </DialogDescription>
                                        </DialogHeader>
                                    </div>
                                    <div className="p-8 space-y-6">
                                        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex gap-3">
                                            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
                                            <div className="text-sm text-red-700 leading-relaxed font-medium">
                                                <strong>Irreversible Operation:</strong> This will delete everything related to Quotes. Projects, Clients, and Contacts will not be affected.
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] pl-1">Confirm with Keyphrase</label>
                                            <input 
                                                type="text"
                                                placeholder="Type 'DELETE QUOTES' to confirm"
                                                value={quoteConfirmation}
                                                onChange={(e) => setQuoteConfirmation(e.target.value)}
                                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-6 text-base focus:outline-none focus:ring-4 focus:ring-red-500/10 focus:border-red-500 transition-all font-black placeholder:font-normal placeholder:text-slate-400"
                                            />
                                        </div>
                                        <DialogFooter>
                                            <Button 
                                                onClick={handleResetQuotes}
                                                disabled={quoteConfirmation !== 'DELETE QUOTES' || isResettingQuotes}
                                                variant="destructive"
                                                className={cn(
                                                    "w-full h-14 rounded-2xl font-black text-base shadow-2xl transition-all",
                                                    quoteConfirmation === 'DELETE QUOTES' ? "shadow-red-500/40 hover:scale-[1.02]" : "opacity-50"
                                                )}
                                            >
                                                {isResettingQuotes ? (
                                                    <>
                                                        <Loader2 className="w-6 h-6 mr-3 animate-spin" />
                                                        Resetting Quotes...
                                                    </>
                                                ) : (
                                                    'EXECUTE FULL QUOTE WIPE'
                                                )}
                                            </Button>
                                        </DialogFooter>
                                    </div>
                                </DialogContent>
                            </Dialog>
                        </CardFooter>
                    </Card>

                    {/* Reset Projects Card */}
                    <Card className="border-slate-200 shadow-xl shadow-slate-200/50 rounded-[2rem] overflow-hidden group hover:border-orange-200 transition-all duration-300">
                        <CardHeader className="bg-white p-8 pb-4">
                            <div className="flex items-center gap-4 mb-2">
                                <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center">
                                    <Briefcase className="w-5 h-5 text-orange-600" />
                                </div>
                                <CardTitle className="text-2xl font-bold text-slate-900">Commercial Sync Reset</CardTitle>
                            </div>
                            <CardDescription className="text-slate-500 text-base">Purge synced commercial entities to allow for a fresh Pipedrive synchronization.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-8 pt-4">
                            <div className="space-y-4">
                                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Entities to be purged</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-6">
                                    {[
                                        'All Projects & References',
                                        'Client / Company Database',
                                        'Contact Directory',
                                        'Pipedrive Sync History',
                                        'Import Batch Logs',
                                        'Entity Relationships'
                                    ].map((item) => (
                                        <div key={item} className="flex items-center text-sm text-slate-600 font-bold">
                                            <div className="w-2 h-2 rounded-full bg-orange-500 mr-3 shadow-sm shadow-orange-500/40" />
                                            {item}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="bg-slate-50/50 border-t border-slate-100 p-8 flex justify-end">
                            <Dialog open={isProjectDialogOpen} onOpenChange={setIsProjectDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="outline" className="h-12 border-2 border-red-200 text-red-600 bg-white hover:bg-red-50 rounded-xl px-8 font-black uppercase tracking-wider active:scale-95 transition-all">
                                        <RefreshCcw className="w-4 h-4 mr-2" />
                                        Wipe Projects & Sycned Data
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-md rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden">
                                    <div className="bg-orange-600 p-8 text-white">
                                        <DialogHeader>
                                            <DialogTitle className="text-3xl font-black tracking-tight leading-none mb-2">COMMERCIAL PURGE</DialogTitle>
                                            <DialogDescription className="text-orange-50 text-lg font-medium">
                                                Cleanse <span className="underline decoration-white underline-offset-4">all commercial sync data</span>.
                                            </DialogDescription>
                                        </DialogHeader>
                                    </div>
                                    <div className="p-8 space-y-6">
                                        <div className="p-4 bg-orange-50 border border-orange-100 rounded-2xl flex gap-3">
                                            <AlertTriangle className="w-5 h-5 text-orange-600 shrink-0" />
                                            <div className="text-sm text-orange-700 leading-relaxed font-medium">
                                                <strong>Impact Warning:</strong> Existing Quotes will be unlinked from Projects, but will NOT be deleted. You should re-sync after this operation.
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] pl-1">Confirm with Keyphrase</label>
                                            <input 
                                                type="text"
                                                placeholder="Type 'DELETE PROJECTS' to confirm"
                                                value={projectConfirmation}
                                                onChange={(e) => setProjectConfirmation(e.target.value)}
                                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-6 text-base focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all font-black placeholder:font-normal placeholder:text-slate-400"
                                            />
                                        </div>
                                        <DialogFooter>
                                            <Button 
                                                onClick={handleResetProjects}
                                                disabled={projectConfirmation !== 'DELETE PROJECTS' || isResettingProjects}
                                                variant="destructive"
                                                className={cn(
                                                    "w-full h-14 rounded-2xl font-black text-base shadow-2xl transition-all border-none bg-orange-600 hover:bg-orange-700",
                                                    projectConfirmation === 'DELETE PROJECTS' ? "shadow-orange-500/40 hover:scale-[1.02]" : "opacity-50"
                                                )}
                                            >
                                                {isResettingProjects ? (
                                                    <>
                                                        <Loader2 className="w-6 h-6 mr-3 animate-spin" />
                                                        Resetting Data...
                                                    </>
                                                ) : (
                                                    'EXECUTE FULL COMMERCIAL WIPE'
                                                )}
                                            </Button>
                                        </DialogFooter>
                                    </div>
                                </DialogContent>
                            </Dialog>
                        </CardFooter>
                    </Card>
                </div>
            </div>
        </div>
    );
}
