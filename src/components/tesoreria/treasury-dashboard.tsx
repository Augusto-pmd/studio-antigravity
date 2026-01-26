'use client';

import { useState, useMemo } from 'react';
import { useCollection, useFirestore } from '@/firebase';
import { collection, collectionGroup, query, orderBy, type DocumentData, type QueryDocumentSnapshot, type SnapshotOptions } from 'firebase/firestore';
import type { TreasuryAccount, TreasuryTransaction, Project } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIcon, X } from 'lucide-react';
import { type DateRange } from 'react-day-picker';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Skeleton } from '../ui/skeleton';
import { Badge } from '../ui/badge';

// Converters
const transactionConverter = {
    toFirestore: (data: TreasuryTransaction): DocumentData => data,
    fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): TreasuryTransaction => ({ ...snapshot.data(options), id: snapshot.id } as TreasuryTransaction)
};
const accountConverter = {
    toFirestore: (data: TreasuryAccount): DocumentData => data,
    fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): TreasuryAccount => ({ ...snapshot.data(options), id: snapshot.id } as TreasuryAccount)
};
const projectConverter = {
    toFirestore: (data: Project): DocumentData => data,
    fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): Project => ({ ...snapshot.data(options), id: snapshot.id } as Project)
};

const formatCurrency = (amount: number, currency: string) => new Intl.NumberFormat('es-AR', { style: 'currency', currency }).format(amount);
const formatDate = (dateString: string) => format(parseISO(dateString), 'dd/MM/yyyy');

export function TreasuryDashboard() {
  const firestore = useFirestore();

  // State for filters
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [selectedAccount, setSelectedAccount] = useState<string | undefined>();
  const [selectedProject, setSelectedProject] = useState<string | undefined>();
  const [searchDescription, setSearchDescription] = useState('');

  // Data fetching
  const transactionsQuery = useMemo(() => firestore ? query(collectionGroup(firestore, 'transactions').withConverter(transactionConverter), orderBy('date', 'desc')) : null, [firestore]);
  const { data: transactions, isLoading: loadingTxs } = useCollection(transactionsQuery);
  
  const accountsQuery = useMemo(() => firestore ? collection(firestore, 'treasuryAccounts').withConverter(accountConverter) : null, [firestore]);
  const { data: accounts, isLoading: loadingAccs } = useCollection(accountsQuery);
  
  const projectsQuery = useMemo(() => firestore ? collection(firestore, 'projects').withConverter(projectConverter) : null, [firestore]);
  const { data: projects, isLoading: loadingProjs } = useCollection(projectsQuery);

  const isLoading = loadingTxs || loadingAccs || loadingProjs;

  const accountsMap = useMemo(() => accounts?.reduce((map, acc) => { map[acc.id] = acc.name; return map; }, {} as Record<string, string>) || {}, [accounts]);

  const filteredTransactions = useMemo(() => {
    return transactions?.filter(tx => {
      const txDate = parseISO(tx.date);
      const dateMatch = !dateRange || !dateRange.from || (txDate >= dateRange.from && txDate <= (dateRange.to || dateRange.from));
      const accountMatch = !selectedAccount || tx.treasuryAccountId === selectedAccount;
      const projectMatch = !selectedProject || tx.projectId === selectedProject;
      const descriptionMatch = !searchDescription || tx.description.toLowerCase().includes(searchDescription.toLowerCase()) || tx.category.toLowerCase().includes(searchDescription.toLowerCase());
      return dateMatch && accountMatch && projectMatch && descriptionMatch;
    }) || [];
  }, [transactions, dateRange, selectedAccount, selectedProject, searchDescription]);

  const resetFilters = () => {
    setDateRange(undefined);
    setSelectedAccount(undefined);
    setSelectedProject(undefined);
    setSearchDescription('');
  };
  const hasActiveFilters = dateRange || selectedAccount || selectedProject || searchDescription;

  const renderSkeleton = () => Array.from({ length: 5 }).map((_, i) => (
    <TableRow key={`skel-tx-${i}`}>
        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
        <TableCell><Skeleton className="h-5 w-32" /></TableCell>
        <TableCell><Skeleton className="h-5 w-48" /></TableCell>
        <TableCell className="text-right"><Skeleton className="h-5 w-28 ml-auto" /></TableCell>
    </TableRow>
  ));

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Flujo de Dinero</CardTitle>
        <CardDescription>Explorador de todos los movimientos de ingresos y egresos de la tesorería.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
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
                        {accounts?.map(acc => <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>)}
                    </SelectContent>
                </Select>
                 <Select onValueChange={(v) => setSelectedProject(v === 'all' ? undefined : v)} value={selectedProject}>
                    <SelectTrigger><SelectValue placeholder="Filtrar por Obra" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todas las Obras</SelectItem>
                        {projects?.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                </Select>
                <Input
                    placeholder="Buscar por descripción..."
                    value={searchDescription}
                    onChange={(e) => setSearchDescription(e.target.value)}
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
              {filteredTransactions.map(tx => (
                <TableRow key={tx.id}>
                  <TableCell className="text-sm">{formatDate(tx.date)}</TableCell>
                  <TableCell>{accountsMap[tx.treasuryAccountId]}</TableCell>
                  <TableCell>
                    <div className="font-medium">{tx.description}</div>
                    <div className="text-sm text-muted-foreground">{tx.category}</div>
                    {tx.projectName && <Badge variant="secondary" className="mt-1">{tx.projectName}</Badge>}
                  </TableCell>
                  <TableCell className={cn("text-right font-mono", tx.type === 'Ingreso' ? 'text-green-500' : 'text-destructive')}>
                    {tx.type === 'Ingreso' ? '+' : '-'} {formatCurrency(tx.amount, tx.currency)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
