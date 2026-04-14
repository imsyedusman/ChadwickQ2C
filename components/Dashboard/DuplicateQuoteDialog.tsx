'use client';

import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Copy } from 'lucide-react';
import { PipedriveSearchableDropdown } from '@/components/ui/PipedriveSearchableDropdown';

interface DuplicateQuoteDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onDuplicate: (
        clientName: string, 
        clientCompany: string, 
        projectName: string,
        pipedrivePersonId?: number | null, 
        pipedriveOrgId?: number | null
    ) => Promise<void>;
    initialClientName?: string;
    initialClientCompany?: string;
    initialProjectName?: string;
}

export default function DuplicateQuoteDialog({
    isOpen,
    onClose,
    onDuplicate,
    initialClientName = '',
    initialClientCompany = '',
    initialProjectName = '',
}: DuplicateQuoteDialogProps) {
    const [clientName, setClientName] = useState(initialClientName);
    const [clientCompany, setClientCompany] = useState(initialClientCompany);
    const [projectName, setProjectName] = useState(initialProjectName);
    const [pipedrivePersonId, setPipedrivePersonId] = useState<number | null>(null);
    const [pipedriveOrgId, setPipedriveOrgId] = useState<number | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setClientName(initialClientName);
            setClientCompany(initialClientCompany);
            setProjectName(initialProjectName);
        }
    }, [isOpen, initialClientName, initialClientCompany, initialProjectName]);

    const handleConfirm = async () => {
        setIsSubmitting(true);
        try {
            await onDuplicate(clientName, clientCompany, projectName, pipedrivePersonId, pipedriveOrgId);
            onClose();
        } catch (error) {
            console.error('Duplication failed', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px] rounded-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Copy className="w-5 h-5 text-blue-600" />
                        Duplicate Quote
                    </DialogTitle>
                    <DialogDescription>
                        Create an independent copy of this quote. You can update the client and customer details below.
                    </DialogDescription>
                </DialogHeader>
                
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <label className="text-sm font-semibold text-gray-700" htmlFor="projectName">Project Name</label>
                        <input
                            id="projectName"
                            className="flex h-10 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            value={projectName}
                            onChange={(e) => setProjectName(e.target.value)}
                            placeholder="e.g., Office Renovation"
                        />
                    </div>
                    <div className="grid gap-2">
                        <label className="text-sm font-semibold text-gray-700" htmlFor="clientCompany">Client / Company Name</label>
                        <PipedriveSearchableDropdown
                            type="organization"
                            value={clientCompany}
                            onSelect={(item) => {
                                setClientCompany(item.name);
                                setPipedriveOrgId(item.pipedriveId || null);
                            }}
                            placeholder="e.g., Acme Corp"
                        />
                    </div>
                    <div className="grid gap-2">
                        <label className="text-sm font-semibold text-gray-700" htmlFor="clientName">Customer / Contact Name</label>
                        <PipedriveSearchableDropdown
                            type="person"
                            value={clientName}
                            onSelect={(item) => {
                                setClientName(item.name);
                                setPipedrivePersonId(item.pipedriveId || null);
                            }}
                            placeholder="e.g., John Doe"
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={onClose} disabled={isSubmitting} className="rounded-xl">
                        Cancel
                    </Button>
                    <Button 
                        onClick={handleConfirm} 
                        disabled={isSubmitting}
                        className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-8 shadow-lg shadow-blue-500/20"
                    >
                        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                        Duplicate Quote
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
