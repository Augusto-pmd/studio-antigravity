'use client';

import { useUser } from '@/firebase';
import { ExpensesChart } from "@/components/dashboard/expenses-chart";
import { ProjectsOverview } from "@/components/dashboard/projects-overview";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { WelcomeGuide } from '@/components/dashboard/welcome-guide';
import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardPage() {
    const { role, isUserLoading } = useUser();

    if (isUserLoading) {
        return (
            <div className="flex flex-col gap-8">
                <Skeleton className="h-10 w-1/3" />
                <Skeleton className="h-28 w-full" />
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-80 w-full" />
            </div>
        );
    }

    // Show dashboard for Director and Supervisor roles
    const showDashboard = role === 'Dirección' || role === 'Supervisor';

    if (showDashboard) {
        return (
            <div className="flex flex-col gap-8">
                <h1 className="text-3xl font-headline">Dashboard</h1>
                <StatsCards />
                <ProjectsOverview />
                <ExpensesChart />
            </div>
        );
    }

    // Show welcome guide for all other roles
    return <WelcomeGuide />;
}
