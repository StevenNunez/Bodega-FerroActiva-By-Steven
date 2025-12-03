"use client";

import React, { useMemo } from "react";
import { useAppState } from "@/modules/core/contexts/app-provider";
import { PageHeader } from "@/components/page-header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import {
  Loader2,
  CheckCircle,
  AlertTriangle,
  FileDown,
  Clock,
  PackageSearch
} from "lucide-react";
import { Timestamp } from "firebase/firestore";
import { differenceInDays, startOfDay } from 'date-fns';
import { ScrollArea } from "@/components/ui/scroll-area";

export default function SupplierPaymentsPage() {
  const { supplierPayments, isLoading: loading, suppliers } = useAppState();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" }).format(value);
  };
  
  const supplierMap = React.useMemo(() => new Map((suppliers || []).map(s => [s.id, s.name])), [suppliers]);
  const today = startOfDay(new Date());


  const { paymentStats, overduePayments, dueSoonPayments } = useMemo(() => {
    if (!supplierPayments) {
      return { paymentStats: { total: 0, paid: 0, pending: 0, overdue: 0, count: 0 }, overduePayments: [], dueSoonPayments: [] };
    }
    
    let paid = 0;
    let pending = 0;
    let overdue = 0;
    const overdueList: any[] = [];
    const dueSoonList: any[] = [];


    supplierPayments.forEach(p => {
      if (p.status === 'paid') {
        paid += p.amount;
      } else {
        const dueDate = p.dueDate instanceof Timestamp ? p.dueDate.toDate() : new Date(p.dueDate as any);
        const daysDiff = differenceInDays(dueDate, today);

        if (daysDiff < 0) {
          overdue += p.amount;
          overdueList.push({...p, daysOverdue: Math.abs(daysDiff)});
        } else {
          pending += p.amount;
          if (daysDiff <= 7) {
            dueSoonList.push({...p, daysUntilDue: daysDiff});
          }
        }
      }
    });

    const total = paid + pending + overdue;

    return { 
        paymentStats: { total, paid, pending, overdue, count: supplierPayments.length },
        overduePayments: overdueList.sort((a,b) => b.daysOverdue - a.daysOverdue),
        dueSoonPayments: dueSoonList.sort((a,b) => a.daysUntilDue - b.daysUntilDue),
    };
  }, [supplierPayments, today]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Resumen de Pagos"
        description="Vista general del estado de pago de las facturas de los proveedores."
      />

       <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Pagado</CardTitle>
                    <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(paymentStats.paid)}</div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Pendiente</CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(paymentStats.pending)}</div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-destructive">Total Vencido</CardTitle>
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-destructive">{formatCurrency(paymentStats.overdue)}</div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Facturas</CardTitle>
                    <FileDown className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{paymentStats.count}</div>
                </CardContent>
            </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="border-destructive/50">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-destructive"><AlertTriangle/> Facturas Vencidas</CardTitle>
                    <CardDescription>Pagos que han superado su fecha de vencimiento.</CardDescription>
                </CardHeader>
                <CardContent>
                     <ScrollArea className="h-72 border rounded-md">
                        <div className="p-2">
                           {overduePayments.length > 0 ? (
                                <ul className="space-y-3">
                                    {overduePayments.map(p => (
                                        <li key={p.id} className="text-sm p-3 rounded-lg border border-destructive/20 bg-destructive/10">
                                            <div className="flex justify-between items-center">
                                                <span className="font-semibold truncate">{supplierMap.get(p.supplierId) || 'N/A'} - Fact. {p.invoiceNumber}</span>
                                                <span className="font-bold text-destructive">{formatCurrency(p.amount)}</span>
                                            </div>
                                            <p className="text-xs text-destructive/80">Venció hace {p.daysOverdue} día(s).</p>
                                        </li>
                                    ))}
                                </ul>
                           ) : (
                                <div className="flex flex-col items-center justify-center text-center text-muted-foreground h-full p-8">
                                    <PackageSearch className="h-10 w-10 mb-2"/>
                                    <p>¡Excelente! No hay facturas vencidas.</p>
                                </div>
                           )}
                        </div>
                     </ScrollArea>
                </CardContent>
            </Card>
            <Card className="border-amber-500/50">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-amber-500"><Clock/> Facturas por Vencer (Próximos 7 días)</CardTitle>
                    <CardDescription>Estos pagos vencen pronto. ¡Que no se te pasen!</CardDescription>
                </CardHeader>
                 <CardContent>
                     <ScrollArea className="h-72 border rounded-md">
                        <div className="p-2">
                           {dueSoonPayments.length > 0 ? (
                                <ul className="space-y-3">
                                    {dueSoonPayments.map(p => (
                                        <li key={p.id} className="text-sm p-3 rounded-lg border border-amber-500/20 bg-amber-500/10">
                                            <div className="flex justify-between items-center">
                                                <span className="font-semibold truncate">{supplierMap.get(p.supplierId) || 'N/A'} - Fact. {p.invoiceNumber}</span>
                                                <span className="font-bold text-amber-600">{formatCurrency(p.amount)}</span>
                                            </div>
                                            <p className="text-xs text-amber-700/80">Vence en {p.daysUntilDue} día(s).</p>
                                        </li>
                                    ))}
                                </ul>
                           ) : (
                                <div className="flex flex-col items-center justify-center text-center text-muted-foreground h-full p-8">
                                    <PackageSearch className="h-10 w-10 mb-2"/>
                                    <p>No hay facturas con vencimiento próximo.</p>
                                </div>
                           )}
                        </div>
                     </ScrollArea>
                </CardContent>
            </Card>
        </div>
    </div>
  );
}
