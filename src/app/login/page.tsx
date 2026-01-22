'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, useFirestore, useUser } from '@/firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
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
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    if (!auth || !firestore) {
      toast({
        variant: 'destructive',
        title: 'Error de configuración',
        description: 'Los servicios de autenticación no están disponibles.',
      });
      return;
    }

    setIsLoading(true);
    const provider = new GoogleAuthProvider();

    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Check if user profile exists, if not, create it
      const userRef = doc(firestore, 'user-profiles', user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        const newUserProfile: UserProfile = {
          id: user.uid,
          email: user.email || '',
          fullName: user.displayName || 'Usuario Anónimo',
          role: 'Operador', // Safest default role
        };
        await setDoc(userRef, newUserProfile);
        toast({
          title: '¡Bienvenido!',
          description: 'Se ha creado tu perfil de usuario.',
        });
      }

      router.push('/'); // Redirect to dashboard after successful login

    } catch (error: any) {
      console.error('Google Sign-In Error:', error);
      toast({
        variant: 'destructive',
        title: 'Error al iniciar sesión',
        description: error.message || 'No se pudo completar el inicio de sesión con Google.',
      });
      setIsLoading(false);
    }
  };

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
            disabled={isLoading}
          >
            {isLoading ? (
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
