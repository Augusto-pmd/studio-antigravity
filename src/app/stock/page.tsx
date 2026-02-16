"use client";

import { useState, useEffect } from "react";
import {
  Wrench,
  Package,
  ArrowRightLeft,
  AlertTriangle,
  History,
  Plus,
  Search
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { Tool, Consumable } from "@/lib/types";
import { getTools, getConsumables } from "@/lib/services/stock";

export default function StockDashboard() {
  const [tools, setTools] = useState<Tool[]>([]);
  const [consumables, setConsumables] = useState<Consumable[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [t, c] = await Promise.all([getTools(), getConsumables()]);
      setTools(t);
      setConsumables(c);
      setLoading(false);
    };
    load();
  }, []);

  const inUseTools = tools.filter(t => t.status === 'IN_USE').length;
  const brokenTools = tools.filter(t => t.status === 'BROKEN' || t.status === 'IN_REPAIR').length;
  const lowStock = consumables.filter(c => c.quantity <= c.minStock).length;

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Pañol y Stock</h1>
          <p className="text-slate-500">Gestión de herramientas e insumos.</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/stock/history">
              <History className="mr-2 h-4 w-4" /> Historial
            </Link>
          </Button>
          <Button asChild>
            <Link href="/stock/new">
              <Plus className="mr-2 h-4 w-4" /> Nuevo Item
            </Link>
          </Button>
        </div>
      </header>

      {/* Quick Actions - The "Agile" Part */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link href="/stock/actions?type=CHECK_OUT" className="w-full">
          <Button className="h-32 text-xl w-full flex flex-col items-center justify-center gap-3 bg-indigo-600 hover:bg-indigo-700 shadow-lg transition-all hover:-translate-y-1">
            <ArrowRightLeft className="h-10 w-10" />
            <span>Entregar Herramienta / Insumo</span>
            <span className="text-sm font-normal opacity-80">Registrar salida a Obra o Empleado</span>
          </Button>
        </Link>

        <Link href="/stock/actions?type=CHECK_IN" className="w-full">
          <Button className="h-32 text-xl w-full flex flex-col items-center justify-center gap-3 bg-emerald-600 hover:bg-emerald-700 shadow-lg transition-all hover:-translate-y-1">
            <Wrench className="h-10 w-10" />
            <span>Devolución al Pañol</span>
            <span className="text-sm font-normal opacity-80">Reingreso y control de estado</span>
          </Button>
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Herramientas en Uso</CardTitle>
            <Wrench className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-600">{inUseTools}</div>
            <p className="text-xs text-slate-500">de {tools.length} herramientas totales</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Reparación / Rotas</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{brokenTools}</div>
            <p className="text-xs text-slate-500">requieren atención</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Insumos Críticos</CardTitle>
            <Package className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{lowStock}</div>
            <p className="text-xs text-slate-500">items por debajo del mínimo</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total Activos</CardTitle>
            <span className="text-green-600 font-bold">$</span>
          </CardHeader>
          <CardContent>
            {/* Placeholder for calculation */}
            <div className="text-2xl font-bold text-slate-900">$ --</div>
            <p className="text-xs text-slate-500">amortización pendiente</p>
          </CardContent>
        </Card>
      </div>

      {/* Lists Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Tools */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Herramientas Recientes</CardTitle>
              <Link href="/stock/tools" className="text-sm text-indigo-600 hover:underline">Ver todas</Link>
            </div>
            <CardDescription>Estado de activos fijos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {tools.slice(0, 5).map(tool => (
                <div key={tool.id} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                  <div>
                    <p className="font-medium text-sm">{tool.name}</p>
                    <p className="text-xs text-slate-500">{tool.category} • {tool.brand}</p>
                  </div>
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${tool.status === 'AVAILABLE' ? 'bg-green-100 text-green-700' :
                    tool.status === 'IN_USE' ? 'bg-blue-100 text-blue-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                    {tool.status === 'AVAILABLE' ? 'Disponible' :
                      tool.status === 'IN_USE' ? 'En Uso' : tool.status}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Consumables */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Stock de Insumos</CardTitle>
              <Link href="/stock/consumables" className="text-sm text-indigo-600 hover:underline">Ver todos</Link>
            </div>
            <CardDescription>Niveles de inventario</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {consumables.slice(0, 5).map(item => (
                <div key={item.id} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                  <div>
                    <p className="font-medium text-sm">{item.name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-bold ${item.quantity <= item.minStock ? 'text-red-600' : 'text-slate-700'}`}>
                      {item.quantity} {item.unit}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
