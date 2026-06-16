'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from '@/components/ui/command';
import { FileText, Briefcase, Settings, Shield } from 'lucide-react';

export function CommandPalette() {
    const router = useRouter();
    const [open, setOpen] = React.useState(false);
    const [search, setSearch] = React.useState('');
    const [quotes, setQuotes] = React.useState<any[]>([]);
    const [loading, setLoading] = React.useState(false);

    React.useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen((open) => !open);
            }
        };

        const handleCustomOpen = () => setOpen(true);

        document.addEventListener('keydown', down);
        window.addEventListener('open-command-palette', handleCustomOpen);
        
        return () => {
            document.removeEventListener('keydown', down);
            window.removeEventListener('open-command-palette', handleCustomOpen);
        };
    }, []);

    React.useEffect(() => {
        if (!open) {
            setSearch('');
            setQuotes([]);
            return;
        }

        if (!search.trim()) {
            setQuotes([]);
            return;
        }

        const fetchQuotes = async () => {
            setLoading(true);
            try {
                const res = await fetch(`/api/quotes?search=${encodeURIComponent(search)}&limit=10`);
                if (res.ok) {
                    const data = await res.json();
                    setQuotes(data.data || []);
                }
            } catch (error) {
                console.error('Failed to fetch quotes for command palette:', error);
            } finally {
                setLoading(false);
            }
        };

        const debounceTimer = setTimeout(() => {
            fetchQuotes();
        }, 300);

        return () => clearTimeout(debounceTimer);
    }, [search, open]);

    const handleSelect = (callback: () => void) => {
        setOpen(false);
        callback();
    };

    return (
        <CommandDialog open={open} onOpenChange={setOpen}>
            <CommandInput
                placeholder="Search quotes or type a command..."
                value={search}
                onValueChange={setSearch}
            />
            <CommandList>
                <CommandEmpty>{loading ? 'Searching...' : 'No results found.'}</CommandEmpty>

                {quotes.length > 0 && (
                    <CommandGroup heading="Quotes">
                        {quotes.map((quote) => (
                            <CommandItem
                                key={quote.id}
                                value={`quote-${quote.quoteNumber}-${quote.projectRef || ''}-${quote.clientName || ''}-${quote.clientCompany || ''}`}
                                onSelect={() => handleSelect(() => router.push(`/quote/${quote.id}`))}
                                className="cursor-pointer"
                            >
                                <FileText className="mr-2 h-4 w-4 text-blue-500" />
                                <div className="flex flex-col">
                                    <span className="font-medium">{quote.quoteNumber}</span>
                                    <span className="text-xs text-gray-500">
                                        {quote.projectRef || quote.clientName || quote.clientCompany}
                                    </span>
                                </div>
                            </CommandItem>
                        ))}
                    </CommandGroup>
                )}

                {quotes.length > 0 && <CommandSeparator />}

                <CommandGroup heading="Navigation">
                    <CommandItem
                        value="nav-quotes"
                        onSelect={() => handleSelect(() => router.push('/'))}
                        className="cursor-pointer"
                    >
                        <FileText className="mr-2 h-4 w-4 text-gray-500" />
                        <span>Quotes</span>
                    </CommandItem>
                    <CommandItem
                        value="nav-projects"
                        onSelect={() => handleSelect(() => router.push('/projects'))}
                        className="cursor-pointer"
                    >
                        <Briefcase className="mr-2 h-4 w-4 text-gray-500" />
                        <span>Projects</span>
                    </CommandItem>
                    <CommandItem
                        value="nav-settings"
                        onSelect={() => handleSelect(() => router.push('/settings'))}
                        className="cursor-pointer"
                    >
                        <Settings className="mr-2 h-4 w-4 text-gray-500" />
                        <span>Settings</span>
                    </CommandItem>
                    <CommandItem
                        value="nav-admin"
                        onSelect={() => handleSelect(() => router.push('/admin'))}
                        className="cursor-pointer"
                    >
                        <Shield className="mr-2 h-4 w-4 text-gray-500" />
                        <span>Admin</span>
                    </CommandItem>
                </CommandGroup>
            </CommandList>
        </CommandDialog>
    );
}
