"use client";

import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Employee } from "@/lib/types";
import { DocumentManager } from "@/components/shared/document-manager";
import { useDoc, useFirestore } from "@/firebase";
import { doc } from "firebase/firestore";

export function EmployeeFileDialog({ employee, children }: { employee: Employee; children: React.ReactNode }) {
    const [open, setOpen] = useState(false);
    const firestore = useFirestore();
    
    // We use useDoc to get real-time updates of the employee's document
    const employeeRef = useMemo(() => firestore ? doc(firestore, `employees/${employee.id}`) : null, [firestore, employee.id]);
    const { data: updatedEmployee, isLoading } = useDoc(employeeRef);

    const displayEmployee = updatedEmployee || employee;

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Legajo de {displayEmployee.name}</DialogTitle>
                    <DialogDescription>
                        Administre la documentación personal del empleado.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <DocumentManager 
                    key={`acc-ins-${displayEmployee.id}`}
                    title="Seguro de Accidentes Personales"
                    docPath={`employees/${displayEmployee.id}`}
                    storagePath={`employee-documents/${displayEmployee.id}`}
                    fieldName="accidentInsuranceUrl"
                    currentUrl={displayEmployee.accidentInsuranceUrl}
                  />
                  <DocumentManager 
                    key={`crim-rec-${displayEmployee.id}`}
                    title="Antecedentes Penales"
                    docPath={`employees/${displayEmployee.id}`}
                    storagePath={`employee-documents/${displayEmployee.id}`}
                    fieldName="criminalRecordUrl"
                    currentUrl={displayEmployee.criminalRecordUrl}
                  />
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>Cerrar</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
