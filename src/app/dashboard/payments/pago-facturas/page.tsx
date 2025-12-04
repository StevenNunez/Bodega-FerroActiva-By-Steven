
"use client";

import React, { useState, useMemo } from "react";
import dynamic from 'next/dynamic';
import { useAppState } from "@/modules/core/contexts/app-provider";
import { useToast } from "@/modules/core/hooks/use-toast";
import { PageHeader } from "@/components/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  CalendarIcon,
  CheckCircle,
  XCircle,
  FilePlus,
  Clock,
  Edit,
} from "lucide-react";
import { Timestamp } from "firebase/firestore";
import { format, differenceInDays, startOfDay } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { SupplierPayment, Supplier } from "@/modules/core/lib/data";
import { MarkAsPaidDialog } from "@/components/admin/mark-as-paid-dialog";
import { EditPaymentForm } from "@/components/admin/edit-payment-form";

const Calendar = dynamic(() => import('@/components/ui/calendar').then(mod => mod.Calendar), { ssr: false });

type PaymentStatus = "pending" | "paid" | "overdue";

// === Subcomponente para crear factura ===
const CreatePaymentForm = ({
  suppliers,
  addPayment,
}: {
  suppliers: Supplier[];
  addPayment: (data: any) => Promise<void>;
}) => {
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [amount, setAmount] = useState<number | "">("");
  const [dueDate, setDueDate] = useState<Date | undefined>();
    const [issueDate, setIssueDate] = useState<Date | undefined>();
  const [purchaseOrderNumber, setPurchaseOrderNumber] = useState("");
  const [work, setWork] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceNumber || !supplierId || !amount || !dueDate || !work || !issueDate) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Por favor, completa todos los campos requeridos.",
      });
      return;
    }
    setIsSubmitting(true);
    try {
      await addPayment({
        invoiceNumber,
        supplierId,
        amount,
        issueDate,
        dueDate,
        purchaseOrderNumber,
        work,
      });
      setInvoiceNumber("");
      setSupplierId("");
      setAmount("");
      setIssueDate(undefined);
      setDueDate(undefined);
      setPurchaseOrderNumber("");
      setWork("");
      toast({
        title: "Éxito",
        description: "Factura registrada correctamente.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
         <div className="space-y-2">
            <Label htmlFor="supplierId">Proveedor</Label>
            <Select value={supplierId} onValueChange={setSupplierId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un proveedor..." />
              </SelectTrigger>
              <SelectContent>
                {suppliers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="work">Obra</Label>
            <Input id="work" value={work} onChange={(e) => setWork(e.target.value)} placeholder="Ej: File 721"/>
          </div>
      </div>


      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="space-y-2">
          <Label htmlFor="invoiceNumber">Nº Factura</Label>
          <Input
            id="invoiceNumber"
            value={invoiceNumber}
            onChange={(e) => setInvoiceNumber(e.target.value)}
            placeholder="Ej: F-12345"
          />
        </div>
         <div className="space-y-2">
          <Label htmlFor="amount">Monto</Label>
          <Input
            id="amount"
            type="number"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            placeholder="Ej: 30000"
          />
        </div>
        <div className="space-y-2">
            <Label htmlFor="issueDate">Fecha de Emisión</Label>
             <Popover>
                <PopoverTrigger asChild>
                <Button
                    variant={"outline"}
                    className={cn(
                    "w-full justify-start text-left font-normal",
                    !issueDate && "text-muted-foreground"
                    )}
                >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {issueDate ? format(issueDate, "PPP", { locale: es }) : "Selecciona una fecha"}
                </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={issueDate} onSelect={setIssueDate} initialFocus />
                </PopoverContent>
            </Popover>
        </div>
        <div className="space-y-2">
          <Label htmlFor="dueDate">Fecha de Vencimiento</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !dueDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dueDate
                  ? format(dueDate, "PPP", { locale: es })
                  : "Selecciona una fecha"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={dueDate}
                onSelect={setDueDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>
      
       <div className="space-y-2">
          <Label htmlFor="purchaseOrderNumber">Orden de Compra (Opcional)</Label>
          <Input
            id="purchaseOrderNumber"
            value={purchaseOrderNumber}
            onChange={(e) => setPurchaseOrderNumber(e.target.value)}
            placeholder="Ej: OC-001"
          />
        </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <FilePlus className="mr-2 h-4 w-4" />
        )}
        Registrar Factura
      </Button>
    </form>
  );
};

// === Badge de estado ===
const PaymentStatusBadge = ({ status, payment }: { status: PaymentStatus, payment: any }) => {
  switch (status) {
    case "pending":
      return (
        <Badge variant="secondary" className="bg-yellow-500 text-white">
          <Clock className="mr-1 h-3 w-3" /> Por Vencer
        </Badge>
      );
    case "overdue":
      return (
        <Badge variant="destructive">
          <XCircle className="mr-1 h-3 w-3" /> Vencida
        </Badge>
      );
    case "paid":
      return (
        <Badge className="bg-green-600 hover:bg-green-700 text-white">
          <CheckCircle className="mr-1 h-3 w-3" /> Pagada
        </Badge>
      );
    default:
      return <Badge variant="outline">Desconocido</Badge>;
  }
};

// === Página principal ===
export default function PaymentManagementPage() {
  const {
    supplierPayments,
    suppliers,
    markPaymentAsPaid,
    addSupplierPayment,
    isLoading: loading,
  } = useAppState();

  const [filter, setFilter] = useState<"all" | PaymentStatus>("all");
  const [ocFilter, setOcFilter] = useState("");
  const [workFilter, setWorkFilter] = useState("all");
  const [payingPayment, setPayingPayment] = useState<SupplierPayment | null>(null);
  const [editingPayment, setEditingPayment] = useState<SupplierPayment | null>(null);
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" }).format(value);
  };

  const processedPayments = useMemo(() => {
    const today = startOfDay(new Date());
    return (supplierPayments || [])
      .map((p) => {
        const dueDate = p.dueDate instanceof Timestamp ? p.dueDate.toDate() : new Date(p.dueDate as any);
        let currentStatus: PaymentStatus = p.status as PaymentStatus;

        if (p.status === "pending") {
          currentStatus = differenceInDays(dueDate, today) < 0 ? "overdue" : "pending";
        }

        return {
          ...p,
          dueDate,
          calculatedStatus: currentStatus,
        };
      })
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  }, [supplierPayments]);

  const filteredPayments = useMemo(() => {
    return processedPayments.filter(p => {
        const statusMatch = filter === 'all' || p.calculatedStatus === filter;
        const ocMatch = !ocFilter || (p.purchaseOrderNumber && p.purchaseOrderNumber.includes(ocFilter));
        const workMatch = workFilter === 'all' || (p.work && p.work.toLowerCase().includes(workFilter.toLowerCase()));
        return statusMatch && ocMatch && workMatch;
    });
  }, [processedPayments, filter, ocFilter, workFilter]);

  const handleMarkAsPaid = async (details: { paymentDate: Date; paymentMethod: string }) => {
    if (!payingPayment) return;
    await markPaymentAsPaid(payingPayment.id, details);
    setPayingPayment(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const supplierMap = new Map(suppliers.map((s) => [s.id, s.name]));
  const workOptions = [...new Set(supplierPayments.map(p => p.work).filter(Boolean))] as string[];

  return (
    <div className="flex flex-col gap-8">
       <PageHeader
        title="Gestión de Facturas"
        description="Ingresa nuevas facturas de proveedores y gestiona los estados de pago."
      />
      <div className="grid grid-cols-1 gap-8">
        <Card>
            <CardHeader>
                <CardTitle>Registrar Nueva Factura</CardTitle>
                <CardDescription>Añade una nueva factura para seguimiento.</CardDescription>
            </CardHeader>
            <CardContent>
                <CreatePaymentForm
                suppliers={suppliers}
                addPayment={addSupplierPayment}
                />
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>Listado de Facturas</CardTitle>
                <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    <Input placeholder="Filtrar por Nº de OC..." value={ocFilter} onChange={e => setOcFilter(e.target.value)} />
                    <Select value={workFilter} onValueChange={setWorkFilter}>
                        <SelectTrigger><SelectValue placeholder="Filtrar por obra..." /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todas las Obras</SelectItem>
                            {workOptions.map(w => <SelectItem key={w} value={w}>{w}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
                        <SelectTrigger><SelectValue placeholder="Filtrar por estado..." /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos los Estados</SelectItem>
                            <SelectItem value="pending">Por Vencer</SelectItem>
                            <SelectItem value="overdue">Vencidas</SelectItem>
                            <SelectItem value="paid">Pagadas</SelectItem>
                    </SelectContent>
                    </Select>
                </div>
            </CardHeader>

            <CardContent className="p-0">
                <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead>Estado</TableHead>
                        <TableHead>Monto</TableHead>
                        <TableHead>Vencimiento</TableHead>
                        <TableHead>Proveedor</TableHead>
                        <TableHead>Factura / OC</TableHead>
                        <TableHead>Obra</TableHead>
                        <TableHead className="text-right">Acción</TableHead>
                    </TableRow>
                    </TableHeader>

                    <TableBody>
                    {filteredPayments.length > 0 ? (
                        filteredPayments.map((p) => (
                        <TableRow
                            key={p.id}
                            className={cn(
                            p.calculatedStatus === "pending" && "bg-yellow-500/10 hover:bg-yellow-500/20",
                            p.calculatedStatus === "overdue" && "bg-red-500/10 hover:bg-red-500/20",
                            p.calculatedStatus === "paid" && "bg-green-500/5 text-muted-foreground"
                            )}
                        >
                            <TableCell><PaymentStatusBadge status={p.calculatedStatus} payment={p} /></TableCell>
                            <TableCell className="font-mono">{formatCurrency(p.amount)}</TableCell>
                            <TableCell>{format(p.dueDate, "dd-MM-yyyy")}</TableCell>
                            <TableCell className="font-medium">{supplierMap.get(p.supplierId) || "Desconocido"}</TableCell>
                            <TableCell>
                                <div>{p.invoiceNumber}</div>
                                {p.purchaseOrderNumber && <div className="text-xs text-muted-foreground">OC: {p.purchaseOrderNumber}</div>}
                            </TableCell>
                             <TableCell>
                                {p.work || 'N/A'}
                                {p.status === 'paid' && p.paymentDate && (
                                    <div className="text-xs text-muted-foreground">Pagado: {format(p.paymentDate, "dd-MM-yy")} ({p.paymentMethod})</div>
                                )}
                            </TableCell>
                            <TableCell className="text-right flex justify-end gap-2">
                                <Button size="sm" variant="outline" onClick={() => setEditingPayment(p)}>
                                    <Edit className="h-4 w-4" />
                                </Button>
                                {p.status !== "paid" && (
                                    <Button size="sm" onClick={() => setPayingPayment(p)}>
                                        Marcar como Pagada
                                    </Button>
                                )}
                            </TableCell>
                        </TableRow>
                        ))
                    ) : (
                        <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center">No hay facturas que coincidan con los filtros.</TableCell>
                        </TableRow>
                    )}
                    </TableBody>
                </Table>
                </div>
            </CardContent>
            </Card>
      </div>

     <MarkAsPaidDialog
        isOpen={!!payingPayment}
        onClose={() => setPayingPayment(null)}
        payment={payingPayment}
        onConfirm={handleMarkAsPaid}
      />
      
      {editingPayment && (
        <EditPaymentForm
            isOpen={!!editingPayment}
            onClose={() => setEditingPayment(null)}
            payment={editingPayment}
        />
      )}
    </div>
  );
}
