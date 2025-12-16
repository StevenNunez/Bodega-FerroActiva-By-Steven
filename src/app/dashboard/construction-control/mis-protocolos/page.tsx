
"use client";

import React, { useMemo } from 'react';
import { PageHeader } from '@/components/page-header';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Construction, Inbox, Clock, ThumbsUp, ThumbsDown } from 'lucide-react';
import { useAppState, useAuth } from '@/modules/core/contexts/app-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { WorkItem, User } from '@/modules/core/lib/data';
import { Timestamp } from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';


const getStatusInfo = (status: string): { label: string; icon: React.ElementType; color: string } => {
    switch (status) {
        case 'pending-quality-review': return { label: 'Pendiente de Revisión', icon: Clock, color: 'bg-yellow-500/80' };
        case 'completed': return { label: 'Aprobado', icon: ThumbsUp, color: 'bg-green-600' };
        case 'rejected': return { label: 'Rechazado', icon: ThumbsDown, color: 'bg-red-600' };
        default: return { label: 'En Progreso', icon: Construction, color: 'bg-gray-500' };
    }
};

const formatDate = (date: Date | Timestamp | undefined | null) => {
    if (!date) return 'N/A';
    const jsDate = date instanceof Timestamp ? date.toDate() : date;
    return formatDistanceToNow(jsDate, { addSuffix: true, locale: es });
};

export default function MisProtocolosPage() {
  const { user } = useAuth();
  const { workItems } = useAppState();

  const mySubmittedProtocols = useMemo(() => {
    if (!user || !workItems) return [];
    return workItems
      .filter((item: WorkItem) => 
          item.status === 'pending-quality-review' || 
          item.status === 'completed' || 
          item.status === 'rejected'
      )
      .sort((a,b) => (b.actualEndDate?.getTime() || 0) - (a.actualEndDate?.getTime() || 0));
  }, [workItems, user]);
  
  const filterByStatus = (status: string) => {
      return mySubmittedProtocols.filter(p => p.status === status);
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Mis Protocolos Enviados"
        description="Aquí verás el historial y estado de las partidas que has finalizado y enviado a revisión."
      />
      
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">Todos ({mySubmittedProtocols.length})</TabsTrigger>
            <TabsTrigger value="pending-quality-review">Pendientes ({filterByStatus('pending-quality-review').length})</TabsTrigger>
            <TabsTrigger value="completed">Aprobados ({filterByStatus('completed').length})</TabsTrigger>
            <TabsTrigger value="rejected">Rechazados ({filterByStatus('rejected').length})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all">
            <ProtocolList protocols={mySubmittedProtocols} />
        </TabsContent>
        <TabsContent value="pending-quality-review">
             <ProtocolList protocols={filterByStatus('pending-quality-review')} />
        </TabsContent>
        <TabsContent value="completed">
             <ProtocolList protocols={filterByStatus('completed')} />
        </TabsContent>
        <TabsContent value="rejected">
             <ProtocolList protocols={filterByStatus('rejected')} />
        </TabsContent>
      </Tabs>
    </div>
  );
}


function ProtocolList({ protocols }: { protocols: WorkItem[] }) {
    if (protocols.length === 0) {
        return (
             <div className="flex flex-col items-center justify-center text-center text-muted-foreground p-12 border-2 border-dashed rounded-lg bg-card mt-4">
                <Inbox className="h-16 w-16 mb-4 opacity-50"/>
                <h3 className="text-xl font-semibold">Sin Protocolos</h3>
                <p className="mt-2">No hay partidas en esta categoría.</p>
            </div>
        );
    }

    return (
        <Card className="mt-4">
            <CardContent className="p-0">
                 <ScrollArea className="h-[calc(80vh-16rem)]">
                    <div className="space-y-3 p-4">
                        {protocols.map(item => {
                            const statusInfo = getStatusInfo(item.status);
                            const StatusIcon = statusInfo.icon;
                            return (
                                <div key={item.id} className="p-4 border rounded-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 hover:bg-muted/50 transition-colors">
                                    <div className="flex-grow">
                                        <p className="font-semibold text-foreground">{item.path} - {item.name}</p>
                                        <p className="text-sm text-muted-foreground">Enviado {formatDate(item.actualEndDate)}</p>
                                    </div>
                                     <Badge className={`${statusInfo.color} text-white`}>
                                        <StatusIcon className="mr-1.5 h-3.5 w-3.5" />
                                        {statusInfo.label}
                                    </Badge>
                                </div>
                            );
                        })}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
}
