import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";

export function CashAdvances() {
  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>Gestión de Adelantos</CardTitle>
        <CardDescription>
          Registre y consulte los adelantos de sueldo otorgados a los empleados durante la semana.
        </CardDescription>
      </CardHeader>
      <CardContent>
         <div className="flex h-64 items-center justify-center rounded-md border border-dashed">
            <p className="text-muted-foreground">La funcionalidad para registrar adelantos se implementará aquí.</p>
        </div>
      </CardContent>
       <CardFooter className="justify-end">
          <Button disabled>
              <PlusCircle className="mr-2 h-4 w-4" />
              Registrar Adelanto
          </Button>
      </CardFooter>
    </Card>
  );
}
