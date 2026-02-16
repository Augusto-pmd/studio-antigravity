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
      <div className="flex h-screen w-screen items-center justify-center bg-black">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <Logo className="h-16 w-16 text-white opacity-50" />
          <p className="text-muted-foreground text-sm">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black p-4">
      {/* Background Effects */}
      <div className="absolute inset-0 z-0">
        <div className="absolute -left-1/4 -top-1/4 h-1/2 w-1/2 rounded-full bg-primary/20 blur-[120px]" />
        <div className="absolute -right-1/4 -bottom-1/4 h-1/2 w-1/2 rounded-full bg-blue-600/20 blur-[120px]" />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full bg-white/5 blur-[100px]" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay"></div>
      </div>

      <div className="z-10 w-full max-w-md animate-in fade-in zoom-in-95 duration-500 slide-in-from-bottom-4">
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 px-8 py-10 shadow-2xl backdrop-blur-xl sm:px-10">

          {/* Decorative border gradient */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent opacity-50" />
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-50" />

          <div className="flex flex-col items-center text-center">
            <div className="mb-8 rounded-2xl bg-white/10 p-4 shadow-inner ring-1 ring-white/20">
              <Logo className="h-12 w-12 text-white" />
            </div>

            <h1 className="mb-2 text-3xl font-bold tracking-tight text-white drop-shadow-sm">
              PMD Manager
            </h1>
            <p className="mb-8 text-sm text-zinc-400">
              Plataforma de Gestión de Obras
            </p>

            <Button
              onClick={handleSignIn}
              className="group relative w-full overflow-hidden rounded-xl bg-white text-black hover:bg-zinc-200 h-12 transition-all duration-300 hover:shadow-[0_0_20px_rgba(255,255,255,0.3)]"
              size="lg"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-black/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
              <GoogleIcon className="mr-2 h-5 w-5" />
              <span className="font-semibold">Continuar con Google</span>
            </Button>

            <div className="mt-8 flex items-center justify-center space-x-2 text-xs text-zinc-500">
              <span>Seguro & Encriptado</span>
              <span className="h-1 w-1 rounded-full bg-zinc-600" />
              <span>Acceso Corporativo</span>
            </div>
          </div>
        </div>

        <p className="mt-8 text-center text-xs text-zinc-600">
          &copy; 2024 PMD Arquitectura. Todos los derechos reservados.
        </p>
      </div>
    </main>
  );
}
