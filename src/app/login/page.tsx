'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/icons/logo';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { loginBackgrounds } from '@/lib/login-backgrounds';


export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [background, setBackground] = useState(loginBackgrounds[0] || { src: '', hint: '', quote: '', author: '' });

  useEffect(() => {
    // This runs only on the client, after hydration, to pick a random background
    if (loginBackgrounds.length > 0) {
      const randomIndex = Math.floor(Math.random() * loginBackgrounds.length);
      setBackground(loginBackgrounds[randomIndex]);
    }
  }, []);

  const handleSignIn = () => {
    setIsSigningIn(true);
    toast({
      title: 'Simulando inicio de sesión...',
      description: 'Redirigiendo al dashboard.',
    });
    // Simulate a network request
    setTimeout(() => {
      router.replace('/');
    }, 1000);
  };
  
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
              onClick={handleSignIn}
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
              Ingresar al Sistema (Simulado)
            </Button>
            <p className="text-center text-xs text-muted-foreground">
                La autenticación real ha sido desactivada temporalmente.
            </p>
          </div>
        </div>
      </div>
       <div className="hidden bg-muted lg:block relative">
        {background.src && (
            <Image
                src={background.src}
                alt={background.hint}
                fill
                priority
                className="h-full w-full object-cover grayscale dark:brightness-[0.3]"
                data-ai-hint={background.hint}
            />
        )}
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
