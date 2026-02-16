'use client';

import { useState } from 'react';
import { useFirestore, useCollection } from '@/firebase';
import { collection, query, where, addDoc, getDocs, writeBatch, serverTimestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Banknote } from 'lucide-react';
import type { TechnicalOfficeEmployee } from '@/lib/types';
import { techOfficeEmployeeConverter } from '@/lib/converters';

export function GenerateSalariesDialog({ children }: { children: React.ReactNode }) {
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedMonth, setSelectedMonth] = useState<string>(() => {
        const now = new Date();
        // Default to current month string YYYY-MM
        return now.toISOString().slice(0, 7);
    });

    const firestore = useFirestore();

    const handleGenerate = async () => {
        if (!firestore || !selectedMonth) return;
        setIsLoading(true);

        try {
            // 1. Fetch Active Employees with 'Relación de Dependencia'
            const employeesRef = collection(firestore, 'technicalOfficeEmployees').withConverter(techOfficeEmployeeConverter);
            const q = query(
                employeesRef,
                where('status', '==', 'Activo'),
                where('employmentType', '==', 'Relación de Dependencia')
            );
            const snapshot = await getDocs(q);

            if (snapshot.empty) {
                toast({
                    title: "Sin empleados",
                    description: "No se encontraron empleados activos en Relación de Dependencia.",
                    variant: "destructive"
                });
                setIsLoading(false);
                return;
            }

            // 2. Check if period already exists to avoid duplicates (optional but good)
            // For now, simpler: Just generate. The user can delete if wrong.
            const salariesRef = collection(firestore, 'monthlySalaries');

            let count = 0;

            // Let's use Promise.all for creation to keep code simple and readable
            const promises = snapshot.docs.map(async (doc) => {
                const emp = doc.data();
                const gross = emp.monthlySalary || 0;
                const deductions = gross * 0.17; // Assumption: 17% standard social security
                const net = gross - deductions;

                await addDoc(salariesRef, {
                    employeeId: emp.id,
                    employeeName: emp.fullName,
                    period: selectedMonth, // YYYY-MM
                    grossSalary: gross,
                    deductions: deductions,
                    netSalary: net,
                    status: 'Pendiente de Pago',
                    paidDate: null,
                    createdAt: serverTimestamp()
                });
                count++;
            });

            await Promise.all(promises);

            toast({
                title: "Liquidaciones Generadas",
                description: `Se han generado ${count} liquidaciones correspondientes a ${selectedMonth}.`,
            });
            setOpen(false);

        } catch (error) {
            console.error("Error generating salaries", error);
            toast({
                title: "Error",
                description: "No se pudieron generar las liquidaciones.",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    // Generate last 12 months options
    const monthOptions = Array.from({ length: 12 }, (_, i) => {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        return d.toISOString().slice(0, 7);
    });

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Generar Liquidaciones</DialogTitle>
                    <DialogDescription>
                        Crea automáticamente los registros de salario para todos los empleados en Relación de Dependencia activos.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="period" className="text-right">
                            Período
                        </Label>
                        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                            <SelectTrigger className="w-[180px] col-span-3">
                                <SelectValue placeholder="Seleccionar mes" />
                            </SelectTrigger>
                            <SelectContent>
                                {monthOptions.map(m => (
                                    <SelectItem key={m} value={m}>{m}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={handleGenerate} disabled={isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isLoading ? 'Generando...' : 'Generar'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
