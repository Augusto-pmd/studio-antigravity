'use client';

import { useState, useTransition, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Send, User, Bot } from 'lucide-react';
import { askAssistantAction } from '@/lib/actions';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { useUser } from '@/context/user-context';

interface Message {
    sender: 'user' | 'bot';
    text: string;
}

export function AiAssistant() {
  const { user } = useUser();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState('');
  const [conversation, setConversation] = useState<Message[]>([]);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
        scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [conversation]);


  const handleQuerySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    const userMessage: Message = { sender: 'user', text: query };
    setConversation(prev => [...prev, userMessage]);
    const currentQuery = query;
    setQuery('');

    startTransition(async () => {
      const result = await askAssistantAction(currentQuery);
      const botMessage: Message = { sender: 'bot', text: result.answer || 'No he podido procesar tu solicitud.' };
      setConversation(prev => [...prev, botMessage]);
    });
  };
  
  const renderMarkdown = (text: string) => {
    return text.split('\n').map((line, index) => (
        <p key={index} className="mb-2 last:mb-0">
            {line.split(/(\*\*.*?\*\*)/g).map((part, i) => {
                 if (part.startsWith('**') && part.endsWith('**')) {
                    return <strong key={i}>{part.slice(2, -2)}</strong>;
                }
                return part;
            })}
        </p>
    ));
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Asistente de Consultas</CardTitle>
        <CardDescription>
          Haz una pregunta en lenguaje natural sobre la documentación, personal u obras. Por ejemplo: "¿Cuándo vence el ART de Carlos Rodríguez?"
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
            <div ref={scrollAreaRef} className="h-96 overflow-y-auto rounded-md border p-4 space-y-6">
                {conversation.length === 0 && (
                    <div className="flex h-full items-center justify-center">
                        <p className="text-muted-foreground">La conversación comenzará aquí.</p>
                    </div>
                )}
                {conversation.map((msg, index) => (
                    <div key={index} className={`flex items-start gap-3 ${msg.sender === 'user' ? 'justify-end' : ''}`}>
                        {msg.sender === 'bot' && (
                            <Avatar className="h-8 w-8">
                                <AvatarFallback><Bot /></AvatarFallback>
                            </Avatar>
                        )}
                        <div className={`max-w-[75%] rounded-lg p-3 text-sm ${msg.sender === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                           {renderMarkdown(msg.text)}
                        </div>
                         {msg.sender === 'user' && (
                            <Avatar className="h-8 w-8">
                                <AvatarImage src={user?.photoURL ?? undefined} />
                                <AvatarFallback>{user?.displayName?.charAt(0) || 'U'}</AvatarFallback>
                            </Avatar>
                        )}
                    </div>
                ))}
                 {isPending && (
                     <div className="flex items-start gap-3">
                        <Avatar className="h-8 w-8">
                            <AvatarFallback><Bot /></AvatarFallback>
                        </Avatar>
                        <div className="max-w-[75%] rounded-lg p-3 text-sm bg-muted flex items-center">
                            <Loader2 className="h-4 w-4 animate-spin" />
                        </div>
                    </div>
                )}
            </div>
            <form onSubmit={handleQuerySubmit} className="flex gap-2">
                <Input 
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Escribe tu pregunta aquí..."
                    disabled={isPending}
                />
                <Button type="submit" disabled={isPending || !query.trim()}>
                    {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
            </form>
        </div>
      </CardContent>
    </Card>
  );
}
