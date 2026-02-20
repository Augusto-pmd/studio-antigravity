'use client';

import { useState, useMemo } from 'react';
import { useCollection, usePaginatedCollection, useFirestore } from '@/firebase';
import { collection, collectionGroup, query, orderBy, getDocs, startAfter, limit, type DocumentData, type QueryDocumentSnapshot, type SnapshotOptions } from 'firebase/firestore';
import type { TreasuryAccount, TreasuryTransaction, Project, CashAccount, CashTransaction } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIcon, X, ArrowUpCircle, ArrowDownCircle, Sparkles, Loader2 } from 'lucide-react';
import { type DateRange } from 'react-day-picker';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { PendingPaymentsInbox } from './pending-payments-inbox';
import { SmartTreasuryAssistant } from './smart-treasury-assistant';
import { cn } from '@/lib/utils';
import { Skeleton } from '../ui/skeleton';
import { Badge } from '../ui/badge';
import {
  treasuryTransactionConverter,
  treasuryAccountConverter,
  projectConverter,
  cashAccountConverter,
  cashTransactionConverter,
} from '@/lib/converters';

const formatCurrency = (amount: number, currency: string) => new Intl.NumberFormat('es-AR', { style: 'currency', currency }).format(amount);
const formatDate = (dateString: string) => format(parseISO(dateString), 'dd/MM/yyyy');

interface MergedTransaction {
  id: string;
  date: string;
  accountId: string;
  accountName: string;
  accountType: 'Tesorería' | 'Caja Chica';
  type: 'Ingreso' | 'Egreso';
  amount: number;
  currency: 'ARS' | 'USD';
  description: string;
  category: string;
  projectName?: string;
}

