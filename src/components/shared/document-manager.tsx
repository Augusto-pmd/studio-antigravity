'use client';

import React, { useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Trash2, Upload, FileIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import type { DocumentRecord } from '@/lib/types';
import { format, parseISO } from 'date-fns';

interface DocumentManagerProps {
    title: string;
    description?: string;
    documents: DocumentRecord[];
    onUpload: (file: File) => void;
    onDelete: (doc: DocumentRecord) => Promise<void>;
    isUploading: boolean;
    isDeleting: string | null;
}

export function DocumentManager({
    title,
    description,
    documents,
    onUpload,
    onDelete,
    isUploading,
    isDeleting,
}: DocumentManagerProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            onUpload(file);
            // reset value so the same file can be selected again if needed
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    return (
        <Card className="mb-4">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-sm font-medium">{title}</CardTitle>
                        {description && <CardDescription className="text-xs">{description}</CardDescription>}
                    </div>
                    <div>
                        <Input
                            type="file"
                            className="hidden"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept="application/pdf,image/jpeg,image/png"
                            disabled={isUploading}
                        />
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                        >
                            {isUploading ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                                <Upload className="h-4 w-4 mr-2" />
                            )}
                            Subir
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {documents.length === 0 ? (
                    <div className="text-center text-sm text-muted-foreground py-4 border-2 border-dashed rounded-md">
                        No hay documentos subidos.
                    </div>
                ) : (
                    <div className="space-y-2">
                        {documents.map((doc) => (
                            <div key={doc.id} className="flex items-center justify-between p-2 rounded-md border bg-muted/30">
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <FileIcon className="h-5 w-5 flex-shrink-0 text-blue-500" />
                                    <div className="overflow-hidden">
                                        <p className="text-sm font-medium truncate" title={doc.fileName}>
                                            <a href={doc.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                                                {doc.fileName}
                                            </a>
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {format(parseISO(doc.uploadedAt), 'dd/MM/yyyy HH:mm')}
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-100"
                                    onClick={() => onDelete(doc)}
                                    disabled={isDeleting === doc.id || isUploading}
                                >
                                    {isDeleting === doc.id ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Trash2 className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
