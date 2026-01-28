"use client";

import { useState, ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Upload, Trash2, Link as LinkIcon, FileText } from "lucide-react";
import type { DocumentRecord } from "@/lib/types";
import { format, parseISO } from "date-fns";
import { es } from 'date-fns/locale';

interface DocumentManagerProps {
    title: string;
    documents: DocumentRecord[];
    onUpload: (file: File) => Promise<void>;
    onDelete: (document: DocumentRecord) => Promise<void>;
    isUploading: boolean;
    isDeleting: string | null; // ID of the document being deleted
}

export function DocumentManager({ title, documents, onUpload, onDelete, isUploading, isDeleting }: DocumentManagerProps) {
    const [file, setFile] = useState<File | null>(null);

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0] || null;
        setFile(selectedFile);
    };

    const handleUploadClick = async () => {
        if (!file) return;
        await onUpload(file);
        setFile(null); // Clear file input after upload
    };

    return (
        <div className="space-y-3 rounded-lg border p-4">
            <h4 className="font-medium">{title}</h4>
            <div className="space-y-2">
                {documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between rounded-md border bg-muted/50 p-2 text-sm">
                        <div className="flex items-center gap-2 truncate">
                           <FileText className="h-4 w-4 shrink-0"/>
                           <div className="truncate">
                             <a href={doc.url} target="_blank" rel="noopener noreferrer" className="truncate font-medium hover:underline">{doc.fileName}</a>
                             <p className="text-xs text-muted-foreground">Subido el {format(parseISO(doc.uploadedAt), 'dd/MM/yyyy', { locale: es })}</p>
                           </div>
                        </div>
                        <div className="flex items-center">
                            <Button asChild variant="ghost" size="icon" className="h-8 w-8">
                                <a href={doc.url} target="_blank" rel="noopener noreferrer" download={doc.fileName}><LinkIcon className="h-4 w-4" /></a>
                            </Button>
                            <Button onClick={() => onDelete(doc)} variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" disabled={isDeleting === doc.id}>
                                {isDeleting === doc.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                            </Button>
                        </div>
                    </div>
                ))}
                {documents.length === 0 && (
                    <p className="text-xs text-muted-foreground px-2">No hay documentos para esta categoría.</p>
                )}
            </div>
             <div className="flex items-center gap-2 pt-2 border-t">
                <Input type="file" onChange={handleFileChange} className="flex-1 h-9 text-xs" />
                <Button onClick={handleUploadClick} disabled={!file || isUploading} size="sm">
                    {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                    Subir
                </Button>
            </div>
        </div>
    );
}
