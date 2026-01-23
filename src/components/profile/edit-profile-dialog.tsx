
'use client';

import { useState, useEffect, useTransition, ChangeEvent } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Pencil } from 'lucide-react';
import { useUser, useAuth, useFirebaseApp } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { updateProfile } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';

export function EditProfileDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { user, firestore } = useUser();
  const auth = useAuth();
  const firebaseApp = useFirebaseApp();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [fullName, setFullName] = useState(user?.displayName || '');
  const [newPhoto, setNewPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(user?.photoURL || null);

  useEffect(() => {
    if (user && open) {
      setFullName(user.displayName || '');
      setPhotoPreview(user.photoURL || null);
    }
  }, [user, open]);

  const handlePhotoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleSave = () => {
    if (!user || !firestore || !auth || !firebaseApp) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo conectar a los servicios de Firebase.' });
      return;
    }
    
    startTransition(async () => {
      try {
        let photoURL = user.photoURL || '';
        const userDocRef = doc(firestore, 'users', user.uid);
        
        if (newPhoto) {
          const storage = getStorage(firebaseApp);
          const filePath = `avatars/${user.uid}/${newPhoto.name}`;
          const storageRef = ref(storage, filePath);
          const snapshot = await uploadBytes(storageRef, newPhoto);
          photoURL = await getDownloadURL(snapshot.ref);
        }

        const profileUpdates: { displayName?: string, photoURL?: string } = {};
        const firestoreUpdates: { fullName?: string, photoURL?: string } = {};

        if (fullName !== user.displayName) {
            profileUpdates.displayName = fullName;
            firestoreUpdates.fullName = fullName;
        }
        if (photoURL !== user.photoURL) {
            profileUpdates.photoURL = photoURL;
            firestoreUpdates.photoURL = photoURL;
        }

        if (auth.currentUser && Object.keys(profileUpdates).length > 0) {
            await updateProfile(auth.currentUser, profileUpdates);
        }

        if (Object.keys(firestoreUpdates).length > 0) {
            await updateDoc(userDocRef, firestoreUpdates);
        }
        
        toast({ title: 'Perfil Actualizado', description: 'Tu información ha sido guardada.' });
        onOpenChange(false);
      } catch (error: any) {
        const permissionError = new FirestorePermissionError({
          path: `users/${user.uid}`,
          operation: 'update',
          requestResourceData: { fullName },
        });
        errorEmitter.emit('permission-error', permissionError);
        toast({ variant: 'destructive', title: 'Error al actualizar', description: 'No se pudo guardar el perfil. Es posible que no tengas permisos.' });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Mi Perfil</DialogTitle>
          <DialogDescription>
            Personaliza tu nombre y foto de perfil.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
                <Avatar className="h-24 w-24">
                    <AvatarImage src={photoPreview || undefined} alt="Avatar" />
                    <AvatarFallback>{fullName?.charAt(0)}</AvatarFallback>
                </Avatar>
                <Label htmlFor="photo-upload" className="absolute -bottom-2 -right-2 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90">
                    <Pencil className="h-4 w-4" />
                    <Input id="photo-upload" type="file" accept="image/*" className="sr-only" onChange={handlePhotoChange} />
                </Label>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="fullName">Nombre Completo</Label>
            <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
           <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={user?.email || ''} disabled />
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
