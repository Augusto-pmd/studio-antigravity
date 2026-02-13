'use client';

import { useMemo } from 'react';
import { useUser } from '@/firebase';
import { useCollection } from '@/firebase';
import { collection, query, orderBy, type DocumentData, type QueryDocumentSnapshot, type SnapshotOptions } from 'firebase/firestore';
import type { CashAccount, CashTransaction, UserProfile } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { QuickExpenseDialog } from '@/components/caja/quick-expense-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ArrowDownCircle, ArrowUpCircle, Landmark, Pencil, PlusCircle, Wallet, Trash2, ArrowRightLeft, LockKeyhole } from 'lucide-react';
import { FundTransferDialog } from '@/components/cajas/fund-transfer-dialog';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { AddCashAccountDialog } from '@/components/caja/add-cash-account-dialog';
import { EditCashAccountDialog } from '@/components/caja/edit-cash-account-dialog';
import { DeleteCashAccountDialog } from '@/components/caja/delete-cash-account-dialog';
import { DeleteTransactionDialog } from '@/components/caja/delete-transaction-dialog';
import { InternalTransferDialog } from './internal-transfer-dialog';
import { SettleLoanDialog } from './settle-loan-dialog';
import { WeeklyClosureDialog } from './weekly-closure-dialog';

const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency }).format(amount);
};

const formatDate = (dateString: string) => {
    return format(parseISO(dateString), 'dd/MM/yyyy HH:mm');
}

const cashTransactionConverter = {
    toFirestore: (data: CashTransaction): DocumentData => data,
    fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): CashTransaction => ({ ...snapshot.data(options), id: snapshot.id } as CashTransaction)
};

const cashAccountConverter = {
    toFirestore: (data: CashAccount): DocumentData => data,
    fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): CashAccount => ({ ...snapshot.data(options), id: snapshot.id } as CashAccount)
};

function MyTransactionsTable({ account, allAccounts }: { account: CashAccount, allAccounts: CashAccount[] }) {
    const { user, firestore } = useUser();
    const transactionsQuery = useMemo(
        () => firestore && user ? query(collection(firestore, `users/${user.uid}/cashAccounts/${account.id}/transactions`).withConverter(cashTransactionConverter), orderBy('date', 'desc')) : null,
        [firestore, user, account.id]
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
                        <TableHead className="w-[50px] text-right">Acción</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {!isLoading && transactions?.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={4} className="h-24 text-center">
                                No hay movimientos en esta caja.
                            </TableCell>
                        </TableRow>
                    )}
                    {transactions?.map((tx: CashTransaction) => {
                        const isIncome = ['Ingreso', 'Refuerzo'].includes(tx.type);
                        const isLoan = tx.isInternalLoan;

                        return (
                            <TableRow key={tx.id}>
                                <TableCell className="text-xs text-muted-foreground">{formatDate(tx.date)}</TableCell>
                                <TableCell>
                                    <div className='flex items-center gap-2'>
                                        {isIncome ? <ArrowUpCircle className="h-4 w-4 text-green-500" /> : <ArrowDownCircle className="h-4 w-4 text-destructive" />}
                                        <div>
                                            <p className="font-medium">{tx.description}</p>
                                            <div className="flex items-center gap-2">
                                                <p className="text-xs text-muted-foreground">{tx.type}</p>
                                                {isLoan && (
                                                    <Badge variant={tx.loanStatus === 'Pendiente' ? 'destructive' : 'default'} className="text-xs">{tx.loanStatus}</Badge>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell className={cn("text-right font-mono", isIncome ? 'text-green-500' : 'text-destructive')}>
                                    {isIncome ? '+' : '-'} {formatCurrency(tx.amount, tx.currency)}
                                </TableCell>
                                <TableCell className="text-right">
                                    {tx.type === 'Egreso' && tx.relatedExpenseId && (
                                        <DeleteTransactionDialog transaction={tx} cashAccount={account} />
                                    )}
                                    {isLoan && tx.loanStatus === 'Pendiente' && (
                                        <SettleLoanDialog transaction={tx} accounts={allAccounts} />
                                    )}
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
    const { user, firestore, isUserLoading, userProfile } = useUser();

    const accountsQuery = useMemo(
        () => (firestore && user ? query(collection(firestore, `users/${user.uid}/cashAccounts`).withConverter(cashAccountConverter)) : null),
        [firestore, user]
    );
    const { data: accounts, isLoading: isLoadingAccounts } = useCollection<CashAccount>(accountsQuery);

    const isLoading = isUserLoading || isLoadingAccounts;

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
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-3xl font-headline">Mis Cajas</h1>
                    <p className="mt-1 text-muted-foreground">
                        Gestiona tus cajas de efectivo en ARS. Puedes tener hasta 3 cajas diferentes.
                    </p>
                </div>
                <div className="flex gap-2">
                    <InternalTransferDialog accounts={accounts || []}>
                        <Button variant="outline" disabled={(accounts?.length ?? 0) < 2}>
                            <ArrowRightLeft className="mr-2 h-4 w-4" />
                            Préstamo entre Cajas
                        </Button>
                    </InternalTransferDialog>
                    <AddCashAccountDialog>
                        <Button disabled={(accounts?.length ?? 0) >= 3}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Crear Nueva Caja
                        </Button>
                    </AddCashAccountDialog>
                </div>
            </div>

            {accounts && accounts.length > 0 ? (
                <Accordion type="single" collapsible className="w-full space-y-4">
                    {accounts.map((account: CashAccount) => (
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
                                    <div className="flex items-center shrink-0">
                                        <EditCashAccountDialog cashAccount={account}>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted rounded-md">
                                                <Pencil className="h-4 w-4 text-muted-foreground" />
                                            </Button>
                                        </EditCashAccountDialog>
                                        <DeleteCashAccountDialog cashAccount={account}>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-destructive/10 rounded-md">
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        </DeleteCashAccountDialog>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="p-6 pt-0">
                                    <div className="flex flex-col sm:flex-row items-center justify-end gap-2 mb-4 border-t pt-4">
                                        {account.lastClosureDate && (
                                            <div className="mr-auto text-sm text-muted-foreground">
                                                <span className="font-semibold">Último Cierre:</span> {formatDate(account.lastClosureDate)} ({formatCurrency(account.lastClosureAmount || 0, 'ARS')})
                                            </div>
                                        )}
                                        <WeeklyClosureDialog cashAccount={account}>
                                            <Button variant="outline" className="w-full sm:w-auto text-orange-600 hover:text-orange-700 hover:bg-orange-50 border-orange-200">
                                                <LockKeyhole className="mr-2 h-4 w-4" />
                                                Cerrar Semana
                                            </Button>
                                        </WeeklyClosureDialog>
                                        {userProfile && (
                                            <FundTransferDialog profile={userProfile} cashAccounts={[account]}>
                                                <Button className="w-full sm:w-auto">
                                                    <Landmark className="mr-2 h-4 w-4" />
                                                    Añadir Fondos
                                                </Button>
                                            </FundTransferDialog>
                                        )}
                                        <QuickExpenseDialog cashAccount={account} />
                                    </div>
                                    <MyTransactionsTable account={account} allAccounts={accounts} />
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
