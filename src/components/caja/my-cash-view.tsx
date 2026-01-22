'use client';

import { useState, useEffect, useMemo } from 'react';
import { useUser, useCollection, useMemoFirebase, setDocumentNonBlocking } from '@/firebase';
import { collection, doc, query, orderBy } from 'firebase/firestore';
import type { CashAccount, CashTransaction } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { QuickExpenseDialog } from './quick-expense-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ArrowDownCircle, ArrowUpCircle } from 'lucide-react';

const formatCurrency = (amount: number, currency: string) => {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency }).format(amount);
};

const formatDate = (dateString: string) => {
  return format(parseISO(dateString), 'dd/MM/yyyy HH:mm');
}

function MyTransactionsTable({ accountId }: { accountId: string }) {
    const { user, firestore } = useUser();
    const transactionsQuery = useMemoFirebase(
        () => firestore && user ? query(collection(firestore, `users/${user.uid}/cashAccounts/${accountId}/transactions`), orderBy('date', 'desc')) : null,
        [firestore, user, accountId]
    );
    const { data: transactions, isLoading } = useCollection<CashTransaction>(transactionsQuery);

    if (isLoading) {
        return (
            <div className="space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
            </div>
        )
    }

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Descripción</TableHead>
                        <TableHead className="text-right">Monto</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {!isLoading && transactions?.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={3} className="h-24 text-center">
                                No hay movimientos en esta caja.
                            </TableCell>
                        </TableRow>
                    )}
                    {transactions?.map(tx => {
                        const isIncome = ['Ingreso', 'Refuerzo'].includes(tx.type);
                        return (
                            <TableRow key={tx.id}>
                                <TableCell className="text-xs text-muted-foreground">{formatDate(tx.date)}</TableCell>
                                <TableCell>
                                    <div className='flex items-center gap-2'>
                                        {isIncome ? <ArrowUpCircle className="h-4 w-4 text-green-500" /> : <ArrowDownCircle className="h-4 w-4 text-destructive" />}
                                        <div>
                                            <p className="font-medium">{tx.description}</p>
                                            <p className="text-xs text-muted-foreground">{tx.type}</p>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell className={cn("text-right font-mono", isIncome ? 'text-green-500' : 'text-destructive')}>
                                    {isIncome ? '+' : '-'} {formatCurrency(tx.amount, tx.currency)}
                                </TableCell>
                            </TableRow>
                        )
                    })}
                </TableBody>
            </Table>
        </div>
    )
}


export function MyCashView() {
  const { user, firestore, isUserLoading } = useUser();
  const { toast } = useToast();

  const accountsQuery = useMemoFirebase(
    () => (firestore && user ? collection(firestore, `users/${user.uid}/cashAccounts`) : null),
    [firestore, user]
  );
  const { data: accounts, isLoading: isLoadingAccounts } = useCollection<CashAccount>(accountsQuery);
  
  const arsAccount = useMemo(() => accounts?.find(a => a.currency === 'ARS'), [accounts]);
  const usdAccount = useMemo(() => accounts?.find(a => a.currency === 'USD'), [accounts]);
  
  const isLoading = isUserLoading || isLoadingAccounts;

  useEffect(() => {
    if (isLoading || !firestore || !user || accounts === null) return;

    if (accounts.length === 0) {
        toast({ title: 'Creando cajas...', description: 'Estamos preparando tus cajas personales.'});
        const cashAccountsCollection = collection(firestore, 'users', user.uid, 'cashAccounts');
        
        const arsAccountRef = doc(cashAccountsCollection);
        const arsData: CashAccount = { id: arsAccountRef.id, userId: user.uid, name: "Caja Principal ARS", currency: "ARS", balance: 0 };
        setDocumentNonBlocking(arsAccountRef, arsData, {});

        const usdAccountRef = doc(cashAccountsCollection);
        const usdData: CashAccount = { id: usdAccountRef.id, userId: user.uid, name: "Caja Principal USD", currency: "USD", balance: 0 };
        setDocumentNonBlocking(usdAccountRef, usdData, {});
    }
  }, [firestore, user, accounts, isLoading, toast]);


  if (isLoading) {
    return (
        <div className="flex flex-col gap-8">
            <Skeleton className="h-10 w-1/3" />
            <div className="grid gap-6 md:grid-cols-2">
                <Skeleton className="h-40 w-full" />
                <Skeleton className="h-40 w-full" />
            </div>
            <Skeleton className="h-64 w-full" />
        </div>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-headline">Mi Caja</h1>
        <QuickExpenseDialog arsAccount={arsAccount} usdAccount={usdAccount} />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Saldo en Pesos (ARS)</CardTitle>
            <CardDescription>Saldo actual disponible en tu caja.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold font-mono">{formatCurrency(arsAccount?.balance ?? 0, 'ARS')}</p>
          </CardContent>
          <CardFooter>
             {arsAccount && <MyTransactionsTable accountId={arsAccount.id} />}
          </CardFooter>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Saldo en Dólares (USD)</CardTitle>
            <CardDescription>Saldo actual disponible en tu caja.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold font-mono">{formatCurrency(usdAccount?.balance ?? 0, 'USD')}</p>
          </CardContent>
           <CardFooter>
            {usdAccount && <MyTransactionsTable accountId={usdAccount.id} />}
           </CardFooter>
        </Card>
      </div>
    </div>
  );
}

    