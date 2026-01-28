"use client";

import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Employee, DocumentRecord } from "@/lib/types";
import { DocumentManager } from "@/components/shared/document-manager";
import { useDoc, useFirestore, useFirebaseApp } from "@/firebase";
import { doc, updateDoc, arrayUnion, arrayRemove, collection } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

export function EmployeeFileDialog({ employee, children }: { employee: Employee; children: React.ReactNode }) {
    const [open, setOpen] = useState(false);
    const firestore = useFirestore();
    const firebaseApp = useFirebaseApp();
    const { toast } = useToast();

    // States for async operations
    const [isUploading, setIsUploading] = useState(false);
    const [deletingDocId, setDeletingDocId] = useState<string | null>(null);

    const employeeRef = useMemo(() => firestore ? doc(firestore, `employees/${employee.id}`) : null, [firestore, employee.id]);
    // useDoc will keep the data fresh
    const { data: updatedEmployee, isLoading } = useDoc(employeeRef);

    const displayEmployee = updatedEmployee || employee;

    const handleUpload = async (file: File, documentType: string) => {
        if (!firestore || !firebaseApp || !employeeRef) return toast({ variant: 'destructive', title: "Error de conexión" });
        
        setIsUploading(true);
        const storage = getStorage(firebaseApp);
        const docId = doc(collection(firestore, 'dummy')).id; // Generate a unique ID
        const fullStoragePath = `employee-documents/${employee.id}/${documentType}/${docId}-${file.name}`;
        const storageRef = ref(storage, fullStoragePath);

        try {
            await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(storageRef);

            const newDocument: DocumentRecord = {
                id: docId,
                type: documentType,
                fileName: file.name,
                url: downloadURL,
                uploadedAt: new Date().toISOString(),
            };

            await updateDoc(employeeRef, {
                documents: arrayUnion(newDocument)
            });

            toast({ title: "Documento Subido", description: `Se ha guardado ${file.name}.` });
        } catch (error) {
            console.error("Upload error:", error);
            toast({ variant: 'destructive', title: "Error al subir", description: "No se pudo subir el documento." });
        } finally {
            setIsUploading(false);
        }
    };

    const handleDelete = async (documentToDelete: DocumentRecord) => {
        if (!firestore || !firebaseApp || !employeeRef) return toast({ variant: 'destructive', title: "Error de conexión" });

        setDeletingDocId(documentToDelete.id);
        const storage = getStorage(firebaseApp);
        
        try {
            const storageRef = ref(storage, documentToDelete.url);
            // First, delete from Firestore to immediately update the UI
            await updateDoc(employeeRef, {
                documents: arrayRemove(documentToDelete)
            });

            // Then, delete from Storage
            await deleteObject(storageRef);
            
            toast({ title: "Documento Eliminado" });
        } catch (error: any) {
            console.error("Delete error:", error);
            // If the file doesn't exist in storage, Firestore update still goes through.
            if(error.code !== 'storage/object-not-found') {
                toast({ variant: 'destructive', title: "Error al eliminar", description: "No se pudo eliminar el archivo del almacenamiento, pero la referencia ha sido borrada." });
            }
        } finally {
            setDeletingDocId(null);
        }
    };

    const accidentInsuranceDocs = displayEmployee.documents?.filter(doc => doc.type === 'accidentInsurance') || [];
    const criminalRecordDocs = displayEmployee.documents?.filter(doc => doc.type === 'criminalRecord') || [];

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Legajo de {displayEmployee.name}</DialogTitle>
                    <DialogDescription>
                        Administre la documentación personal del empleado. Aquí puede ver el historial de archivos subidos.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-4">
                  {isLoading ? (
                    <div className="space-y-4">
                        <Skeleton className="h-32 w-full" />
                        <Skeleton className="h-32 w-full" />
                    </div>
                  ) : (
                    <>
                        <DocumentManager
                            title="Seguro de Accidentes Personales"
                            documents={accidentInsuranceDocs}
                            onUpload={(file) => handleUpload(file, 'accidentInsurance')}
                            onDelete={handleDelete}
                            isUploading={isUploading}
                            isDeleting={deletingDocId}
                        />
                        <DocumentManager
                            title="Antecedentes Penales"
                            documents={criminalRecordDocs}
                            onUpload={(file) => handleUpload(file, 'criminalRecord')}
                            onDelete={handleDelete}
                            isUploading={isUploading}
                            isDeleting={deletingDocId}
                        />
                    </>
                  )}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>Cerrar</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
