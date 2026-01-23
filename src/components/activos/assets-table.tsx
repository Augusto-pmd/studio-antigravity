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
import { useFirestore, useCollection } from "@/firebase";
import { collection, type QueryDocumentSnapshot, type SnapshotOptions, type DocumentData } from "firebase/firestore";
import { Skeleton } from "../ui/skeleton";
import { useMemo } from "react";

const formatCurrency = (amount: number, currency: string) => {
    if (typeof amount !== 'number') return '';
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency }).format(amount);
}

const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return formatDateFns(parseISO(dateString), 'dd/MM/yyyy');
}

const assetConverter = {
    toFirestore(asset: Asset): DocumentData {
        const { id, ...data } = asset;
        return data;
    },
    fromFirestore(
        snapshot: QueryDocumentSnapshot,
        options: SnapshotOptions
    ): Asset {
        const data = snapshot.data(options);
        return {
            id: snapshot.id,
            name: data.name,
            description: data.description,
            purchaseDate: data.purchaseDate,
            purchaseValue: data.purchaseValue,
            currency: data.currency,
            category: data.category,
            status: data.status,
        } as Asset;
    }
};

export function AssetsTable() {
  const firestore = useFirestore();
  const assetsQuery = useMemo(() => (firestore ? collection(firestore, 'assets').withConverter(assetConverter) : null), [firestore]);
  const { data: assets, isLoading } = useCollection(assetsQuery);

  const renderSkeleton = () => (
    <TableRow>
      <TableCell><div className="space-y-1"><Skeleton className="h-5 w-3/4" /><Skeleton className="h-4 w-1/2" /></div></TableCell>
      <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-24" /></TableCell>
      <TableCell className="text-right"><Skeleton className="h-10 w-10 rounded-md ml-auto" /></TableCell>
    </TableRow>
  );

  return (
    <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Activo</TableHead>
              <TableHead className="hidden md:table-cell">Estado</TableHead>
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
                <TableCell colSpan={3} className="h-24 text-center">
                  No hay activos registrados. Comience creando uno nuevo.
                </TableCell>
              </TableRow>
            )}
            {assets?.map((asset: Asset) => (
              <TableRow key={asset.id}>
                <TableCell>
                  <div className="font-medium">{asset.name}</div>
                  <div className="text-sm text-muted-foreground">{asset.category}</div>
                  <div className="space-y-1 text-sm text-muted-foreground md:hidden mt-2">
                     <div>
                        <Badge
                            variant="outline"
                            className={cn(
                                "capitalize text-xs",
                                asset.status === "Activo" && "bg-green-900/40 text-green-300 border-green-700",
                                asset.status === "Mantenimiento" && "bg-yellow-900/40 text-yellow-300 border-yellow-700",
                                asset.status === "Vendido" && "bg-blue-900/40 text-blue-300 border-blue-700",
                                asset.status === "De Baja" && "bg-red-900/40 text-red-300 border-red-700",
                            )}
                        >
                            {asset.status}
                        </Badge>
                     </div>
                     <p>Compra: {formatDate(asset.purchaseDate)}</p>
                     <p>Valor: <span className="font-mono">{formatCurrency(asset.purchaseValue, asset.currency)}</span></p>
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell">
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
