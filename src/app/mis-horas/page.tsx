import { UserTimeLog } from "@/components/recursos-humanos/user-time-log";

export default function MisHorasPage() {
  return (
     <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-headline">Mis Horas Trabajadas</h1>
      </div>
      <p className="text-muted-foreground">
        Registre las horas dedicadas a cada proyecto por día.
      </p>
      <UserTimeLog />
    </div>
  );
}
