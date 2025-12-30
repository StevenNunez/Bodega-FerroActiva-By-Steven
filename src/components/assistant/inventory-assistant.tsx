'use client';
import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Bot, Send, Loader2, Sparkles, X, Trash2, ArrowRight } from 'lucide-react';
import { useAppState } from '@/modules/core/contexts/app-provider';
import { analyzeInventory } from '@/ai/flows/inventory-assistant-flow';
import ReactMarkdown from 'react-markdown';

const SUGGESTED_QUESTIONS = [
  "¿Qué materiales tienen stock bajo?",
  "Resumen de herramientas en uso",
  "Analiza el inventario de EPP",
  "¿Necesitamos reponer Cemento?"
];

export function InventoryAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([
    { role: 'assistant', content: '¡Hola! Soy tu asistente de bodega IA. Puedo ayudarte a analizar el stock, buscar herramientas o sugerir reabastecimientos.' }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const state = useAppState();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [messages, isOpen]);

  const handleQuery = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userQuery = text;
    setQuery('');
    setMessages(prev => [...prev, { role: 'user', content: userQuery }]);
    setIsLoading(true);

    try {
      // Prepare a concise context of the current inventory state
      const contextData = {
        materials: state.materials?.map(m => ({ 
          name: m.name, 
          stock: m.stock, 
          unit: m.unit,
          category: m.category,
          status: m.stock < 10 ? 'LOW STOCK' : 'OK'
        })),
        tools: state.tools,
        stats: {
          totalMaterials: state.materials?.length || 0,
          totalTools: state.tools?.length || 0,
          timestamp: new Date().toISOString()
        }
      };

      const response = await analyzeInventory({ query: userQuery, inventoryContext: JSON.stringify(contextData, null, 2) });
      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'assistant', content: "Lo siento, tuve problemas para conectar con el inventario. Intenta nuevamente." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleQuery(query);
  };

  const clearChat = () => {
    setMessages([{ role: 'assistant', content: 'Chat reiniciado. ¿En qué puedo ayudarte ahora?' }]);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-xl hover:bg-primary/90 hover:scale-105 transition-all duration-300 flex items-center justify-center z-50 group"
      >
        <Sparkles className="h-6 w-6 group-hover:rotate-12 transition-transform" />
        <span className="absolute -top-1 -right-1 flex h-4 w-4">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-4 w-4 bg-sky-500 border-2 border-white"></span>
        </span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-[380px] h-[600px] z-50 flex flex-col shadow-2xl rounded-2xl overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-300 ring-1 ring-black/5">
      <Card className="h-full flex flex-col border-0">
        <CardHeader className="bg-gradient-to-r from-primary to-orange-400 text-white p-4 flex flex-row items-center justify-between space-y-0 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="bg-white/20 p-1.5 rounded-lg backdrop-blur-sm">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold text-white">Asistente de Bodega</CardTitle>
              <div className="flex items-center gap-1.5 opacity-90">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span className="text-xs font-medium">En línea</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
             <button 
              onClick={clearChat} 
              className="p-1.5 hover:bg-white/10 rounded-full transition-colors text-white/80 hover:text-white"
              title="Limpiar chat"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            <button 
              onClick={() => setIsOpen(false)} 
              className="p-1.5 hover:bg-white/10 rounded-full transition-colors text-white/80 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </CardHeader>
        
        <CardContent className="flex-1 p-0 flex flex-col bg-muted/30 overflow-hidden relative">
          <div className="flex-1 overflow-y-auto p-4 space-y-5 scroll-smooth">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex items-start ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="h-8 w-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mr-2 shrink-0 self-end mb-1">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                )}
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-br-none'
                      : 'bg-background text-foreground border rounded-bl-none'
                  }`}
                >
                  <div className="prose dark:prose-invert prose-sm max-w-none prose-p:m-0 prose-ul:m-0 prose-ul:pl-4 prose-li:m-0 prose-p:leading-relaxed">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="h-8 w-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mr-2 shrink-0 self-end mb-1">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="bg-background border rounded-2xl rounded-bl-none px-4 py-3 shadow-sm flex items-center">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/80 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/80 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/80 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {!isLoading && (
            <div className="px-4 pb-2 flex gap-2 overflow-x-auto">
              {SUGGESTED_QUESTIONS.map((q, i) => (
                <button
                  key={i}
                  onClick={() => handleQuery(q)}
                  className="whitespace-nowrap px-3 py-1.5 bg-background border border-border hover:border-primary/50 hover:bg-primary/10 text-primary-foreground/80 text-xs rounded-full transition-colors shadow-sm flex items-center gap-1 shrink-0"
                >
                  {q} <ArrowRight className="h-3 w-3 opacity-50" />
                </button>
              ))}
            </div>
          )}

          <div className="p-3 bg-background border-t">
            <form onSubmit={handleSubmit} className="flex gap-2 relative">
              <Input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Escribe tu consulta..."
                className="flex-1 pr-10"
                autoFocus
                disabled={isLoading}
              />
              <Button 
                type="submit" 
                size="icon" 
                disabled={isLoading || !query.trim()} 
                className={`shrink-0 transition-all duration-200 ${query.trim() ? 'bg-primary hover:bg-primary/90' : 'bg-muted-foreground/50'}`}
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
