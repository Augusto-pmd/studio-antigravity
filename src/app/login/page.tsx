'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { useUser, useFirestore } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/icons/logo';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

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
  const [isSigningIn, setIsSigningIn] = useState(false);

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
      setIsSigningIn(true);
      const result = await signInWithPopup(auth, provider);
      const authUser = result.user;

      const userDocRef = doc(firestore, 'users', authUser.uid);
      const userDoc = await getDoc(userDocRef);
      const isDirector = authUser.email === 'info@pmdarquitectura.com';

      if (!userDoc.exists()) {
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
        const updates: Partial<UserProfile> = {
          fullName: authUser.displayName!,
          photoURL: authUser.photoURL || undefined,
          email: authUser.email!,
        };

        if (isDirector) {
          updates.role = 'Dirección';
        }

        await setDoc(userDocRef, updates, { merge: true });

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
      setIsSigningIn(false);
    }
  };

  if (isUserLoading || user) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-4 animate-pulse">
          <div className="relative">
            <div className="absolute inset-0 blur-xl bg-blue-500/30 rounded-full"></div>
            <Logo className="h-16 w-16 text-white relative z-10" />
          </div>
          <p className="text-blue-400/80 text-sm font-medium tracking-wider uppercase">Iniciando Sistema...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-black text-white">
      {/* Dynamic Background */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Deep Space Gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-[#0a0f1e] to-slate-950" />

        {/* Animated Orbs */}
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-blue-600/20 blur-[120px] animate-pulse duration-[4000ms]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-indigo-600/10 blur-[120px] animate-pulse duration-[7000ms]" />

        {/* Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:50px_50px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_100%)] opacity-30" />
      </div>

      {/* Main Content Card */}
      <div className="relative z-10 w-full max-w-md px-6 animate-in zoom-in-95 fade-in duration-700 slide-in-from-bottom-8">
        <div className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-2xl transition-all hover:border-white/20 hover:bg-white/10">

          {/* Shine Effect */}
          <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent z-0 pointer-events-none" />

          {/* Header */}
          <div className="relative z-10 flex flex-col items-center text-center">
            <div className="mb-8 relative">
              <div className="absolute -inset-4 bg-gradient-to-tr from-blue-500 to-cyan-500 rounded-full blur-xl opacity-40 animate-pulse" />
              <div className="relative rounded-2xl bg-gradient-to-b from-white/10 to-white/5 p-4 ring-1 ring-white/20 shadow-lg">
                <Logo className="h-14 w-14 text-white drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
              </div>
            </div>

            <h1 className="mb-2 text-4xl font-bold tracking-tight text-white drop-shadow-md">
              PMD <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">Manager</span>
            </h1>
            <p className="mb-10 text-sm text-slate-400 font-medium tracking-wide">
              GESTIÓN DE OBRAS DE PRÓXIMA GENERACIÓN
            </p>

            {/* Login Button */}
            <Button
              onClick={handleSignIn}
              disabled={isSigningIn}
              className="group relative w-full overflow-hidden rounded-xl bg-white text-slate-900 hover:bg-blue-50 h-14 transition-all duration-300 shadow-[0_0_20px_rgba(255,255,255,0.15)] hover:shadow-[0_0_30px_rgba(59,130,246,0.4)] hover:scale-[1.02] active:scale-[0.98]"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-200/50 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />

              {isSigningIn ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin text-blue-600" />
              ) : (
                <GoogleIcon className="mr-3 h-6 w-6 transition-transform group-hover:scale-110" />
              )}

              <span className="font-bold text-lg">
                {isSigningIn ? 'Iniciando sesión...' : 'Continuar con Google'}
              </span>
            </Button>

            {/* Footer / Badges */}
            <div className="mt-10 flex items-center justify-center gap-4 text-[10px] uppercase tracking-widest text-slate-500 font-semibold">
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.8)] animate-pulse" />
                Seguro
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/5">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500 shadow-[0_0_5px_rgba(59,130,246,0.8)]" />
                Corporativo
              </div>
            </div>
          </div>
        </div>

        <p className="mt-8 text-center text-xs text-slate-600 font-medium">
          &copy; 2026 PMD Arquitectura. Sistema Integral v2.0
        </p>
      </div>
    </main>
  );
}
