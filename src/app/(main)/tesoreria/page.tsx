import { TreasuryAccounts } from "@/components/tesoreria/treasury-accounts";

export default function TesoreriaPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-headline">Tesorería</h1>
        <p className="text-muted-foreground">
            Administre las cuentas bancarias y de efectivo centrales de la empresa.
        </p>
      </div>
      <TreasuryAccounts />
    </div>
  );
}
