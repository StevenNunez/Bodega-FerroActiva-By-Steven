
"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
    BookOpen,
    CalendarCheck,
    Clock,
    FileBarChart,
    ArrowRight,
    AlertCircle,
    Users,
    UserCheck,
    UserX,
    LogIn,
    LogOut,
    HandCoins
} from "lucide-react";
import { useAppState } from "@/modules/core/contexts/app-provider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { StatCard } from "@/components/admin/stat-card";
import { Timestamp } from "firebase/firestore";
import { Badge } from "@/components/ui/badge";
import { User, AttendanceLog } from "@/modules/core/lib/data";

interface ModuleProps {
    title: string;
    description: string;
    href: string;
    permission: string;
    icon: React.ElementType;
}

const attendanceModules: ModuleProps[] = [
    {
        title: "Registro de Asistencia",
        description: "Escanea QRs para registrar entradas y salidas en tiempo real.",
        href: "/dashboard/attendance/registry",
        permission: "attendance:register",
        icon: CalendarCheck,
    },
    {
        title: "Reporte Semanal",
        description: "Visualiza el detalle de horas, atrasos y extras de la semana.",
        href: "/dashboard/attendance/report",
        permission: "attendance:edit",
        icon: BookOpen,
    },
    {
        title: "Reporte Mensual y Liquidación",
        description: "Genera reportes mensuales y calcula liquidaciones de sueldo.",
        href: "/dashboard/attendance/monthly-report",
        permission: "attendance:edit",
        icon: FileBarChart,
    },
    {
        title: "Cálculo de Horas Extras",
        description: "Consulta el detalle de las horas extras por trabajador y período.",
        href: "/dashboard/attendance/overtime",
        permission: "attendance:edit",
        icon: Clock,
    },
    {
        title: "Generador de Finiquito",
        description: "Calcula finiquitos según la normativa chilena.",
        href: "/dashboard/attendance/severance",
        permission: "attendance:edit",
        icon: HandCoins,
    }
];

export default function AttendanceDashboardPage() {
    const { users, attendanceLogs, can } = useAppState();

    const todayStr = useMemo(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
            now.getDate()
        ).padStart(2, "0")}`;
    }, []);

    const { stats, recentLogs } = useMemo(() => {
        const safeUsers: User[] = users || [];
        const safeLogs: AttendanceLog[] = attendanceLogs || [];

        const relevantUsers = safeUsers.filter(
            (u: User) => u.role !== "guardia" && u.role !== "superadmin"
        );

        const todaysLogs = safeLogs.filter((log: AttendanceLog) => log.date === todayStr);

        const attendees = new Set(todaysLogs.map((log) => log.userId));

        let currentlyPresent = 0;
        const userLastLogType: Record<string, "in" | "out"> = {};

        todaysLogs.forEach((log: AttendanceLog) => {
            userLastLogType[log.userId] = log.type;
        });

        Object.values(userLastLogType).forEach((type) => {
            if (type === "in") currentlyPresent++;
        });

        const sortedRecentLogs = [...todaysLogs]
            .sort(
                (a, b) =>
                    b.timestamp.getTime() -
                    a.timestamp.getTime()
            )
            .slice(0, 5);

        return {
            stats: {
                totalWorkers: relevantUsers.length,
                presentToday: attendees.size,
                absentToday: relevantUsers.length - attendees.size,
                currentlyIn: currentlyPresent,
            },
            recentLogs: sortedRecentLogs,
        };
    }, [users, attendanceLogs, todayStr]);

    const userMap = useMemo(
        () => new Map((users || []).map((u: User) => [u.id, u.name])),
        [users]
    );

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
    };

    const visibleModules = attendanceModules.filter((module) =>
        can(module.permission as any)
    );

    if (!can("module_attendance:view")) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Acceso Denegado</AlertTitle>
                <AlertDescription>
                    No tienes los permisos necesarios para acceder a este módulo.
                </AlertDescription>
            </Alert>
        );
    }

    return (
        <div className="flex flex-col gap-8">
            <PageHeader
                title="Módulo de Asistencia"
                description="Controla el tiempo de tu equipo, gestiona reportes y calcula las horas trabajadas."
            />

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard title="Trabajadores Activos" value={stats.totalWorkers} icon={Users} />
                <StatCard title="Asistencia Hoy" value={stats.presentToday} icon={UserCheck} />
                <StatCard
                    title="Ausentes Hoy"
                    value={stats.absentToday}
                    icon={UserX}
                    color="text-red-500"
                />
                <StatCard
                    title="Actualmente en Obra"
                    value={stats.currentlyIn}
                    icon={Users}
                    color="text-green-500"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Movimientos Recientes</CardTitle>
                            <CardDescription>
                                Últimos 5 registros de entrada y salida del día.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Hora</TableHead>
                                        <TableHead>Trabajador</TableHead>
                                        <TableHead className="text-right">Movimiento</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {recentLogs.length > 0 ? (
                                        recentLogs.map((log: AttendanceLog) => (
                                            <TableRow key={log.id}>
                                                <TableCell className="font-mono">
                                                    {formatTime(log.timestamp)}
                                                </TableCell>

                                                <TableCell className="font-medium">
                                                    {userMap.get(log.userId) || "Desconocido"}
                                                </TableCell>

                                                <TableCell className="text-right">
                                                    {log.type === "in" ? (
                                                        <Badge className="bg-green-600 hover:bg-green-700 text-white">
                                                            <LogIn className="mr-1 h-3 w-3" /> Entrada
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="outline">
                                                            <LogOut className="mr-1 h-3 w-3" /> Salida
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell
                                                colSpan={3}
                                                className="text-center h-24 text-muted-foreground"
                                            >
                                                No hay movimientos registrados hoy.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-4">
                    {visibleModules.length === 0 ? (
                        <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Sin Permisos de Acción</AlertTitle>
                            <AlertDescription>
                                Puedes ver este módulo, pero tu rol no tiene permisos para
                                realizar acciones aquí. Contacta a un administrador si crees que esto
                                es un error.
                            </AlertDescription>
                        </Alert>
                    ) : (
                        visibleModules.map((module) => (
                            <Link key={module.href} href={module.href} className="group">
                                <Card className="h-full transition-all duration-200 hover:border-primary hover:shadow-md">
                                    <CardHeader>
                                        <CardTitle className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <module.icon className="h-6 w-6 text-primary" />
                                                <span>{module.title}</span>
                                            </div>
                                            <ArrowRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
                                        </CardTitle>
                                        <CardDescription className="pt-2">
                                            {module.description}
                                        </CardDescription>
                                    </CardHeader>
                                </Card>
                            </Link>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
