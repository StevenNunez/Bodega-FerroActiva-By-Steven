
"use client";

import React, { useState, useMemo, useRef } from "react";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PageHeader } from "@/components/page-header";
import { useAppState, useAuth } from "@/contexts/app-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, ChevronsUpDown, Check, CalendarIcon, Signature } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import SignaturePad from "@/components/signature-pad";

const observationQuestions = [
    "¿La persona trabajadora utiliza los EPP acordes a la actividad que realiza?",
    "¿La persona trabajadora da cumplimiento al procedimiento de trabajo seguro dispuestos por la empresa, con la finalidad de evitar accidentes?",
    "¿La persona trabajadora tiene su área de trabajo segregada y señalizada?",
    "¿La persona trabajadora tiene su área limpia y ordenada?",
    "¿Las herramientas que utiliza cumplen con el código de color?",
    "¿Se utiliza una herramienta acorde a la actividad?",
    "Durante la observación ¿es posible evidenciar que el trabajador actúa en base al autocuidado?",
];

const FormSchema = z.object({
  obra: z.string().min(3, "La obra es requerida"),
  workerId: z.string({ required_error: "Debes seleccionar un trabajador." }),
  observationDate: z.date({ required_error: "La fecha es requerida." }),
  items: z.array(z.object({
    question: z.string(),
    status: z.enum(['si', 'no', 'na']),
  })).length(observationQuestions.length, "Debes responder todas las preguntas."),
  riskLevel: z.enum(['aceptable', 'leve', 'grave', 'gravisimo'], { required_error: "Debes seleccionar un nivel de riesgo." }),
  feedback: z.string().min(1, "La retroalimentación es requerida."),
  observerSignature: z.string().min(1, "La firma del observador es requerida."),
  workerSignature: z.string().min(1, "La firma del trabajador es requerida."),
});

type FormData = z.infer<typeof FormSchema>;

