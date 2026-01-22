"use client";

import Image from "next/image";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useUser } from "@/context/user-context";
import type { Role } from "@/lib/types";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { ChevronsUpDown } from "lucide-react";

const roles: Role[] = ["Dirección", "Supervisor", "Administración", "Operador"];

export function AppHeader() {
  const { role, setRole } = useUser();
  const userAvatar = PlaceHolderImages.find(p => p.id === 'user-avatar-1');

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-secondary px-4 md:px-6">
      <SidebarTrigger className="text-secondary-foreground hover:text-white/90" />
      <div className="flex-1">
        <h1 className="font-headline text-xl text-secondary-foreground">
          PMD Manager
        </h1>
      </div>
      <div className="flex items-center gap-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 text-secondary-foreground hover:bg-black/10 hover:text-secondary-foreground/90">
              {userAvatar && (
                 <Image
                    src={userAvatar.imageUrl}
                    alt={userAvatar.description}
                    data-ai-hint={userAvatar.imageHint}
                    width={28}
                    height={28}
                    className="rounded-full"
                 />
              )}
              <span className="hidden md:inline">{role}</span>
              <ChevronsUpDown className="h-4 w-4 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Cambiar Rol (Simulación)</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup value={role} onValueChange={(value) => setRole(value as Role)}>
              {roles.map((r) => (
                <DropdownMenuRadioItem key={r} value={r}>
                  {r}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
