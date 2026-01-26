'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { Expense } from '@/lib/types';
import { parseISO, format as formatDateFns } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { useMemo } from 'react';
import { useCollection } from '@/firebase';
import { useFirestore } from '@/firebase/provider';
import { collection, type DocumentData, type QueryDocumentSnapshot, type SnapshotOptions } from 'firebase/firestore';
import type { Project, Supplier } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { expenseCategories } from '@/lib/data';

const formatCurrency = (amount: number | undefined, currency: string = 'ARS') => {
  if (typeof amount !== 'number') return '';
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency,
  }).format(amount);
};

const formatDate = (dateString?: string) => {
  if (!dateString) return 'N/A';
  return formatDateFns(parseISO(dateString), 'dd/MM/yyyy');
};

const projectConverter = {
    toFirestore(project: Project): DocumentData {
        const { id, ...data } = project;
        return data;
    },
    fromFirestore(
        snapshot: QueryDocumentSnapshot,
        options: SnapshotOptions
    ): Project {
        const data = snapshot.data(options)!;
        return {
            id: snapshot.id,
            name: data.name,
            client: data.client,
            address: data.address,
            currency: data.currency,
            projectType: data.projectType,
            status: data.status,
            startDate: data.startDate,
            endDate: data.endDate,
            supervisor: data.supervisor,
            budget: data.budget,
            balance: data.balance,
            progress: data.progress,
            description: data.description,
        };
    }
};

const supplierConverter = {
    toFirestore(supplier: Supplier): DocumentData {
        const { id, ...data } = supplier;
        return data;
    },
    fromFirestore(
        snapshot: QueryDocumentSnapshot,
        options: SnapshotOptions
    ): Supplier {
        const data = snapshot.data(options)!;
        return {
            id: snapshot.id,
            name: data.name,
            cuit: data.cuit,
            status: data.status,
            type: data.type,
            email: data.email,
            phone: data.phone,
            contactPerson: data.contactPerson,
            address: data.address,
            fiscalCondition: data.fiscalCondition,
            notes: data.notes,
        };
    }
};

export function ExpenseReport({ expenses, isLoading }: { expenses: Expense[]; isLoading: boolean }) {
  const firestore = useFirestore();

  const projectsQuery = useMemo(() => (firestore ? collection(firestore, 'projects').withConverter(projectConverter) : null), [firestore]);
  const { data: projects, isLoading: isLoadingProjects } = useCollection<Project>(projectsQuery);

  const suppliersQuery = useMemo(() => (firestore ? collection(firestore, 'suppliers').withConverter(supplierConverter) : null), [firestore]);
  const { data: suppliers, isLoading: isLoadingSuppliers } = useCollection<Supplier>(suppliersQuery);

  const projectsMap = useMemo(() => {
    return projects?.reduce((acc: Record<string, string>, p: Project) => ({ ...acc, [p.id]: p.name }), {} as Record<string, string>) || {};
  }, [projects]);

  const suppliersMap = useMemo(() => {
    return suppliers?.reduce((acc: Record<string, string>, s: Supplier) => ({ ...acc, [s.id]: s.name }), {} as Record<string, string>) || {};
  }, [suppliers]);
  
  const handleExportCSV = () => {
    if (!expenses || expenses.length === 0) {
      return;
    }

    const escapeCSV = (value: any): string => {
      if (value === null || value === undefined) return '""';
      const str = String(value);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const headers = [
      "ID Gasto", "Fecha", "ID Obra", "Obra", "ID Proveedor", "Proveedor",
      "Rubro", "Comprobante", "Nro Factura", "Monto", "Moneda", "Tipo Cambio",
      "IVA", "IIBB", "Jurisdicción IIBB", "Ret. Ganancias", "Ret. IVA", "Ret. IIBB", "Ret. SUSS"
    ];

    const rows = expenses.map((expense: Expense) => [
      expense.id,
      formatDate(expense.date),
      expense.projectId,
      projectsMap[expense.projectId] || '',
      expense.supplierId,
      suppliersMap[expense.supplierId] || '',
      expenseCategories.find(c => c.id === expense.categoryId)?.name || expense.categoryId,
      expense.documentType,
      expense.invoiceNumber || '',
      expense.amount,
      expense.currency,
      expense.exchangeRate,
      expense.iva || 0,
      expense.iibb || 0,
      expense.iibbJurisdiction || 'No Aplica',
      expense.retencionGanancias || 0,
      expense.retencionIVA || 0,
      expense.retencionIIBB || 0,
      expense.retencionSUSS || 0
    ].map(escapeCSV).join(','));

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `reporte_gastos_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  const renderSkeleton = () => (
    Array.from({ length: 3 }).map((_, i) => (
      <TableRow key={i}>
        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
        <TableCell className='hidden sm:table-cell'><Skeleton className="h-5 w-32" /></TableCell>
        <TableCell className='hidden md:table-cell'><Skeleton className="h-5 w-28" /></TableCell>
        <TableCell className="text-right hidden lg:table-cell"><Skeleton className="h-5 w-20 ml-auto" /></TableCell>
      </TableRow>
    ))
  );

  return (
    <Card>
      <CardHeader className="flex-col items-start gap-y-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Reporte de Gastos</CardTitle>
          <CardDescription>Detalle de todos los gastos registrados con información fiscal.</CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={isLoading || !expenses || expenses.length === 0}>
          <Download className="mr-2 h-4 w-4" />
          Exportar a CSV
        </Button>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead className='hidden sm:table-cell'>Obra</TableHead>
                <TableHead className="hidden md:table-cell">Proveedor</TableHead>
                <TableHead className="text-right hidden lg:table-cell">IVA</TableHead>
                <TableHead className="text-right hidden lg:table-cell">IIBB</TableHead>
                <TableHead className="text-right hidden lg:table-cell">Retenciones</TableHead>
                <TableHead className="text-right hidden sm:table-cell">Monto Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(isLoading || isLoadingProjects || isLoadingSuppliers) && renderSkeleton()}
              {!isLoading && expenses.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center">
                    No hay gastos registrados para mostrar.
                  </TableCell>
                </TableRow>
              )}
              {expenses.map((expense: Expense) => (
                <TableRow key={expense.id}>
                  <TableCell>
                    <div className="font-medium">{formatDate(expense.date)}</div>
                    <div className="space-y-1 text-sm text-muted-foreground sm:hidden mt-2">
                        <p><span className='font-medium'>Obra:</span> {projectsMap[expense.projectId] || expense.projectId}</p>
                        <p><span className='font-medium'>Prov:</span> {suppliersMap[expense.supplierId] || expense.supplierId}</p>
                        <div className='font-mono pt-1 font-semibold text-foreground'>{formatCurrency(expense.amount, expense.currency)}</div>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium hidden sm:table-cell">{projectsMap[expense.projectId] || expense.projectId}</TableCell>
                  <TableCell className='hidden md:table-cell'>{suppliersMap[expense.supplierId] || expense.supplierId}</TableCell>
                  <TableCell className="text-right font-mono hidden lg:table-cell">{formatCurrency(expense.iva)}</TableCell>
                  <TableCell className="text-right font-mono hidden lg:table-cell">{formatCurrency(expense.iibb)}</TableCell>
                  <TableCell className="text-right font-mono hidden lg:table-cell">{formatCurrency((expense.retencionGanancias || 0) + (expense.retencionIIBB || 0) + (expense.retencionIVA || 0) + (expense.retencionSUSS || 0))}</TableCell>
                  <TableCell className="text-right font-mono font-bold hidden sm:table-cell">{formatCurrency(expense.amount, expense.currency)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
