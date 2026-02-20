
'use client';

import { Suspense } from 'react';
import { AnalyticsDashboard } from '@/components/dashboard/analytics/analytics-dashboard';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorBoundary } from '@/components/ui/error-boundary';

export default function AnalyticsPage() {
    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Análisis Financiero</h2>
            </div>
            <ErrorBoundary>
                <Suspense fallback={<Skeleton className="h-[600px] w-full" />}>
                    <AnalyticsDashboard />
                </Suspense>
            </ErrorBoundary>
        </div>
    );
}
