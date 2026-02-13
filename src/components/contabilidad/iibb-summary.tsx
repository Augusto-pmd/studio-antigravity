import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { FileText } from 'lucide-react';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
  }).format(amount);
};

export function IibbSummary({
  iibbCABA,
  iibbProvincia,
}: {
  iibbCABA: number;
  iibbProvincia: number;
}) {
  const totalIIBB = iibbCABA + iibbProvincia;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="font-headline">Resumen de IIBB</CardTitle>
            <CardDescription>
              Total de percepciones sufridas en el período.
            </CardDescription>
          </div>
          <FileText className="h-8 w-8 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="rounded-lg border bg-background p-4">
          <p className="text-sm font-medium text-muted-foreground">Total Percepciones IIBB</p>
          <p className="text-2xl font-bold font-mono text-orange-500">
            {formatCurrency(totalIIBB)}
          </p>
          <div className="mt-2 flex justify-between text-sm">
            <span className="text-muted-foreground">Jurisdicción CABA:</span>
            <span className="font-mono">{formatCurrency(iibbCABA)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Jurisdicción Provincia:</span>
            <span className="font-mono">{formatCurrency(iibbProvincia)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
