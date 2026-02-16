"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import {
    ArrowRightLeft,
    Search,
    User,
    Briefcase,
    Wrench,
    ArrowDownCircle,
    ArrowUpCircle
} from "lucide-react";
import { Tool, Consumable, InventoryItem, MovementType } from "@/lib/types";
import { getTools, getConsumables, registerMovement } from "@/lib/services/stock";
import { getProjects, getEmployees } from "@/lib/services/project-tracking"; // Need these generic services
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

interface MovementFormProps {
    defaultType?: 'CHECK_OUT' | 'CHECK_IN';
}

export function MovementForm({ defaultType = 'CHECK_OUT' }: MovementFormProps) {
    const router = useRouter();
    const { toast } = useToast();

    const [movementType, setMovementType] = useState<MovementType>(defaultType);
    const [itemType, setItemType] = useState<'TOOL' | 'CONSUMABLE'>('TOOL');
    const [step, setStep] = useState(1);

    // Data
    const [tools, setTools] = useState<Tool[]>([]);
    const [consumables, setConsumables] = useState<Consumable[]>([]);
    const [projects, setProjects] = useState<any[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);

    // Selection
    const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
    const [quantity, setQuantity] = useState(1);
    const [targetType, setTargetType] = useState<'EMPLOYEE' | 'PROJECT'>('EMPLOYEE');
    const [targetId, setTargetId] = useState("");
    const [status, setStatus] = useState<string>("AVAILABLE"); // For Return status

    // Search
    const [search, setSearch] = useState("");

    useEffect(() => {
        Promise.all([
            getTools(),
            getConsumables(),
            getProjects(),
            getEmployees()
        ]).then(([t, c, p, e]) => {
            setTools(t);
            setConsumables(c);
            setProjects(p);
            setEmployees(e);
        });
    }, []);

    const filteredItems = itemType === 'TOOL'
        ? tools.filter(t =>
            t.name.toLowerCase().includes(search.toLowerCase()) ||
            t.brand?.toLowerCase().includes(search.toLowerCase())
        ).filter(t => {
            // Filter based on movement type
            if (movementType === 'CHECK_OUT') return t.status === 'AVAILABLE';
            if (movementType === 'CHECK_IN') return t.status === 'IN_USE'; // Only return items that are out
            return true;
        })
        : consumables.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

    const handleSubmit = async () => {
        if (!selectedItem) return;

        try {
            const targetName = targetType === 'EMPLOYEE'
                ? employees.find(e => e.id === targetId)?.name
                : projects.find(p => p.id === targetId)?.name;

            const movementData: any = {
                itemId: selectedItem.id,
                itemName: selectedItem.name,
                itemType: itemType,
                type: movementType,
                quantity: itemType === 'CONSUMABLE' ? quantity : 1,
                date: new Date().toISOString(),
                responsableId: "current-user", // TODO: Get from Auth
                responsableName: "Admin", // TODO: Get from Auth
            };

            if (movementType === 'CHECK_OUT') {
                if (!targetId || !targetName) {
                    toast({ variant: "destructive", title: "Error", description: "Seleccione un destinatario." });
                    return;
                }
                movementData.to = {
                    type: targetType,
                    id: targetId,
                    name: targetName
                };
            } else if (movementType === 'CHECK_IN' && itemType === 'TOOL') {
                // Return Status
                // The service handles logic based on movement type, but standard Check-in sets to AVAILABLE.
                // If broken, we'd use a different flow or set status after.
                // For simplicity, Check-in implies return to shelf.
            }

            await registerMovement(movementData);

            toast({ title: "Movimiento Registrado", description: `${movementType === 'CHECK_OUT' ? 'Entrega' : 'Devolución'} exitosa.` });
            router.push('/stock');

        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: error.message });
        }
    };

    return (
        <Card className="max-w-4xl mx-auto shadow-lg border-indigo-100">
            <CardHeader className="bg-slate-50 border-b">
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle className="flex items-center gap-2 text-xl">
                            {movementType === 'CHECK_OUT' ? <ArrowUpCircle className="text-orange-500" /> : <ArrowDownCircle className="text-emerald-500" />}
                            {movementType === 'CHECK_OUT' ? 'Entregar Item' : 'Recibir Devolución'}
                        </CardTitle>
                        <CardDescription>
                            {movementType === 'CHECK_OUT'
                                ? 'Asignar herramienta o insumo a una obra o empleado.'
                                : 'Reingresar items al pañol.'}
                        </CardDescription>
                    </div>
                    <div className="flex bg-white rounded-lg border p-1">
                        <Button
                            variant={movementType === 'CHECK_OUT' ? 'secondary' : 'ghost'}
                            size="sm"
                            onClick={() => { setMovementType('CHECK_OUT'); setSelectedItem(null); setStep(1); }}
                        >
                            Entrega
                        </Button>
                        <Button
                            variant={movementType === 'CHECK_IN' ? 'secondary' : 'ghost'}
                            size="sm"
                            onClick={() => { setMovementType('CHECK_IN'); setSelectedItem(null); setStep(1); }}
                        >
                            Devolución
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-6 space-y-8">

                {/* STEP 1: SELECT ITEM */}
                {step === 1 && (
                    <div className="space-y-4">
                        <div className="flex gap-4 mb-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                <Input
                                    className="pl-10 h-12 text-lg"
                                    placeholder="Buscar herramienta o insumo..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    autoFocus
                                />
                            </div>
                            <Select value={itemType} onValueChange={(v: any) => setItemType(v)}>
                                <SelectTrigger className="w-[180px] h-12">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="TOOL">Herramientas</SelectItem>
                                    <SelectItem value="CONSUMABLE">Insumos</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[400px] overflow-y-auto p-1">
                            {filteredItems.map(item => (
                                <div
                                    key={item.id}
                                    onClick={() => { setSelectedItem(item); setStep(2); }}
                                    className="group cursor-pointer border rounded-lg p-4 hover:border-indigo-500 hover:shadow-md transition-all bg-white relative"
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <Badge variant="outline" className="text-xs">{item.category}</Badge>
                                        {(item as Tool).status && (
                                            <Badge className={
                                                (item as Tool).status === 'AVAILABLE' ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                                            }>
                                                {(item as Tool).status}
                                            </Badge>
                                        )}
                                    </div>
                                    <h4 className="font-semibold text-slate-800 group-hover:text-indigo-600">{item.name}</h4>
                                    <p className="text-sm text-slate-500">
                                        {(item as Tool).brand} {(item as Tool).model}
                                    </p>
                                    {itemType === 'CONSUMABLE' && (
                                        <div className="mt-2 text-xs font-semibold text-slate-600">
                                            Stock: {(item as Consumable).quantity} {(item as Consumable).unit}
                                        </div>
                                    )}
                                </div>
                            ))}
                            {filteredItems.length === 0 && (
                                <div className="col-span-full text-center py-8 text-slate-400">
                                    No se encontraron items {movementType === 'CHECK_OUT' ? 'disponibles' : 'en uso'}.
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* STEP 2: CONFIGURE MOVEMENT */}
                {step === 2 && selectedItem && (
                    <div className="space-y-6">
                        <div className="bg-slate-50 p-4 rounded-lg flex items-center justify-between border">
                            <div>
                                <h3 className="font-bold text-lg">{selectedItem.name}</h3>
                                <p className="text-slate-500 text-sm">{(selectedItem as Tool).brand} - {selectedItem.category}</p>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => setStep(1)}>Cambiar Item</Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Left: Quantity / Status */}
                            <div className="space-y-4">
                                {itemType === 'CONSUMABLE' && (
                                    <div className="space-y-2">
                                        <Label>Cantidad a {movementType === 'CHECK_OUT' ? 'Retirar' : 'Ingresar'}</Label>
                                        <div className="flex items-center gap-2">
                                            <Input
                                                type="number"
                                                min="1"
                                                value={quantity}
                                                onChange={(e) => setQuantity(parseFloat(e.target.value))}
                                                className="text-lg font-bold w-32"
                                            />
                                            <span className="text-slate-500">{(selectedItem as Consumable).unit}</span>
                                        </div>
                                    </div>
                                )}

                                {movementType === 'CHECK_IN' && itemType === 'TOOL' && (
                                    <div className="p-4 bg-yellow-50 rounded border border-yellow-200 text-sm text-yellow-800">
                                        <p>⚠️ Al confirmar, la herramienta pasará a estado <strong>AVAILABLE</strong> (Disponible).</p>
                                        <p className="mt-1">Si está rota, usa la opción "Reportar Daño" en el listado.</p>
                                    </div>
                                )}
                            </div>

                            {/* Right: Target (Who/Where) */}
                            {movementType === 'CHECK_OUT' && (
                                <div className="space-y-4 border-l pl-8">
                                    <Label>Destinatario</Label>
                                    <div className="flex gap-2 mb-2">
                                        <Button
                                            variant={targetType === 'EMPLOYEE' ? 'default' : 'outline'}
                                            size="sm"
                                            onClick={() => setTargetType('EMPLOYEE')}
                                            className="flex-1"
                                        >
                                            <User className="h-4 w-4 mr-2" /> Empleado
                                        </Button>
                                        <Button
                                            variant={targetType === 'PROJECT' ? 'default' : 'outline'}
                                            size="sm"
                                            onClick={() => setTargetType('PROJECT')}
                                            className="flex-1"
                                        >
                                            <Briefcase className="h-4 w-4 mr-2" /> Obra
                                        </Button>
                                    </div>

                                    <Select onValueChange={setTargetId}>
                                        <SelectTrigger className="h-12">
                                            <SelectValue placeholder={`Seleccionar ${targetType === 'EMPLOYEE' ? 'Persona' : 'Obra'}...`} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {(targetType === 'EMPLOYEE' ? employees : projects).map((t: any) => (
                                                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            {movementType === 'CHECK_IN' && (
                                <div className="border-l pl-8 flex flex-col justify-center">
                                    <p className="text-slate-500 mb-2">Item devuelto por:</p>
                                    <div className="font-semibold text-lg">
                                        {(selectedItem as Tool).currentHolder?.name || "Desconocido"}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="pt-6 flex justify-end gap-3 border-t mt-4">
                            <Button variant="outline" size="lg" onClick={() => router.back()}>Cancelar</Button>
                            <Button size="lg" onClick={handleSubmit} className="px-8">
                                Confirmar {movementType === 'CHECK_OUT' ? 'Entrega' : 'Devolución'}
                            </Button>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
