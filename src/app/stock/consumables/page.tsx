"use client";

import { useState, useEffect } from "react";
import {
    Search,
    Filter,
    MoreHorizontal,
    Package,
    AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Consumable } from "@/lib/types";
import { getConsumables } from "@/lib/services/stock";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Progress } from "@/components/ui/progress";

export default function ConsumablesPage() {
    const [consumables, setConsumables] = useState<Consumable[]>([]);
    const [search, setSearch] = useState("");

    useEffect(() => {
        getConsumables().then(setConsumables);
    }, []);

    const filteredItems = consumables.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Stock de Insumos</h1>
                    <p className="text-slate-500">Materiales y consumibles diarios.</p>
                </div>
                <Button asChild>
                    <Link href="/stock/new?type=CONSUMABLE">Nuevo Insumo</Link>
                </Button>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 items-center bg-white p-4 rounded-lg border shadow-sm">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                    <Input
                        placeholder="Buscar por nombre..."
                        className="pl-9"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <div className="bg-white rounded-md border shadow-sm overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nombre</TableHead>
                            <TableHead>Categoría</TableHead>
                            <TableHead>Cantidad Actual</TableHead>
                            <TableHead>Estado de Stock</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredItems.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                                    No se encontraron insumos.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredItems.map((item) => {
                                const stockPercentage = Math.min(100, (item.quantity / (item.minStock * 3)) * 100);
                                const isLow = item.quantity <= item.minStock;

                                return (
                                    <TableRow key={item.id}>
                                        <TableCell className="font-medium">{item.name}</TableCell>
                                        <TableCell>{item.category}</TableCell>
                                        <TableCell>
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-lg font-bold">{item.quantity}</span>
                                                <span className="text-xs text-slate-500">{item.unit}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="w-[200px]">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex justify-between text-xs">
                                                    <span className={isLow ? "text-red-600 font-bold" : "text-green-600"}>
                                                        {isLow ? "Stock Crítico" : "Normal"}
                                                    </span>
                                                    <span className="text-slate-400">Min: {item.minStock}</span>
                                                </div>
                                                <Progress value={stockPercentage} className={`h-2 ${isLow ? 'bg-red-100' : 'bg-slate-100'}`} indicatorClassName={isLow ? 'bg-red-500' : 'bg-green-500'} />
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
