import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Landmark } from 'lucide-react';
import { cn } from '@/lib/utils';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
  }).format(amount);
};

export function IvaSummary({ ivaCredit, ivaDebit }: { ivaCredit: number, ivaDebit: number }) {
  const ivaBalance = ivaDebit - ivaCredit;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="font-headline">Resumen de IVA</CardTitle>
            <CardDescription>
              Posición mensual de IVA (Débito - Crédito).
            </CardDescription>
          </div>
          <Landmark className="h-8 w-8 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="rounded-lg border bg-background p-4 space-y-3">
          <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Débito Fiscal (Ventas)</p>
                <p className="text-xl font-bold font-mono text-destructive">
                  {formatCurrency(ivaDebit)}
                </p>
              </div>
              <div className='text-right'>
                <p className="text-sm font-medium text-muted-foreground">Crédito Fiscal (Compras)</p>
                <p className="text-xl font-bold font-mono text-green-500">
                  {formatCurrency(ivaCredit)}
                </p>
              </div>
          </div>
          <div className='border-t pt-3'>
            <p className="text-sm font-medium text-muted-foreground">Posición de IVA a Pagar/Favor</p>
            <p className={cn(
              "text-2xl font-bold font-mono",
              ivaBalance >= 0 ? "text-destructive" : "text-green-500"
            )}>
              {formatCurrency(ivaBalance)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
