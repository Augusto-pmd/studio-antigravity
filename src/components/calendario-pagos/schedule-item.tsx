'use client';

import { PayExpenseDialog } from '@/components/contabilidad/pay-expense-dialog';
import { PaySalaryDialog } from '@/components/contabilidad/pay-salary-dialog';
import { PayInstallmentDialog } from '@/components/planes-de-pago/pay-installment-dialog';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from '@/lib/utils';
import { format, isBefore, startOfToday } from 'date-fns';
import { Banknote, Building, Calendar, ClipboardCheck, CreditCard, FileText, HardHat, TriangleAlert, User } from 'lucide-react';
import { useRouter } from 'next/navigation';

const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency }).format(amount);
}

const typeConfig = {
    'Gasto Recurrente': { icon: Banknote, color: 'text-cyan-500' },
    'Moratoria': { icon: FileText, color: 'text-indigo-500' },
    'Factura Proveedor': { icon: Building, color: 'text-orange-500' },
    'Sueldo': { icon: User, color: 'text-blue-500' },
    'Vencimiento DOC': { icon: ClipboardCheck, color: 'text-amber-600' },
}

export function ScheduleItem({ item }: { item: any }) {
    const router = useRouter();
    const isOverdue = isBefore(item.date, startOfToday());
    const Icon = typeConfig[item.type as keyof typeof typeConfig]?.icon || Banknote;
    
    const renderAction = () => {
        switch(item.type) {
            case 'Factura Proveedor':
                return <PayExpenseDialog expense={item.itemData}><Button size="sm">Pagar</Button></PayExpenseDialog>;
            case 'Sueldo':
                return <PaySalaryDialog salary={item.itemData}><Button size="sm">Pagar</Button></PaySalaryDialog>;
            case 'Moratoria':
                return <PayInstallmentDialog plan={item.itemData}><Button size="sm">Pagar Cuota</Button></PayInstallmentDialog>;
            case 'Gasto Recurrente': // No direct payment action, just a reminder
                 return <Button size="sm" variant="outline" onClick={() => router.push('/gastos-recurrentes')}>Ver</Button>
            case 'Vencimiento DOC':
                const path = item.itemData.cuit ? '/contratistas' : '/empleados'
                return <Button size="sm" variant="outline" onClick={() => router.push(path)}>Revisar</Button>
            default:
                return null;
        }
    }

    return (
        <TooltipProvider>
            <div className="flex items-center gap-4 rounded-lg p-3 hover:bg-muted/50">
                <div className="flex-none">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className={cn("flex h-10 w-10 items-center justify-center rounded-full bg-muted", isOverdue && 'bg-destructive/20')}>
                                <Icon className={cn(typeConfig[item.type as keyof typeof typeConfig]?.color || 'text-muted-foreground', "h-5 w-5")} />
                            </div>
                        </TooltipTrigger>
                        <TooltipContent>{item.type}</TooltipContent>
                    </Tooltip>
                </div>
                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-1">
                    <div className='md:col-span-2'>
                        <p className="font-medium">{item.title}</p>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                     <div className="flex items-center justify-start md:justify-end gap-4">
                        <div className='text-left md:text-right'>
                             <p className={cn("font-mono font-semibold", !item.amount && 'hidden')}>{item.amount ? formatCurrency(item.amount, item.currency) : ''}</p>
                             <p className={cn("text-sm", isOverdue && 'text-destructive font-semibold')}>
                                {format(item.date, 'dd/MM/yyyy')}
                             </p>
                        </div>
                    </div>
                </div>
                <div className="flex-none">
                    {renderAction()}
                </div>
            </div>
        </TooltipProvider>
    )
}
