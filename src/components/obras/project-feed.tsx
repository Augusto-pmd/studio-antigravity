'use client';

import { useState, useEffect } from 'react';
import { ProjectUpdate } from '@/lib/types';
import { getProjectUpdates, addProjectUpdate, deleteProjectUpdate } from '@/lib/services/project-tracking';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Send, Trash2, Paperclip, MessageSquare, AlertCircle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUser } from '@/firebase/provider';

interface ProjectFeedProps {
    projectId: string;
}

export function ProjectFeed({ projectId }: ProjectFeedProps) {
    const { user } = useUser();
    const [updates, setUpdates] = useState<ProjectUpdate[]>([]);
    const [newUpdateContent, setNewUpdateContent] = useState('');
    const [updateType, setUpdateType] = useState<ProjectUpdate['type']>('NOTE');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadUpdates();
    }, [projectId]);

    const loadUpdates = async () => {
        try {
            const data = await getProjectUpdates(projectId);
            setUpdates(data);
        } catch (error) {
            console.error("Error loading updates:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handlePostUpdate = async () => {
        if (!newUpdateContent.trim() || !user) return;

        try {
            await addProjectUpdate({
                projectId,
                content: newUpdateContent,
                date: new Date().toISOString(),
                author: user.displayName || user.email || 'Usuario', // Use actual user name
                type: updateType
            });
            setNewUpdateContent('');
            loadUpdates();
        } catch (error) {
            console.error("Error posting update:", error);
        }
    };

    const handleDeleteUpdate = async (updateId: string) => {
        if (!confirm('¿Borrar esta nota?')) return;
        try {
            await deleteProjectUpdate(updateId);
            loadUpdates();
        } catch (error) {
            console.error("Error deleting update:", error);
        }
    }

    const getTypeIcon = (type: ProjectUpdate['type']) => {
        switch (type) {
            case 'ISSUE': return <AlertCircle className="h-4 w-4 text-red-500" />;
            case 'DECISION': return <CheckCircle className="h-4 w-4 text-green-500" />;
            case 'MEETING': return <MessageSquare className="h-4 w-4 text-blue-500" />;
            default: return null;
        }
    }

    return (
        <div className="flex flex-col h-[600px]">
            {/* Feed List */}
            <div className="flex-1 overflow-y-auto space-y-4 p-1 pr-2">
                {updates.map((update) => (
                    <div key={update.id} className="flex gap-3 group">
                        <Avatar className="h-8 w-8">
                            <AvatarFallback>{update.author[0]?.toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-1">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="font-semibold text-sm">{update.author}</span>
                                    <span className="text-xs text-muted-foreground">
                                        {format(new Date(update.date), "d MMM 'at' HH:mm", { locale: es })}
                                    </span>
                                    {getTypeIcon(update.type)}
                                </div>
                                <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleDeleteUpdate(update.id)}>
                                    <Trash2 className="h-3 w-3 text-muted-foreground" />
                                </Button>
                            </div>
                            <div className={cn(
                                "text-sm p-3 rounded-md bg-muted/50 whitespace-pre-wrap",
                                update.type === 'ISSUE' && "bg-red-50 border border-red-100 text-red-800",
                                update.type === 'DECISION' && "bg-green-50 border border-green-100 text-green-800"
                            )}>
                                {update.content}
                            </div>
                        </div>
                    </div>
                ))}
                {updates.length === 0 && !isLoading && (
                    <div className="text-center text-muted-foreground py-10">Ninguna actualización todavía. ¡Escribe la primera!</div>
                )}
            </div>

            {/* Input Area */}
            <div className="mt-4 pt-4 border-t space-y-2 bg-background">
                <div className="flex gap-2">
                    {(['NOTE', 'ISSUE', 'DECISION', 'MEETING'] as const).map(type => (
                        <Button
                            key={type}
                            variant={updateType === type ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setUpdateType(type)}
                            className="text-xs h-7"
                        >
                            {type === 'NOTE' ? 'Nota' : type === 'ISSUE' ? 'Problema' : type === 'DECISION' ? 'Decisión' : 'Reunión'}
                        </Button>
                    ))}
                </div>
                <div className="flex gap-2">
                    <Textarea
                        placeholder="Escribe una actualización..."
                        value={newUpdateContent}
                        onChange={(e) => setNewUpdateContent(e.target.value)}
                        className="min-h-[80px] resize-none"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handlePostUpdate();
                            }
                        }}
                    />
                    <Button className="h-[80px] px-4" onClick={handlePostUpdate}>
                        <Send className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
