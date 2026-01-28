'use client';

import { useState, useTransition, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFirestore } from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import { collection, doc, setDoc } from "firebase/firestore";
import type { MonthlySalary, TechnicalOfficeEmployee } from "@/lib/types";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";

export function SettleSalaryDialog({ employee, children }: { employee: TechnicalOfficeEmployee, children: React.ReactNode }) {
    const [open, setOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    const firestore = useFirestore();
    const { toast } = useToast();

    const [period, setPeriod] = useState('');
    const [deductions, setDeductions] = useState('');

    const netSalary = useMemo(() => {
        const gross = employee.monthlySalary || 0;
        const ded = parseFloat(deductions) || 0;
        return gross - ded;
    }, [employee.monthlySalary, deductions]);

    useEffect(() => {
        if (open) {
            setPeriod(format(new Date(), 'yyyy-MM'));
            setDeductions('');
        }
    }, [open]);

    const handleSave = () => {
        if (!firestore) return toast({ variant: "destructive", title: "Error de conexión" });
        if (!period || deductions === '') return toast({ variant: "destructive", title: "Campos incompletos", description: "Período y deducciones son obligatorios." });

        startTransition(() => {
            const salaryRef = doc(collection(firestore, 'monthlySalaries'));
            
            const newSalary: MonthlySalary = {
                id: salaryRef.id,
                employeeId: employee.id,
                employeeName: employee.fullName,
                period,
                grossSalary: employee.monthlySalary,
                deductions: parseFloat(deductions) || 0,
                netSalary,
                status: 'Pendiente de Pago',
            };

            setDoc(salaryRef, newSalary)
                .then(() => {
                    toast({ title: 'Liquidación Generada', description: `Se ha generado la deuda del sueldo para ${employee.fullName}.` });
                    setOpen(false);
                })
                .catch((error) => {
                    console.error("Error writing to Firestore:", error);
                    toast({
                        variant: "destructive",
                        title: "Error al generar",
                        description: "No se pudo generar la liquidación. Es posible que no tengas permisos.",
                    });
                });
        });
    };
    
    const formatCurrency = (amount: number) => {
        if (typeof amount !== 'number') return '';
        return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Liquidar Sueldo de {employee.fullName}</DialogTitle>
                    <DialogDescription>
                        Cargue los datos del recibo para generar la deuda pendiente de pago.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="period">Período de Liquidación</Label>
                        <Input id="period" type="month" value={period} onChange={(e: any) => setPeriod(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label>Salario Bruto</Label>
                        <Input value={formatCurrency(employee.monthlySalary)} disabled />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="deductions">Total Deducciones (Aportes, etc.)</Label>
                        <Input id="deductions" type="number" value={deductions} onChange={(e: any) => setDeductions(e.target.value)} placeholder="0.00" />
                    </div>
                    <div className="rounded-md border bg-muted p-3 space-y-1">
                        <Label>Neto a Pagar</Label>
                        <p className="text-2xl font-bold font-mono text-primary">{formatCurrency(netSalary)}</p>
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={handleSave} disabled={isPending}>
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Generar Deuda
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
