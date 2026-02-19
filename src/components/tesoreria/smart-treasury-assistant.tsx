'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sparkles, Send, Loader2, Bot, User } from 'lucide-react';
import { analyzeTreasuryPatterns } from '@/actions/treasury-ai';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

interface SmartTreasuryAssistantProps {
    transactions: any[]; // We pass the currently filtered transactions
}

export function SmartTreasuryAssistant({ transactions }: SmartTreasuryAssistantProps) {
    const [query, setQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        { role: 'assistant', content: 'Hola, soy tu asistente financiero. Pregúntame sobre patrones, gastos en combustible, o movimientos ocultos.' }
    ]);

    const handleSend = async () => {
        if (!query.trim()) return;

        const userMsg = query;
        setQuery('');
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setIsLoading(true);

        try {
            const result = await analyzeTreasuryPatterns({
                transactions,
                userQuery: userMsg
            });

            setMessages(prev => [...prev, { role: 'assistant', content: result.answer }]);
        } catch (error) {
            console.error(error);
            setMessages(prev => [...prev, { role: 'assistant', content: 'Lo siento, hubo un error al analizar los datos. Intenta nuevamente.' }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card className="h-[500px] flex flex-col shadow-lg border-primary/20 bg-gradient-to-b from-card to-secondary/5">
            <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary animate-pulse" />
                    <CardTitle>Asistente Inteligente</CardTitle>
                </div>
                <CardDescription>Analiza tus movimientos con IA (Gemini 2.0)</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col p-4 pt-0 gap-4 overflow-hidden">
                <ScrollArea className="flex-1 pr-4">
                    <div className="space-y-4">
                        {messages.map((m, i) => (
                            <div key={i} className={cn("flex gap-3", m.role === 'user' ? "flex-row-reverse" : "")}>
                                <div className={cn(
                                    "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                                    m.role === 'assistant' ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                                )}>
                                    {m.role === 'assistant' ? <Bot className="h-5 w-5" /> : <User className="h-5 w-5" />}
                                </div>
                                <div className={cn(
                                    "rounded-lg p-3 text-sm max-w-[80%]",
                                    m.role === 'assistant' ? "bg-secondary text-secondary-foreground" : "bg-primary text-primary-foreground"
                                )}>
                                    <ReactMarkdown>{m.content}</ReactMarkdown>
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex gap-3">
                                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                    <Bot className="h-5 w-5" />
                                </div>
                                <div className="bg-secondary rounded-lg p-3 flex items-center">
                                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                </div>
                            </div>
                        )}
                    </div>
                </ScrollArea>
                <div className="flex gap-2 mt-auto">
                    <Input
                        placeholder="Ej: ¿Cuánto gastamos en nafta este mes?"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSend()}
                        disabled={isLoading}
                    />
                    <Button size="icon" onClick={handleSend} disabled={isLoading || !query.trim()}>
                        <Send className="h-4 w-4" />
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
