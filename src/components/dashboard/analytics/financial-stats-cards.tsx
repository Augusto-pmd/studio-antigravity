
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Formatter } from '@/lib/utils';
import { DollarSign, TrendingDown, TrendingUp, Activity } from 'lucide-react';

interface Props {
    totalIncome: number;
    totalCost: number;
    totalProfit: number;
}

export function FinancialStatsCards({ totalIncome, totalCost, totalProfit }: Props) {
    const margin = totalIncome > 0 ? (totalProfit / totalIncome) * 100 : 0;

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Ingresos Totales (Cobrado)</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-green-600">{Formatter.currency(totalIncome)}</div>
                    <p className="text-xs text-muted-foreground">
                        +20.1% desde el mes pasado
                    </p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Costos Totales (Real)</CardTitle>
                    <TrendingDown className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-red-600">{Formatter.currency(totalCost)}</div>
                    <p className="text-xs text-muted-foreground">
                        Gastos + Mano de Obra
                    </p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Utilidad Neta</CardTitle>
                    <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className={`text-2xl font-bold ${totalProfit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                        {Formatter.currency(totalProfit)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Ganancia Real
                    </p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Margen Promedio</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className={`text-2xl font-bold ${margin >= 10 ? 'text-green-600' : 'text-yellow-600'}`}>
                        {margin.toFixed(1)}%
                    </div>
                    <p className="text-xs text-muted-foreground">
                        ROI Global
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
