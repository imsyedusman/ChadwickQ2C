'use client';

import * as React from 'react';
import { Check, ChevronsUpDown, Loader2, Search, Building2, User, Briefcase, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';

export interface PipedriveItem {
    id?: string | number;
    name: string;
    type: 'organization' | 'person' | 'deal' | 'manual';
    pipedriveId?: number;
}

interface Props {
    type: 'organization' | 'person' | 'deal';
    value: string;
    onSelect: (item: PipedriveItem) => void;
    placeholder?: string;
    className?: string;
    disabled?: boolean;
}

export function PipedriveSearchableDropdown({
    type,
    value,
    onSelect,
    placeholder,
    className,
    disabled
}: Props) {
    const [open, setOpen] = React.useState(false);
    const [search, setSearch] = React.useState('');
    const [localResults, setLocalResults] = React.useState<PipedriveItem[]>([]);
    const [pipedriveResults, setPipedriveResults] = React.useState<PipedriveItem[]>([]);
    const [isLoadingLocal, setIsLoadingLocal] = React.useState(false);
    const [isLoadingRemote, setIsLoadingRemote] = React.useState(false);

    const typeLabel = type === 'organization' ? 'Company' : type === 'person' ? 'Client' : 'Project';
    const Icon = type === 'organization' ? Building2 : type === 'person' ? User : Briefcase;

    const fetchLocal = React.useCallback(async (term: string) => {
        setIsLoadingLocal(true);
        try {
            const endpoint = type === 'organization' ? 'clients' : type === 'person' ? 'contacts' : 'projects';
            const res = await fetch(`/api/${endpoint}?search=${encodeURIComponent(term)}`);
            if (res.ok) {
                const data = await res.json();
                const items = (data.clients || data.contacts || data.projects || []).map((item: any) => ({
                    id: item.id,
                    name: item.name || item.projectName,
                    type: 'manual' as const,
                    pipedriveId: item.pipedrive_org_id || item.pipedrive_person_id || item.pipedrive_deal_id
                }));
                setLocalResults(items);
            }
        } catch (error) {
            console.error('Local fetch error:', error);
        } finally {
            setIsLoadingLocal(false);
        }
    }, [type]);

    const fetchRemote = React.useCallback(async (term: string) => {
        if (term.length < 3) {
            setPipedriveResults([]);
            return;
        }
        setIsLoadingRemote(true);
        try {
            const endpoint = type === 'organization' ? 'organizations' : type === 'person' ? 'persons' : 'deals';
            const res = await fetch(`/api/pipedrive/search/${endpoint}?term=${encodeURIComponent(term)}`);
            if (res.ok) {
                const data = await res.json();
                const items = (data.items || []).map((item: any) => ({
                    id: item.id,
                    name: item.name || item.title,
                    type: type,
                    pipedriveId: item.id
                }));
                setPipedriveResults(items);
            }
        } catch (error) {
            console.error('Remote fetch error:', error);
        } finally {
            setIsLoadingRemote(false);
        }
    }, [type]);

    // Initial search
    React.useEffect(() => {
        if (open && search === '') {
            fetchLocal('');
        }
    }, [open, search, fetchLocal]);

    // Debounced remote search
    React.useEffect(() => {
        if (!open || search === '') return;
        
        const localTimer = setTimeout(() => fetchLocal(search), 100);
        const remoteTimer = setTimeout(() => fetchRemote(search), 400);

        return () => {
            clearTimeout(localTimer);
            clearTimeout(remoteTimer);
        };
    }, [search, open, fetchLocal, fetchRemote]);

    const mergedResults = React.useMemo(() => {
        const map = new Map<string, PipedriveItem>();
        
        // Add local results first (manual or previously synced)
        localResults.forEach(item => {
            const key = item.pipedriveId ? `pd-${item.pipedriveId}` : `local-${item.name}`;
            map.set(key, item);
        });

        // Add Pipedrive results (overwrite local if same ID to ensure latest name)
        pipedriveResults.forEach(item => {
            const key = `pd-${item.pipedriveId}`;
            map.set(key, item);
        });

        return Array.from(map.values());
    }, [localResults, pipedriveResults]);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    disabled={disabled}
                    className={cn("w-full justify-between h-10 px-3 bg-white border-gray-200 rounded-lg hover:bg-gray-50 text-left font-normal", className)}
                >
                    <div className="flex items-center gap-2 truncate">
                        <Icon size={14} className="text-gray-400 shrink-0" />
                        <span className={cn("truncate", !value && "text-gray-400")}>
                            {value || placeholder || `Select ${typeLabel}...`}
                        </span>
                    </div>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                <Command shouldFilter={false}>
                    <div className="flex items-center border-b px-3">
                        <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                        <input
                            className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                            placeholder={`Search ${typeLabel}s...`}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                        {(isLoadingLocal || isLoadingRemote) && <Loader2 className="h-4 w-4 animate-spin text-blue-500 ml-2" />}
                    </div>
                    <CommandList className="max-h-[300px]">
                        <CommandEmpty className="py-2 px-4 text-sm text-gray-500">
                            No matching {typeLabel.toLowerCase()}s found.
                        </CommandEmpty>
                        <CommandGroup>
                            {mergedResults.map((item) => (
                                <CommandItem
                                    key={item.pipedriveId ? `pd-${item.pipedriveId}` : `local-${item.name}`}
                                    value={item.name}
                                    onSelect={() => {
                                        onSelect(item);
                                        setOpen(false);
                                    }}
                                    className="flex items-center justify-between py-2 px-3 cursor-pointer"
                                >
                                    <div className="flex items-center gap-2 flex-1 truncate">
                                        <Icon size={14} className="text-gray-400 shrink-0" />
                                        <span className="truncate">{item.name}</span>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        {item.pipedriveId ? (
                                            <div className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-[9px] font-bold border border-blue-100 uppercase tracking-tighter shrink-0">
                                                <img src="/pipedrive.jpeg" alt="PD" className="w-2.5 h-2.5 rounded-sm" />
                                                Pipedrive
                                            </div>
                                        ) : (
                                            <div className="px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded text-[9px] font-bold border border-gray-200 uppercase tracking-tighter shrink-0">
                                                Local
                                            </div>
                                        )}
                                        {value === item.name && <Check className="h-4 w-4 text-blue-600" />}
                                    </div>
                                </CommandItem>
                            ))}
                            {search.length > 0 && !mergedResults.some(m => m.name.toLowerCase() === search.toLowerCase()) && (
                                <CommandItem
                                    value={search}
                                    onSelect={() => {
                                        onSelect({ name: search, type: 'manual' });
                                        setOpen(false);
                                    }}
                                    className="flex items-center gap-2 py-2 px-3 cursor-pointer text-blue-600 font-medium"
                                >
                                    <Plus size={14} />
                                    <span>Use "{search}"</span>
                                </CommandItem>
                            )}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
