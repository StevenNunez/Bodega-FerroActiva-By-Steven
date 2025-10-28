"use client";

import { PageHeader } from "@/components/page-header";
import { useAppState, useAuth } from "@/contexts/app-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import React, { useState, useMemo } from "react";
import { Wrench, PackageSearch } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function SupervisorPage() {
  const { users, toolLogs, tools } = useAppState();
  const { user: authUser } = useAuth();
  
  // Tools checked out under this supervisor's responsibility
  const checkedOutToolsUnderSupervisor = toolLogs.filter(log => log.returnDate === null && log.supervisorId === authUser?.id);
  
  return (
    <div className="flex flex-col gap-8">
      <PageHeader title={`Panel de Supervisor`} description="Gestiona las solicitudes y las herramientas de tu equipo." />
      
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3 items-start">
         <div className="lg:col-span-3 space-y-8">
             <Card>
              <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Wrench /> Herramientas Asignadas al Equipo</CardTitle>
                  <CardDescription>Visualiza las herramientas que están actualmente en uso por los trabajadores bajo tu supervisión.</CardDescription>
              </CardHeader>
              <CardContent>
                  <ScrollArea className="h-96 border rounded-md">
                    <div className="p-2">
                        {checkedOutToolsUnderSupervisor.length > 0 ? (
                        <div className="space-y-2">
                            {checkedOutToolsUnderSupervisor.map(log => {
                                const tool = tools.find(t => t.id === log.toolId);
                                const worker = users.find(u => u.id === log.workerId);
                                return <div key={log.id} className="text-sm p-2 rounded-md bg-muted flex justify-between items-center">
                                    <span><span className="font-semibold">{tool?.name}</span> en posesión de {worker?.name}</span>
                                    <Badge variant="destructive">Ocupado</Badge>
                                </div>
                            })}
                        </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-4">
                                <PackageSearch className="h-10 w-10 mb-2"/>
                                <p>Ningún trabajador de tu equipo tiene herramientas asignadas.</p>
                            </div>
                        )}
                    </div>
                     <ScrollBar orientation="vertical" />
                  </ScrollArea>
              </CardContent>
          </Card>
         </div>
      </div>
    </div>
  );
}
