import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Landmark } from 'lucide-react';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
  }).format(amount);
};

export function IvaSummary({ ivaCredit }: { ivaCredit: number }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="font-headline">Resumen de IVA</CardTitle>
            <CardDescription>
              Crédito Fiscal acumulado a partir de los gastos registrados.
            </CardDescription>
          </div>
          <Landmark className="h-8 w-8 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="flex items-center justify-between rounded-lg border bg-background p-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Crédito Fiscal (IVA Compras)</p>
            <p className="text-2xl font-bold font-mono text-green-500">
              {formatCurrency(ivaCredit)}
            </p>
          </div>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-dashed p-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Débito Fiscal (IVA Ventas)</p>
            <p className="text-sm font-mono text-muted-foreground/70">
              No disponible (requiere módulo de ventas).
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
