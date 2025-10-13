"use client";

import React, { useState, useMemo } from "react";
import { useAppState } from "@/contexts/app-provider";
import { useToast } from "@/hooks/use-toast";
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
import { Calendar } from "@/components/ui/calendar";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Loader2,
  DollarSign,
  CalendarIcon,
  CheckCircle,
  AlertTriangle,
  XCircle,
  FilePlus,
  Filter,
} from "lucide-react";
import { Timestamp } from "firebase/firestore";
import { format, differenceInDays, startOfDay } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { SupplierPayment, Supplier } from "@/lib/data";

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
  const [purchaseOrderNumber, setPurchaseOrderNumber] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceNumber || !supplierId || !amount || !dueDate) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Por favor, completa todos los campos.",
      });
      return;
    }
    setIsSubmitting(true);
    try {
      await addPayment({
        invoiceNumber,
        supplierId,
        amount,
        dueDate,
        purchaseOrderNumber,
      });
      setInvoiceNumber("");
      setSupplierId("");
      setAmount("");
      setDueDate(undefined);
      setPurchaseOrderNumber("");
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

      <div className="grid grid-cols-2 gap-4">
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
          <Label htmlFor="purchaseOrderNumber">Orden de Compra (Opcional)</Label>
          <Input
            id="purchaseOrderNumber"
            value={purchaseOrderNumber}
            onChange={(e) => setPurchaseOrderNumber(e.target.value)}
            placeholder="Ej: OC-001"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
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
const PaymentStatusBadge = ({ status }: { status: PaymentStatus }) => {
  switch (status) {
    case "pending":
      return (
        <Badge variant="secondary" className="bg-yellow-500 text-white">
          <AlertTriangle className="mr-1 h-3 w-3" /> Por Vencer
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
export default function SupplierPaymentsPage() {
  const {
    supplierPayments,
    suppliers,
    updateSupplierPaymentStatus,
    addSupplierPayment,
    loading,
  } = useAppState();

  const [filter, setFilter] = useState<"all" | "pending" | "paid" | "overdue">("all");
  const [confirmingPayment, setConfirmingPayment] = useState<SupplierPayment | null>(null);

  const processedPayments = useMemo(() => {
    const today = startOfDay(new Date());
    return (supplierPayments || [])
      .map((p) => {
        const dueDate =
          p.dueDate instanceof Timestamp ? p.dueDate.toDate() : new Date(p.dueDate);
        const daysRemaining = differenceInDays(dueDate, today);
        let currentStatus: PaymentStatus = p.status;

        if (p.status === "pending") {
          currentStatus = daysRemaining < 0 ? "overdue" : "pending";
        }

        return {
          ...p,
          dueDate,
          daysRemaining,
          calculatedStatus: currentStatus,
        };
      })
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  }, [supplierPayments]);

  const filteredPayments = useMemo(() => {
    if (filter === "all") return processedPayments;
    return processedPayments.filter((p) => p.calculatedStatus === filter);
  }, [processedPayments, filter]);

  const handleConfirmPayment = async () => {
    if (!confirmingPayment) return;
    await updateSupplierPaymentStatus(confirmingPayment.id, "paid");
    setConfirmingPayment(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const supplierMap = new Map(suppliers.map((s) => [s.id, s.name]));

  return (
    <>
      <PageHeader
        title="Pagos a Proveedores"
        description="Gestiona y registra el estado de pago de las facturas de los proveedores."
      />

      <div className="grid grid-cols-1 gap-8">
        {/* === Formulario === */}
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

        {/* === Listado de Facturas === */}
        <Card>
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              <span>Listado de Facturas</span>
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filtrar estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="pending">Por Vencer</SelectItem>
                    <SelectItem value="overdue">Vencidas</SelectItem>
                    <SelectItem value="paid">Pagadas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardTitle>
          </CardHeader>

          <CardContent className="p-0">
            {/* Scroll mejorado */}
            <div
              className="relative h-[calc(80vh-15rem)] w-full overflow-x-auto overflow-y-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent scroll-smooth rounded-b-lg border-t"
              role="region"
              aria-label="Listado de facturas con scroll horizontal y vertical"
            >
              <Table className="min-w-[900px] w-full border-collapse">
                <TableHeader className="sticky top-0 bg-card z-10">
                  <TableRow>
                    <TableHead>Proveedor</TableHead>
                    <TableHead>Factura / OC</TableHead>
                    <TableHead>Vencimiento</TableHead>
                    <TableHead>Monto</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acción</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {filteredPayments.length > 0 ? (
                    filteredPayments.map((p) => (
                      <TableRow
                        key={p.id}
                        className={cn(
                          p.calculatedStatus === "pending" &&
                            "bg-yellow-500/10 hover:bg-yellow-500/20",
                          p.calculatedStatus === "overdue" &&
                            "bg-red-500/10 hover:bg-red-500/20",
                          p.calculatedStatus === "paid" &&
                            "bg-green-500/5 text-muted-foreground"
                        )}
                      >
                        <TableCell className="font-medium">
                          {supplierMap.get(p.supplierId) || "Desconocido"}
                        </TableCell>
                        <TableCell>
                          <div>{p.invoiceNumber}</div>
                          {p.purchaseOrderNumber && (
                            <div className="text-xs text-muted-foreground">
                              OC: {p.purchaseOrderNumber}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>{format(p.dueDate, "dd-MM-yyyy")}</TableCell>
                        <TableCell>
                          {new Intl.NumberFormat("es-CL", {
                            style: "currency",
                            currency: "CLP",
                          }).format(p.amount)}
                        </TableCell>
                        <TableCell>
                          <PaymentStatusBadge status={p.calculatedStatus} />
                        </TableCell>
                        <TableCell className="text-right">
                          {p.status !== "paid" && (
                            <Button
                              size="sm"
                              onClick={() => setConfirmingPayment(p)}
                            >
                              Marcar como Pagada
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">
                        No hay facturas que coincidan con el filtro.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* === Confirmar pago === */}
      <AlertDialog
        open={!!confirmingPayment}
        onOpenChange={(open) => !open && setConfirmingPayment(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Pago</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que quieres marcar la factura{" "}
              <strong>{confirmingPayment?.invoiceNumber}</strong> del proveedor{" "}
              <strong>
                {supplierMap.get(confirmingPayment?.supplierId || "")}
              </strong>{" "}
              como pagada? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmPayment}>
              Sí, Marcar como Pagada
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
