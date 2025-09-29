"use client";

import React, { useState, useMemo, useEffect } from "react";
import { PageHeader } from "@/components/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAppState } from "@/contexts/app-provider";
import { useMonthlyAttendance } from "@/hooks/use-attendance";
import { es } from "date-fns/locale";
import { format } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserSearch, FileDown, Briefcase, User as UserIcon, Loader2 } from "lucide-react";

const MONTHS = Array.from({ length: 12 }, (_, i) => ({
  value: i + 1,
  label: format(new Date(0, i), "MMMM", { locale: es }),
}));
const YEARS = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

export default function MonthlyReportPage() {
  const { users } = useAppState();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  // State for manual inputs
  const [sueldoBase, setSueldoBase] = useState(0);
  const [movilizacion, setMovilizacion] = useState(0);
  const [colacion, setColacion] = useState(0);
  const [otrosHaberes, setOtrosHaberes] = useState(0);
  const [afpPorcentaje, setAfpPorcentaje] = useState(10.0);
  const [saludPorcentaje, setSaludPorcentaje] = useState(7.0);
  const [prestamos, setPrestamos] = useState(0);
  const [otrosDescuentos, setOtrosDescuentos] = useState(0);

  const selectedUser = useMemo(
    () => users.find((u) => u.id === selectedUserId),
    [users, selectedUserId]
  );

  const { report, loading } = useMonthlyAttendance(
    selectedUserId,
    selectedYear,
    selectedMonth
  );

  // Reset manual inputs when user or period changes
  useEffect(() => {
    setSueldoBase(0);
    setMovilizacion(0);
    setColacion(0);
    setOtrosHaberes(0);
    setAfpPorcentaje(10.0);
    setSaludPorcentaje(7.0);
    setPrestamos(0);
    setOtrosDescuentos(0);
  }, [selectedUserId, selectedMonth, selectedYear]);

  const calculations = useMemo(() => {
    const totalImponible = sueldoBase + otrosHaberes;
    const totalNoImponible = movilizacion + colacion;
    const totalHaberes = totalImponible + totalNoImponible;

    const descuentoAfp = (totalImponible * afpPorcentaje) / 100;
    const descuentoSalud = (totalImponible * saludPorcentaje) / 100;
    const totalDescuentosLegales = descuentoAfp + descuentoSalud;
    const totalOtrosDescuentos = prestamos + otrosDescuentos;
    const totalDescuentos = totalDescuentosLegales + totalOtrosDescuentos;

    const sueldoLiquido = totalHaberes - totalDescuentos;

    return {
      totalImponible,
      totalNoImponible,
      totalHaberes,
      descuentoAfp,
      descuentoSalud,
      totalDescuentosLegales,
      totalOtrosDescuentos,
      totalDescuentos,
      sueldoLiquido,
    };
  }, [
    sueldoBase,
    otrosHaberes,
    movilizacion,
    colacion,
    afpPorcentaje,
    saludPorcentaje,
    prestamos,
    otrosDescuentos,
  ]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" }).format(value);
  };
  
  const generatePDF = () => {
    if (!selectedUser || !report) return;
    const doc = new jsPDF();

    autoTable(doc, {
      body: [[{content: 'LIQUIDACIÓN DE SUELDO', styles: { halign: 'center', fontSize: 16, fontStyle: 'bold' }}]],
      theme: 'plain'
    });

    autoTable(doc, {
      body: [
        ["Razón Social:", "Constructora Ferro Activa y CIA. Ltda.", "Nombre Trabajador:", selectedUser.name],
        ["RUT:", "76.040.151-K", "RUT Trabajador:", selectedUser.id],
        ["Dirección:", "Tucapel 578, Los Ángeles", "Cargo:", selectedUser.role],
        ["Período:", `${format(report.period.start, "MMMM yyyy", { locale: es })}`, "", ""],
      ],
      theme: "plain",
      styles: { fontSize: 9 },
    });

    const body = [
        // Haberes
        [{ content: 'HABERES', colSpan: 2, styles: { fontStyle: 'bold', fillColor: [230,230,230] }}],
        ['Sueldo Base', formatCurrency(sueldoBase)],
        ['Otros Haberes Imponibles', formatCurrency(otrosHaberes)],
        [{ content: 'Total Imponible', styles: { fontStyle: 'bold' }}, { content: formatCurrency(calculations.totalImponible), styles: { fontStyle: 'bold' }}],
        ['Asignación Movilización', formatCurrency(movilizacion)],
        ['Asignación Colación', formatCurrency(colacion)],
        [{ content: 'Total No Imponible', styles: { fontStyle: 'bold' }}, { content: formatCurrency(calculations.totalNoImponible), styles: { fontStyle: 'bold' }}],
        [{ content: 'TOTAL HABERES', styles: { fontStyle: 'bold', fillColor: [230,230,230] }}, { content: formatCurrency(calculations.totalHaberes), styles: { fontStyle: 'bold', fillColor: [230,230,230] }}],
        // Descuentos
        [{ content: 'DESCUENTOS', colSpan: 2, styles: { fontStyle: 'bold', fillColor: [230,230,200] }}],
        [`Cotización AFP (${afpPorcentaje.toFixed(1)}%)`, formatCurrency(calculations.descuentoAfp)],
        [`Cotización Salud (${saludPorcentaje.toFixed(1)}%)`, formatCurrency(calculations.descuentoSalud)],
        [{ content: 'Total Descuentos Legales', styles: { fontStyle: 'bold' }}, { content: formatCurrency(calculations.totalDescuentosLegales), styles: { fontStyle: 'bold' }}],
        ['Préstamos', formatCurrency(prestamos)],
        ['Otros Descuentos', formatCurrency(otrosDescuentos)],
        [{ content: 'Total Otros Descuentos', styles: { fontStyle: 'bold' }}, { content: formatCurrency(calculations.totalOtrosDescuentos), styles: { fontStyle: 'bold' }}],
        [{ content: 'TOTAL DESCUENTOS', styles: { fontStyle: 'bold', fillColor: [230,230,200] }}, { content: formatCurrency(calculations.totalDescuentos), styles: { fontStyle: 'bold', fillColor: [230,230,200] }}],
        // Líquido
        [{ content: 'LÍQUIDO A PAGAR', styles: { fontStyle: 'bold', fontSize: 12, fillColor: [200,220,200] }}, { content: formatCurrency(calculations.sueldoLiquido), styles: { fontStyle: 'bold', fontSize: 12, fillColor: [200,220,200] }}],
    ];

     autoTable(doc, {
      body: body,
      theme: 'grid',
      styles: { fontSize: 9 },
    });

    const finalY = (doc as any).lastAutoTable.finalY;
    doc.setFontSize(8);
    doc.text('_________________________', doc.internal.pageSize.getWidth() / 2, finalY + 20, { align: 'center'});
    doc.text('Firma del Trabajador', doc.internal.pageSize.getWidth() / 2, finalY + 25, { align: 'center'});
    
    doc.save(`Liquidacion_${selectedUser.name.replace(' ', '_')}_${selectedMonth}_${selectedYear}.pdf`);
  };


  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Calculadora de Liquidación de Sueldo"
        description="Genera un resumen mensual de asistencia y calcula la liquidación de sueldo."
      />

      <Card>
        <CardHeader>
          <CardTitle>Selección de Reporte</CardTitle>
          <CardDescription>
            Elige un trabajador y el período para generar el informe.
          </CardDescription>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
            <Select
              value={selectedUserId || ""}
              onValueChange={setSelectedUserId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un trabajador..." />
              </SelectTrigger>
              <SelectContent>
                {users
                  .filter((u) => u.role !== "guardia")
                  .map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>

            <Select
              value={String(selectedMonth)}
              onValueChange={(val) => setSelectedMonth(Number(val))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un mes..." />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((m) => (
                  <SelectItem key={m.value} value={String(m.value)}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={String(selectedYear)}
              onValueChange={(val) => setSelectedYear(Number(val))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un año..." />
              </SelectTrigger>
              <SelectContent>
                {YEARS.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
      </Card>

      {!selectedUserId ? (
        <Card>
          <CardContent className="p-12">
            <div className="flex flex-col items-center justify-center text-center text-muted-foreground">
              <UserSearch className="h-16 w-16 mb-4" />
              <h3 className="text-xl font-semibold">Selecciona un Trabajador</h3>
              <p className="mt-2">
                Elige a un trabajador para ver su reporte y calcular su liquidación.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : loading ? (
         <Card>
          <CardContent className="p-12">
            <div className="flex flex-col items-center justify-center text-center text-muted-foreground">
              <Loader2 className="h-12 w-12 animate-spin mb-4" />
              <p className="text-xl font-semibold">Cargando reporte...</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        report && selectedUser && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                <div className="lg:col-span-1 space-y-8">
                     <Card>
                        <CardHeader>
                            <CardTitle>Resumen de Asistencia</CardTitle>
                             <CardDescription>Período: {format(report.period.start, "MMMM yyyy", { locale: es })}</CardDescription>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 gap-4 text-center">
                             <div className="p-2 bg-muted rounded-lg">
                                <p className="text-xs text-muted-foreground">Días Hábiles</p>
                                <p className="text-xl font-bold">{report.summary.totalBusinessDays}</p>
                             </div>
                             <div className="p-2 bg-muted rounded-lg">
                                <p className="text-xs text-muted-foreground">Días Trabajados</p>
                                <p className="text-xl font-bold">{report.summary.workedDays}</p>
                             </div>
                             <div className="p-2 bg-muted rounded-lg">
                                <p className="text-xs text-muted-foreground">Ausencias</p>
                                <p className="text-xl font-bold text-red-500">{report.summary.absentDays}</p>
                             </div>
                             <div className="p-2 bg-muted rounded-lg">
                                <p className="text-xs text-muted-foreground">Atrasos (min)</p>
                                <p className="text-xl font-bold text-amber-500">{report.summary.totalDelayMinutes}</p>
                             </div>
                             <div className="p-2 bg-muted rounded-lg col-span-2">
                                <p className="text-xs text-muted-foreground">Horas Extras</p>
                                <p className="text-xl font-bold text-green-500">{report.summary.totalOvertimeHours}</p>
                             </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Datos para Cálculo</CardTitle>
                            <CardDescription>Ingresa los valores para la liquidación.</CardDescription>
                        </CardHeader>
                         <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="sueldoBase">Sueldo Base</Label>
                                <Input id="sueldoBase" type="number" value={sueldoBase} onChange={e => setSueldoBase(Number(e.target.value))} />
                            </div>
                             <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="movilizacion">Movilización</Label>
                                    <Input id="movilizacion" type="number" value={movilizacion} onChange={e => setMovilizacion(Number(e.target.value))} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="colacion">Colación</Label>
                                    <Input id="colacion" type="number" value={colacion} onChange={e => setColacion(Number(e.target.value))} />
                                </div>
                             </div>
                            <div className="space-y-2">
                                <Label htmlFor="otrosHaberes">Otros Haberes Imponibles (Bonos, etc.)</Label>
                                <Input id="otrosHaberes" type="number" value={otrosHaberes} onChange={e => setOtrosHaberes(Number(e.target.value))} />
                            </div>
                            <hr className="my-4"/>
                             <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="afp">AFP (%)</Label>
                                    <Input id="afp" type="number" step="0.1" value={afpPorcentaje} onChange={e => setAfpPorcentaje(Number(e.target.value))} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="salud">Salud (%)</Label>
                                    <Input id="salud" type="number" step="0.1" value={saludPorcentaje} onChange={e => setSaludPorcentaje(Number(e.target.value))} />
                                </div>
                             </div>
                             <div className="space-y-2">
                                <Label htmlFor="prestamos">Préstamos y Otros Descuentos</Label>
                                <Input id="prestamos" type="number" value={prestamos} onChange={e => setPrestamos(Number(e.target.value))} />
                            </div>
                         </CardContent>
                    </Card>
                </div>

                <Card className="lg:col-span-2">
                    <CardHeader className="flex flex-row justify-between items-start">
                        <div>
                            <CardTitle>
                                Liquidación de Sueldo para {selectedUser.name}
                            </CardTitle>
                            <CardDescription>
                                Período: {format(report.period.start, "MMMM yyyy", { locale: es })}
                            </CardDescription>
                        </div>
                        <Button onClick={generatePDF}>
                            <FileDown className="mr-2 h-4 w-4" />
                            Descargar PDF
                        </Button>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm">
                            {/* Haberes */}
                            <div className="space-y-2">
                                <h3 className="font-bold text-lg border-b pb-2 mb-2">HABERES</h3>
                                <div className="flex justify-between"><span>Sueldo Base:</span> <span>{formatCurrency(sueldoBase)}</span></div>
                                <div className="flex justify-between"><span>Otros Haberes Imponibles:</span> <span>{formatCurrency(otrosHaberes)}</span></div>
                                <div className="flex justify-between font-semibold border-t pt-1 mt-1"><span>Total Imponible:</span> <span>{formatCurrency(calculations.totalImponible)}</span></div>
                                <div className="flex justify-between pt-2"><span>Movilización:</span> <span>{formatCurrency(movilizacion)}</span></div>
                                <div className="flex justify-between"><span>Colación:</span> <span>{formatCurrency(colacion)}</span></div>
                                <div className="flex justify-between font-semibold border-t pt-1 mt-1"><span>Total No Imponible:</span> <span>{formatCurrency(calculations.totalNoImponible)}</span></div>
                                <div className="flex justify-between font-bold text-lg bg-muted p-2 rounded-md mt-4"><span>TOTAL HABERES:</span> <span>{formatCurrency(calculations.totalHaberes)}</span></div>
                            </div>

                            {/* Descuentos */}
                             <div className="space-y-2">
                                <h3 className="font-bold text-lg border-b pb-2 mb-2">DESCUENTOS</h3>
                                <div className="flex justify-between"><span>Cotización AFP ({afpPorcentaje.toFixed(1)}%):</span> <span>{formatCurrency(calculations.descuentoAfp)}</span></div>
                                <div className="flex justify-between"><span>Cotización Salud ({saludPorcentaje.toFixed(1)}%):</span> <span>{formatCurrency(calculations.descuentoSalud)}</span></div>
                                <div className="flex justify-between font-semibold border-t pt-1 mt-1"><span>Total Descuentos Legales:</span> <span>{formatCurrency(calculations.totalDescuentosLegales)}</span></div>
                                <div className="flex justify-between pt-2"><span>Préstamos:</span> <span>{formatCurrency(prestamos)}</span></div>
                                <div className="flex justify-between"><span>Otros Descuentos:</span> <span>{formatCurrency(otrosDescuentos)}</span></div>
                                 <div className="flex justify-between font-semibold border-t pt-1 mt-1"><span>Total Otros Descuentos:</span> <span>{formatCurrency(calculations.totalOtrosDescuentos)}</span></div>
                                <div className="flex justify-between font-bold text-lg bg-muted p-2 rounded-md mt-4"><span>TOTAL DESCUENTOS:</span> <span className="text-destructive">{formatCurrency(calculations.totalDescuentos)}</span></div>
                            </div>
                        </div>
                        <div className="pt-6 text-center">
                            <h3 className="text-muted-foreground font-semibold">SUELDO LÍQUIDO A PAGAR</h3>
                            <p className="text-4xl font-bold text-primary tracking-tight">{formatCurrency(calculations.sueldoLiquido)}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
      )}
    </div>
  );
}
