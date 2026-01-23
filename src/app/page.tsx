import { ExpensesChart } from "@/components/dashboard/expenses-chart";
import { ProjectsOverview } from "@/components/dashboard/projects-overview";
import { StatsCards } from "@/components/dashboard/stats-cards";

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-8">
        <h1 className="text-3xl font-headline">Dashboard</h1>
        <StatsCards />
        <ProjectsOverview />
        <ExpensesChart />
    </div>
  );
}