export default function BehaviorObservationPage() {
  const { users, addBehaviorObservation } = useAppState();
  const { user: authUser } = useAuth();
  const { toast } = useToast();
  
  const [workerPopoverOpen, setWorkerPopoverOpen] = useState(false);
  const observerSigRef = useRef<any>(null);
  const workerSigRef = useRef<any>(null);

  const { control, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      obra: "File 721",
      observationDate: new Date(),
      items: observationQuestions.map(q => ({ question: q, status: 'si' })),
      feedback: "",
    },
  });

  const workerId = useWatch({ control, name: "workerId" });
  const selectedWorker = useMemo(() => users.find(u => u.id === workerId), [users, workerId]);

  const handleWorkerSelect = (id: string) => {
    setValue("workerId", id, { shouldValidate: true });
    setWorkerPopoverOpen(false);
  };
  
  const onSubmit: SubmitHandler<FormData> = async (data) => {
    if (!selectedWorker) {
        toast({ variant: "destructive", title: "Error", description: "Trabajador no válido." });
        return;
    }
    try {
        await addBehaviorObservation({
            ...data,
            workerName: selectedWorker.name,
            workerRut: selectedWorker.rut || 'N/A',
        });
        toast({ title: "Observación Guardada", description: "El formulario ha sido registrado exitosamente." });
        // Optionally reset form
    } catch (error: any) {
        toast({ variant: "destructive", title: "Error", description: error.message || "No se pudo guardar el formulario." });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-8">
      <PageHeader
        title="Observación de Conducta"
        description="Formulario para el registro de observaciones de conducta en terreno."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
           <Card>
                <CardHeader>
                    <CardTitle>Información General</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div className="space-y-2">
                        <Label htmlFor="obra">Obra</Label>
                        <Input id="obra" {...control.register('obra')} />
                        {errors.obra && <p className="text-xs text-destructive">{errors.obra.message}</p>}
                    </div>
                     <div className="space-y-2">
                        <Label>Trabajador Observado</Label>
                        <Controller
                            name="workerId"
                            control={control}
                            render={({ field }) => (
                               <Popover open={workerPopoverOpen} onOpenChange={setWorkerPopoverOpen}>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" role="combobox" className="w-full justify-between">
                                            <span className="truncate">{selectedWorker?.name || "Selecciona un trabajador..."}</span>
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                        <Command>
                                            <CommandInput placeholder="Buscar trabajador..." />
                                            <CommandList>
                                                <CommandEmpty>No se encontró el trabajador.</CommandEmpty>
                                                <CommandGroup>
                                                    {users.filter(u => u.role !== 'guardia').map((user) => (
                                                        <CommandItem key={user.id} value={user.name} onSelect={() => handleWorkerSelect(user.id)}>
                                                            <Check className={cn("mr-2 h-4 w-4", field.value === user.id ? "opacity-100" : "opacity-0")} />
                                                            {user.name}
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                            )}
                        />
                        {errors.workerId && <p className="text-xs text-destructive">{errors.workerId.message}</p>}
                    </div>
                     <div className="space-y-2">
                        <Label>RUT</Label>
                        <Input value={selectedWorker?.rut || 'N/A'} readOnly disabled />
                    </div>
                     <div className="space-y-2">
                        <Label>Fecha</Label>
                        <Controller
                            name="observationDate"
                            control={control}
                            render={({ field }) => (
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}>
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {field.value ? format(field.value, "PPP", { locale: es }) : <span>Selecciona fecha</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent>
                                </Popover>
                            )}
                        />
                         {errors.observationDate && <p className="text-xs text-destructive">{errors.observationDate.message}</p>}
                    </div>
                </CardContent>
           </Card>

           <Card>
                <CardHeader>
                    <CardTitle>Observación de Conducta (Nivel de Riesgo)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {observationQuestions.map((q, index) => (
                        <div key={index} className="p-3 border rounded-lg">
                            <Label className="font-semibold">{` ${String.fromCharCode(65 + index)}. ${q}`}</Label>
                            <Controller
                                name={`items.${index}.status`}
                                control={control}
                                render={({ field }) => (
                                    <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex space-x-4 mt-2">
                                        <div className="flex items-center space-x-2"><RadioGroupItem value="si" id={`si-${index}`} /><Label htmlFor={`si-${index}`}>Sí</Label></div>
                                        <div className="flex items-center space-x-2"><RadioGroupItem value="no" id={`no-${index}`} /><Label htmlFor={`no-${index}`}>No</Label></div>
                                        <div className="flex items-center space-x-2"><RadioGroupItem value="na" id={`na-${index}`} /><Label htmlFor={`na-${index}`}>N/A</Label></div>
                                    </RadioGroup>
                                )}
                            />
                        </div>
                    ))}
                    {errors.items && <p className="text-xs text-destructive">{errors.items.message}</p>}
                </CardContent>
           </Card>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Categoría Nivel de Riesgo</CardTitle>
                </CardHeader>
                 <CardContent>
                    <Controller
                        name="riskLevel"
                        control={control}
                        render={({ field }) => (
                            <RadioGroup onValueChange={field.onChange} className="space-y-1">
                                <div className="p-3 border rounded-md has-[[data-state=checked]]:bg-muted">
                                    <div className="flex items-center space-x-3">
                                        <RadioGroupItem value="aceptable" id="r1" />
                                        <Label htmlFor="r1" className="font-bold">ACEPTABLE</Label>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1 pl-7">La observación cumple con todos los ítems evaluados, entregar las felicitaciones pertinentes.</p>
                                </div>
                                 <div className="p-3 border rounded-md has-[[data-state=checked]]:bg-muted">
                                    <div className="flex items-center space-x-3">
                                        <RadioGroupItem value="leve" id="r2" />
                                        <Label htmlFor="r2" className="font-bold">LEVE</Label>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1 pl-7">La observación no cumple con un ítem evaluado, realizar corrección verbal y firmar compromiso.</p>
                                </div>
                                <div className="p-3 border rounded-md has-[[data-state=checked]]:bg-muted">
                                    <div className="flex items-center space-x-3">
                                        <RadioGroupItem value="grave" id="r3" />
                                        <Label htmlFor="r3" className="font-bold">GRAVE</Label>
                                    </div>
                                     <p className="text-xs text-muted-foreground mt-1 pl-7">No cumple con dos ítems. Realizar reinstrucción con capacitación y firmar compromiso.</p>
                                </div>
                                 <div className="p-3 border rounded-md has-[[data-state=checked]]:bg-muted">
                                    <div className="flex items-center space-x-3">
                                        <RadioGroupItem value="gravisimo" id="r4" />
                                        <Label htmlFor="r4" className="font-bold">GRAVÍSIMO</Label>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1 pl-7">Incumplimiento en más de dos ítems. Tomar acciones inmediatas + informe de investigación.</p>
                                </div>
                            </RadioGroup>
                        )}
                    />
                     {errors.riskLevel && <p className="text-xs text-destructive mt-2">{errors.riskLevel.message}</p>}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Retroalimentación y Firmas</CardTitle>
                </CardHeader>
                 <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="feedback">Retroalimentación a la Persona</Label>
                        <Textarea id="feedback" {...control.register('feedback')} />
                        {errors.feedback && <p className="text-xs text-destructive">{errors.feedback.message}</p>}
                    </div>
                    <div className="space-y-2">
                        <Label>Firma Observador ({authUser?.name})</Label>
                        <div className="w-full h-36 border rounded-md bg-white">
                           <SignaturePad ref={observerSigRef} onEnd={() => setValue('observerSignature', observerSigRef.current?.getTrimmedCanvas().toDataURL('image/png'), { shouldValidate: true })} />
                        </div>
                        {errors.observerSignature && <p className="text-xs text-destructive">{errors.observerSignature.message}</p>}
                    </div>
                     <div className="space-y-2">
                        <Label>Firma Trabajador ({selectedWorker?.name || '...'})</Label>
                        <div className="w-full h-36 border rounded-md bg-white">
                           <SignaturePad ref={workerSigRef} onEnd={() => setValue('workerSignature', workerSigRef.current?.getTrimmedCanvas().toDataURL('image/png'), { shouldValidate: true })} />
                        </div>
                         {errors.workerSignature && <p className="text-xs text-destructive">{errors.workerSignature.message}</p>}
                    </div>
                </CardContent>
            </Card>

             <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>}
                Guardar y Enviar
            </Button>
        </div>
      </div>
    </form>
  );
}
