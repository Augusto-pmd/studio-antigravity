'use client';

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { useUser } from "@/firebase";
import type { Expense } from "@/lib/types";
import { ExpenseForm } from "./expense-form";

export function AddExpenseDialog({
  expense,
  projectId: defaultProjectId,
  children,
}: {
  expense?: Expense;
  projectId?: string;
  children?: React.ReactNode;
}) {
  const { permissions } = useUser();
  const [open, setOpen] = useState(false);
  const isEditMode = !!expense;

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (!permissions.canLoadExpenses) return null;

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>
          {children || (
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Cargar Gasto
            </Button>
          )}
        </DrawerTrigger>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader>
            <DrawerTitle>{isEditMode ? 'Editar Documento' : 'Registrar Documento'}</DrawerTitle>
            <DrawerDescription>
              {isEditMode ? 'Modifique los detalles.' : 'Complete los campos o escanee un comprobante.'}
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-4 overflow-y-auto pb-6">
            <ExpenseForm
              expense={expense}
              projectId={defaultProjectId}
              onSuccess={() => setOpen(false)}
            />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Cargar Gasto
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Editar Documento' : 'Registrar Documento de Compra'}</DialogTitle>
          <DialogDescription>
            {isEditMode ? 'Modifique los detalles del documento.' : 'Escanee un comprobante o complete los campos para registrar un nuevo documento.'}
          </DialogDescription>
        </DialogHeader>
        <ExpenseForm
          expense={expense}
          projectId={defaultProjectId}
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
