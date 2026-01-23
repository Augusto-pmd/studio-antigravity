'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth, useFirestore, useUser, errorEmitter, FirestorePermissionError } from '@/firebase';
import { GoogleAuthProvider, signInWithPopup, User, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

import { Button } from '@/components/ui/button';
import { Logo } from '@/components/icons/logo';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { UserProfile } from '@/lib/types';
import { loginBackgrounds } from '@/lib/login-backgrounds';


export default function LoginPage() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [background, setBackground] = useState(loginBackgrounds[0]);

  useEffect(() => {
    // This runs only on the client, after hydration, to pick a random background
    const randomIndex = Math.floor(Math.random() * loginBackgrounds.length);
    setBackground(loginBackgrounds[randomIndex]);
  }, []);

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
        
        setDoc(userRef, newUserProfile)
          .then(() => {
            toast({
              title: '¡Bienvenido!',
              description: 'Se ha creado tu perfil de usuario.',
            });
            // La redirección es manejada por el useEffect
          })
          .catch((error) => {
            const permissionError = new FirestorePermissionError({
              path: userRef.path,
              operation: 'create',
              requestResourceData: newUserProfile,
            });
            errorEmitter.emit('permission-error', permissionError);
            toast({
              variant: 'destructive',
              title: 'Error de Perfil',
              description: 'No se pudo crear tu perfil de usuario. Contacta al administrador.',
            });
          });
      }
    } catch (error: any) {
      if (error.code !== 'auth/popup-closed-by-user') {
        toast({
          variant: 'destructive',
          title: 'Error al iniciar sesión',
          description: error.message || 'No se pudo completar el inicio de sesión con Google.',
        });
      }
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
    <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2">
      <div className="flex items-center justify-center py-12">
        <div className="mx-auto grid w-[350px] gap-8">
          <div className="grid gap-4 text-center">
            <Logo className="mx-auto h-auto w-28" />
            <h1 className="text-3xl font-bold">Iniciar Sesión</h1>
            <p className="text-balance text-muted-foreground">
              Accede al sistema integral de gestión de obras.
            </p>
          </div>
          <div className="grid gap-4">
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
            <p className="text-center text-xs text-muted-foreground">
                Usa tu cuenta corporativa de Google para acceder.
            </p>
          </div>
        </div>
      </div>
       <div className="hidden bg-muted lg:block relative">
        <Image
            src={background.src}
            alt={background.hint}
            fill
            priority
            className="h-full w-full object-cover grayscale dark:brightness-[0.3]"
            data-ai-hint={background.hint}
        />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-8">
            <blockquote className="text-white text-lg font-medium max-w-lg">
            &ldquo;{background.quote}&rdquo;
            <footer className="text-sm mt-2 opacity-80">- {background.author}</footer>
            </blockquote>
        </div>
      </div>
    </div>
  );
}
