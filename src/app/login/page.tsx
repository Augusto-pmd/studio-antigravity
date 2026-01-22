'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, useFirestore, useUser } from '@/firebase/provider';
import { GoogleAuthProvider, signInWithPopup, User, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Logo } from '@/components/icons/logo';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { UserProfile } from '@/lib/types';


export default function LoginPage() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
    // Si el usuario ya está logueado y la carga ha terminado, redirigir
    if (!isUserLoading && user) {
      router.replace('/');
    }
  }, [user, isUserLoading, router]);

  const handleGoogleSignIn = async () => {
    if (!auth || !firestore) {
      toast({
        variant: 'destructive',
        title: 'Error de configuración',
        description: 'Los servicios de autenticación no están disponibles.',
      });
      return;
    }

    setIsSigningIn(true);
    const provider = new GoogleAuthProvider();

    try {
      const result = await signInWithPopup(auth, provider);
      const loggedInUser = result.user;
      const userEmail = loggedInUser.email;
      
      const corporateDomain = 'pmdarquitectura.com';
      if (!userEmail || !userEmail.endsWith(`@${corporateDomain}`)) {
        await signOut(auth);
        toast({
          variant: 'destructive',
          title: 'Acceso Denegado',
          description: `El inicio de sesión solo está permitido para usuarios del dominio @${corporateDomain}.`,
        });
        setIsSigningIn(false);
        return;
      }

      const userRef = doc(firestore, 'users', loggedInUser.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        const newUserProfile: UserProfile = {
          id: loggedInUser.uid,
          email: loggedInUser.email || '',
          fullName: loggedInUser.displayName || 'Usuario Anónimo',
          role: 'Operador',
          photoURL: loggedInUser.photoURL || '',
        };
        await setDoc(userRef, newUserProfile);
        toast({
          title: '¡Bienvenido!',
          description: 'Se ha creado tu perfil de usuario.',
        });
      }
      // La redirección ahora es manejada por el useEffect
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error al iniciar sesión',
        description: error.code === 'auth/popup-closed-by-user' 
          ? 'El inicio de sesión fue cancelado.'
          : error.message || 'No se pudo completar el inicio de sesión con Google.',
      });
    } finally {
      setIsSigningIn(false);
    }
  };
  
  // Muestra un loader mientras se determina el estado de autenticación inicial
  if (isUserLoading || user) {
    return (
       <div className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground">Verificando sesión...</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <Logo className="mb-4 h-auto w-40" />
          <CardTitle className="text-2xl">Iniciar Sesión</CardTitle>
          <CardDescription>
            Accede al sistema de gestión de obras.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            className="w-full"
            onClick={handleGoogleSignIn}
            disabled={isSigningIn}
          >
            {isSigningIn ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <svg
                className="mr-2 h-4 w-4"
                aria-hidden="true"
                focusable="false"
                data-prefix="fab"
                data-icon="google"
                role="img"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 488 512"
              >
                <path
                  fill="currentColor"
                  d="M488 261.8C488 403.3 381.5 512 244 512 109.8 512 0 402.2 0 265.8 0 129.5 109.8 20 244 20c69.1 0 125.3 27.8 172.4 72.3l-66.5 64.2C300.5 112.2 274.6 96 244 96c-84.9 0-154.4 68.5-154.4 169.8s69.5 169.8 154.4 169.8c99.1 0 132.3-72.5 136.2-109.4H244v-85.3h244.1c2.5 13.9 3.9 29.8 3.9 46.4z"
                ></path>
              </svg>
            )}
            Iniciar Sesión con Google
          </Button>
        </CardContent>
        <CardFooter>
          <p className="w-full text-center text-xs text-muted-foreground">
            Usa tu cuenta corporativa de Google.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
