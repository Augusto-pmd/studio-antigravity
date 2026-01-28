'use client';

import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { ContractorEmployee, DocumentRecord } from "@/lib/types";
import { DocumentManager } from "@/components/shared/document-manager";
import { useDoc, useFirestore, useFirebaseApp } from "@/firebase";
import { doc, updateDoc, arrayUnion, arrayRemove, collection } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

export function PersonnelFileDialog({ contractorId, personnel, children }: { contractorId: string; personnel: ContractorEmployee; children: React.ReactNode }) {
    const [open, setOpen] = useState(false);
    const firestore = useFirestore();
    const firebaseApp = useFirebaseApp();
    const { toast } = useToast();

    // States for async operations
    const [isUploading, setIsUploading] = useState(false);
    const [deletingDocId, setDeletingDocId] = useState<string | null>(null);
    
    const personnelRef = useMemo(() => firestore ? doc(firestore, `contractors/${contractorId}/personnel/${personnel.id}`) : null, [firestore, contractorId, personnel.id]);
    const { data: updatedPersonnel, isLoading } = useDoc(personnelRef);

    const displayPersonnel = updatedPersonnel || personnel;

    const handleUpload = async (file: File, documentType: string) => {
        if (!firestore || !firebaseApp || !personnelRef) return toast({ variant: 'destructive', title: "Error de conexión" });
        
        setIsUploading(true);
        const storage = getStorage(firebaseApp);
        const docId = doc(collection(firestore, 'dummy')).id; // Generate a unique ID
        const fullStoragePath = `contractor-documents/${contractorId}/${personnel.id}/${documentType}/${docId}-${file.name}`;
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

            await updateDoc(personnelRef, {
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
        if (!firestore || !firebaseApp || !personnelRef) return toast({ variant: 'destructive', title: "Error de conexión" });

        setDeletingDocId(documentToDelete.id);
        const storage = getStorage(firebaseApp);

        try {
            const storageRef = ref(storage, documentToDelete.url);
            await updateDoc(personnelRef, {
                documents: arrayRemove(documentToDelete)
            });
            await deleteObject(storageRef);
            toast({ title: "Documento Eliminado" });
        } catch (error: any) {
            console.error("Delete error:", error);
            if(error.code !== 'storage/object-not-found') {
                toast({ variant: 'destructive', title: "Error al eliminar", description: "No se pudo eliminar el archivo. La referencia fue borrada." });
            }
        } finally {
            setDeletingDocId(null);
        }
    };

    const accidentInsuranceDocs = displayPersonnel.documents?.filter((doc: any) => doc.type === 'accidentInsurance') || [];
    const criminalRecordDocs = displayPersonnel.documents?.filter((doc: any) => doc.type === 'criminalRecord') || [];

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Legajo de {displayPersonnel.name}</DialogTitle>
                    <DialogDescription>
                        Administre la documentación del personal del contratista. Aquí puede ver el historial de archivos.
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
                        onUpload={(file: File) => { handleUpload(file, 'accidentInsurance'); } }
                        onDelete={async (doc: DocumentRecord) => { await handleDelete(doc); }}
                        isUploading={isUploading}
                        isDeleting={deletingDocId}
                      />
                      <DocumentManager
                        title="Antecedentes Penales"
                        documents={criminalRecordDocs}
                        onUpload={(file: File) => { handleUpload(file, 'criminalRecord'); } }
                        onDelete={async (doc: DocumentRecord) => { await handleDelete(doc); }}
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
