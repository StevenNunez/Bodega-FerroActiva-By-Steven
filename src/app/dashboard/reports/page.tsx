"use client";

import { PageHeader } from "@/components/page-header";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, FileBarChart, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useAppState } from "@/contexts/app-provider";

const reportsModules = [
    {
        title: "Estadísticas de Consumo",
        description: "Analiza el consumo de materiales por área y los usuarios que más solicitan.",
        href: "/dashboard/reports/stats",
        icon: BarChart3,
        permission: "reports:view"
    },
    {
        title: "Reporte de Entregas",
        description: "Revisa y exporta un listado detallado de todos los materiales entregados desde bodega.",
        href: "/dashboard/reports/deliveries",
        icon: FileBarChart,
        permission: "reports:view"
    },
];

export default function ReportsDashboardPage() {
    const { can } = useAppState();

    const visibleModules = reportsModules.filter(module => can(module.permission as any));

    return (
        <div className="flex flex-col gap-8">
            <PageHeader
                title="Módulo de Reportes"
                description="Analiza datos, genera informes y obtén una visión clara de la operación de tu bodega."
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
