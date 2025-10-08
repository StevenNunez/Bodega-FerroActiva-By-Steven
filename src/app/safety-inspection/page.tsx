
"use client";

import React, { useState, useCallback, memo, useRef } from "react";
import { useForm, Controller, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Save, FileDown, CalendarIcon, Upload, Trash2 } from "lucide-react";
import { Timestamp } from "firebase/firestore";
import { ref, uploadString, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

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

const FormSchema = z.object({
  work: z.string().min(1, "El campo Obra es obligatorio."),
  date: z.date({ required_error: "La fecha es obligatoria."}),
  location: z.string().optional(),
  inspectorName: z.string().min(1, "El nombre del inspector es obligatorio."),
  inspectorRole: z.string().optional(),
  description: z.string().min(1, "La descripción es obligatoria."),
  importance: z.enum(["low", "medium", "high"], { required_error: "Debe seleccionar un nivel de importancia." }),
  evidencePhotos: z.array(z.string()).min(1, "Debe subir al menos una foto de evidencia."),
  correctiveMeasures: z.string().optional(),
  responsible: z.string().optional(),
  complianceDate: z.date().optional().nullable(),
  finalPhoto: z.string().optional(),
  finalDescription: z.string().optional(),
  executorName: z.string().optional(),
  finalDate: z.date().optional().nullable(),
});

type SafetyInspectionFormData = z.infer<typeof FormSchema>;

const SafetyInspectionSkeleton = memo(() => (
  <div className="space-y-4">
    {/* ... (skeleton content remains the same) ... */}
  </div>
));

const PhotoPreview = memo(
  ({ photos, removePhoto, label }: { photos: string[]; removePhoto: (index: number) => void; label: string; }) => (
    <div className="space-y-2 mt-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {photos.map((photo, index) => (
          <div key={index} className="relative group">
            <img src={photo} alt={`${label} ${index + 1}`} className="h-24 w-full object-cover rounded-md border" />
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute top-1 right-1 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => removePhoto(index)}
              aria-label={`Eliminar ${label.toLowerCase()} ${index + 1}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
);

export default function SafetyInspectionPage() {
  const { users, isLoading: isAppLoading, addSafetyInspection } = useAppState();
  const { toast } = useToast();
  const evidencePhotoInputRef = useRef<HTMLInputElement>(null);
  const finalPhotoInputRef = useRef<HTMLInputElement>(null);
  
  const { register, handleSubmit, control, setValue, getValues, watch, reset, trigger, formState: { errors, isSubmitting } } = useForm<SafetyInspectionFormData>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      date: new Date(),
      evidencePhotos: [],
    }
  });

  const evidencePhotos = watch("evidencePhotos");
  const finalPhoto = watch("finalPhoto");

  const handlePhotoUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>, field: "evidencePhotos" | "finalPhoto") => {
      const files = e.target.files;
      if (!files) return;
      const maxSize = 5 * 1024 * 1024; // 5MB

      Array.from(files).forEach((file) => {
        if (file.size > maxSize) {
          toast({ variant: "destructive", title: "Error", description: `La imagen ${file.name} excede el tamaño máximo de 5MB.` });
          return;
        }
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            const result = event.target.result as string;
            if (field === "evidencePhotos") {
              setValue("evidencePhotos", [...(getValues("evidencePhotos") || []), result], { shouldValidate: true });
            } else {
              setValue("finalPhoto", result, { shouldValidate: true });
            }
          }
        };
        reader.readAsDataURL(file);
      });
       e.target.value = ""; // Reset file input
    },
    [toast, setValue, getValues]
  );

  const removePhoto = useCallback((index: number, field: "evidencePhotos" | "finalPhoto") => {
    if (field === "evidencePhotos") {
      setValue("evidencePhotos", getValues("evidencePhotos").filter((_, i) => i !== index), { shouldValidate: true });
    } else {
      setValue("finalPhoto", "", { shouldValidate: true });
    }
  }, [setValue, getValues]);

  const onSubmit: SubmitHandler<SafetyInspectionFormData> = async (data) => {
    try {
      const uploadPhoto = async (photo: string, path: string) => {
        const storageRef = ref(storage, path);
        await uploadString(storageRef, photo, "data_url");
        return getDownloadURL(storageRef);
      };

      const evidencePhotoUrls = await Promise.all(
        data.evidencePhotos.map((photo, index) =>
          uploadPhoto(photo, `inspections/${data.work}/evidence_${index}_${Date.now()}.png`)
        )
      );
      const finalPhotoUrl = data.finalPhoto ? await uploadPhoto(data.finalPhoto, `inspections/${data.work}/final_${Date.now()}.png`) : "";

      await addSafetyInspection({ ...data, evidencePhotos: evidencePhotoUrls, finalPhoto: finalPhotoUrl });

      toast({ title: "Inspección guardada", description: "La inspección se guardó correctamente." });
      reset({ date: new Date(), evidencePhotos: [] });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e?.message || "Error al guardar la inspección" });
    }
  };

 const handleExportPDF = async () => {
    const isValid = await trigger();
    if (!isValid) {
      toast({
        variant: "destructive",
        title: "Faltan datos",
        description: "Completa todos los campos obligatorios (marcados en rojo) antes de exportar.",
      });
      return;
    }

    const formData = getValues();
    const {
      work, date, location, inspectorName, inspectorRole, description,
      importance, evidencePhotos, correctiveMeasures, responsible,
      complianceDate, finalPhoto, finalDescription, executorName, finalDate
    } = formData;

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
      doc.text('SISTEMA DE GESTIÓN DE SEGURIDAD Y SALUD EN EL TRABAJO', pageWidth / 2, y + 5, { align: 'center'});
      
      doc.setFontSize(11);
      doc.text('INSPECCIÓN DE SEGURIDAD', pageWidth / 2, y + 15, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text('Código: FA-PR-002', pageWidth - margin, y + 5, { align: 'right' });
      doc.text('Versión: 02', pageWidth - margin, y + 10, { align: 'right' });
      doc.text('Fecha: 01-08-2025', pageWidth - margin, y + 15, { align: 'right' });

      y += 30; // Start below header

      doc.setFontSize(12);
      doc.text(`Obra: ${work}`, 20, y);
      doc.text(`Fecha: ${format(date, "dd/MM/yyyy", { locale: es })}`, pageWidth - 20, y, { align: 'right' });
      y += 7;

      doc.text(`Ubicación: ${location || "N/A"}`, 20, y);
      y += 10;
      
      doc.text(`Inspector: ${inspectorName}`, 20, y);
      y += 7;
      doc.text(`Cargo: ${inspectorRole || "N/A"}`, 20, y);
      y += 15;

      doc.setFont("helvetica", "bold");
      doc.text("Descripción de la Observación:", 20, y);
      y += 7;
      doc.setFont("helvetica", "normal");
      const descLines = doc.splitTextToSize(description, 170);
      doc.text(descLines, 20, y);
      y += descLines.length * 5 + 5;

      doc.text(`Nivel de Riesgo: ${importance.toUpperCase()}`, 20, y);
      y += 15;

      if (evidencePhotos.length > 0) {
        doc.setFont("helvetica", "bold");
        doc.text("Evidencia (Fotos):", 20, y);
        y += 10;
        evidencePhotos.forEach((photo) => {
           if (y + 45 > doc.internal.pageSize.height) { doc.addPage(); y = 20; }
           doc.addImage(photo, "PNG", 20, y, 60, 45);
           y += 50;
        });
      }

      if (correctiveMeasures || responsible || complianceDate) {
        if (y > 200) { doc.addPage(); y = 20; }
        doc.setFont("helvetica", "bold");
        doc.text("Plan de Acción:", 20, y);
        y += 10;
        doc.setFont("helvetica", "normal");
        const measuresLines = doc.splitTextToSize(correctiveMeasures || "N/A", 170);
        doc.text(measuresLines, 20, y);
        y += measuresLines.length * 5 + 5;
        doc.text(`Responsable: ${responsible || "N/A"}`, 20, y);
        y += 7;
        doc.text(`Fecha Cumplimiento: ${complianceDate ? format(complianceDate, "dd/MM/yyyy", { locale: es }) : "N/A"}`, 20, y);
        y += 15;
      }
      
      if (finalPhoto || finalDescription || executorName || finalDate) {
        if (y > 180) { doc.addPage(); y = 20; }
        doc.setFont("helvetica", "bold");
        doc.text("Cierre de la Observación:", 20, y);
        y += 10;
         if (finalPhoto) {
            doc.addImage(finalPhoto, "PNG", 20, y, 60, 45);
            y += 50;
        }
        doc.setFont("helvetica", "normal");
        const finalDescLines = doc.splitTextToSize(finalDescription || "N/A", 170);
        doc.text(finalDescLines, 20, y);
        y += finalDescLines.length * 5 + 5;
        doc.text(`Ejecutor: ${executorName || "N/A"}`, 20, y);
        y += 7;
        doc.text(`Fecha Cierre: ${finalDate ? format(finalDate, "dd/MM/yyyy", { locale: es }) : "N/A"}`, 20, y);
      }
      
      // Footer
      const developedByText = 'desarrollado por ';
      const linkText = 'teolabs.app';
      const fullText = developedByText + linkText;
      const textWidth = doc.getTextWidth(fullText);
      const textX = (pageWidth - textWidth) / 2;
      doc.setFontSize(8);
      doc.text(developedByText, textX, pageHeight - 10);
      doc.link(textX + doc.getTextWidth(developedByText), pageHeight - 10, doc.getTextWidth(linkText), 5, { url: 'https://teolabs.app' });


      doc.save(`inspeccion-seguridad-${work.replace(/ /g, '_')}.pdf`);
      toast({ title: "PDF exportado", description: "La inspección se exportó correctamente." });

    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Error de Exportación",
        description: e.message || "Hubo un problema al generar el PDF.",
      });
    }
  };
  

  if (isAppLoading) return <SafetyInspectionSkeleton />;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Inspección de Seguridad"
        description="Registra una nueva inspección de seguridad con evidencia y medidas correctivas."
      />
      <form onSubmit={handleSubmit(onSubmit)}>
        <Card>
            <CardHeader>
                <CardTitle>Formulario de Inspección</CardTitle>
                <CardDescription>Completa los detalles de la inspección y sube las fotos correspondientes.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="work" className={cn(errors.work && "text-destructive")}>Obra</Label>
                        <Input id="work" placeholder="Nombre de la obra" {...register("work")} className={cn(errors.work && "border-destructive")} />
                        {errors.work && <p className="text-xs text-destructive mt-1">{errors.work.message}</p>}
                    </div>
                    <div>
                        <Label htmlFor="date" className={cn(errors.date && "text-destructive")}>Fecha</Label>
                         <Controller
                            name="date"
                            control={control}
                            render={({ field }) => (
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground", errors.date && "border-destructive")}>
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {field.value ? format(field.value, "PPP", { locale: es }) : <span>Selecciona fecha</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent>
                                </Popover>
                            )}
                        />
                        {errors.date && <p className="text-xs text-destructive mt-1">{errors.date.message}</p>}
                    </div>
                </div>
                 {/* Descripción y Evidencia */}
                <div>
                    <Label htmlFor="description" className={cn(errors.description && "text-destructive")}>Descripción de la Observación</Label>
                    <Textarea id="description" placeholder="Describe la observación, condición o acto inseguro..." rows={4} {...register("description")} className={cn(errors.description && "border-destructive")} />
                    {errors.description && <p className="text-xs text-destructive mt-1">{errors.description.message}</p>}
                </div>
                 <div>
                    <Label htmlFor="evidencePhotos" className={cn("mb-2 block", errors.evidencePhotos && "text-destructive")}>Evidencia (Mínimo 1 foto)</Label>
                    <input
                      id="evidencePhotos"
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => handlePhotoUpload(e, "evidencePhotos")}
                      className="hidden"
                      ref={evidencePhotoInputRef}
                    />
                    <Button type="button" variant="outline" onClick={() => evidencePhotoInputRef.current?.click()}>
                        <Upload className="mr-2 h-4 w-4" />
                        Añadir Fotos...
                    </Button>
                    {evidencePhotos && evidencePhotos.length > 0 && (
                        <PhotoPreview photos={evidencePhotos} removePhoto={(index) => removePhoto(index, "evidencePhotos")} label="Evidencia" />
                    )}
                     {errors.evidencePhotos && <p className="text-xs text-destructive mt-1">{errors.evidencePhotos.message}</p>}
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="inspectorName" className={cn(errors.inspectorName && "text-destructive")}>Nombre Inspector</Label>
                        <Input id="inspectorName" placeholder="Nombre de la persona que inspecciona" {...register("inspectorName")} className={cn(errors.inspectorName && "border-destructive")} />
                        {errors.inspectorName && <p className="text-xs text-destructive mt-1">{errors.inspectorName.message}</p>}
                    </div>
                     <div>
                        <Label htmlFor="importance" className={cn(errors.importance && "text-destructive")}>Nivel de Riesgo</Label>
                        <Controller name="importance" control={control} render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value}>
                                <SelectTrigger className={cn(errors.importance && "border-destructive")}><SelectValue placeholder="Seleccionar Nivel" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="low">Bajo</SelectItem>
                                    <SelectItem value="medium">Medio</SelectItem>
                                    <SelectItem value="high">Alto</SelectItem>
                                </SelectContent>
                            </Select>
                        )} />
                        {errors.importance && <p className="text-xs text-destructive mt-1">{errors.importance.message}</p>}
                    </div>
                </div>

                {/* Medidas Correctivas */}
                <div className="space-y-4 pt-4 border-t">
                    <h3 className="text-lg font-semibold">Plan de Acción (Opcional)</h3>
                     <div>
                        <Label htmlFor="correctiveMeasures">Medidas Correctivas Recomendadas</Label>
                        <Textarea id="correctiveMeasures" placeholder="Describe las acciones a tomar..." rows={3} {...register("correctiveMeasures")} />
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                           <Label htmlFor="responsible">Responsable de Ejecución</Label>
                           <Input id="responsible" placeholder="Nombre del responsable" {...register("responsible")} />
                        </div>
                        <div>
                            <Label htmlFor="complianceDate">Fecha de Cumplimiento</Label>
                             <Controller name="complianceDate" control={control} render={({ field }) => (
                                <Popover>
                                    <PopoverTrigger asChild><Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{field.value ? format(field.value, "PPP", { locale: es }) : <span>Selecciona fecha</span>}</Button></PopoverTrigger>
                                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value || undefined} onSelect={field.onChange} initialFocus /></PopoverContent>
                                </Popover>
                            )}/>
                        </div>
                    </div>
                </div>
                
                 {/* Cierre */}
                <div className="space-y-4 pt-4 border-t">
                    <h3 className="text-lg font-semibold">Cierre de la Observación (Opcional)</h3>
                     <div>
                        <Label htmlFor="finalPhoto" className="mb-2 block">Foto de Término</Label>
                        <input id="finalPhoto" type="file" accept="image/*" onChange={(e) => handlePhotoUpload(e, "finalPhoto")} className="hidden" ref={finalPhotoInputRef}/>
                         <Button type="button" variant="outline" onClick={() => finalPhotoInputRef.current?.click()}>
                            <Upload className="mr-2 h-4 w-4" />
                            Añadir Foto de Término...
                        </Button>
                        {finalPhoto && <PhotoPreview photos={[finalPhoto]} removePhoto={() => removePhoto(0, "finalPhoto")} label="Foto de Término" />
                        }
                    </div>
                     <div>
                        <Label htmlFor="finalDescription">Descripción del Cierre</Label>
                        <Textarea id="finalDescription" placeholder="Describe cómo se solucionó la observación..." rows={3} {...register("finalDescription")} />
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                           <Label htmlFor="executorName">Nombre del Ejecutor</Label>
                           <Input id="executorName" placeholder="Quién realizó el trabajo" {...register("executorName")} />
                        </div>
                        <div>
                            <Label htmlFor="finalDate">Fecha de Cierre</Label>
                             <Controller name="finalDate" control={control} render={({ field }) => (
                                <Popover>
                                    <PopoverTrigger asChild><Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{field.value ? format(field.value, "PPP", { locale: es }) : <span>Selecciona fecha</span>}</Button></PopoverTrigger>
                                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value || undefined} onSelect={field.onChange} initialFocus /></PopoverContent>
                                </Popover>
                            )}/>
                        </div>
                    </div>
                </div>


                {/* Botones de acción */}
                <div className="flex justify-end gap-4 pt-6">
                    <Button type="button" onClick={handleExportPDF} variant="outline" disabled={isSubmitting}>
                        <FileDown className="mr-2 h-4 w-4" /> Exportar a PDF
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Guardar Inspección
                    </Button>
                </div>
            </CardContent>
        </Card>
      </form>
    </div>
  );
}
