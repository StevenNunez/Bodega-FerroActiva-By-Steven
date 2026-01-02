'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Bot, Send, Loader2, Sparkles, X, Trash2, ArrowRight, MessageSquare } from 'lucide-react';
import { useAppState } from '@/modules/core/contexts/app-provider';
import { analyzeInventory } from '@/ai/flows/inventory-assistant-flow';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const SUGGESTED_QUESTIONS = [
  "¿Qué materiales tienen stock crítico?",
  "Resume las herramientas disponibles",
  "Analiza el inventario de EPP",
  "¿Necesitamos reponer Cemento?"
];

export function InventoryAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([
    { role: 'assistant', content: '¡Hola! Soy **Ferro**, tu asistente inteligente. Analizo tus datos en tiempo real. ¿En qué te ayudo hoy?' }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  
  const { materials, tools } = useAppState();
  
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

  const inventoryContextData = useMemo(() => {
    return {
      materials: materials?.map(m => ({
        name: m.name,
        stock: m.stock,
        unit: m.unit,
        category: m.category,
        status: m.stock <= 10 ? 'CRITICAL_LOW' : 'OK'
      })) || [],
      tools: tools?.map((t: any) => ({
        name: t.name,
        status: t.status,
        category: t.category
      })) || [],
      stats: {
        totalMaterials: materials?.length || 0,
        totalTools: tools?.length || 0,
        lowStockCount: materials?.filter(m => m.stock <= 10).length || 0,
        date: new Date().toLocaleDateString('es-CL')
      }
    };
  }, [materials, tools]);

  const hasInventoryData = inventoryContextData.materials.length > 0 || inventoryContextData.tools.length > 0;

  const handleQuery = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userQuery = text.trim();
    setQuery('');
    setMessages(prev => [...prev, { role: 'user', content: userQuery }]);
    setIsLoading(true);

    // NUEVA VALIDACIÓN: Si no hay datos, responder directamente sin llamar al backend
    if (!hasInventoryData) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "⚠️ **Aún no tengo datos del inventario cargados.**\n\nEstoy esperando que se carguen los materiales y herramientas desde la base de datos. Por favor espera unos segundos y vuelve a intentarlo.\n\nSi el problema persiste, recarga la página."
      }]);
      setIsLoading(false);
      return;
    }

    try {
      const response = await analyzeInventory({ 
        query: userQuery, 
        inventoryContext: JSON.stringify(inventoryContextData) 
      });
      
      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    } catch (error) {
      console.error('Error al consultar Ferro AI:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "🔌 **Problema técnico al conectar con Ferro AI.**\n\nNo pude procesar tu consulta en este momento. Por favor, intenta de nuevo en unos segundos." 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleQuery(query);
  };

  const clearChat = () => {
    setMessages([{ role: 'assistant', content: 'Chat reiniciado. ¿En qué te puedo ayudar ahora?' }]);
  };

  // Botón flotante cerrado
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-2xl hover:shadow-primary/50 hover:scale-110 transition-all duration-300 flex items-center justify-center z-50 group border-2 border-white/20"
      >
        <Sparkles className="h-6 w-6 group-hover:rotate-12 transition-transform" />
        <span className="absolute -top-1 -right-1 flex h-4 w-4">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-4 w-4 bg-green-500 border-2 border-white"></span>
        </span>
      </button>
    );
  }

  // Ventana abierta
  return (
    <div className="fixed bottom-6 right-6 w-[90vw] md:w-[400px] h-[600px] max-h-[80vh] z-50 flex flex-col shadow-2xl rounded-2xl overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-300 ring-1 ring-black/10 font-sans">
      <Card className="h-full flex flex-col border-0">
        <CardHeader className="bg-primary text-primary-foreground p-4 flex flex-row items-center justify-between space-y-0 shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md shadow-inner">
              <Bot className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold text-white tracking-tight">Ferro AI</CardTitle>
              <div className="flex items-center gap-1.5 opacity-90">
                <span className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.8)]"></span>
                <span className="text-xs font-medium">{hasInventoryData ? 'Inventario Conectado' : 'Cargando datos...'}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={clearChat} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/80 hover:text-white" title="Limpiar chat">
              <Trash2 className="h-4 w-4" />
            </button>
            <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/80 hover:text-white">
              <X className="h-5 w-5" />
            </button>
          </div>
        </CardHeader>
        
        <CardContent className="flex-1 p-0 flex flex-col bg-muted/30 dark:bg-slate-900 overflow-hidden relative">
          <div className="flex-1 overflow-y-auto p-4 space-y-6 scroll-smooth">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex items-start gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 shadow-sm mt-1 ${
                  msg.role === 'assistant' ? 'bg-primary text-primary-foreground' : 'bg-blue-600 text-white'
                }`}>
                  {msg.role === 'assistant' ? <Bot className="h-4 w-4" /> : <MessageSquare className="h-4 w-4" />}
                </div>
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                  msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-background text-foreground border rounded-tl-none'
                }`}>
                  <div className="prose prose-sm max-w-none dark:prose-invert prose-p:m-0 prose-ul:m-0 prose-ul:pl-4 prose-li:m-0 
                    prose-headings:font-bold prose-headings:text-sm prose-headings:mb-1 prose-headings:mt-2
                    prose-table:text-xs prose-th:px-2 prose-th:py-1 prose-td:px-2 prose-td:py-1 prose-tr:border-b
                    prose-th:text-left prose-th:font-bold prose-th:text-slate-700 dark:prose-th:text-slate-300">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                  </div>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start gap-2 animate-pulse">
                <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="bg-background border rounded-2xl rounded-tl-none px-4 py-3 shadow-sm flex items-center">
                  <div className="flex gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/80 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/70 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Sugerencias solo si hay datos y es el primer mensaje */}
          {!isLoading && messages.length === 1 && hasInventoryData && (
            <div className="px-4 pb-2 flex flex-wrap gap-2 justify-center">
              {SUGGESTED_QUESTIONS.map((q, i) => (
                <button key={i} onClick={() => handleQuery(q)}
                  className="px-3 py-1.5 bg-background border hover:border-primary/50 hover:bg-primary/10 text-foreground/80 text-xs rounded-full transition-all shadow-sm flex items-center gap-1">
                  {q} <ArrowRight className="h-3 w-3 opacity-50" />
                </button>
              ))}
            </div>
          )}

          <div className="p-4 bg-background border-t">
            <form onSubmit={handleSubmit} className="flex gap-2 relative">
              <Input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={hasInventoryData ? "Pregunta sobre el inventario..." : "Esperando datos del inventario..."}
                className="flex-1 pr-10 rounded-xl border-border focus-visible:ring-primary"
                autoFocus
                disabled={isLoading || !hasInventoryData}
              />
              <Button 
                type="submit" 
                size="icon" 
                disabled={isLoading || !query.trim() || !hasInventoryData}
                className={`shrink-0 rounded-xl transition-all duration-300 ${
                  query.trim() && hasInventoryData 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/30' 
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}