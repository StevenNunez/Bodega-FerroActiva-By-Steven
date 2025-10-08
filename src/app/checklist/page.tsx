
"use client";

import React, { useState, useCallback, memo, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Save, FileDown, XCircle, CalendarIcon } from "lucide-react";
import { Timestamp } from "firebase/firestore";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

// Helper to load logo
async function getBase64FromUrl(url: string): Promise<string> {
  const response = await fetch(url);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}


// Tipos
interface User {
  id: string;
  name: string;
}

interface ChecklistItem {
  element: string;
  yes: boolean;
  no: boolean;
  na: boolean;
  responsible: string;
  date: Date | null;
}

interface SignatureData {
  name: string;
  role: string;
  signature: string;
  date: Date | null;
}

interface ChecklistFormData {
  work: string;
  date: Date | null;
  items: ChecklistItem[];
  observations: string;
  performedBy: SignatureData;
  reviewedBy: SignatureData;
}

// Componente dinámico para SignaturePad
const SignaturePad = dynamic(() => import("@/components/signature-pad"), {
  ssr: false,
  loading: () => <Skeleton className="h-[100px] w-full" />,
});

// Elementos del checklist
const CHECKLIST_ITEMS = [
  "¿Se implementa código de color en equipos eléctricos?",
  "¿Se implementa código de color en equipos elevadores?",
  "¿Se implementa código de color en equipos control de incendios?",
  "¿Se implementa código de color en sistema de alarma?",
  "¿Se implementa código de color en herramientas manuales?",
  "¿Se implementa código de color en elementos auxiliares para el manejo de materiales?",
  "¿Existe bandera u otro medio de publicación en bodega y lugares visibles?",
  "¿Se retira el color del o los meses anteriores para no producir confusión en la revisión?",
  "¿El color de revisión se implementa de acuerdo al calendario preestablecido?",
  "¿Conocen los trabajadores el significado del procedimiento de mantención del código de color?",
  "Otros",
];

// Componente para el skeleton loader
const ChecklistSkeleton = memo(() => (
  <div className="space-y-4">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
    </div>
    <Skeleton className="h-[400px] w-full" />
    <Skeleton className="h-20 w-full" />
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
    <div className="flex justify-end gap-4">
      <Skeleton className="h-10 w-32" />
      <Skeleton className="h-10 w-32" />
    </div>
  </div>
));

