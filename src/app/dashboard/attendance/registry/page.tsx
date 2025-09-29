
"use client";

import React, { useState, useMemo, useEffect } from "react";
import dynamic from "next/dynamic";
import { PageHeader } from "@/components/page-header";
import { useAppState } from "@/contexts/app-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScanLine, Clock, LogIn, LogOut, Loader2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Timestamp } from "firebase/firestore";
import type { AttendanceLog } from "@/lib/data";

const QrScannerDialog = dynamic(() => import('@/components/qr-scanner-dialog').then(mod => mod.QrScannerDialog), { ssr: false });

export default function AttendanceRegistryPage() {
    const { attendanceLogs, handleAttendanceScan, loading, users } = useAppState();
    const [isScannerOpen, setScannerOpen] = useState(false);
    const [today, setToday] = useState('');

    useEffect(() => {
        const now = new Date();
        setToday(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`);
    }, []);
    
    const userMap = useMemo(() => new Map(users.map(u => [u.id, u.name])), [users]);
    const todaysLogsGrouped = useMemo(() => {
        if (!attendanceLogs) return new Map();
        
        const grouped = new Map<string, AttendanceLog[]>();

        attendanceLogs
            .filter(log => log.date === today)
            .forEach(log => {
                if (!grouped.has(log.userId)) {
                    grouped.set(log.userId, []);
                }
                grouped.get(log.userId)!.push(log);
            });
        
        // Sort logs within each group by timestamp
        grouped.forEach(logs => logs.sort((a,b) => (a.timestamp as Date).getTime() - (b.timestamp as Date).getTime()));

        return grouped;

    }, [attendanceLogs, today]);


    const handleScan = async (qrCode: string) => {
        setScannerOpen(false);
        const userId = qrCode.replace('USER-', '');
        await handleAttendanceScan(userId);
    };

    const formatTime = (date: Date | Timestamp | null | undefined): string => {
        if (!date) return "--:--";
        const jsDate = date instanceof Timestamp ? date.toDate() : date;
        return jsDate.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
    };

    const getStatusForUser = (logs: AttendanceLog[] | undefined) => {
        if (!logs || logs.length === 0) return <Badge variant="outline">Ausente</Badge>;
        const lastLog = logs[logs.length - 1];
        if (lastLog.type === 'in') return <Badge className="bg-green-600 text-white hover:bg-green-700">Presente</Badge>;
        return <Badge variant="outline">Finalizado</Badge>;
    }


    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }
    
    return (
        <>
        <QrScannerDialog
            open={isScannerOpen}
            onOpenChange={setScannerOpen}
            onScan={handleScan}
            title="Escanear Asistencia"
            description="Apunta la cámara al código QR del carnet del trabajador para registrar su entrada o salida."
        />
        <div className="flex flex-col gap-8">
            <PageHeader
                title="Registro de Asistencia"
                description={`Movimientos registrados para hoy, ${new Date().toLocaleDateString('es-CL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.`}
            />
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <span>Movimientos del Día</span>
                         <Button onClick={() => setScannerOpen(true)}>
                            <ScanLine className="mr-2 h-4 w-4" />
                            Escanear QR
                        </Button>
                    </CardTitle>
                    <CardDescription>
                        Cada escaneo registra una entrada o una salida automáticamente, incluyendo colación.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-[calc(80vh-12rem)]">
                        <Table>
                            <TableHeader className="sticky top-0 bg-card">
                                <TableRow>
                                    <TableHead>Trabajador</TableHead>
                                    <TableHead>Registros del Día</TableHead>
                                    <TableHead>Estado Actual</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {Array.from(todaysLogsGrouped.entries()).length > 0 ? Array.from(todaysLogsGrouped.entries()).map(([userId, logs]) => (
                                    <TableRow key={userId}>
                                        <TableCell className="font-medium">{userMap.get(userId) || 'Desconocido'}</TableCell>
                                        <TableCell>
                                            <div className="flex flex-wrap gap-x-4 gap-y-2">
                                                {logs.map(log => (
                                                     <div key={log.id} className="flex items-center gap-2 text-sm">
                                                        {log.type === 'in' ? <LogIn className="h-4 w-4 text-green-500" /> : <LogOut className="h-4 w-4 text-red-500" />}
                                                        <span>{formatTime(log.timestamp)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {getStatusForUser(logs)}
                                        </TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={3} className="h-24 text-center">
                                            Aún no hay registros de asistencia para hoy.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
        </>
    );
}
