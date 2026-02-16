'use client';

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Edit, Phone, Mail, MapPin, Calendar, DollarSign, Clock } from "lucide-react";
import type { TechnicalOfficeEmployee } from "@/lib/types";

interface EmployeeProfileHeaderProps {
    employee: TechnicalOfficeEmployee;
    onEdit?: () => void;
}

export function EmployeeProfileHeader({ employee, onEdit }: EmployeeProfileHeaderProps) {
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount);
    };

    return (
        <Card className="overflow-hidden">
            <div className="h-32 bg-gradient-to-r from-blue-600 to-indigo-600 opacity-90"></div>
            <CardContent className="relative pt-0">
                <div className="flex flex-col sm:flex-row items-start sm:items-end -mt-12 mb-6 gap-4">
                    <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
                        <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${employee.fullName}`} />
                        <AvatarFallback>{employee.fullName.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-1 mt-2 sm:mt-0">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-bold">{employee.fullName}</h2>
                                <p className="text-muted-foreground">{employee.position}</p>
                            </div>
                            {onEdit && (
                                <Button variant="outline" size="sm" onClick={onEdit}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Editar
                                </Button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="space-y-3">
                        <div className="flex items-center text-sm text-muted-foreground">
                            <Badge variant={employee.status === 'Activo' ? 'default' : 'secondary'}>
                                {employee.status}
                            </Badge>
                            <span className="mx-2">•</span>
                            <span>{employee.employmentType}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium text-foreground">{formatCurrency(employee.monthlySalary)}</span>
                            <span className="text-muted-foreground text-xs">(Mensual Bruto)</span>
                        </div>
                    </div>

                    {/* Placeholder for more contacts if they existed in the type */}
                    <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <span>{/* employee.email || */ 'No email registered'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <span>{/* employee.phone || */ 'No phone registered'}</span>
                        </div>
                    </div>

                    <div className="space-y-2 text-sm">
                        {/* Placeholder for Address/Date */}
                        <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span>Oficina Central</span>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
