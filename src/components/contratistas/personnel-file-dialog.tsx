"use client";

import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { ContractorEmployee } from "@/lib/types";
import { DocumentManager } from "@/components/shared/document-manager";
import { useDoc, useFirestore } from "@/firebase";
import { doc } from "firebase/firestore";

export function PersonnelFileDialog({ contractorId, personnel, children }: { contractorId: string; personnel: ContractorEmployee; children: React.ReactNode }) {
    const [open, setOpen] = useState(false);
    const firestore = useFirestore();

    const personnelRef = useMemo(() => firestore ? doc(firestore, `contractors/${contractorId}/personnel/${personnel.id}`) : null, [firestore, contractorId, personnel.id]);
    const { data: updatedPersonnel } = useDoc(personnelRef);

    const displayPersonnel = updatedPersonnel || personnel;

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Legajo de {displayPersonnel.name}</DialogTitle>
                    <DialogDescription>
                        Administre la documentación personal del empleado del contratista.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <DocumentManager 
                    key={`acc-ins-${displayPersonnel.id}`}
                    title="Seguro de Accidentes Personales"
                    docPath={`contractors/${contractorId}/personnel/${displayPersonnel.id}`}
                    storagePath={`contractor-documents/${contractorId}/${displayPersonnel.id}/accidentInsuranceUrl`}
                    fieldName="accidentInsuranceUrl"
                    currentUrl={displayPersonnel.accidentInsuranceUrl}
                  />
                  <DocumentManager 
                    key={`crim-rec-${displayPersonnel.id}`}
                    title="Antecedentes Penales"
                    docPath={`contractors/${contractorId}/personnel/${displayPersonnel.id}`}
                    storagePath={`contractor-documents/${contractorId}/${displayPersonnel.id}/criminalRecordUrl`}
                    fieldName="criminalRecordUrl"
                    currentUrl={displayPersonnel.criminalRecordUrl}
                  />
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>Cerrar</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
