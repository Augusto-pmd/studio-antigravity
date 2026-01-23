import { CashAdvances } from "@/components/asistencias/cash-advances";
import { DailyAttendance } from "@/components/asistencias/daily-attendance";
import { WeeklySummary } from "@/components/asistencias/weekly-summary";

export default function AsistenciasPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-headline">Asistencias y Planillas</h1>
      </div>
      <WeeklySummary />
      <CashAdvances />
      <DailyAttendance />
    </div>
  );
}
