'use client';

import { useState, useTransition, useRef, useEffect } from 'react';
import { useUser } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Sparkles, User, Bot } from 'lucide-react';
import { askAssistant } from '@/ai/flows/ask-assistant-flow';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface Message {
    role: 'user' | 'model';
    content: string;
}

export function AiAssistant() {
    const { role } = useUser();
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();
    const [conversation, setConversation] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const scrollAreaRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Scroll to bottom when conversation updates
        if (scrollAreaRef.current) {
            scrollAreaRef.current.scrollTo({
                top: scrollAreaRef.current.scrollHeight,
                behavior: 'smooth',
            });
        }
    }, [conversation]);


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isPending || !role) return;

        const userMessage: Message = { role: 'user', content: input };
        const newConversation = [...conversation, userMessage];
        setConversation(newConversation);
        setInput('');

        startTransition(async () => {
            try {
                const result = await askAssistant({
                    question: input,
                    userRole: role,
                    conversationHistory: newConversation,
                });
                
                const modelMessage: Message = { role: 'model', content: result.answer };
                setConversation([...newConversation, modelMessage]);

            } catch (error: any) {
                console.error('Error asking assistant:', error);
                toast({
                    variant: 'destructive',
                    title: 'Error del Asistente',
                    description: error.message || 'No se pudo obtener una respuesta.',
                });
                // Remove the user's message if the API call fails
                setConversation(conversation);
            }
        });
    };

    return (
        <Card className="flex flex-col h-full">
            <CardHeader className='pb-4'>
                <div className="flex items-center gap-3">
                    <Sparkles className="h-6 w-6 text-primary" />
                    <div>
                        <CardTitle className="font-headline">Consultor IA</CardTitle>
                        <CardDescription>¿Tienes dudas? Pregúntame cómo usar la app.</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col gap-4 p-4 pt-0">
                <ScrollArea className="flex-1 rounded-md border p-4 h-64" ref={scrollAreaRef}>
                     {conversation.length === 0 && (
                        <div className="flex h-full items-center justify-center">
                            <p className="text-muted-foreground text-center">Ej: ¿Cómo cargo un gasto de combustible?</p>
                        </div>
                    )}
                    <div className="space-y-4">
                        {conversation.map((msg, index) => (
                            <div
                                key={index}
                                className={cn(
                                    "flex items-start gap-3",
                                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                                )}
                            >
                                {msg.role === 'model' && <Bot className="h-6 w-6 shrink-0 text-primary" />}
                                <div
                                    className={cn(
                                        "max-w-[80%] rounded-lg p-3 text-sm",
                                        msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                                    )}
                                >
                                    {msg.content}
                                </div>
                                {msg.role === 'user' && <User className="h-6 w-6 shrink-0 text-muted-foreground" />}
                            </div>
                        ))}
                         {isPending && (
                            <div className="flex items-center gap-3">
                                <Bot className="h-6 w-6 shrink-0 text-primary animate-pulse" />
                                <div className="bg-muted rounded-lg p-3">
                                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                                </div>
                            </div>
                        )}
                    </div>
                </ScrollArea>
                <form onSubmit={handleSubmit} className="flex items-center gap-2">
                    <Input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Escribe tu pregunta aquí..."
                        disabled={isPending}
                    />
                    <Button type="submit" disabled={isPending || !input.trim()}>
                        Enviar
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
