
"use client";

import React, { useState } from 'react';
import Papa from 'papaparse';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Upload, Loader2, CheckCircle, AlertTriangle, FileWarning, Inbox } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAppState } from '@/contexts/app-provider';
import { db } from '@/lib/firebase';
import { collection, writeBatch, doc, getDocs, query, where, addDoc } from 'firebase/firestore';
import type { Material } from '@/lib/data';

interface Feedback {
    type: 'success' | 'error' | 'warning';
    message: string;
    details?: string[];
}

export default function BulkImportPage() {
  const { materials: existingMaterials, addMaterial } = useAppState();
  const [pastedData, setPastedData] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const handleImport = async () => {
    setIsProcessing(true);
    setFeedback(null);

    const result = Papa.parse<string[]>(pastedData.trim(), {
      delimiter: "\t", // Standard delimiter when copying from Excel/Sheets
      skipEmptyLines: true,
    });

    if (result.errors.length > 0) {
        setFeedback({
            type: 'error',
            message: 'Error al parsear los datos. Revisa el formato.',
            details: result.errors.map(e => `Fila ${e.row}: ${e.message}`)
        });
        setIsProcessing(false);
        return;
    }

    const rows = result.data;
    const materialsToProcess: Omit<Material, 'id' | 'supplierId'>[] = [];
    const validationErrors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (row.length < 4) {
            validationErrors.push(`Fila ${i + 1}: No tiene las 4 columnas requeridas. Omitida.`);
            continue;
        }

        const [name, stock, unit, category] = row;
        const stockNumber = parseInt(stock, 10);

        if (!name || name.trim().length < 3) {
            validationErrors.push(`Fila ${i + 1}: El nombre del material ('${name}') no es válido.`);
            continue;
        }
        if (isNaN(stockNumber) || stockNumber < 0) {
            validationErrors.push(`Fila ${i + 1}: El stock ('${stock}') no es un número válido.`);
            continue;
        }
        if (!unit || unit.trim().length === 0) {
            validationErrors.push(`Fila ${i + 1}: La unidad ('${unit}') no es válida.`);
            continue;
        }
        if (!category || category.trim().length === 0) {
            validationErrors.push(`Fila ${i + 1}: La categoría ('${category}') no es válida.`);
            continue;
        }
        
        materialsToProcess.push({ name: name.trim(), stock: stockNumber, unit: unit.trim(), category: category.trim() });
    }

    if (materialsToProcess.length === 0 && validationErrors.length > 0) {
        setFeedback({
            type: 'error',
            message: 'No se pudo procesar ninguna fila debido a errores.',
            details: validationErrors,
        });
        setIsProcessing(false);
        return;
    }

    try {
        const batch = writeBatch(db);
        let createdCount = 0;
        let updatedCount = 0;

        for (const material of materialsToProcess) {
            const existingMaterial = existingMaterials.find(m => m.name.toLowerCase() === material.name.toLowerCase());
            
            if (existingMaterial) {
                // Update existing material
                const materialRef = doc(db, "materials", existingMaterial.id);
                batch.update(materialRef, { stock: existingMaterial.stock + material.stock });
                updatedCount++;
            } else {
                // Create new material
                const newMaterialRef = doc(collection(db, "materials"));
                batch.set(newMaterialRef, { ...material, supplierId: null });
                createdCount++;
            }
        }
        
        await batch.commit();

        let successMessage = `Proceso completado. ${createdCount} materiales creados y ${updatedCount} actualizados.`;
        if (validationErrors.length > 0) {
            setFeedback({
                type: 'warning',
                message: successMessage,
                details: validationErrors,
            });
        } else {
             setFeedback({
                type: 'success',
                message: successMessage,
            });
        }
        setPastedData('');
    } catch (error) {
        setFeedback({ type: 'error', message: 'Error al guardar en la base de datos.', details: [String(error)] });
    } finally {
        setIsProcessing(false);
    }
  };
  
   const getFeedbackIcon = () => {
    if (!feedback) return null;
    switch(feedback.type) {
        case 'success': return <CheckCircle className="h-4 w-4" />;
        case 'error': return <AlertTriangle className="h-4 w-4" />;
        case 'warning': return <FileWarning className="h-4 w-4" />;
    }
   }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Importación Masiva de Materiales"
        description="Añade o actualiza el inventario de materiales pegando datos desde una hoja de cálculo."
      />

      <Card>
        <CardHeader>
          <CardTitle>Paso 1: Prepara tus Datos</CardTitle>
          <CardDescription>
            Asegúrate de que tu archivo de Excel o Google Sheets tenga las siguientes columnas en este orden exacto:
          </CardDescription>
        </CardHeader>
        <CardContent>
            <div className="p-4 bg-muted rounded-md text-sm font-mono">
                <p><span className="font-bold text-primary">Columna A:</span> Nombre del Material (Texto)</p>
                <p><span className="font-bold text-primary">Columna B:</span> Stock (Número)</p>
                <p><span className="font-bold text-primary">Columna C:</span> Unidad (Texto, ej: "un", "kg", "m2")</p>
                <p><span className="font-bold text-primary">Columna D:</span> Categoría (Texto, ej: "Fierros y Acero")</p>
            </div>
            <p className="text-xs text-muted-foreground mt-2">No incluyas una fila de encabezado en los datos que copias.</p>
        </CardContent>
      </Card>
      
      <Card>
          <CardHeader>
              <CardTitle>Paso 2: Copia y Pega tus Datos</CardTitle>
              <CardDescription>
                  Selecciona las filas de tu hoja de cálculo (sin los títulos), cópialas (Ctrl+C o Cmd+C) y pégalas en el área de texto de abajo (Ctrl+V o Cmd+V).
              </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
              <Textarea
                placeholder="Pega aquí los datos de tu hoja de cálculo. Cada fila representa un material y las columnas deben estar separadas por tabulaciones (esto ocurre automáticamente al copiar desde Excel/Sheets)."
                className="h-64 font-mono"
                value={pastedData}
                onChange={(e) => setPastedData(e.target.value)}
                disabled={isProcessing}
              />
              <Button onClick={handleImport} disabled={isProcessing || !pastedData.trim()} className="w-full">
                  {isProcessing ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Procesando...</>
                  ) : (
                      <><Upload className="mr-2 h-4 w-4"/> Importar Materiales</>
                  )}
              </Button>

                {feedback && (
                    <Alert variant={feedback.type === 'error' ? 'destructive' : (feedback.type === 'warning' ? 'default' : 'default')} 
                        className={feedback.type === 'warning' ? 'bg-amber-900/20 border-amber-500/50' : (feedback.type === 'success' ? 'bg-green-900/20 border-green-500/50': '')}>
                        <AlertTitle className="flex items-center gap-2">
                           {getFeedbackIcon()}
                           {feedback.type === 'error' ? 'Error' : (feedback.type === 'warning' ? 'Completado con Advertencias' : 'Éxito')}
                        </AlertTitle>
                        <AlertDescription>
                            <p className="font-semibold">{feedback.message}</p>
                            {feedback.details && feedback.details.length > 0 && (
                                <ul className="mt-2 list-disc list-inside text-xs space-y-1 max-h-40 overflow-y-auto">
                                    {feedback.details.map((detail, i) => <li key={i}>{detail}</li>)}
                                </ul>
                            )}
                        </AlertDescription>
                    </Alert>
                )}

          </CardContent>
      </Card>
    </div>
  );
}

    