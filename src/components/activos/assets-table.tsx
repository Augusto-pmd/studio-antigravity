'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Asset } from "@/lib/types";
import { parseISO, format as formatDateFns } from 'date-fns';
import { Pencil } from "lucide-react";
import { AssetDialog } from "./asset-dialog";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection } from "firebase/firestore";
import { Skeleton } from "../ui/skeleton";

const formatCurrency = (amount: number, currency: string) => {
    if (typeof amount !== 'number') return '';
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency }).format(amount);
}

const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return formatDateFns(parseISO(dateString), 'dd/MM/yyyy');
}

export function AssetsTable() {
  const firestore = useFirestore();
  const assetsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'assets') : null), [firestore]);
  const { data: assets, isLoading } = useCollection<Asset>(assetsQuery);

  const renderSkeleton = () => (
    <TableRow>
      <TableCell><div className="space-y-1"><Skeleton className="h-5 w-3/4" /><Skeleton className="h-4 w-1/2" /></div></TableCell>
      <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-24" /></TableCell>
      <TableCell className="hidden lg:table-cell"><Skeleton className="h-5 w-20" /></TableCell>
      <TableCell className="hidden text-right lg:table-cell"><Skeleton className="h-5 w-24 ml-auto" /></TableCell>
      <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
      <TableCell className="text-right"><Skeleton className="h-10 w-10 rounded-md ml-auto" /></TableCell>
    </TableRow>
  );

  return (
    <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Activo</TableHead>
              <TableHead className="hidden md:table-cell">Categoría</TableHead>
              <TableHead className="hidden lg:table-cell">Fecha de Compra</TableHead>
              <TableHead className="hidden text-right lg:table-cell">Valor de Compra</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <>
                {renderSkeleton()}
                {renderSkeleton()}
              </>
            )}
            {!isLoading && assets?.length === 0 && (
               <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No hay activos registrados. Comience creando uno nuevo.
                </TableCell>
              </TableRow>
            )}
            {assets?.map((asset: Asset) => (
              <TableRow key={asset.id}>
                <TableCell>
                  <div className="font-medium">{asset.name}</div>
                  <div className="text-sm text-muted-foreground md:hidden">{asset.category}</div>
                  <div className="text-sm text-muted-foreground lg:hidden">{asset.description || asset.id}</div>
                </TableCell>
                <TableCell className="hidden md:table-cell">{asset.category}</TableCell>
                <TableCell className="hidden lg:table-cell">{formatDate(asset.purchaseDate)}</TableCell>
                <TableCell className="hidden text-right font-mono lg:table-cell">{formatCurrency(asset.purchaseValue, asset.currency)}</TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={cn(
                        "capitalize",
                        asset.status === "Activo" && "bg-green-900/40 text-green-300 border-green-700",
                        asset.status === "Mantenimiento" && "bg-yellow-900/40 text-yellow-300 border-yellow-700",
                        asset.status === "Vendido" && "bg-blue-900/40 text-blue-300 border-blue-700",
                        asset.status === "De Baja" && "bg-red-900/40 text-red-300 border-red-700",
                    )}
                  >
                    {asset.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <AssetDialog asset={asset}>
                      <Button variant="ghost" size="icon">
                          <Pencil className="h-4 w-4" />
                          <span className="sr-only">Editar</span>
                      </Button>
                  </AssetDialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
    </div>
  );
}
