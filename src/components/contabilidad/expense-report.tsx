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
import { useFirestore } from '@/firebase';
import { collection, type DocumentData, type QueryDocumentSnapshot, type SnapshotOptions } from 'firebase/firestore';
import type { Project, Supplier } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { expenseCategories } from '@/lib/data';
import { projectConverter, supplierConverter } from '@/lib/converters';
import { useYear } from '@/lib/contexts/year-context';

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


export function ExpenseReport({ expenses, isLoading }: { expenses: Expense[]; isLoading: boolean }) {
  const firestore = useFirestore();

  const { selectedYear } = useYear();

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

  const filteredExpenses = expenses;


  const handleExportCSV = () => {
    if (!filteredExpenses || filteredExpenses.length === 0) {
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

    const rows = filteredExpenses.map((expense: Expense) => [
      expense.id,
      formatDate(expense.date),
      expense.projectId,
      projectsMap[expense.projectId] || '',
      expense.supplierId,
      suppliersMap[expense.supplierId] || '',
      expenseCategories.find((c: any) => c.id === expense.categoryId)?.name || expense.categoryId,
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
    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `reporte_gastos_${selectedYear}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  const renderSkeleton = () => (
    Array.from({ length: 3 }).map((_: any, i: number) => (
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
      <CardHeader className="flex-col items-start gap-y-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Libro de IVA Compras</CardTitle>
          <CardDescription>
            Detalle de facturas y notas de crédito que componen el crédito fiscal. Puede exportar esta vista a formato CSV.
          </CardDescription>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={isLoading || !filteredExpenses || filteredExpenses.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Exportar CSV ({selectedYear})
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Comprobante</TableHead>
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
              {!isLoading && filteredExpenses.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center">
                    No hay gastos para el año seleccionado.
                  </TableCell>
                </TableRow>
              )}
              {filteredExpenses.map((expense: Expense) => (
                <TableRow key={expense.id}>
                  <TableCell>
                    <div className="font-medium">{formatDate(expense.date)}</div>
                    <div className="space-y-1 text-sm text-muted-foreground sm:hidden mt-2">
                      <p className="font-semibold text-foreground">{expense.documentType}</p>
                      <p><span className='font-medium'>Obra:</span> {projectsMap[expense.projectId] || expense.projectId}</p>
                      <p><span className='font-medium'>Prov:</span> {suppliersMap[expense.supplierId] || expense.supplierId}</p>
                      <div className='font-mono pt-1 font-semibold text-foreground'>{formatCurrency(expense.amount, expense.currency)}</div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">{expense.documentType}</TableCell>
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
