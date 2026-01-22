import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

export function WeeklySummary() {
  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>Planilla de Pagos Semanal</CardTitle>
        <CardDescription>
          Aquí se mostrará el resumen semanal de asistencias, adelantos y el total a pagar por cada empleado y proveedor.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex h-64 items-center justify-center rounded-md border border-dashed">
            <p className="text-muted-foreground">La funcionalidad de resumen semanal se implementará aquí.</p>
        </div>
      </CardContent>
      <CardFooter className="justify-end">
          <Button disabled>
              <Download className="mr-2 h-4 w-4" />
              Exportar Planilla
          </Button>
      </CardFooter>
    </Card>
  );
}
