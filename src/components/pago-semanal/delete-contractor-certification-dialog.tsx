'use client';

import { useState } from "react";
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
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Loader2, Trash2 } from "lucide-react";
import { useFirestore } from "@/firebase";
import { doc, writeBatch } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import type { ContractorCertification } from "@/lib/types";

export function DeleteContractorCertificationDialog({ certification }: { certification: ContractorCertification }) {
  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const handleDelete = async () => {
    if (!firestore) {
      toast({
        variant: "destructive",
        title: "Error de conexión",
      });
      return;
    }
    setIsPending(true);
    try {
      const batch = writeBatch(firestore);

      // 1. Delete certification document
      const certRef = doc(firestore, 'contractorCertifications', certification.id);
      batch.delete(certRef);

      // 2. If it was paid, delete the associated expense
      if (certification.status === 'Pagado' && certification.relatedExpenseId && certification.projectId) {
        const expenseRef = doc(firestore, `projects/${certification.projectId}/expenses`, certification.relatedExpenseId);
        batch.delete(expenseRef);
      }
      
      await batch.commit();

      toast({
        title: "Certificación Eliminada",
        description: `Se ha eliminado la certificación para ${certification.contractorName}.`,
      });
      setOpen(false);
    } catch (error) {
      console.error("Error deleting document:", error);
      toast({
        variant: "destructive",
        title: "Error al eliminar",
        description: "No se pudo eliminar la certificación.",
      });
    } finally {
        setIsPending(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
            <Trash2 className="mr-2 h-4 w-4" />
            <span>Eliminar</span>
        </DropdownMenuItem>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Está seguro?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción no se puede deshacer. Se eliminará permanentemente la certificación y el gasto de obra asociado (si ya fue pagada).
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} disabled={isPending} className="bg-destructive hover:bg-destructive/90">
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
