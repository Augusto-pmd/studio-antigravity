'use client';

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
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Loader2, Trash2 } from "lucide-react";
import { useFirestore } from "@/firebase";
import { doc, deleteDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import type { FundRequest } from "@/lib/types";

export function DeleteFundRequestDialog({ request }: { request: FundRequest }) {
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
      const requestRef = doc(firestore, 'fundRequests', request.id);
      deleteDoc(requestRef)
        .then(() => {
          toast({
            title: "Solicitud Eliminada",
            description: `Se ha eliminado la solicitud de fondos.`,
          });
          setOpen(false);
        })
        .catch((error) => {
          console.error("Error deleting document:", error);
          toast({
            variant: "destructive",
            title: "Error al eliminar",
            description: "No se pudo eliminar la solicitud. Es posible que no tengas permisos.",
          });
        });
    });
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
          <AlertDialogTitle>¿Está seguro que desea eliminar esta solicitud?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción no se puede deshacer. Se eliminará permanentemente el registro de la solicitud de fondos.
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
