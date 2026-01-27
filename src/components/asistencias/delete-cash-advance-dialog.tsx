"use client";

import { useState, useTransition } from "react";
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
import { Loader2, Trash2 } from "lucide-react";
import { useFirestore } from "@/firebase";
import { doc, deleteDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import type { CashAdvance } from "@/lib/types";

export function DeleteCashAdvanceDialog({ advance }: { advance: CashAdvance }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const firestore = useFirestore();
  const { toast } = useToast();

  const handleDelete = () => {
    if (!firestore) {
      toast({
        variant: "destructive",
        title: "Error de conexión",
        description: "No se pudo conectar a la base de datos.",
      });
      return;
    }
    startTransition(() => {
      const advanceRef = doc(firestore, 'cashAdvances', advance.id);
      deleteDoc(advanceRef)
        .then(() => {
          toast({
            title: "Adelanto Eliminado",
            description: `Se ha eliminado el adelanto para ${advance.employeeName}.`,
          });
          setOpen(false);
        })
        .catch((error) => {
          console.error("Error deleting document:", error);
          toast({
            variant: "destructive",
            title: "Error al eliminar",
            description: "No se pudo eliminar el adelanto. Es posible que no tengas permisos.",
          });
        });
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Está seguro que desea eliminar este adelanto?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción no se puede deshacer. Se eliminará permanentemente el registro del adelanto. El monto se re-calculará en la liquidación semanal.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} disabled={isPending} className="bg-destructive hover:bg-destructive/90">
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmar Eliminación
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
