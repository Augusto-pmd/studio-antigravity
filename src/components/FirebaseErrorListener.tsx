'use client';

import { useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { useToast } from '@/hooks/use-toast';
import type { FirestorePermissionError } from '@/firebase/errors';

export function FirebaseErrorListener() {
  const { toast } = useToast();

  useEffect(() => {
    const handlePermissionError = (error: FirestorePermissionError) => {
      console.error(error); // Also log to console for dev visibility
      toast({
        variant: 'destructive',
        title: 'Error de Permisos',
        description: 'No tienes permiso para realizar esta acción. Contacta al administrador.',
        duration: 9000,
      });
       // In a real app, you might want to throw this to a boundary
       // For now, we just toast and log.
       if (process.env.NODE_ENV === 'development') {
         throw error;
       }
    };

    errorEmitter.on('permission-error', handlePermissionError);

    return () => {
      errorEmitter.off('permission-error', handlePermissionError);
    };
  }, [toast]);

  return null;
}
