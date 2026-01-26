"use client";

import { useState, useEffect, useTransition } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import type { UserProfile, Role } from "@/lib/types";
import { useFirestore } from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import { doc, updateDoc } from "firebase/firestore";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

const roles: Role[] = ["Dirección", "Supervisor", "Administración", "Operador", "Pañolero"];

export function EditUserDialog({
  userProfile,
  children,
}: {
  userProfile: UserProfile;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [role, setRole] = useState<Role>(userProfile.role);

  useEffect(() => {
    if (open) {
      setRole(userProfile.role);
    }
  }, [open, userProfile]);

  const handleSave = () => {
    if (!firestore) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo conectar a la base de datos.' });
      return;
    }
    
    startTransition(() => {
      const userRef = doc(firestore, 'users', userProfile.id);
      const updatedData = { role };
      
      updateDoc(userRef, updatedData)
        .then(() => {
            toast({
              title: 'Rol Actualizado',
              description: `El rol de ${userProfile.fullName} ha sido cambiado a ${role}.`,
            });
            setOpen(false);
        })
        .catch((error) => {
            console.error("Error writing to Firestore:", error);
            toast({
                variant: "destructive",
                title: "Error al guardar",
                description: "No se pudo actualizar el rol. Es posible que no tengas permisos.",
            });
        });
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Rol de Usuario</DialogTitle>
          <DialogDescription>
            Seleccione el nuevo rol para {userProfile.fullName}.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
            <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                    <AvatarImage src={userProfile.photoURL} />
                    <AvatarFallback className="text-2xl">{userProfile.fullName.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                    <p className="font-semibold">{userProfile.fullName}</p>
                    <p className="text-sm text-muted-foreground">{userProfile.email}</p>
                </div>
            </div>
          <div className="space-y-2">
            <Label htmlFor="role">Rol en el sistema</Label>
            <Select value={role} onValueChange={(v: any) => setRole(v)}>
              <SelectTrigger id="role">
                <SelectValue placeholder="Seleccione un rol" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" onClick={handleSave} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar Cambios
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
