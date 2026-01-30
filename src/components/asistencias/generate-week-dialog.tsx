'use client';

import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { useFirestore } from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import { collection, doc, setDoc, query, where, limit, getDocs } from "firebase/firestore";
import type { PayrollWeek } from "@/lib/types";
import { startOfWeek, endOfWeek, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Loader2, PlusCircle } from "lucide-react";

export function GenerateWeekDialog({ disabled }: { disabled: boolean }) {
    const [open, setOpen] = useState(false);
    const [isGenerating, startTransition] = useTransition();
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
    const { firestore } = useFirestore();
    const { toast } = useToast();

    const handleGenerate = () => {
        if (!firestore) return;
        if (!selectedDate) {
            toast({ variant: 'destructive', title: 'Fecha requerida', description: 'Por favor, seleccione una fecha.' });
            return;
        }

        startTransition(() => {
            (async () => {
                try {
                    // Check if there is an open week already
                    const openWeekQuery = query(collection(firestore, 'payrollWeeks'), where('status', '==', 'Abierta'), limit(1));
                    const openWeekSnap = await getDocs(openWeekQuery);
                    if (!openWeekSnap.empty) {
                        toast({
                            variant: "destructive",
                            title: "Semana Abierta",
                            description: `Ya existe una semana abierta. Debe cerrarla antes de generar una nueva.`,
                        });
                        setOpen(false);
                        return;
                    }

                    const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 }); // Monday
                    const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 }); // Sunday

                    const newWeekRef = doc(collection(firestore, 'payrollWeeks'));
                    const newWeek: PayrollWeek = {
                        id: newWeekRef.id,
                        startDate: weekStart.toISOString(),
                        endDate: weekEnd.toISOString(),
                        status: 'Abierta',
                        generatedAt: new Date().toISOString(),
                    };

                    await setDoc(newWeekRef, newWeek);
                    
                    toast({
                        title: "Nueva Semana Generada",
                        description: `Se ha creado la semana del ${format(weekStart, 'dd/MM/yyyy')} al ${format(weekEnd, 'dd/MM/yyyy')}.`,
                    });
                    setOpen(false);
                } catch (error: any) {
                    console.error("Error generating new week:", error);
                    toast({ variant: 'destructive', title: "Error al generar", description: `No se pudo generar la nueva semana. ${error.message}` });
                }
            })();
        });
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button disabled={disabled}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Generar Nueva Semana
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Generar Nueva Semana de Pagos</DialogTitle>
                    <DialogDescription>
                        Seleccione cualquier día de la semana que desea generar. El sistema calculará automáticamente el inicio (Lunes) y fin (Domingo) de esa semana.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex justify-center py-4">
                     <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        locale={es}
                        initialFocus
                     />
                </div>
                <DialogFooter>
                    <Button type="button" onClick={handleGenerate} disabled={isGenerating || !selectedDate}>
                        {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Generar Semana
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
