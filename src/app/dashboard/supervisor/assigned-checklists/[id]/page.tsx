
"use client";

import React, { useMemo, useState, useRef, useEffect } from "react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useAppState, useAuth } from "@/contexts/app-provider";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, ArrowLeft, Save, Signature, CircleUserRound, CalendarDays, Calendar as CalendarIcon, Camera, Trash2 } from "lucide-react";
import { Timestamp } from "firebase/firestore";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import SignaturePad from "@/components/signature-pad";
import { useToast } from "@/hooks/use-toast";
import type { AssignedChecklist, ChecklistItem as ChecklistItemType, User } from "@/lib/data";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

const formatDate = (date: Date | Timestamp | undefined | null) => {
    if (!date) return 'N/A';
    const jsDate = date instanceof Timestamp ? date.toDate() : date;
    return format(jsDate, "d 'de' MMMM, yyyy", { locale: es });
};

export default function AssignedChecklistPage() {
    const params = useParams();
    const router = useRouter();
    const { assignedChecklists, users, loading, completeAssignedChecklist } = useAppState();
    const { user } = useAuth();
    const { toast } = useToast();
    
    const signaturePadRef = useRef<any>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);

    const checklistId = params.id as string;

    const checklist = useMemo(() => {
        if (!assignedChecklists) return null;
        return assignedChecklists.find(c => c.id === checklistId) || null;
    }, [assignedChecklists, checklistId]);

    const [checklistData, setChecklistData] = useState<AssignedChecklist | null>(checklist);

     useEffect(() => {
        if (checklist) {
            setChecklistData(checklist);
        }
    }, [checklist]);

    const handleItemChange = (itemIndex: number, field: keyof ChecklistItemType | 'responsibleUserId' | 'completionDate', value: any) => {
        if (!checklistData) return;
        const newItems = [...checklistData.items];
        const currentItem = { ...newItems[itemIndex] };

        if (field === 'yes' || field === 'no' || field === 'na') {
            currentItem.yes = field === 'yes' ? value : false;
            currentItem.no = field === 'no' ? value : false;
            currentItem.na = field === 'na' ? value : false;
        } else {
             (currentItem as any)[field] = value;
        }
        
        newItems[itemIndex] = currentItem;
        setChecklistData({ ...checklistData, items: newItems });
    };

    const handleSignatureEnd = () => {
        if (!checklistData || !signaturePadRef.current) return;
        const signature = signaturePadRef.current.getTrimmedCanvas().toDataURL('image/png');
        setChecklistData({
            ...checklistData,
            performedBy: {
                name: user?.name || 'Desconocido',
                role: 'Supervisor',
                signature: signature,
                date: Timestamp.now(),
            }
        })
    }

    const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            const file = event.target.files[0];
            const reader = new FileReader();
            reader.onload = (e) => {
                if (typeof e.target?.result === 'string' && checklistData) {
                    setChecklistData({
                        ...checklistData,
                        evidencePhotos: [...checklistData.evidencePhotos, e.target.result]
                    });
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const removePhoto = (index: number) => {
        if (!checklistData) return;
        const newPhotos = checklistData.evidencePhotos.filter((_, i) => i !== index);
        setChecklistData({ ...checklistData, evidencePhotos: newPhotos });
    };

    const handleSave = async () => {
        if (!checklistData) return;
        
        const isEveryItemAnswered = checklistData.items.every(item => item.yes || item.no || item.na);
        if (!isEveryItemAnswered) {
            toast({ variant: 'destructive', title: 'Error', description: 'Debes responder a todos los ítems (Sí, No, o N/A).' });
            return;
        }
        if (!checklistData.performedBy.signature) {
            toast({ variant: 'destructive', title: 'Error', description: 'La firma de conformidad es obligatoria.' });
            return;
        }
        if (checklistData.evidencePhotos.length === 0) {
            toast({ variant: 'destructive', title: 'Error', description: 'Debes adjuntar al menos una foto de evidencia.' });
            return;
        }

        try {
            await completeAssignedChecklist(checklistData);
            toast({ title: "Checklist Enviado", description: "El formulario ha sido guardado y enviado para su revisión." });
            router.push('/dashboard/supervisor/assigned-checklists');
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error al Guardar", description: error.message || "No se pudo guardar el formulario." });
        }
    };


    if (loading) {
        return <div className="flex h-full w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    if (!checklistData) {
        return (
            <div>
                <Button variant="ghost" onClick={() => router.back()}><ArrowLeft className="mr-2"/> Volver</Button>
                <PageHeader title="Checklist no encontrado" description="El checklist que buscas no existe o no tienes permiso para verlo." />
            </div>
        );
    }
    
    return (
        <div className="flex flex-col gap-8">
            <div className="flex items-center gap-4">
                 <Button variant="outline" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <PageHeader title={checklistData.templateTitle} description={`Completando para la obra: ${checklistData.work}`} className="mb-0"/>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Ítems a Verificar</CardTitle>
                    <CardDescription>Completa cada punto del checklist. Todos los campos son requeridos.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {checklistData.items.map((item, index) => (
                        <div key={index} className="p-4 border rounded-lg space-y-4">
                            <p className="font-semibold">{index + 1}. {item.element}</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                <RadioGroup 
                                    className="flex space-x-4 items-center" 
                                    value={item.yes ? 'yes' : item.no ? 'no' : item.na ? 'na' : ''}
                                    onValueChange={(val) => handleItemChange(index, val as any, true)}
                                >
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="yes" id={`yes-${index}`} />
                                        <Label htmlFor={`yes-${index}`}>Sí</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="no" id={`no-${index}`} />
                                        <Label htmlFor={`no-${index}`}>No</Label>
                                    </div>
                                     <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="na" id={`na-${index}`} />
                                        <Label htmlFor={`na-${index}`}>N/A</Label>
                                    </div>
                                </RadioGroup>
                                <div className="space-y-2">
                                    <Label>Responsable</Label>
                                    <Select 
                                        value={item.responsibleUserId} 
                                        onValueChange={(value) => handleItemChange(index, 'responsibleUserId', value)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Asignar responsable..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {users.map(u => (
                                                <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Fecha Cumplimiento</Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant={"outline"}
                                                className={cn(
                                                "w-full justify-start text-left font-normal",
                                                !item.completionDate && "text-muted-foreground"
                                                )}
                                            >
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {item.completionDate ? format(item.completionDate instanceof Timestamp ? item.completionDate.toDate() : item.completionDate, "PPP", {locale: es}) : <span>Selecciona fecha</span>}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0">
                                            <Calendar
                                                mode="single"
                                                selected={item.completionDate instanceof Timestamp ? item.completionDate.toDate() : item.completionDate || undefined}
                                                onSelect={(date) => handleItemChange(index, 'completionDate', date)}
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                     <CardTitle>Observaciones Generales</CardTitle>
                </CardHeader>
                <CardContent>
                    <Textarea 
                        placeholder="Añade cualquier observación adicional aquí..."
                        value={checklistData.observations}
                        onChange={(e) => setChecklistData({ ...checklistData, observations: e.target.value })}
                    />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Evidencia Fotográfica</CardTitle>
                    <CardDescription>Adjunta al menos una foto como evidencia de la inspección.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        {checklistData.evidencePhotos.map((photo, index) => (
                            <div key={index} className="relative group aspect-square">
                                <Image src={photo} alt={`Evidencia ${index + 1}`} layout="fill" className="object-cover rounded-md" />
                                <Button
                                    variant="destructive"
                                    size="icon"
                                    className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => removePhoto(index)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                    <Button variant="outline" onClick={() => cameraInputRef.current?.click()}>
                        <Camera className="mr-2 h-4 w-4" />
                        Añadir Foto
                    </Button>
                    <input
                        ref={cameraInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handlePhotoUpload}
                        className="hidden"
                    />
                </CardContent>
            </Card>

             <Card>
                <CardHeader>
                    <CardTitle>Firma de Conformidad</CardTitle>
                    <CardDescription>Firma en el recuadro para confirmar que has realizado la inspección.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="w-full h-48 border rounded-md bg-white relative">
                        <SignaturePad ref={signaturePadRef} onEnd={handleSignatureEnd}/>
                    </div>
                     {checklistData.performedBy.signature && (
                        <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between text-sm text-muted-foreground p-4 bg-muted rounded-md">
                           <div className="flex items-center gap-2">
                             <CircleUserRound className="h-4 w-4"/>
                             <p>Realizado por: <span className="font-semibold text-foreground">{checklistData.performedBy.name}</span></p>
                           </div>
                           <div className="flex items-center gap-2">
                             <CalendarDays className="h-4 w-4"/>
                             <p>Fecha: <span className="font-semibold text-foreground">{formatDate(checklistData.performedBy.date)}</span></p>
                           </div>
                        </div>
                    )}
                </CardContent>
            </Card>
            
            <div className="flex justify-end gap-4">
                 <Button variant="outline" onClick={() => router.back()}>Cancelar</Button>
                 <Button onClick={handleSave}><Save className="mr-2"/> Guardar y Enviar</Button>
            </div>

        </div>
    );
}
