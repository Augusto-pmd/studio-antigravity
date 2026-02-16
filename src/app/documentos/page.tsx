'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Folder, FileText, Upload, ExternalLink, Loader2, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';

interface DriveFile {
    id: string;
    name: string;
    mimeType: string;
    webViewLink: string;
    iconLink?: string;
}

export default function DocumentosPage() {
    const [files, setFiles] = useState<DriveFile[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadOpen, setUploadOpen] = useState(false);
    const { toast } = useToast();

    const fetchFiles = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/drive');
            if (!res.ok) throw new Error('Failed to fetch files');
            const data = await res.json();
            setFiles(data.files || []);
        } catch (error) {
            console.error(error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'No se pudieron cargar los archivos. Verifique las credenciales.'
            });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchFiles();
    }, []);

    const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsUploading(true);
        const formData = new FormData(e.currentTarget);

        try {
            const res = await fetch('/api/drive', {
                method: 'POST',
                body: formData,
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Upload failed');
            }

            toast({ title: 'Éxito', description: 'Archivo subido correctamente.' });
            setUploadOpen(false);
            fetchFiles();
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: error.message || 'Error al subir archivo.'
            });
        } finally {
            setIsUploading(false);
        }
    };

    const [chatOpen, setChatOpen] = useState(false);
    const [selectedFile, setSelectedFile] = useState<DriveFile | null>(null);
    const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'ai', content: string }[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    const openChat = (file: DriveFile) => {
        setSelectedFile(file);
        setChatMessages([]);
        setChatOpen(true);
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!chatInput.trim() || !selectedFile) return;

        const userMsg = chatInput;
        setChatMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setChatInput('');
        setIsAnalyzing(true);

        try {
            const res = await fetch('/api/drive/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fileId: selectedFile.id,
                    fileName: selectedFile.name,
                    mimeType: selectedFile.mimeType,
                    prompt: userMsg
                })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to analyze');
            }

            const data = await res.json();
            setChatMessages(prev => [...prev, { role: 'ai', content: data.answer }]);
        } catch (error: any) {
            setChatMessages(prev => [...prev, { role: 'ai', content: `Error: ${error.message}` }]);
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <div className="flex flex-col gap-6 p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Documentos Corporativos</h1>
                    <p className="text-muted-foreground">
                        Gestión centralizada de archivos en Google Drive.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={fetchFiles} disabled={isLoading}>
                        <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                    </Button>
                    <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <Upload className="mr-2 h-4 w-4" />
                                Subir Archivo
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Subir Archivo a Drive</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleUpload} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="file">Seleccionar Archivo</Label>
                                    <Input id="file" name="file" type="file" required />
                                </div>
                                <div className="flex justify-end gap-2">
                                    <Button type="button" variant="ghost" onClick={() => setUploadOpen(false)}>Cancelar</Button>
                                    <Button type="submit" disabled={isUploading}>
                                        {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Subir
                                    </Button>
                                </div>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Chat Dialog */}
            <Dialog open={chatOpen} onOpenChange={setChatOpen}>
                <DialogContent className="max-w-2xl h-[80vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <span className="truncate max-w-[300px]">{selectedFile?.name}</span>
                            <span className="text-xs font-normal text-muted-foreground bg-secondary px-2 py-1 rounded">IA Assistant</span>
                        </DialogTitle>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4 border rounded-md bg-muted/20">
                        {chatMessages.length === 0 ? (
                            <div className="text-center text-muted-foreground mt-10">
                                <p>Haz una pregunta sobre este documento.</p>
                                <p className="text-xs mt-2">Ej: "¿De qué trata este archivo?" o "Resume los puntos clave"</p>
                            </div>
                        ) : (
                            chatMessages.map((msg, i) => (
                                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[80%] rounded-lg p-3 ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}>
                                        <div className="whitespace-pre-wrap text-sm">{msg.content}</div>
                                    </div>
                                </div>
                            ))
                        )}
                        {isAnalyzing && (
                            <div className="flex justify-start">
                                <div className="bg-secondary rounded-lg p-3">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                </div>
                            </div>
                        )}
                    </div>

                    <form onSubmit={handleSendMessage} className="flex gap-2 mt-2">
                        <Input
                            value={chatInput}
                            onChange={e => setChatInput(e.target.value)}
                            placeholder="Escribe tu pregunta..."
                            disabled={isAnalyzing}
                        />
                        <Button type="submit" disabled={isAnalyzing || !chatInput.trim()}>Enviar</Button>
                    </form>
                </DialogContent>
            </Dialog>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[50px]"></TableHead>
                                <TableHead>Nombre</TableHead>
                                <TableHead className="hidden md:table-cell">Tipo</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center">
                                        Cargando archivos...
                                    </TableCell>
                                </TableRow>
                            ) : files.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                                        No hay archivos en la carpeta corporativa.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                files.map((file) => (
                                    <TableRow key={file.id}>
                                        <TableCell>
                                            {file.mimeType === 'application/vnd.google-apps.folder' ? (
                                                <Folder className="h-5 w-5 text-blue-500" />
                                            ) : (
                                                <FileText className="h-5 w-5 text-gray-500" />
                                            )}
                                        </TableCell>
                                        <TableCell className="font-medium">{file.name}</TableCell>
                                        <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                                            {file.mimeType.split('/').pop()}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                {file.mimeType !== 'application/vnd.google-apps.folder' && (
                                                    <Button variant="secondary" size="sm" onClick={() => openChat(file)}>
                                                        ✨ Analizar IA
                                                    </Button>
                                                )}
                                                <Button variant="ghost" size="sm" asChild>
                                                    <a href={file.webViewLink} target="_blank" rel="noopener noreferrer">
                                                        <ExternalLink className="h-4 w-4" />
                                                    </a>
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
