'use client';

import { useFirestore, useDoc } from '@/firebase';
import { doc } from 'firebase/firestore';
import { techOfficeEmployeeConverter } from '@/lib/converters';
import { EmployeeProfileHeader } from '@/components/recursos-humanos/employee-profile-header';
import { SalaryHistoryList } from '@/components/recursos-humanos/salary-history-list';
import { AttendanceStats } from '@/components/recursos-humanos/attendance-stats';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import type { TechnicalOfficeEmployee } from '@/lib/types';

export default function LegajoPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const firestore = useFirestore();
    const employeeId = params.id;

    const { data: employee, isLoading } = useDoc<TechnicalOfficeEmployee>(
        firestore ? doc(firestore, 'technicalOfficeEmployees', employeeId).withConverter(techOfficeEmployeeConverter) : null
    );

    if (isLoading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-96 w-full" />
            </div>
        );
    }

    if (!employee) {
        return <div>Empleado no encontrado</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <h1 className="text-3xl font-headline">Legajo del Empleado</h1>
            </div>

            <EmployeeProfileHeader employee={employee} />

            <Tabs defaultValue="stats" className="w-full">
                <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
                    <TabsTrigger value="stats">Estadísticas</TabsTrigger>
                    <TabsTrigger value="history">Historial</TabsTrigger>
                    <TabsTrigger value="incidents">Incidencias</TabsTrigger>
                </TabsList>
                <TabsContent value="stats" className="mt-6">
                    <AttendanceStats employeeId={employeeId} />
                </TabsContent>
                <TabsContent value="history" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Historial Salarial</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <SalaryHistoryList employeeId={employeeId} />
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="incidents" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Incidencias y Ausencias</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground">Próximamente: Detalle de llegadas tarde y faltas.</p>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