// Componente para la fila del checklist
const ChecklistRow = memo(
  ({
    item,
    index,
    updateItem,
    users,
  }: {
    item: ChecklistItem;
    index: number;
    updateItem: (index: number, field: keyof ChecklistItem, value: any) => void;
    users: User[];
  }) => {
    const [datePopoverOpen, setDatePopoverOpen] = useState(false);
    
    return (
      <TableRow className="hover:bg-muted/50 transition-colors">
        <TableCell className="font-medium">{item.element}</TableCell>
        <TableCell>
          <Checkbox
            checked={item.yes}
            onCheckedChange={(checked) => updateItem(index, "yes", checked)}
            aria-label={`Marcar Sí para ${item.element}`}
          />
        </TableCell>
        <TableCell>
          <Checkbox
            checked={item.no}
            onCheckedChange={(checked) => updateItem(index, "no", checked)}
            aria-label={`Marcar No para ${item.element}`}
          />
        </TableCell>
        <TableCell>
          <Checkbox
            checked={item.na}
            onCheckedChange={(checked) => updateItem(index, "na", checked)}
            aria-label={`Marcar N/A para ${item.element}`}
          />
        </TableCell>
        <TableCell>
          <Select
            value={item.responsible}
            onValueChange={(value) => {
              if (value !== 'manual') {
                updateItem(index, "responsible", value)
              }
            }}
          >
            <SelectTrigger aria-label={`Seleccionar responsable para ${item.element}`}>
              <SelectValue placeholder="Seleccionar responsable" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="manual">Escribir manualmente</SelectItem>
              {users.map((user) => (
                <SelectItem key={user.id} value={user.name}>
                  {user.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            value={item.responsible}
            onChange={(e) => updateItem(index, "responsible", e.target.value)}
            placeholder="Responsable"
            className="mt-2"
            aria-label={`Responsable para ${item.element}`}
          />
        </TableCell>
        <TableCell>
          <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !item.date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {item.date ? format(item.date, "PPP", { locale: es }) : <span>Selecciona fecha</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={item.date || undefined}
                onSelect={(date) => {
                  updateItem(index, "date", date || null);
                  setDatePopoverOpen(false);
                }}
                initialFocus
                locale={es}
              />
            </PopoverContent>
          </Popover>
        </TableCell>
      </TableRow>
    )
  }
);

// Componente para la firma digital
const SignatureField = memo(
  ({
    label,
    signatureData,
    updateSignatureData,
    person,
  }: {
    label: string;
    signatureData: SignatureData;
    updateSignatureData: (person: "performedBy" | "reviewedBy", field: keyof SignatureData, value: any) => void;
    person: "performedBy" | "reviewedBy";
  }) => {
    const sigCanvas = useRef<any>(null);

    const clearSignature = useCallback(() => {
      sigCanvas.current?.clear();
      updateSignatureData(person, "signature", "");
    }, [updateSignatureData, person]);

    const saveSignature = useCallback(() => {
      if (sigCanvas.current) {
        const dataUrl = sigCanvas.current.getTrimmedCanvas().toDataURL("image/png");
        updateSignatureData(person, "signature", dataUrl);
      }
    }, [updateSignatureData, person]);

    return (
      <div className="space-y-2">
        <label className="text-sm font-medium">{label}</label>
        <div className="border rounded-md p-2 bg-white aspect-video w-full">
          <SignaturePad
            ref={sigCanvas}
            penColor="black"
            onEnd={saveSignature}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={clearSignature}
          aria-label={`Limpiar firma de ${label}`}
        >
          <XCircle className="mr-2 h-4 w-4" />
          Limpiar Firma
        </Button>
      </div>
    );
  }
);

const DatePickerField = memo(({ label, date, setDate }: { label: string, date: Date | null, setDate: (date: Date | null) => void }) => {
    const [popoverOpen, setPopoverOpen] = useState(false);
    return (
        <div>
            <Label>{label}</Label>
            <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant={"outline"}
                        className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date ? format(date, "PPP", { locale: es }) : <span>Selecciona fecha</span>}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                    <Calendar
                        mode="single"
                        selected={date || undefined}
                        onSelect={(d) => { setDate(d || null); setPopoverOpen(false); }}
                        initialFocus
                        locale={es}
                    />
                </PopoverContent>
            </Popover>
        </div>
    );
});


// Componente principal
export default function ColorCodeChecklistPage() {
  const { users, isLoading: isAppLoading, addChecklist } = useAppState();
  const { toast } = useToast();

  const getInitialFormData = (): ChecklistFormData => ({
    work: "",
    date: new Date(),
    items: CHECKLIST_ITEMS.map((element) => ({
      element,
      yes: false,
      no: false,
      na: false,
      responsible: "",
      date: null,
    })),
    observations: "",
    performedBy: { name: "", role: "", signature: "", date: null },
    reviewedBy: { name: "", role: "", signature: "", date: null },
  });

  const [formData, setFormData] = useState<ChecklistFormData>(getInitialFormData());
  const [isLoading, setIsLoading] = useState(false);

  // Handler para actualizar los elementos del checklist
  const updateItem = useCallback(
    (index: number, field: keyof ChecklistItem, value: any) => {
      setFormData((prev) => {
        const newItems = [...prev.items];
        const updatedItem = { ...newItems[index], [field]: value };
        // Asegurar exclusividad entre Sí/No/N.A
        if (field === "yes" && value) {
          updatedItem.no = false;
          updatedItem.na = false;
        } else if (field === "no" && value) {
          updatedItem.yes = false;
          updatedItem.na = false;
        } else if (field === "na" && value) {
          updatedItem.yes = false;
          updatedItem.no = false;
        }
        newItems[index] = updatedItem;
        return { ...prev, items: newItems };
      });
    },
    []
  );

  // Validar formulario
  const validateForm = useCallback(() => {
    if (!formData.work) return "El campo Obra es obligatorio.";
    if (!formData.date) return "El campo Fecha es obligatorio.";
    if (!formData.performedBy.name) return "El nombre de quien realizó es obligatorio.";
    if (!formData.reviewedBy.name) return "El nombre de quien revisó es obligatorio.";
    const invalidItems = formData.items.filter(
      (item) => !item.yes && !item.no && !item.na
    );
    if (invalidItems.length > 0) {
      return "Todos los elementos deben tener una opción marcada (Sí/No/N.A).";
    }
    return null;
  }, [formData]);

  // Handler para guardar el formulario
  const handleSubmit = useCallback(async () => {
    const validationError = validateForm();
    if (validationError) {
      toast({
        variant: "destructive",
        title: "Error",
        description: validationError,
      });
      return;
    }
    setIsLoading(true);
    try {
      const dataToSave = {
        ...formData,
        date: formData.date ? Timestamp.fromDate(formData.date) : null,
        items: formData.items.map(item => ({
            ...item,
            date: item.date ? format(item.date, "yyyy-MM-dd") : "",
        })),
        performedBy: {
          ...formData.performedBy,
          date: formData.performedBy.date ? Timestamp.fromDate(formData.performedBy.date) : null,
        },
        reviewedBy: {
          ...formData.reviewedBy,
          date: formData.reviewedBy.date ? Timestamp.fromDate(formData.reviewedBy.date) : null,
        },
      };
      await addChecklist(dataToSave as any); // Cast because of date string conversion
      toast({ title: "Checklist guardado", description: "El checklist se guardó correctamente." });
      setFormData(getInitialFormData());
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: e?.message || "Error al guardar el checklist",
      });
    } finally {
      setIsLoading(false);
    }
  }, [formData, addChecklist, toast, validateForm]);

  // Handler para exportar a PDF
  const handleExportPDF = useCallback(async () => {
    const validationError = validateForm();
    if (validationError) {
      toast({ variant: "destructive", title: "Error", description: validationError });
      return;
    }
    setIsLoading(true);

    try {
      const doc = new jsPDF();
      const margin = 15;
      const pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
      const pageWidth = doc.internal.pageSize.width || doc.internal.pageSize.getWidth();
      
      const logoUrl = '/logopdf.jpg';
      const logoBase64 = await getBase64FromUrl(logoUrl);

      // --- Header Content ---
      let y = margin;
      
      doc.addImage(logoBase64, 'JPEG', margin, y, 20, 20);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('SISTEMA DE GESTIÓN DE SEGURIDAD Y SALUD EN EL TRABAJO', pageWidth / 2, y + 5, { align: 'center' });
      
      doc.setFontSize(11);
      doc.text('CHECK LIST CÓDIGO DE COLOR', pageWidth / 2, y + 15, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text('Código: FA-OA-000', pageWidth - margin, y + 5, { align: 'right' });
      doc.text('Revisión: 01', pageWidth - margin, y + 15, { align: 'right' });

      y += 25; // Start below header

      // Obra y Fecha
      doc.setFontSize(12);
      doc.text(`Obra: ${formData.work}`, margin, y);
      doc.text(`Fecha: ${formData.date ? formData.date.toLocaleDateString("es-CL") : "N/A"}`, pageWidth - margin, y, { align: 'right' });
      y += 10;

      (doc as any).autoTable({
        startY: y,
        head: [["Elemento", "Sí", "No", "N/A", "Responsable", "Fecha"]],
        body: formData.items.map((item) => [
          item.element,
          item.yes ? "X" : "",
          item.no ? "X" : "",
          item.na ? "X" : "",
          item.responsible,
          item.date ? format(item.date, "dd/MM/yyyy", { locale: es }) : "",
        ]),
        theme: "grid",
        headStyles: { fillColor: [0, 102, 204] },
      });

      let finalY = (doc as any).lastAutoTable.finalY + 10;
      doc.text("Observaciones:", margin, finalY);
      finalY += 7;
      doc.text(formData.observations || "N/A", margin, finalY, { maxWidth: pageWidth - margin * 2 });

      finalY = Math.max(finalY + 15, 230); // Ensure signatures are at the bottom
      const addSignatureSection = (person: "performedBy" | "reviewedBy", title: string, xPos: number, yPos: number) => {
        doc.text(title, xPos, yPos);
        doc.text(`Nombre: ${formData[person].name}`, xPos, yPos + 7);
        doc.text(`Cargo: ${formData[person].role || "N/A"}`, xPos, yPos + 14);
        if (formData[person].signature) {
          doc.addImage(formData[person].signature, "PNG", xPos, yPos + 18, 60, 30);
        }
        doc.text(
          `Fecha: ${formData[person].date ? formData[person].date.toLocaleDateString("es-CL") : "N/A"}`,
          xPos,
          yPos + 52
        );
      };
      
      addSignatureSection("performedBy", "Realizó", margin, finalY);
      addSignatureSection("reviewedBy", "Revisó", pageWidth / 2 + margin, finalY);
      
      // Footer
      const developedByText = 'desarrollado por ';
      const linkText = 'teolabs.app';
      const fullText = developedByText + linkText;
      const textWidth = doc.getTextWidth(fullText);
      const textX = (pageWidth - textWidth) / 2;
      doc.setFontSize(8);
      doc.text(developedByText, textX, pageHeight - 10);
      doc.link(textX + doc.getTextWidth(developedByText), pageHeight - 10, doc.getTextWidth(linkText), 5, { url: 'https://teolabs.app' });


      doc.save(`checklist-codigo-color-${formData.work || "sin-nombre"}.pdf`);
      toast({ title: "PDF exportado", description: "El checklist se exportó correctamente." });
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: e?.message || "Error al exportar el PDF",
      });
    } finally {
      setIsLoading(false);
    }
  }, [formData, toast, validateForm]);
  
  const updatePersonField = (person: 'performedBy' | 'reviewedBy', field: keyof SignatureData, value: any) => {
    setFormData(prev => ({
        ...prev,
        [person]: {
            ...prev[person],
            [field]: value,
        }
    }));
  };

  if (isAppLoading) {
    return (
      <div className="flex flex-col gap-8 p-6 bg-background min-h-screen">
        <PageHeader
          title="Checklist Código de Color"
          description="Registra la inspección de los elementos relacionados con el código de color."
        />
        <Card className="transition-all duration-300">
          <CardHeader>
            <CardTitle>Formulario de Inspección</CardTitle>
            <CardDescription>
              Completa el checklist para verificar el cumplimiento del código de color.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChecklistSkeleton />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 p-6 bg-background min-h-screen">
      <PageHeader
        title="Checklist Código de Color"
        description="Registra la inspección de los elementos relacionados con el código de color."
      />
      <Card className="transition-all duration-300">
        <CardHeader>
          <CardTitle>Formulario de Inspección</CardTitle>
          <CardDescription>
            Completa el checklist para verificar el cumplimiento del código de color.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="work" className="text-sm font-medium">
                Obra
              </label>
              <Input
                id="work"
                value={formData.work}
                onChange={(e) => setFormData({ ...formData, work: e.target.value })}
                placeholder="Nombre de la obra"
                aria-label="Nombre de la obra"
                required
              />
            </div>
            <div>
              <Label>Fecha del Checklist</Label>
               <Popover>
                <PopoverTrigger asChild>
                    <Button
                        variant={"outline"}
                        className={cn("w-full justify-start text-left font-normal", !formData.date && "text-muted-foreground")}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.date ? format(formData.date, "PPP", { locale: es }) : <span>Selecciona fecha</span>}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                    <Calendar
                        mode="single"
                        selected={formData.date || undefined}
                        onSelect={(date) => setFormData(prev => ({...prev, date: date || null}))}
                        initialFocus
                        locale={es}
                    />
                </PopoverContent>
            </Popover>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow>
                  <TableHead className="min-w-[300px]">Elemento</TableHead>
                  <TableHead>Sí</TableHead>
                  <TableHead>No</TableHead>
                  <TableHead>N/A</TableHead>
                  <TableHead className="min-w-[200px]">Responsable</TableHead>
                  <TableHead className="min-w-[150px]">Fecha</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {formData.items.map((item, index) => (
                  <ChecklistRow
                    key={item.element}
                    item={item}
                    index={index}
                    updateItem={updateItem}
                    users={users}
                  />
                ))}
              </TableBody>
            </Table>
          </div>

          <div>
            <label htmlFor="observations" className="text-sm font-medium">
              Observaciones
            </label>
            <Textarea
              id="observations"
              value={formData.observations}
              onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
              placeholder="Escribe cualquier observación adicional..."
              rows={4}
              aria-label="Observaciones del checklist"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-semibold mb-2">Realizó</h3>
              <div className="space-y-4">
                <Select
                  value={formData.performedBy.name}
                  onValueChange={(value) => {
                    if (value !== 'manual') {
                      updatePersonField('performedBy', 'name', value);
                    }
                  }}
                >
                  <SelectTrigger aria-label="Seleccionar nombre de quien realizó">
                    <SelectValue placeholder="Seleccionar nombre" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Escribir manualmente</SelectItem>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.name}>
                        {user.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Nombre"
                  value={formData.performedBy.name}
                  onChange={(e) => updatePersonField('performedBy', 'name', e.target.value)}
                  aria-label="Nombre de quien realizó el checklist"
                  required
                />
                <Input
                  placeholder="Cargo"
                  value={formData.performedBy.role}
                  onChange={(e) => updatePersonField('performedBy', 'role', e.target.value)}
                  aria-label="Cargo de quien realizó el checklist"
                />
                 <SignatureField
                  label="Firma"
                  signatureData={formData.performedBy}
                  updateSignatureData={updatePersonField}
                  person="performedBy"
                />
                 <DatePickerField 
                    label="Fecha de Realización"
                    date={formData.performedBy.date}
                    setDate={(date) => updatePersonField('performedBy', 'date', date)}
                />
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">Revisó</h3>
              <div className="space-y-4">
                <Select
                  value={formData.reviewedBy.name}
                  onValueChange={(value) => {
                     if (value !== 'manual') {
                       updatePersonField('reviewedBy', 'name', value);
                      }
                  }}
                >
                  <SelectTrigger aria-label="Seleccionar nombre de quien revisó">
                    <SelectValue placeholder="Seleccionar nombre" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Escribir manualmente</SelectItem>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.name}>
                        {user.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Nombre"
                  value={formData.reviewedBy.name}
                  onChange={(e) => updatePersonField('reviewedBy', 'name', e.target.value)}
                  aria-label="Nombre de quien revisó el checklist"
                  required
                />
                <Input
                  placeholder="Cargo"
                  value={formData.reviewedBy.role}
                  onChange={(e) => updatePersonField('reviewedBy', 'role', e.target.value)}
                  aria-label="Cargo de quien revisó el checklist"
                />
                 <SignatureField
                  label="Firma"
                  signatureData={formData.reviewedBy}
                  updateSignatureData={updatePersonField}
                  person="reviewedBy"
                />
                <DatePickerField 
                    label="Fecha de Revisión"
                    date={formData.reviewedBy.date}
                    setDate={(date) => updatePersonField('reviewedBy', 'date', date)}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-4">
            <Button
              onClick={handleExportPDF}
              variant="outline"
              disabled={isLoading}
              aria-label="Exportar checklist a PDF"
            >
              <FileDown className="mr-2 h-4 w-4" />
              Exportar a PDF
            </Button>
            <Button onClick={handleSubmit} disabled={isLoading} aria-label="Guardar checklist">
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Guardar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
