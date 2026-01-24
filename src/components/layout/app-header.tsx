"use client";

import { useState, useEffect } from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useUser } from "@/firebase";
import { Moon, Sun } from "lucide-react";

export function AppHeader() {
  const { user } = useUser();
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);

  // Effect to run on client mount
  useEffect(() => {
    setMounted(true);
    const storedTheme = localStorage.getItem("theme");
    // Set initial theme based on storage or system preference
    if (storedTheme === 'dark' || (!storedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setTheme('dark');
    }
  }, []);

  // Effect to apply theme changes to the DOM and local storage
  useEffect(() => {
    if (mounted) {
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
      }
    }
  }, [theme, mounted]);

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  const renderThemeButton = () => {
    if (!mounted) {
      // To prevent hydration mismatch, render a placeholder on the server.
      return <div className="h-7 w-7" />;
    }

    return (
      <Button variant="ghost" size="icon" onClick={toggleTheme} className="h-7 w-7 text-foreground hover:text-foreground/90">
        <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
        <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        <span className="sr-only">Toggle theme</span>
      </Button>
    );
  };


  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border/20 bg-background/60 px-4 backdrop-blur-sm md:px-6">
      <SidebarTrigger className="text-foreground hover:text-foreground/90" />
      
      {renderThemeButton()}

      <div className="flex-1">
        {/* Placeholder for potential breadcrumbs or page titles */}
      </div>
      <div className="flex items-center gap-4">
        {/* User menu is now only in the sidebar footer */}
      </div>
    </header>
  );
}
