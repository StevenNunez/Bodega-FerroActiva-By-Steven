"use client";

import React, { useMemo } from "react";
import { PageHeader } from "@/components/page-header";
import { useAppState, useAuth } from "@/modules/core/contexts/app-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Wrench, History, CheckCircle, AlertTriangle, Inbox } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Timestamp } from "firebase/firestore";

type ToolLog = {
    id: string;
    userId: string;
    toolName: string;
    checkoutDate: Timestamp;
    returnDate: Timestamp | null;
    returnStatus?: string;
};

const formatDate = (date: Date | Timestamp | null | undefined) => {
    if (!date) return "N/A";
    const jsDate = date instanceof Timestamp ? date.toDate() : date;
    return jsDate.toLocaleDateString("es-CL", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
};

export default function WorkerToolsPage() {
    const { user } = useAuth();
    const { toolLogs } = useAppState();

    const { currentTools, toolHistory } = useMemo(() => {
        if (!user || !toolLogs) return { currentTools: [], toolHistory: [] };

        const myLogs: ToolLog[] = toolLogs.filter(
            (log: ToolLog) => log.userId === user.id
        );

        const current: ToolLog[] = myLogs
            .filter((log: ToolLog) => log.returnDate === null)
            .sort(
                (a: ToolLog, b: ToolLog) =>
                    b.checkoutDate.toMillis() - a.checkoutDate.toMillis()
            );

        const history: ToolLog[] = myLogs
            .filter((log: ToolLog) => log.returnDate !== null)
            .sort(
                (a: ToolLog, b: ToolLog) =>
                    (b.returnDate?.toMillis() ?? 0) -
                    (a.returnDate?.toMillis() ?? 0)
            );

        return { currentTools: current, toolHistory: history };
    }, [user, toolLogs]);

    return (
        <div className="flex flex-col gap-8">
            <PageHeader
                title="Mis Herramientas"
                description="Consulta las herramientas que tienes a tu cargo y tu historial de uso."
            />

            <Tabs defaultValue="current">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="current">
                        <Wrench className="mr-2 h-4 w-4" />
                        Mis Herramientas Actuales ({currentTools.length})
                    </TabsTrigger>
                    <TabsTrigger value="history">
                        <History className="mr-2 h-4 w-4" />
                        Historial de Uso
                    </TabsTrigger>
                </TabsList>

                {/* TAB: Herramientas actuales */}
                <TabsContent value="current">
                    <Card>
                        <CardHeader>
                            <CardTitle>Herramientas a mi Cargo</CardTitle>
                            <CardDescription>
                                Estas son las herramientas que tienes retiradas.
                            </CardDescription>
                        </CardHeader>

                        <CardContent>
                            <ScrollArea className="h-[60vh]">
                                {currentTools.length > 0 ? (
                                    <div className="space-y-4">
                                        {currentTools.map((log: ToolLog) => (
                                            <div
                                                key={log.id}
                                                className="p-4 border rounded-lg flex items-center justify-between"
                                            >
                                                <div>
                                                    <p className="font-semibold">
                                                        {log.toolName}
                                                    </p>
                                                    <p className="text-sm text-muted-foreground">
                                                        Retirada el:{" "}
                                                        {formatDate(log.checkoutDate)}
                                                    </p>
                                                </div>

                                                <Badge>En tu poder</Badge>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center text-center text-muted-foreground h-full p-12">
                                        <Inbox className="h-16 w-16 mb-4" />
                                        <h3 className="text-xl font-semibold">
                                            Sin herramientas
                                        </h3>
                                        <p className="mt-2">
                                            No tienes herramientas actualmente.
                                        </p>
                                    </div>
                                )}
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* TAB: Historial */}
                <TabsContent value="history">
                    <Card>
                        <CardHeader>
                            <CardTitle>Historial de Herramientas Utilizadas</CardTitle>
                            <CardDescription>
                                Todas las herramientas que has utilizado y devuelto.
                            </CardDescription>
                        </CardHeader>

                        <CardContent>
                            <ScrollArea className="h-[60vh]">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Herramienta</TableHead>
                                            <TableHead>Retiro</TableHead>
                                            <TableHead>Devolución</TableHead>
                                            <TableHead>Estado</TableHead>
                                        </TableRow>
                                    </TableHeader>

                                    <TableBody>
                                        {toolHistory.length > 0 ? (
                                            toolHistory.map((log: ToolLog) => (
                                                <TableRow key={log.id}>
                                                    <TableCell className="font-medium">
                                                        {log.toolName}
                                                    </TableCell>

                                                    <TableCell>
                                                        {formatDate(log.checkoutDate)}
                                                    </TableCell>

                                                    <TableCell>
                                                        {formatDate(log.returnDate)}
                                                    </TableCell>

                                                    <TableCell>
                                                        {log.returnStatus === "ok" ? (
                                                            <Badge
                                                                variant="secondary"
                                                                className="bg-green-100 text-green-800"
                                                            >
                                                                <CheckCircle className="mr-1 h-3 w-3" />
                                                                OK
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="destructive">
                                                                <AlertTriangle className="mr-1 h-3 w-3" />
                                                                Dañada
                                                            </Badge>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell
                                                    colSpan={4}
                                                    className="h-24 text-center"
                                                >
                                                    No tienes historial.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
