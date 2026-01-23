'use client';

import { useMemo } from 'react';
import { useUser } from '@/context/user-context';
import { useCollection, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import type { TreasuryAccount } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Banknote, Landmark, MoreVertical, PlusCircle, View } from 'lucide-react';
import { AddTreasuryAccountDialog } from './add-treasury-account-dialog';
import { AddTreasuryTransactionDialog } from './add-treasury-transaction-dialog';
import { ViewTreasuryTransactionsDialog } from './view-treasury-transactions-dialog';

const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency }).format(amount);
};

export function TreasuryAccounts() {
    const { firestore, permissions } = useUser();
    const canManage = permissions.isSuperAdmin;

    const accountsQuery = useMemoFirebase(
        () => (firestore && canManage ? query(collection(firestore, 'treasuryAccounts')) : null),
        [firestore, canManage]
    );
    const { data: accounts, isLoading } = useCollection<TreasuryAccount>(accountsQuery);

    if (!canManage) {
        return (
            <Card>
                <CardContent className="flex h-64 flex-col items-center justify-center gap-4 text-center">
                    <p className="text-lg font-medium text-muted-foreground">Acceso Denegado</p>
                    <p className="text-sm text-muted-foreground">No tienes permisos para acceder a esta sección.</p>
                </CardContent>
            </Card>
        )
    }

    if (isLoading) {
        return (
             <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-48 w-full" />
             </div>
        )
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-end">
                <AddTreasuryAccountDialog>
                    <Button>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Nueva Cuenta
                    </Button>
                </AddTreasuryAccountDialog>
            </div>
            
            {accounts && accounts.length === 0 && (
                <div className="flex h-40 items-center justify-center rounded-md border border-dashed">
                    <p className="text-muted-foreground">No hay cuentas de tesorería. Comience creando una.</p>
                </div>
            )}

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {accounts?.map(account => (
                    <Card key={account.id}>
                        <CardHeader>
                            <div className="flex items-start justify-between">
                                <div className='flex items-center gap-3'>
                                    {account.accountType === 'Banco' ? <Landmark className="h-8 w-8 text-muted-foreground" /> : <Banknote className="h-8 w-8 text-muted-foreground" />}
                                    <div>
                                        <CardTitle>{account.name}</CardTitle>
                                        <CardDescription>{account.accountType} ({account.currency})</CardDescription>
                                    </div>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-bold font-mono">{formatCurrency(account.balance, account.currency)}</p>
                        </CardContent>
                        <CardFooter className="flex gap-2">
                            <AddTreasuryTransactionDialog account={account}>
                                <Button className="flex-1">
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    Nuevo Movimiento
                                </Button>
                            </AddTreasuryTransactionDialog>
                            <ViewTreasuryTransactionsDialog account={account}>
                                <Button variant="outline" className="flex-1">
                                    <View className="mr-2 h-4 w-4" />
                                    Ver Movimientos
                                </Button>
                            </ViewTreasuryTransactionsDialog>
                        </CardFooter>
                    </Card>
                ))}
            </div>
        </div>
    );
}
