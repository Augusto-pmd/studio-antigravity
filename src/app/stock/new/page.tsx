"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import { Textarea } from "@/components/ui/textarea";
import { addTool, addConsumable } from "@/lib/services/stock";
import { ItemCategory } from "@/lib/types";

export default function NewItemPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const defaultType = searchParams.get('type') === 'CONSUMABLE' ? 'CONSUMABLE' : 'TOOL';

    const [loading, setLoading] = useState(false);
    const [type, setType] = useState<'TOOL' | 'CONSUMABLE'>(defaultType);

    // Shared Fields
    const [name, setName] = useState("");
    const [category, setCategory] = useState<ItemCategory>("Other");
    const [sku, setSku] = useState("");
    const [minStock, setMinStock] = useState("1"); // String for input

    // Tool Fields
    const [brand, setBrand] = useState("");
    const [model, setModel] = useState("");
    const [serialNumber, setSerialNumber] = useState("");
    const [purchaseDate, setPurchaseDate] = useState("");
    const [purchasePrice, setPurchasePrice] = useState("");

    // Consumable Fields
    const [quantity, setQuantity] = useState("0");
    const [unit, setUnit] = useState("unidades");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (type === 'TOOL') {
                await addTool({
                    name,
                    category,
                    type: 'TOOL',
                    sku,
                    minStock: parseInt(minStock) || 1,
                    status: 'AVAILABLE',
                    brand,
                    model,
                    serialNumber,
                    purchaseDate,
                    purchasePrice: parseFloat(purchasePrice) || 0,
                    lifespanMonths: 12 // Default
                });
            } else {
                await addConsumable({
                    name,
                    category,
                    type: 'CONSUMABLE',
                    sku,
                    minStock: parseInt(minStock) || 5,
                    quantity: parseFloat(quantity) || 0,
                    unit
                });
            }
            router.push(type === 'TOOL' ? '/stock/tools' : '/stock/consumables');
        } catch (error) {
            console.error(error);
            alert("Error al crear item");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-2xl mx-auto">
            <Card>
                <CardHeader>
                    <CardTitle>Nuevo Item de Inventario</CardTitle>
                    <CardDescription>Agregar herramienta o insumo al pañol.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">

                        <div className="space-y-2">
                            <Label>Tipo de Item</Label>
                            <div className="flex gap-4">
                                <Button
                                    type="button"
                                    variant={type === 'TOOL' ? 'default' : 'outline'}
                                    onClick={() => setType('TOOL')}
                                    className="flex-1"
                                >
                                    Herramienta (Activo)
                                </Button>
                                <Button
                                    type="button"
                                    variant={type === 'CONSUMABLE' ? 'default' : 'outline'}
                                    onClick={() => setType('CONSUMABLE')}
                                    className="flex-1"
                                >
                                    Insumo (Consumible)
                                </Button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Nombre</Label>
                                <Input id="name" required value={name} onChange={e => setName(e.target.value)} />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="category">Categoría</Label>
                                <Select value={category} onValueChange={(v: ItemCategory) => setCategory(v)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccionar..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Power Tools">Herramientas Eléctricas</SelectItem>
                                        <SelectItem value="Hand Tools">Herramientas Manuales</SelectItem>
                                        <SelectItem value="Machinery">Maquinaria</SelectItem>
                                        <SelectItem value="Safety">Seguridad (EPP)</SelectItem>
                                        <SelectItem value="Consumables">Insumos/Materiales</SelectItem>
                                        <SelectItem value="Other">Otro</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {type === 'TOOL' && (
                            <>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Marca</Label>
                                        <Input value={brand} onChange={e => setBrand(e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Modelo</Label>
                                        <Input value={model} onChange={e => setModel(e.target.value)} />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Nro. Serie</Label>
                                    <Input value={serialNumber} onChange={e => setSerialNumber(e.target.value)} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Fecha Compra</Label>
                                        <Input type="date" value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Valor Compra ($)</Label>
                                        <Input type="number" value={purchasePrice} onChange={e => setPurchasePrice(e.target.value)} />
                                    </div>
                                </div>
                            </>
                        )}

                        {type === 'CONSUMABLE' && (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Cantidad Inicial</Label>
                                    <Input type="number" required value={quantity} onChange={e => setQuantity(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Unidad de Medida</Label>
                                    <Select value={unit} onValueChange={setUnit}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="unidades">Unidades</SelectItem>
                                            <SelectItem value="metros">Metros</SelectItem>
                                            <SelectItem value="kg">Kilogramos</SelectItem>
                                            <SelectItem value="litros">Litros</SelectItem>
                                            <SelectItem value="cajas">Cajas</SelectItem>
                                            <SelectItem value="pares">Pares</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>SKU / Código</Label>
                                <Input value={sku} onChange={e => setSku(e.target.value)} placeholder="Opcional" />
                            </div>
                            <div className="space-y-2">
                                <Label>Stock Mínimo (Alerta)</Label>
                                <Input type="number" value={minStock} onChange={e => setMinStock(e.target.value)} />
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-4">
                            <Button type="button" variant="ghost" onClick={() => router.back()}>Cancelar</Button>
                            <Button type="submit" disabled={loading}>
                                {loading ? "Guardando..." : "Crear Item"}
                            </Button>
                        </div>

                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
