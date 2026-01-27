"use client";

import { useState, ChangeEvent, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Upload, Trash2, Link as LinkIcon } from "lucide-react";
import { useUser, useFirestore, useFirebaseApp } from "@/firebase";
import { doc, updateDoc, deleteField } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { useToast } from "@/hooks/use-toast";

interface DocumentManagerProps {
    title: string;
    docPath: string; // e.g. "employees/employeeId123"
    storagePath: string; // e.g. "employee-documents/employeeId123"
    fieldName: string; // e.g. "accidentInsuranceUrl"
    currentUrl?: string;
}

export function DocumentManager({ title, docPath, storagePath, fieldName, currentUrl: initialUrl }: DocumentManagerProps) {
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [currentUrl, setCurrentUrl] = useState(initialUrl);

    useEffect(() => {
        setCurrentUrl(initialUrl);
    }, [initialUrl]);

    const { firestore, firebaseApp } = useUser();
    const { toast } = useToast();

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        setFile(e.target.files?.[0] || null);
    };

    const handleUpload = async () => {
        if (!file || !firestore || !firebaseApp) return;

        setIsUploading(true);
        const storage = getStorage(firebaseApp);
        const fullStoragePath = `${storagePath}/${fieldName}`;
        const storageRef = ref(storage, fullStoragePath);

        try {
            await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(storageRef);

            const docRef = doc(firestore, docPath);
            await updateDoc(docRef, { [fieldName]: downloadURL });
            
            setCurrentUrl(downloadURL);
            setFile(null);
            toast({ title: "Documento Subido", description: `${title} ha sido guardado.` });

        } catch (error: any) {
            console.error("Upload error:", error);
            let description = "No se pudo subir el documento. Revisa tu conexión a internet.";
            if (error.code === 'storage/unauthorized') {
                description = "No tienes permisos para subir archivos. Es probable que las reglas de Firebase Storage necesiten ser ajustadas.";
            }
            toast({ variant: 'destructive', title: "Error al subir", description: description });
        } finally {
            setIsUploading(false);
        }
    };
    
    const handleDelete = async () => {
        if (!currentUrl || !firestore || !firebaseApp) return;

        setIsDeleting(true);
        const storage = getStorage(firebaseApp);
        
        try {
            const fullStoragePath = `${storagePath}/${fieldName}`;
            const storageRef = ref(storage, fullStoragePath);
            await deleteObject(storageRef);
        } catch (error: any) {
            if (error.code !== 'storage/object-not-found') {
                 console.error("Delete from storage error:", error);
                 toast({ variant: 'destructive', title: "Error al borrar", description: "No se pudo borrar el archivo del almacenamiento." });
                 setIsDeleting(false);
                 return;
            }
        }
        
        try {
            const docRef = doc(firestore, docPath);
            await updateDoc(docRef, { [fieldName]: deleteField() });
            setCurrentUrl(undefined);
            setFile(null);
            toast({ title: "Documento Eliminado" });
        } catch (error) {
            console.error("Delete from firestore error:", error);
            toast({ variant: 'destructive', title: "Error al borrar", description: "No se pudo borrar la referencia del documento." });
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="space-y-3 rounded-lg border p-4">
            <h4 className="font-medium">{title}</h4>
            {currentUrl ? (
                <div className="flex items-center justify-between">
                    <Button asChild variant="link" className="p-0 h-auto">
                        <a href={currentUrl} target="_blank" rel="noopener noreferrer">
                            <LinkIcon className="mr-2 h-4 w-4" />
                            Ver Documento
                        </a>
                    </Button>
                    <Button onClick={handleDelete} variant="destructive" size="sm" disabled={isDeleting}>
                        {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                        Borrar
                    </Button>
                </div>
            ) : (
                <div className="flex items-center gap-2">
                    <Input type="file" onChange={handleFileChange} className="flex-1" />
                    <Button onClick={handleUpload} disabled={!file || isUploading} size="sm">
                        {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                        Subir
                    </Button>
                </div>
            )}
        </div>
    );
}
