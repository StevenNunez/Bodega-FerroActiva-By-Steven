"use client";

import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, CalendarCheck, Clock, FileBarChart, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useAppState } from "@/contexts/app-provider";

const attendanceModules = [
    {
        title: "Registro de Asistencia",
        description: "Escanea QRs para registrar entradas y salidas en tiempo real.",
        href: "/dashboard/attendance/registry",
        icon: CalendarCheck,
        permission: "attendance:register"
    },
    {
        title: "Reporte Semanal",
        description: "Visualiza el detalle de horas, atrasos y extras de la semana.",
        href: "/dashboard/attendance/report",
        icon: BookOpen,
        permission: "attendance:edit"
    },
    {
        title: "Reporte Mensual y Liquidación",
        description: "Genera reportes mensuales y calcula liquidaciones de sueldo.",
        href: "/dashboard/attendance/monthly-report",
        icon: FileBarChart,
        permission: "attendance:edit"
    },
    {
        title: "Cálculo de Horas Extras",
        description: "Consulta el detalle de las horas extras por trabajador y período.",
        href: "/dashboard/attendance/overtime",
        icon: Clock,
        permission: "attendance:edit"
    }
];

export default function AttendanceDashboardPage() {
    const { can } = useAppState();

    const visibleModules = attendanceModules.filter(module => can(module.permission as any));

    return (
        <div className="flex flex-col gap-8">
            <PageHeader
                title="Módulo de Asistencia"
                description="Controla el tiempo de tu equipo, gestiona reportes y calcula las horas trabajadas."
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {visibleModules.map(module => (
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
                                <CardDescription className="pt-2">{module.description}</CardDescription>
                            </CardHeader>
                        </Card>
                    </Link>
                ))}
            </div>
        </div>
    );
}