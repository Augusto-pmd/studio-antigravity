'use client';

import { useMemo } from 'react';
import { useUser } from '@/context/user-context';
import { useCollection } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import type { CashAccount, CashTransaction } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { QuickExpenseDialog } from './quick-expense-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ArrowDownCircle, ArrowUpCircle, Landmark, Pencil, PlusCircle, Wallet } from 'lucide-react';
import { FundTransferDialog } from '@/components/cajas/fund-transfer-dialog';
import { Button } from '../ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { AddCashAccountDialog } from './add-cash-account-dialog';
import { EditCashAccountDialog } from './edit-cash-account-dialog';

const formatCurrency = (amount: number, currency: string) => {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency }).format(amount);
};

const formatDate = (dateString: string) => {
  return format(parseISO(dateString), 'dd/MM/yyyy HH:mm');
}

function MyTransactionsTable({ accountId }: { accountId: string }) {
    const { user, firestore } = useUser();
    const transactionsQuery = useMemo(
        () => firestore && user ? query(collection(firestore, `users/${user.uid}/cashAccounts/${accountId}/transactions`), orderBy('date', 'desc')) : null,
        [firestore, user, accountId]
    );
    const { data: transactions, isLoading } = useCollection<CashTransaction>(transactionsQuery);

    if (isLoading) {
        return (
            <div className="space-y-2">
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
  const { user, firestore, isUserLoading, role } = useUser();

  const accountsQuery = useMemo(
    () => (firestore && user ? query(collection(firestore, `users/${user.uid}/cashAccounts`)) : null),
    [firestore, user]
  );
  const { data: accounts, isLoading: isLoadingAccounts } = useCollection<CashAccount>(accountsQuery);
  
  const isLoading = isUserLoading || isLoadingAccounts;

  const userProfile = useMemo(() => {
    if (!user) return null;
    return {
      id: user.uid,
      email: user.email || '',
      fullName: user.displayName || 'Usuario Anónimo',
      photoURL: user.photoURL || undefined,
      role,
    };
  }, [user, role]);

  if (isLoading) {
    return (
        <div className="flex flex-col gap-8">
            <Skeleton className="h-10 w-1/3" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-64 w-full" />
        </div>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-3xl font-headline">Mis Cajas</h1>
        <AddCashAccountDialog disabled={(accounts?.length ?? 0) >= 3}>
            <Button disabled={(accounts?.length ?? 0) >= 3}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Crear Nueva Caja
            </Button>
        </AddCashAccountDialog>
      </div>

      <p className="text-muted-foreground">
        Gestiona tus cajas de efectivo en ARS. Puedes tener hasta 3 cajas diferentes.
      </p>

      {accounts && accounts.length > 0 ? (
        <Accordion type="single" collapsible className="w-full space-y-4">
            {accounts.map(account => (
                <Card key={account.id}>
                    <AccordionItem value={account.id} className="border-b-0">
                        <AccordionTrigger className="p-6 hover:no-underline">
                            <div className="flex items-center gap-4 flex-grow">
                                <Wallet className="h-8 w-8 text-muted-foreground" />
                                <div>
                                    <h3 className="text-lg font-semibold text-left">{account.name}</h3>
                                    <p className="text-2xl font-bold font-mono text-left">{formatCurrency(account.balance, 'ARS')}</p>
                                </div>
                            </div>
                            <EditCashAccountDialog cashAccount={account}>
                                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted rounded-md shrink-0 mr-2">
                                    <Pencil className="h-4 w-4 text-muted-foreground" />
                                </Button>
                            </EditCashAccountDialog>
                        </AccordionTrigger>
                        <AccordionContent className="p-6 pt-0">
                            <div className="flex items-center justify-end gap-2 mb-4 border-t pt-4">
                                {userProfile && (
                                    <FundTransferDialog profile={userProfile} cashAccounts={[account]}>
                                        <Button variant="outline">
                                            <Landmark className="mr-2 h-4 w-4" />
                                            Añadir Fondos
                                        </Button>
                                    </FundTransferDialog>
                                )}
                                <QuickExpenseDialog cashAccount={account} />
                            </div>
                            <MyTransactionsTable accountId={account.id} />
                        </AccordionContent>
                    </AccordionItem>
                </Card>
            ))}
        </Accordion>
      ) : (
        <div className="flex h-40 items-center justify-center rounded-md border border-dashed">
            <p className="text-muted-foreground">No tienes ninguna caja. ¡Crea una para empezar!</p>
        </div>
      )}
    </div>
  );
}
