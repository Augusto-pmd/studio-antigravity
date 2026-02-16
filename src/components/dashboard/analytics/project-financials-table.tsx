
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ProjectFinancials } from '@/services/financial-analytics';
import { Formatter } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

export function ProjectFinancialsTable({ data }: { data: ProjectFinancials[] }) {
    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Obra</TableHead>
                        <TableHead className="text-right">Ingresos</TableHead>
                        <TableHead className="text-right">Costos Directos</TableHead>
                        <TableHead className="text-right">Utilidad</TableHead>
                        <TableHead className="text-right">ROI</TableHead>
                        <TableHead className="text-center">Estado</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.map(p => {
                        const profit = p.income.total - p.costs.total;
                        return (
                            <TableRow key={p.projectId}>
                                <TableCell className="font-medium">{p.projectName}</TableCell>
                                <TableCell className="text-right text-green-600 font-mono">{Formatter.currency(p.income.total)}</TableCell>
                                <TableCell className="text-right text-red-600 font-mono">{Formatter.currency(p.costs.total)}</TableCell>
                                <TableCell className={`text-right font-bold font-mono ${profit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                                    {Formatter.currency(profit)}
                                </TableCell>
                                <TableCell className="text-right font-mono">
                                    <span className={p.roi > 20 ? 'text-green-600' : p.roi > 0 ? 'text-yellow-600' : 'text-red-600'}>
                                        {p.roi.toFixed(1)}%
                                    </span>
                                </TableCell>
                                <TableCell className="text-center">
                                    {p.roi < 0 ? <Badge variant="destructive">Pérdida</Badge> :
                                        p.roi > 30 ? <Badge className="bg-green-500">Excelente</Badge> :
                                            <Badge variant="secondary">Normal</Badge>}
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </div>
    );
}
