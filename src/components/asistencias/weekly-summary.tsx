'use client';

import { useState, useTransition, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, PlusCircle, FilePenLine, Eye, Loader2 } from "lucide-react";
import { useUser } from "@/context/user-context";
import { useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy, doc, getDocs, limit, setDoc, updateDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import type { PayrollWeek } from "@/lib/types";
import { format, parseISO, addDays, startOfWeek, endOfWeek } from "date-fns";
import { es } from "date-fns/locale";
import { Skeleton } from "../ui/skeleton";
import { cn } from "@/lib/utils";

export function WeeklySummary() {
  const { permissions, firestore } = useUser();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const isAdmin = permissions.canValidate;

  const payrollWeeksQuery = useMemoFirebase(
    () => firestore ? query(collection(firestore, 'payrollWeeks'), orderBy('startDate', 'desc')) : null,
    [firestore]
  );
  const { data: weeks, isLoading } = useCollection<PayrollWeek>(payrollWeeksQuery);

  const currentWeek = useMemo(() => weeks?.find(w => w.status === 'Abierta') || weeks?.[0], [weeks]);
  const historicalWeeks = useMemo(() => {
    if (!weeks) return [];
    if (!currentWeek) return weeks;
    return weeks.filter(w => w.id !== currentWeek.id);
  }, [weeks, currentWeek]);

  const formatDateRange = (startDate: string, endDate: string) => {
    const start = parseISO(startDate);
    const end = parseISO(endDate);
    return `${format(start, 'dd/MM/yyyy')} al ${format(end, 'dd/MM/yyyy')}`;
  };

  const handleGenerateNewWeek = () => {
    if (!firestore) return;
    if (weeks?.some(w => w.status === 'Abierta')) {
      toast({
        variant: "destructive",
        title: "Semana Abierta",
        description: "Ya existe una semana abierta. Debe cerrarla antes de generar una nueva.",
      });
      return;
    }

    startTransition(async () => {
        try {
            const lastWeekQuery = query(collection(firestore, 'payrollWeeks'), orderBy('startDate', 'desc'), limit(1));
            const lastWeekSnap = await getDocs(lastWeekQuery);
            
            let nextStartDate: Date;

            if (lastWeekSnap.empty) {
                // No weeks exist, start with the current week (Monday)
                nextStartDate = startOfWeek(new Date(), { weekStartsOn: 1 });
            } else {
                // Start from the day after the last week ended
                const lastWeek = lastWeekSnap.docs[0].data() as PayrollWeek;
                nextStartDate = addDays(parseISO(lastWeek.endDate), 1);
            }

            const nextEndDate = endOfWeek(nextStartDate, { weekStartsOn: 1 });

            const newWeekRef = doc(collection(firestore, 'payrollWeeks'));
            const newWeek: PayrollWeek = {
                id: newWeekRef.id,
                startDate: nextStartDate.toISOString(),
                endDate: nextEndDate.toISOString(),
                status: 'Abierta',
                generatedAt: new Date().toISOString(),
            };

            await setDoc(newWeekRef, newWeek, {});
            toast({
                title: "Nueva Semana Generada",
                description: `Se ha creado la semana del ${format(nextStartDate, 'dd/MM')} al ${format(nextEndDate, 'dd/MM')}.`,
            });
        } catch (error) {
            console.error("Error generating new week:", error);
            toast({ variant: 'destructive', title: "Error", description: "No se pudo generar la nueva semana." });
        }
    });
  };
  
  const handleCloseWeek = (weekId: string) => {
      if (!firestore) return;
      startTransition(async () => {
        try {
            const weekRef = doc(firestore, 'payrollWeeks', weekId);
            // Here we could add logic to validate the week before closing
            await updateDoc(weekRef, { status: 'Cerrada' });
            toast({
                title: "Semana Cerrada",
                description: "La semana ha sido cerrada y pasada al historial."
            });
        } catch (error) {
            console.error("Error closing week:", error);
            toast({ variant: 'destructive', title: "Error", description: "No se pudo cerrar la semana." });
        }
      });
  };

  return (
    <div className="mt-4">
       <Tabs defaultValue="actual" className="w-full">
         <div className="flex items-center justify-between mb-4">
            <TabsList>
                <TabsTrigger value="actual">Semana Actual</TabsTrigger>
                <TabsTrigger value="historial">Historial</TabsTrigger>
            </TabsList>
            {isAdmin && (
                <Button onClick={handleGenerateNewWeek} disabled={isPending || isLoading}>
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Generar Nueva Semana
                </Button>
            )}
         </div>
        
        <TabsContent value="actual">
            {isLoading && <Skeleton className="h-80 w-full" />}
            {!isLoading && !currentWeek && (
                 <Card>
                    <CardContent className="flex h-64 flex-col items-center justify-center gap-4 text-center">
                        <p className="text-lg font-medium text-muted-foreground">No hay ninguna semana de pagos activa.</p>
                        {isAdmin && <p className="text-sm text-muted-foreground">Utilice el botón "Generar Nueva Semana" para comenzar.</p>}
                    </CardContent>
                 </Card>
            )}
            {!isLoading && currentWeek && (
                 <Card>
                    <CardHeader>
                        <CardTitle>Planilla de Pagos: {formatDateRange(currentWeek.startDate, currentWeek.endDate)}</CardTitle>
                        <CardDescription>
                        Resumen de pagos a empleados y proveedores para la semana en curso.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex h-64 items-center justify-center rounded-md border border-dashed">
                            <p className="text-muted-foreground">Aquí se mostrará el resumen de la semana actual.</p>
                        </div>
                    </CardContent>
                    <CardFooter className="justify-between">
                        <p className="text-sm text-muted-foreground">Estado de la semana: 
                            <span className={cn(
                                "font-semibold ml-1",
                                currentWeek.status === 'Abierta' ? 'text-green-500' : 'text-red-500'
                            )}>
                                {currentWeek.status}
                            </span>
                        </p>
                        <div className="flex gap-2">
                             {isAdmin && currentWeek.status === 'Abierta' && (
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="outline" disabled={isPending}>Cerrar y Contabilizar</Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                        <AlertDialogTitle>¿Está seguro que desea cerrar la semana?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Esta acción es irreversible. Una vez cerrada, no se podrán registrar más asistencias
                                            ni adelantos para este período. Solo un administrador podrá editarla.
                                        </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleCloseWeek(currentWeek.id)}>Confirmar Cierre</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            )}
                            <Button disabled={isPending}>
                                <Download className="mr-2 h-4 w-4" />
                                Exportar Planilla
                            </Button>
                        </div>
                    </CardFooter>
                </Card>
            )}
        </TabsContent>
        <TabsContent value="historial">
            <Card>
                <CardHeader>
                    <CardTitle>Historial de Planillas Semanales</CardTitle>
                    <CardDescription>
                    Consulte las planillas de semanas anteriores. Las semanas cerradas solo pueden ser modificadas por un administrador.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Semana</TableHead>
                                    <TableHead>Estado</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading && <TableRow><TableCell colSpan={3}><Skeleton className="h-10 w-full" /></TableCell></TableRow>}
                                {!isLoading && historicalWeeks.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={3} className="h-24 text-center">No hay semanas en el historial.</TableCell>
                                    </TableRow>
                                )}
                                {historicalWeeks.map(week => (
                                    <TableRow key={week.id}>
                                        <TableCell className="font-medium">{formatDateRange(week.startDate, week.endDate)}</TableCell>
                                        <TableCell>
                                            <Badge variant="secondary">{week.status}</Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="outline" size="sm">
                                                {isAdmin ? <FilePenLine className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
                                                {isAdmin ? "Editar" : "Ver"}
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
