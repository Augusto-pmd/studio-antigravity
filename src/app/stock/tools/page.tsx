"use client";

import { useState, useEffect } from "react";
import {
    Search,
    Filter,
    MoreHorizontal,
    AlertTriangle,
    CheckCircle,
    XCircle
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
import { Tool } from "@/lib/types";
import { getTools } from "@/lib/services/stock";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export default function ToolsPage() {
    const [tools, setTools] = useState<Tool[]>([]);
    const [search, setSearch] = useState("");
    const [filterStatus, setFilterStatus] = useState<string>("ALL");

    useEffect(() => {
        getTools().then(setTools);
    }, []);

    const filteredTools = tools.filter(t => {
        const matchesSearch = t.name.toLowerCase().includes(search.toLowerCase()) ||
            t.brand?.toLowerCase().includes(search.toLowerCase());
        const matchesStatus = filterStatus === "ALL" || t.status === filterStatus;
        return matchesSearch && matchesStatus;
    });

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'AVAILABLE': return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Disponible</Badge>;
            case 'IN_USE': return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">En Uso</Badge>;
            case 'BROKEN': return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Rota</Badge>;
            case 'IN_REPAIR': return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">En Reparación</Badge>;
            case 'STOLEN': return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">Robada</Badge>;
            default: return <Badge variant="outline">{status}</Badge>;
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Catálogo de Herramientas</h1>
                    <p className="text-slate-500">Activos fijos y maquinaria.</p>
                </div>
                <Button asChild>
                    <Link href="/stock/new?type=TOOL">Nueva Herramienta</Link>
                </Button>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 items-center bg-white p-4 rounded-lg border shadow-sm">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                    <Input
                        placeholder="Buscar por nombre, marca o modelo..."
                        className="pl-9"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Filter className="h-4 w-4 text-slate-500" />
                    <select
                        className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2 w-full sm:w-[180px]"
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                    >
                        <option value="ALL">Todos los estados</option>
                        <option value="AVAILABLE">Disponible</option>
                        <option value="IN_USE">En Uso</option>
                        <option value="BROKEN">Rotas</option>
                        <option value="IN_REPAIR">En Reparación</option>
                    </select>
                </div>
            </div>

            <div className="bg-white rounded-md border shadow-sm overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nombre</TableHead>
                            <TableHead>Marca / Modelo</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead>Ubicación / Responsable</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredTools.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                                    No se encontraron herramientas.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredTools.map((tool) => (
                                <TableRow key={tool.id}>
                                    <TableCell className="font-medium">
                                        <div className="flex flex-col">
                                            <span>{tool.name}</span>
                                            <span className="text-xs text-slate-500">{tool.category}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {tool.brand} {tool.model && <span className="text-slate-400">({tool.model})</span>}
                                    </TableCell>
                                    <TableCell>{getStatusBadge(tool.status)}</TableCell>
                                    <TableCell>
                                        {tool.currentHolder ? (
                                            <div className="flex items-center gap-2 text-sm">
                                                <span className="font-semibold text-indigo-600">{tool.currentHolder.type === 'EMPLOYEE' ? '👤' : '🏗️'}</span>
                                                <span>{tool.currentHolder.name}</span>
                                            </div>
                                        ) : (
                                            <span className="text-slate-400 text-sm">En Pañol</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Link href={`/stock/tools/${tool.id}`}>
                                            <Button variant="ghost" size="icon">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </Link>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
