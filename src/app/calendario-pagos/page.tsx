import { PaymentSchedule } from "@/components/calendario-pagos/payment-schedule";

export default function CalendarioPagosPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-headline">Calendario de Pagos y Vencimientos</h1>
        <p className="mt-1 text-muted-foreground">
          Un resumen de todas sus obligaciones de pago y vencimientos de documentación.
        </p>
      </div>
      <PaymentSchedule />
    </div>
  );
}
