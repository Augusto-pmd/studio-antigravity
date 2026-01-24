'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { useUser, useFirestore } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/icons/logo';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

function GoogleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 48 48" {...props}>
      <path
        fill="#FFC107"
        d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"
      />
      <path
        fill="#FF3D00"
        d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.222,0-9.657-3.356-11.303-7.962l-6.571,4.819C9.656,39.663,16.318,44,24,44z"
      />
      <path
        fill="#1976D2"
        d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571l6.19,5.238C42.02,35.62,44,30.038,44,24C44,22.659,43.862,21.35,43.611,20.083z"
      />
    </svg>
  );
}

export default function LoginPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (!isUserLoading && user) {
      router.push('/');
    }
  }, [user, isUserLoading, router]);

  const handleSignIn = async () => {
    const auth = getAuth();
    const provider = new GoogleAuthProvider();

    if (!firestore) {
      toast({
        variant: "destructive",
        title: "Error de conexión",
        description: "No se pudo conectar a la base de datos.",
      });
      return;
    }

    try {
      const result = await signInWithPopup(auth, provider);
      const authUser = result.user;

      const userDocRef = doc(firestore, 'users', authUser.uid);
      const userDoc = await getDoc(userDocRef);
      const isDirector = authUser.email === 'info@pmdarquitectura.com';

      if (!userDoc.exists()) {
        // This is a new user, create their profile document
        const newUserProfile: UserProfile = {
          id: authUser.uid,
          email: authUser.email!,
          fullName: authUser.displayName!,
          photoURL: authUser.photoURL || undefined,
          role: isDirector ? 'Dirección' : 'Operador',
        };
        await setDoc(userDocRef, newUserProfile);
        toast({
            title: "¡Bienvenido!",
            description: `Se ha creado tu perfil como ${newUserProfile.role}.`,
        });
      } else {
        // Existing user. Ensure profile info is up-to-date and enforce Director role.
        const updates: Partial<UserProfile> = {
          fullName: authUser.displayName!,
          photoURL: authUser.photoURL || undefined,
          email: authUser.email!,
        };

        if (isDirector) {
          updates.role = 'Dirección';
        }

        await setDoc(userDocRef, updates, { merge: true });

        // Only show toast if the role was incorrect and has now been fixed.
        if (isDirector && userDoc.data()?.role !== 'Dirección') {
          toast({
            title: "Rol de Director Verificado",
            description: 'Tu rol ha sido actualizado a "Dirección".',
          });
        }
      }

      router.push('/');
    } catch (error: any) {
      console.error('Error signing in with Google', error);
      toast({
        variant: "destructive",
        title: "Error al iniciar sesión",
        description: error.message || "Ocurrió un error inesperado.",
      });
    }
  };

  if (isUserLoading || user) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <p>Cargando...</p>
      </div>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-md space-y-8 rounded-lg border bg-card p-8 shadow-lg">
            <div className="text-center">
                <Logo className="mx-auto h-auto w-40" />
                <h1 className="mt-6 text-3xl font-bold tracking-tight text-foreground">
                    Bienvenido a PMD Manager
                </h1>
                <p className="mt-2 text-muted-foreground">
                    Inicie sesión para acceder al sistema de gestión de obras.
                </p>
            </div>
            <Button onClick={handleSignIn} className="w-full" size="lg">
                <GoogleIcon className="mr-2 h-5 w-5" />
                Ingresar con Google
            </Button>
            <p className="text-center text-xs text-muted-foreground">
                Al continuar, usted acepta nuestros Términos de Servicio y Política de Privacidad.
            </p>
        </div>
    </main>
  );
}
