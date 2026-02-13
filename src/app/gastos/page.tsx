import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Building2 } from 'lucide-react';

export default function GastosPage() {
  return (
    <div className="flex h-full items-center justify-center">
      <Card className="w-full max-w-lg text-center">
        <CardHeader>
          <CardTitle className="text-2xl">Gestión de Gastos por Obra</CardTitle>
          <CardDescription>
            Para ver, filtrar y registrar gastos, por favor seleccione una obra específica.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-6 text-muted-foreground">
            Hemos centralizado toda la gestión de gastos dentro de cada proyecto para una mejor organización.
          </p>
          <Button asChild>
            <Link href="/obras">
              <Building2 className="mr-2 h-4 w-4" />
              Ir a Obras
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
