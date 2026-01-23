import { FundRequestsTable } from "@/components/pago-semanal/fund-requests-table";
import { RequestFundDialog } from "@/components/pago-semanal/request-fund-dialog";
import { useUser, useCollection } from "@/firebase";
import { collection, query, where } from "firebase/firestore";

export default function PagoSemanalPage() {
  // These hooks can't be used here directly as this is a Server Component.
  // We will pass the data down to the client components.
  // For now, this is a placeholder to show the structure.
  // In a real implementation, you'd fetch this data in a way that works with Server Components.
  const requests = null;
  const isLoading = true;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-headline">Solicitudes de Fondos</h1>
        <RequestFundDialog />
      </div>
      <p className="text-muted-foreground">
        Cree y supervise las solicitudes de dinero para gastos de la semana.
      </p>
      {/* <FundRequestsTable requests={requests} isLoading={isLoading} /> */}
      <p className="text-center text-muted-foreground mt-8">El componente de la tabla de solicitudes se cargará aquí.</p>

    </div>
  );
}
