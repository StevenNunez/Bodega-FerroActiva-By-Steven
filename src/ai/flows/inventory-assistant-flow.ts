'use server';

import 'server-only';

import { ai } from '@/ai/genkit';
import {
  InventoryAnalysisInputSchema,
  InventoryAnalysisOutputSchema,
  type InventoryAnalysisInput,
  type InventoryAnalysisOutput,
} from './inventory-assistant-types';

const prompt = ai.definePrompt({
  name: 'inventoryAnalysisPrompt',
  input: { schema: InventoryAnalysisInputSchema },
  output: { schema: InventoryAnalysisOutputSchema },
  prompt: `
You are **Ferro**, un asistente experto en bodega de construcción.

Hablas con **Anthony (Jefe de Proyecto)**.
Valoras la eficiencia, control de costos y alertas proactivas.

CONTEXTO DEL INVENTARIO:
{{{inventoryContext}}}

REGLAS PRINCIPALES:
1. Responde SOLO usando el contexto proporcionado.
2. Si hay items con status "CRITICAL_LOW", muestra al inicio:
   ⚠️ **Alerta de Stock Crítico**
3. Sugiere acciones de compra cuando el stock esté bajo.
4. Usa Markdown: tablas, negritas, listas, emojis.
5. Sé conciso, profesional y proactivo.
6. Siempre responde en español.

PREGUNTA DEL USUARIO:
"{{query}}"

EJEMPLO DE TABLA:
| Material      | Stock | Unidad | Estado      |
|---------------|-------|--------|-------------|
| Cemento       | 5     | sacos  | 🔴 CRÍTICO   |
| Arena         | 120   | m³     | 🟢 OK        |
| Clavos        | 8     | kg     | 🔴 CRÍTICO   |
`,
});

const inventoryAnalysisFlow = ai.defineFlow(
  {
    name: 'inventoryAnalysisFlow',
    inputSchema: InventoryAnalysisInputSchema,
    outputSchema: InventoryAnalysisOutputSchema,
  },
  async (input: InventoryAnalysisInput): Promise<InventoryAnalysisOutput> => {
    console.log('🚀 Ferro AI: consulta recibida →', input.query);

    try {
      let contextData;
      try {
        contextData = JSON.parse(input.inventoryContext);
      } catch (e) {
        return '❌ Error al leer los datos del inventario. Intenta de nuevo.';
      }

      const hasData = 
        (Array.isArray(contextData.materials) && contextData.materials.length > 0) ||
        (Array.isArray(contextData.tools) && contextData.tools.length > 0);

      if (!hasData) {
        return '📭 No hay datos de inventario disponibles en este momento.\n\nEspera unos segundos mientras se cargan los materiales y herramientas.';
      }

      const { output } = await prompt(input);

      return output ?? 'No pude generar una respuesta completa con los datos actuales.';

    } catch (error: any) {
      console.error('❌ Error en Ferro AI:', error.message);

      if (error.message?.includes('API key')) {
        return '🔑 Error de configuración de IA. Contacta al administrador.';
      }

      return '🔌 Lo siento, hubo un problema técnico al procesar tu consulta. Intenta nuevamente en unos momentos.';
    }
  }
);

export async function analyzeInventory(input: InventoryAnalysisInput): Promise<InventoryAnalysisOutput> {
  const { result } = await inventoryAnalysisFlow.run(input);
  return result ?? 'No se obtuvo respuesta del asistente.';
}