export function TreasuryDashboard() {
  const firestore = useFirestore();

  // State for filters
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [selectedAccount, setSelectedAccount] = useState<string | undefined>();
  const [selectedProject, setSelectedProject] = useState<string | undefined>();
  const [searchDescription, setSearchDescription] = useState('');

  // Data fetching
  const treasuryTxsQuery = useMemo(() => firestore ? query(collectionGroup(firestore, 'transactions').withConverter(treasuryTransactionConverter), orderBy('date', 'desc')) : null, [firestore]);
  const { data: treasuryTransactions, isLoading: loadingTreasuryTxs, error: errorTreasuryTxs, hasMore: hasMoreTreasury, loadMore: loadMoreTreasury, isLoadingMore: loadingMoreTreasury } = usePaginatedCollection(treasuryTxsQuery, { pageSize: 50 });

  const cashTxsQuery = useMemo(() => firestore ? query(collectionGroup(firestore, 'transactions').withConverter(cashTransactionConverter), orderBy('date', 'desc')) : null, [firestore]);
  const { data: cashTransactions, isLoading: loadingCashTxs, error: errorCashTxs, hasMore: hasMoreCash, loadMore: loadMoreCash, isLoadingMore: loadingMoreCash } = usePaginatedCollection(cashTxsQuery, { pageSize: 50 });

  const treasuryAccountsQuery = useMemo(() => firestore ? collection(firestore, 'treasuryAccounts').withConverter(treasuryAccountConverter) : null, [firestore]);
  const { data: treasuryAccounts, isLoading: loadingTreasuryAccs } = useCollection(treasuryAccountsQuery);

  const cashAccountsQuery = useMemo(() => firestore ? collectionGroup(firestore, 'cashAccounts').withConverter(cashAccountConverter) : null, [firestore]);
  const { data: cashAccounts, isLoading: loadingCashAccs } = useCollection(cashAccountsQuery);

  const projectsQuery = useMemo(() => firestore ? collection(firestore, 'projects').withConverter(projectConverter) : null, [firestore]);
  const { data: projects, isLoading: loadingProjs } = useCollection(projectsQuery);

  const isLoading = loadingTreasuryTxs || loadingCashTxs || loadingTreasuryAccs || loadingCashAccs || loadingProjs;
  const error = errorTreasuryTxs || errorCashTxs;

  const [showAiAssistant, setShowAiAssistant] = useState(false);

  if (error) {
    console.error("Treasury Dashboard Error:", error);
  }

  const allAccounts = useMemo(() => {
    const accounts: { id: string, name: string }[] = [];
    if (treasuryAccounts) {
      treasuryAccounts.forEach(acc => accounts.push({ id: acc.id, name: `${acc.name} (Tesorería)` }));
    }
    if (cashAccounts) {
      cashAccounts.forEach(acc => accounts.push({ id: acc.id, name: `${acc.name} (Caja)` }));
    }
    return accounts;
  }, [treasuryAccounts, cashAccounts]);

  const allTransactions = useMemo((): MergedTransaction[] => {
    if (!treasuryTransactions || !cashTransactions || !treasuryAccounts || !cashAccounts) return [];

    const merged: MergedTransaction[] = [];

    treasuryTransactions.forEach((tx: TreasuryTransaction) => {
      const account = treasuryAccounts.find(acc => acc.id === tx.treasuryAccountId);
      merged.push({
        id: tx.id,
        date: tx.date,
        accountId: tx.treasuryAccountId,
        accountName: account?.name || 'Cuenta Desconocida',
        accountType: 'Tesorería',
        type: tx.type,
        amount: tx.amount,
        currency: tx.currency,
        description: tx.description,
        category: tx.category,
        projectName: tx.projectName
      });
    });

    cashTransactions.forEach((tx: CashTransaction) => {
      const account = cashAccounts.find(acc => acc.userId === tx.userId); // This logic needs improvement if a user has multiple accounts
      merged.push({
        id: tx.id,
        date: tx.date,
        accountId: 'caja_' + tx.userId, // Fake ID for filtering
        accountName: account?.name || `Caja de ${tx.operatorName}`,
        accountType: 'Caja Chica',
        type: tx.type === 'Ingreso' || tx.type === 'Refuerzo' ? 'Ingreso' : 'Egreso',
        amount: tx.amount,
        currency: 'ARS',
        description: tx.description,
        category: tx.relatedProjectName ? 'Gasto de Obra' : 'Movimiento de Caja',
        projectName: tx.relatedProjectName
      });
    });

    return merged.sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
  }, [treasuryTransactions, cashTransactions, treasuryAccounts, cashAccounts]);

  const filteredTransactions = useMemo(() => {
    return allTransactions.filter(tx => {
      const txDate = parseISO(tx.date);
      const dateMatch = !dateRange || !dateRange.from || (txDate >= dateRange.from && txDate <= (dateRange.to || dateRange.from));
      const accountMatch = !selectedAccount || tx.accountId === selectedAccount;
      const projectMatch = !selectedProject || tx.projectName === projects.find(p => p.id === selectedProject)?.name;
      const descriptionMatch = !searchDescription || tx.description.toLowerCase().includes(searchDescription.toLowerCase()) || tx.category.toLowerCase().includes(searchDescription.toLowerCase());
      return dateMatch && accountMatch && projectMatch && descriptionMatch;
    });
  }, [allTransactions, dateRange, selectedAccount, selectedProject, searchDescription, projects]);

  const resetFilters = () => {
    setDateRange(undefined);
    setSelectedAccount(undefined);
    setSelectedProject(undefined);
    setSearchDescription('');
  };
  const hasActiveFilters = dateRange || selectedAccount || selectedProject || searchDescription;

  const renderSkeleton = () => Array.from({ length: 5 }).map((_, i: number) => (
    <TableRow key={`skel-tx-${i}`}>
      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
      <TableCell><Skeleton className="h-5 w-32" /></TableCell>
      <TableCell><Skeleton className="h-5 w-48" /></TableCell>
      <TableCell className="text-right"><Skeleton className="h-5 w-28 ml-auto" /></TableCell>
    </TableRow>
  ));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <div>
          <CardTitle className="text-2xl font-bold">Flujo de Dinero (Libro Diario)</CardTitle>
          <CardDescription>Explorador de todos los movimientos de ingresos y egresos.</CardDescription>
        </div>
        <Button
          variant={showAiAssistant ? "secondary" : "default"}
          onClick={() => setShowAiAssistant(!showAiAssistant)}
          className="gap-2"
        >
          <Sparkles className="h-4 w-4" />
          {showAiAssistant ? 'Ocultar Asistente' : 'Consultar con IA'}
        </Button>
      </div>

      <PendingPaymentsInbox />

      <div className="flex flex-col lg:flex-row gap-6">
        <div className={cn("flex-1 transition-all", showAiAssistant ? "lg:w-2/3" : "w-full")}>
          <Card className="w-full">
            <CardHeader>
              <CardTitle>Movimientos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {error && (
                <div className="p-4 rounded-md bg-destructive/10 text-destructive text-sm font-medium border border-destructive/20">
                  Error al cargar movimientos: {error.message}
                  {error.message.includes('index') && (
                    <div className="mt-2 text-xs">
                      Es probable que falte un índice en Firestore para "transactions" ordenado por "date".
                      Por favor, revisa la consola del navegador para el enlace de creación del índice.
                    </div>
                  )}
                </div>
              )}
              <div className="flex flex-col gap-4 rounded-lg border p-4">
                <h3 className="shrink-0 font-semibold tracking-tight">Filtros</h3>
                <div className="grid flex-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        id="date"
                        variant={"outline"}
                        className={cn("w-full justify-start text-left font-normal", !dateRange && "text-muted-foreground")}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange?.from ? (
                          dateRange.to ? (
                            <>
                              {format(dateRange.from, "LLL dd, y", { locale: es })} -{" "}
                              {format(dateRange.to, "LLL dd, y", { locale: es })}
                            </>
                          ) : (
                            format(dateRange.from, "LLL dd, y", { locale: es })
                          )
                        ) : (
                          <span>Seleccionar rango</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={dateRange?.from}
                        selected={dateRange}
                        onSelect={setDateRange}
                        numberOfMonths={2}
                        locale={es}
                      />
                    </PopoverContent>
                  </Popover>
                  <Select onValueChange={(v) => setSelectedAccount(v === 'all' ? undefined : v)} value={selectedAccount}>
                    <SelectTrigger><SelectValue placeholder="Filtrar por Cuenta" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas las Cuentas</SelectItem>
                      {allAccounts.map((acc: any) => <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select onValueChange={(v) => setSelectedProject(v === 'all' ? undefined : v)} value={selectedProject}>
                    <SelectTrigger><SelectValue placeholder="Filtrar por Obra" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas las Obras</SelectItem>
                      {projects?.map((p: Project) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Buscar por descripción..."
                    value={searchDescription}
                    onChange={(e: any) => setSearchDescription(e.target.value)}
                  />
                  {hasActiveFilters && (
                    <Button variant="ghost" onClick={resetFilters}>
                      <X className="mr-2 h-4 w-4" />
                      Limpiar
                    </Button>
                  )}
                </div>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Cuenta</TableHead>
                      <TableHead>Descripción / Categoría</TableHead>
                      <TableHead className="text-right">Monto</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading && renderSkeleton()}
                    {!isLoading && filteredTransactions.length === 0 && (
                      <TableRow><TableCell colSpan={4} className="h-24 text-center">No se encontraron movimientos con los filtros aplicados.</TableCell></TableRow>
                    )}
                    {filteredTransactions.map((tx: MergedTransaction) => (
                      <TableRow key={tx.id}>
                        <TableCell className="text-sm">{formatDate(tx.date)}</TableCell>
                        <TableCell>{tx.accountName}</TableCell>
                        <TableCell>
                          <div className="font-medium">{tx.description}</div>
                          <div className="text-sm text-muted-foreground">{tx.category}</div>
                          {tx.projectName && <Badge variant="secondary" className="mt-1">{tx.projectName}</Badge>}
                        </TableCell>
                        <TableCell className={cn("text-right font-mono", tx.type === 'Ingreso' ? 'text-green-500' : 'text-destructive')}>
                          {tx.type === 'Ingreso' ? <ArrowUpCircle className="inline h-4 w-4 mr-1" /> : <ArrowDownCircle className="inline h-4 w-4 mr-1" />}
                          {formatCurrency(tx.amount, tx.currency)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {(hasMoreTreasury || hasMoreCash) && (
                  <div className="p-4 flex justify-center border-t">
                    <Button
                      variant="outline"
                      onClick={() => {
                        if (hasMoreTreasury) loadMoreTreasury();
                        if (hasMoreCash) loadMoreCash();
                      }}
                      disabled={loadingMoreTreasury || loadingMoreCash}
                    >
                      {(loadingMoreTreasury || loadingMoreCash) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Cargar movimientos anteriores
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {showAiAssistant && (
          <div className="lg:w-1/3 min-w-[300px] animate-in slide-in-from-right-10 duration-500">
            <SmartTreasuryAssistant transactions={filteredTransactions} />
          </div>
        )}
      </div>
    </div>
  );
}
