"use client";

import React, { useMemo } from "react";
import { PageHeader } from "@/components/page-header";
import { useAppState } from "@/modules/core/contexts/app-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Inbox, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Timestamp } from "firebase/firestore";
import type { DailyTalk } from "@/modules/core/lib/data";

const formatDate = (date: Date | Timestamp | undefined | null) => {
    if (!date) return 'N/A';
    const jsDate = date instanceof Timestamp ? date.toDate() : date;
    return jsDate.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function ReviewDailyTalksPage() {
    const { dailyTalks, isLoading } = useAppState();

    const sortedTalks = useMemo(() => {
        if (!dailyTalks) return [];
        return [...dailyTalks].sort((a, b) => {
            const dateA = a.fecha instanceof Timestamp ? a.fecha.toMillis() : new Date(a.fecha as any).getTime();
            const dateB = b.fecha instanceof Timestamp ? b.fecha.toMillis() : new Date(b.fecha as any).getTime();
            return dateB - dateA;
        });
    }, [dailyTalks]);


    if (isLoading) {
        return <div className="flex h-full w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <div className="flex flex-col gap-8">
            <PageHeader
                title="Historial de Charlas Diarias"
                description="Aquí puedes ver todos los registros de charlas de 5 minutos."
            />

            <Card>
                <CardHeader>
                    <CardTitle>Historial</CardTitle>
                    <CardDescription>
                       Selecciona una charla para ver sus detalles y descargar el PDF.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-[calc(80vh-12rem)] border rounded-md">
                        {sortedTalks.length > 0 ? (
                            <div className="space-y-3 p-4">
                                {sortedTalks.map((talk: DailyTalk) => (
                                    <Link key={talk.id} href={`/dashboard/safety/review-daily-talks/${talk.id}`} >
                                        <div className="p-4 border rounded-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 hover:bg-muted/50 transition-colors cursor-pointer">
                                            <div className="flex-grow">
                                                <h4 className="font-semibold">Charla del {formatDate(talk.fecha)}</h4>
                                                <p className="text-sm text-muted-foreground">Obra: <span className="font-medium">{talk.obra}</span></p>
                                                <p className="text-sm text-muted-foreground">Expositor: <span className="font-medium">{talk.expositorName}</span></p>
                                            </div>
                                            <div className="flex items-center gap-4 flex-shrink-0">
                                                <ArrowRight className="h-5 w-5 text-muted-foreground"/>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        ) : (
                             <div className="flex flex-col items-center justify-center text-center text-muted-foreground h-full p-12">
                                <Inbox className="h-16 w-16 mb-4"/>
                                <h3 className="text-xl font-semibold">Sin registros</h3>
                                <p className="mt-2">No se han registrado charlas diarias todavía.</p>
                            </div>
                        )}
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
    );
}
