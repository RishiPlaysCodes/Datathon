import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Bot, User, FileText, Loader2 } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  sources?: any[];
}

const AIAssistant = () => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Namaste. I am your KSP AI Investigation Assistant. How can I help you with your cases today?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { token } = useAuth();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ message: userMessage }),
      });

      if (!response.ok) throw new Error('Failed to get AI response');

      const data = await response.json();
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: data.response,
        sources: data.sources 
      }]);
    } catch (error) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'I apologize, but I encountered an error processing your request. Please try again.' 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)]">
      <div className="flex items-center gap-2 mb-6">
        <Bot className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">AI Investigation Assistant</h1>
          <p className="text-sm text-muted-foreground">Powered by Google Gemini 1.5 Pro</p>
        </div>
      </div>

      <Card className="flex-1 overflow-hidden flex flex-col">
        <CardContent className="p-0 flex-1 flex flex-col">
          <ScrollArea ref={scrollRef} className="flex-1 p-4 md:p-6">
            <div className="space-y-6">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`flex gap-3 max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-slate-100 dark:bg-slate-800'
                    }`}>
                      {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                    </div>
                    <div className="space-y-2">
                      <div className={`p-4 rounded-2xl ${
                        msg.role === 'user' 
                          ? 'bg-primary text-primary-foreground rounded-tr-none' 
                          : 'bg-slate-100 dark:bg-slate-800 rounded-tl-none'
                      }`}>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                      </div>
                      {msg.sources && msg.sources.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {msg.sources.map((source, j) => (
                            <div key={j} className="flex items-center gap-1.5 px-2 py-1 bg-slate-50 dark:bg-slate-900 border rounded text-[10px] text-muted-foreground">
                              <FileText size={12} />
                              <span>{source.fir_number}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="flex gap-3 items-center">
                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                      <Bot size={16} />
                    </div>
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="p-4 border-t bg-slate-50/50 dark:bg-slate-950/50">
            <form onSubmit={handleSend} className="flex gap-2">
              <Input
                placeholder="Ask about cases, suspects, or crime patterns..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="flex-1"
                disabled={isLoading}
              />
              <Button type="submit" disabled={isLoading || !input.trim()}>
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AIAssistant;
