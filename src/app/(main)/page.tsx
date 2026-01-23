import { StatsCards } from "@/components/dashboard/stats-cards";
import { ExpensesChart } from "@/components/dashboard/expenses-chart";
import { ProjectsOverview } from "@/components/dashboard/projects-overview";

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-headline">Dashboard General</h1>
      </div>
      <StatsCards />
      <div className="grid gap-8 lg:grid-cols-2">
        <ExpensesChart />
        <ProjectsOverview />
      </div>
    </div>
  );
}
