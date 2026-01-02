import { z } from 'genkit';

export const InventoryAnalysisInputSchema = z.object({
  query: z.string().describe('La pregunta del usuario sobre el inventario.'),
  inventoryContext: z
    .string()
    .describe(
      'JSON stringificado con materiales y herramientas (nombre, stock, unidad, categoria, status).'
    ),
});

export type InventoryAnalysisInput = z.infer<
  typeof InventoryAnalysisInputSchema
>;

export const InventoryAnalysisOutputSchema = z
  .string()
  .describe('Respuesta en Markdown del asistente de inventario.');

export type InventoryAnalysisOutput = z.infer<
  typeof InventoryAnalysisOutputSchema
>;
