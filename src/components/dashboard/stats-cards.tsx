'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Landmark, CircleDollarSign, Receipt } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useCollection, useFirestore } from "@/firebase";
import { collection, collectionGroup, query, type DocumentData, type QueryDocumentSnapshot, type SnapshotOptions } from "firebase/firestore";
import type { Sale, Expense, Asset } from "@/lib/types";
import { getYear, parseISO } from "date-fns";
import { saleConverter, expenseConverter, assetConverter } from "@/lib/converters";


const formatCurrency = (amount: number, currency?: string) => {
    if (typeof amount !== 'number') return '';
    const options: Intl.NumberFormatOptions = {
        style: 'currency',
        currency: currency || 'ARS',
        maximumFractionDigits: 0,
    };
    return new Intl.NumberFormat('es-AR', options).format(amount);
};

interface StatCard {
    title: string;
    value: string;
    icon: React.ReactNode;
    change: string;
}

export function StatsCards() {
    const [currentYear, setCurrentYear] = useState<number | null>(null);
    const firestore = useFirestore();

    useEffect(() => {
        // This hook ensures the year is determined on the client-side, avoiding hydration mismatches.
        setCurrentYear(new Date().getFullYear());
    }, []);
    
    // Data Fetching
    const salesQuery = useMemo(() => firestore ? query(collectionGroup(firestore, 'sales').withConverter(saleConverter)) : null, [firestore]);
    const { data: allSales, isLoading: isLoadingSales } = useCollection<Sale>(salesQuery);
    
    const expensesQuery = useMemo(() => firestore ? query(collectionGroup(firestore, 'expenses').withConverter(expenseConverter)) : null, [firestore]);
    const { data: allExpenses, isLoading: isLoadingExpenses } = useCollection<Expense>(expensesQuery);

    const assetsQuery = useMemo(() => firestore ? query(collection(firestore, 'assets').withConverter(assetConverter)) : null, [firestore]);
    const { data: allAssets, isLoading: isLoadingAssets } = useCollection<Asset>(assetsQuery);
    
    const isLoading = isLoadingSales || isLoadingExpenses || isLoadingAssets || !currentYear;

    const { annualRevenue, annualResult, totalAssets } = useMemo(() => {
        if (!currentYear || !allSales || !allExpenses || !allAssets) {
            return { annualRevenue: 0, annualResult: 0, totalAssets: 0 };
        }

        const annualRevenue = allSales.reduce((sum, sale) => {
            if (getYear(parseISO(sale.date)) === currentYear && sale.status === 'Cobrado') {
                return sum + sale.totalAmount;
            }
            return sum;
        }, 0);

        const annualExpenses = allExpenses.reduce((sum, expense) => {
             if (getYear(parseISO(expense.date)) === currentYear && expense.status === 'Pagado') {
                const amountInARS = expense.currency === 'USD' ? expense.amount * expense.exchangeRate : expense.amount;
                return sum + amountInARS;
            }
            return sum;
        }, 0);
        
        const annualResult = annualRevenue - annualExpenses;

        const totalAssets = allAssets.reduce((sum, asset) => {
            if (asset.currency === 'ARS') {
                return sum + asset.purchaseValue;
            }
            // Note: Cannot reliably convert USD assets without a daily exchange rate.
            // This calculation will only include ARS assets.
            return sum;
        }, 0);

        return { annualRevenue, annualResult, totalAssets };

    }, [currentYear, allSales, allExpenses, allAssets]);


    if (isLoading) {
        return (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Skeleton className="h-[108px]" />
                <Skeleton className="h-[108px]" />
                <Skeleton className="h-[108px]" />
            </div>
        )
    }
    
    const statCards: StatCard[] = [
        {
          title: `Facturación Anual (Ejercicio ${currentYear})`,
          value: formatCurrency(annualRevenue, 'ARS'),
          icon: <CircleDollarSign className="h-5 w-5 text-muted-foreground" />,
          change: "Ventas netas de bienes y servicios cobradas.",
        },
        {
          title: `Resultado del Ejercicio (${currentYear})`,
          value: formatCurrency(annualResult, 'ARS'),
          icon: <Receipt className="h-5 w-5 text-muted-foreground" />,
          change: "Facturación cobrada menos gastos pagados.",
        },
        {
          title: `Activo Total`,
          value: formatCurrency(totalAssets, 'ARS'),
          icon: <Landmark className="h-5 w-5 text-muted-foreground" />,
          change: "Suma del valor de compra de activos en ARS.",
        },
      ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {statCards.map((stat: StatCard) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            {stat.icon}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            <p className="text-xs text-muted-foreground">{stat.change}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
