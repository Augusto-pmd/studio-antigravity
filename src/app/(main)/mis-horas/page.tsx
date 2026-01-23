'use client';

import { UserTimeLog } from '@/components/recursos-humanos/user-time-log';

export default function MisHorasPage() {
  return (
    <div className="flex flex-col gap-8">
        <div className="flex items-center justify-between">
            <h1 className="text-3xl font-headline">Registro de Horas por Obra</h1>
        </div>
        <p className="text-muted-foreground">
            Seleccione la fecha y distribuya sus horas de trabajo del día entre las obras correspondientes.
        </p>
        <UserTimeLog />
    </div>
  )
}
