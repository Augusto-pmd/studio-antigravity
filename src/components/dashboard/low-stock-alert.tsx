'use client';

import { useMemo } from 'react';
import { useFirestore, useCollection } from '@/firebase';
import { collection, type FirestoreDataConverter, type DocumentData, type QueryDocumentSnapshot, type SnapshotOptions } from 'firebase/firestore';
import type { StockItem } from '@/lib/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { TriangleAlert, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

const stockItemConverter: FirestoreDataConverter<StockItem> = {
    toFirestore(item: StockItem): DocumentData {
        return item as unknown as DocumentData;
    },
    fromFirestore(
        snapshot: QueryDocumentSnapshot,
        options: SnapshotOptions
    ): StockItem {
        const data = snapshot.data(options);
        return { ...data, id: snapshot.id } as StockItem;
    },
};

export function LowStockAlert() {
    const firestore = useFirestore();

    const stockQuery = useMemo(() =>
        firestore ? collection(firestore, 'inventory_consumables').withConverter(stockItemConverter) : null
        , [firestore]);

    const { data: items } = useCollection<StockItem>(stockQuery);

    const lowStockItems = useMemo(() => {
        if (!items) return [];
        return items.filter(item => {
            if (item.type !== 'CONSUMABLE') return false;
            return (
                item.minStock !== undefined &&
                item.minStock > 0 &&
                (item.quantity ?? 0) <= item.minStock
            );
        });
    }, [items]);

    if (!lowStockItems || lowStockItems.length === 0) return null;

    return (
        <div className="space-y-4">
            {lowStockItems.slice(0, 3).map(item => {
                const consumable = item as Extract<StockItem, { type: 'CONSUMABLE' }>;
                return (
                    <Alert key={item.id} variant="destructive" className="bg-destructive/10 border-destructive/20 text-destructive-foreground">
                        <TriangleAlert className="h-4 w-4" />
                        <AlertTitle>Stock Bajo: {item.name}</AlertTitle>
                        <AlertDescription className="flex items-center justify-between">
                            <span>
                                Quedan <strong>{consumable.quantity} {consumable.unit}</strong> (Mínimo: {item.minStock})
                            </span>
                            <Button asChild variant="link" size="sm" className="p-0 h-auto font-semibold text-destructive underline-offset-4">
                                <Link href="/panol">Reponer <ArrowRight className="ml-1 h-3 w-3" /></Link>
                            </Button>
                        </AlertDescription>
                    </Alert>
                );
            })}
            {lowStockItems.length > 3 && (
                <div className="text-center">
                    <Button asChild variant="link" size="sm" className="text-muted-foreground">
                        <Link href="/panol">Ver {lowStockItems.length - 3} alertas más...</Link>
                    </Button>
                </div>
            )}
        </div>
    );
}
