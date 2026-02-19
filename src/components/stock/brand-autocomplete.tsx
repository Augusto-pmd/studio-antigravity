'use client';

import * as React from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';

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
import { collection, getDocs, limit, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface BrandAutocompleteProps {
    value: string;
    onChange: (value: string) => void;
    category?: string;
}

export function BrandAutocomplete({ value, onChange, category }: BrandAutocompleteProps) {
    const [open, setOpen] = React.useState(false);
    const [brands, setBrands] = React.useState<string[]>([]);
    const [dbBrands, setDbBrands] = React.useState<string[]>([]); // Brands from DB
    const [inputValue, setInputValue] = React.useState(''); // For typing new brands

    React.useEffect(() => {
        const fetchBrands = async () => {
            // We fetch from both collections to get a good list of brands
            // Limit to 100 recent items from each to avoid performance hit
            try {
                const toolsRef = collection(db, 'inventory_tools');
                const consumablesRef = collection(db, 'inventory_consumables');

                const [toolsSnap, consumablesSnap] = await Promise.all([
                    getDocs(query(toolsRef, orderBy('lastUpdated', 'desc'), limit(50))),
                    getDocs(query(consumablesRef, orderBy('lastUpdated', 'desc'), limit(50)))
                ]);

                const extractedBrands = new Set<string>();

                toolsSnap.forEach(doc => {
                    const data = doc.data();
                    if (data.brand) extractedBrands.add(data.brand);
                });

                consumablesSnap.forEach(doc => {
                    const data = doc.data();
                    // Consumables might not have brand in type, but might in DB if added loosely
                    if (data.brand) extractedBrands.add(data.brand);
                });

                const sortedBrands = Array.from(extractedBrands).sort();
                setDbBrands(sortedBrands);
                setBrands(sortedBrands);

            } catch (error) {
                console.error("Error fetching brands:", error);
            }
        };

        fetchBrands();
    }, []);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between"
                >
                    {value ? value : "Seleccionar o escribir marca..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0">
                <Command>
                    <CommandInput
                        placeholder="Buscar marca..."
                        value={inputValue}
                        onValueChange={(search) => {
                            setInputValue(search);
                            // Allow typing new values
                            if (!dbBrands.includes(search)) {
                                onChange(search);
                            }
                        }}
                    />
                    <CommandList>
                        <CommandEmpty>
                            {inputValue && (
                                <div onClick={() => {
                                    onChange(inputValue);
                                    setOpen(false);
                                }} className="p-2 cursor-pointer hover:bg-accent text-sm">
                                    Usar: "{inputValue}"
                                </div>
                            )}
                            {!inputValue && "No hay marcas encontradas."}
                        </CommandEmpty>
                        <CommandGroup>
                            {dbBrands.map((brand) => (
                                <CommandItem
                                    key={brand}
                                    value={brand}
                                    onSelect={(currentValue) => {
                                        onChange(currentValue);
                                        setOpen(false);
                                    }}
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            value === brand ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    {brand}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
