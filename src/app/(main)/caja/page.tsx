import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FileDown, TriangleAlert } from "lucide-react";

export default function CajaPage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-headline">Mi Caja</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Saldo en Pesos (ARS)</CardTitle>
            <CardDescription>Saldo actual disponible en su caja.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold font-mono">$ 45,780.50</p>
          </CardContent>
          <CardFooter>
            <p className="text-sm text-muted-foreground">Último cierre: 15/07/2024</p>
          </CardFooter>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Saldo en Dólares (USD)</CardTitle>
            <CardDescription>Saldo actual disponible en su caja.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold font-mono">$ 1,250.00</p>
          </CardContent>
           <CardFooter>
            <p className="text-sm text-muted-foreground">Último cierre: 15/07/2024</p>
          </CardFooter>
        </Card>
      </div>

       <Card className="border-destructive/50 bg-destructive/10">
        <CardHeader className="flex-row items-center gap-4 space-y-0">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/20">
            <TriangleAlert className="h-6 w-6 text-destructive" />
          </div>
          <div>
            <CardTitle>Cierre Semanal Obligatorio</CardTitle>
            <CardDescription className="text-foreground/80">
              Debe realizar el cierre de caja para la semana actual.
            </CardDescription>
          </div>
        </CardHeader>
        <CardFooter className="flex justify-end gap-2">
            <Button variant="outline">Ver Movimientos</Button>
            <Button>
                <FileDown className="mr-2 h-4 w-4" />
                Realizar Cierre Semanal
            </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
