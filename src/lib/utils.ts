
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const Formatter = {
  currency: (value: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  },
  date: (dateStr: string) => {
    if (!dateStr) return "-";
    // Expect YYYY-MM-DD
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  }
}
