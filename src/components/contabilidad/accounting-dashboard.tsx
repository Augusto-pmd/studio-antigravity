'use client';

import { useCollection } from '@/firebase';
import { useFirestore } from '@/firebase';
import { collectionGroup, query, type DocumentData, type QueryDocumentSnapshot, type SnapshotOptions } from 'firebase/firestore';
import type { Expense, Sale } from '@/lib/types';
import { useMemo } from 'react';
import { IvaSummary } from '@/components/contabilidad/iva-summary';
import { IibbSummary } from '@/components/contabilidad/iibb-summary';
import { ExpenseReport } from '@/components/contabilidad/expense-report';
import { Skeleton } from '@/components/ui/skeleton';
import { RetencionesSummary } from '@/components/contabilidad/retenciones-summary';
import { AccountsPayable } from '@/components/contabilidad/accounts-payable';
import { AccountsReceivable } from '@/components/contabilidad/accounts-receivable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SalaryPayables } from '@/components/contabilidad/salary-payables';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PlanDePagoDialog } from '@/components/planes-de-pago/plan-de-pago-dialog';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { PlanesDePagoTable } from '@/components/planes-de-pago/planes-de-pago-table';
import { expenseConverter, saleConverter } from '@/lib/converters';
import { TreasuryDashboard } from '../tesoreria/treasury-dashboard';


export function AccountingDashboard() {
  const firestore = useFirestore();

  const expensesQuery = useMemo(
    () => (firestore ? query(collectionGroup(firestore, 'expenses').withConverter(expenseConverter)) : null),
    [firestore]
  );
  const { data: allExpenses, isLoading: isLoadingExpenses } = useCollection<Expense>(expensesQuery);

  const salesQuery = useMemo(
    () => (firestore ? query(collectionGroup(firestore, 'sales').withConverter(saleConverter)) : null),
    [firestore]
  );
  const { data: sales, isLoading: isLoadingSales } = useCollection<Sale>(salesQuery);
  
  const formalExpenses = useMemo(() => {
    if (!allExpenses) return [];
    // Only include formal documents for accounting summaries
    return allExpenses.filter((e: Expense) => e.documentType === 'Factura' || e.documentType === 'Nota de Crédito');
  }, [allExpenses]);


  const { ivaCredit, ivaDebit, iibbCABA, iibbProvincia, retGanancias, retIva, retIibb, retSuss } = useMemo(() => {
    if (!formalExpenses || !sales) {
      return { ivaCredit: 0, ivaDebit: 0, iibbCABA: 0, iibbProvincia: 0, retGanancias: 0, retIva: 0, retIibb: 0, retSuss: 0 };
    }
    
    const expenseSummary = formalExpenses.reduce(
      (acc: any, expense: Expense) => {
        const sign = expense.documentType === 'Nota de Crédito' ? -1 : 1;
        acc.ivaCredit += (expense.iva || 0) * sign;
        if (expense.iibbJurisdiction === 'CABA') {
          acc.iibbCABA += (expense.iibb || 0) * sign;
        } else if (expense.iibbJurisdiction === 'Provincia') {
          acc.iibbProvincia += (expense.iibb || 0) * sign;
        }
        acc.retGanancias += expense.retencionGanancias || 0;
        acc.retIva += expense.retencionIVA || 0;
        acc.retIibb += expense.retencionIIBB || 0;
        acc.retSuss += expense.retencionSUSS || 0;
        return acc;
      },
      { ivaCredit: 0, iibbCABA: 0, iibbProvincia: 0, retGanancias: 0, retIva: 0, retIibb: 0, retSuss: 0 }
    );
    
    const ivaDebit = sales.reduce((acc, sale: Sale) => {
      if (!['Cancelado', 'Borrador'].includes(sale.status)) {
        const sign = sale.documentType === 'Nota de Crédito' ? -1 : 1;
        return acc + (sale.ivaAmount || 0) * sign;
      }
      return acc;
    }, 0);

    return { ...expenseSummary, ivaDebit };

  }, [formalExpenses, sales]);
  

  if (isLoadingExpenses || isLoadingSales) {
    return (
        <div className='space-y-6'>
            <div className="grid gap-6 md:grid-cols-2">
                <Skeleton className="h-40" />
                <Skeleton className="h-40" />
            </div>
             <Skeleton className="h-48" />
            <Skeleton className="h-80" />
        </div>
    )
  }

  return (
    <div className="space-y-6">
       <Tabs defaultValue="cuentas-corrientes" className="w-full">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5">
            <TabsTrigger value="cuentas-corrientes">Cuentas Corrientes</TabsTrigger>
            <TabsTrigger value="salarios">Salarios</TabsTrigger>
            <TabsTrigger value="moratorias">Planes de Pago</TabsTrigger>
            <TabsTrigger value="impuestos">Impuestos y Reportes</TabsTrigger>
            <TabsTrigger value="flujo-dinero">Flujo de Dinero</TabsTrigger>
          </TabsList>

          <TabsContent value="cuentas-corrientes" className="mt-6">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <AccountsPayable />
                <AccountsReceivable />
            </div>
          </TabsContent>

          <TabsContent value="salarios" className="mt-6">
            <SalaryPayables />
          </TabsContent>
          
          <TabsContent value="moratorias" className="mt-6">
            <Card>
              <CardHeader className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Planes de Pago (Moratorias)</CardTitle>
                  <CardDescription>Gestione los planes de facilidades de pago de impuestos con AFIP.</CardDescription>
                </div>
                <PlanDePagoDialog>
                    <Button>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Nuevo Plan de Pago
                    </Button>
                </PlanDePagoDialog>
              </CardHeader>
              <CardContent>
                <PlanesDePagoTable />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="impuestos" className="mt-6 space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <IvaSummary ivaCredit={ivaCredit} ivaDebit={ivaDebit} />
                <IibbSummary iibbCABA={iibbCABA} iibbProvincia={iibbProvincia} />
              </div>
              <RetencionesSummary retGanancias={retGanancias} retIva={retIva} retIibb={retIibb} retSuss={retSuss} />
              <ExpenseReport expenses={formalExpenses || []} isLoading={isLoadingExpenses} />
          </TabsContent>
          
           <TabsContent value="flujo-dinero" className="mt-6">
            <TreasuryDashboard />
          </TabsContent>
       </Tabs>
    </div>
  );
}
