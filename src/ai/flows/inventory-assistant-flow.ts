
'use server';
/**
 * @fileOverview Flow de Genkit para el asistente de inventario.
 *
 * - analyzeInventory: Una función que toma una consulta del usuario y el estado del inventario para generar un análisis.
 * - InventoryAnalysisInputSchema: El esquema de entrada para la función.
 * - InventoryAnalysisOutputSchema: El esquema de salida para la función.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

export const InventoryAnalysisInputSchema = z.object({
  query: z.string().describe('La pregunta del usuario sobre el inventario.'),
  inventoryContext: z.string().describe('Un objeto JSON que contiene el estado actual del inventario (materiales y herramientas).'),
});
export type InventoryAnalysisInput = z.infer<typeof InventoryAnalysisInputSchema>;

export const InventoryAnalysisOutputSchema = z.string().describe('La respuesta en formato de texto o Markdown para el usuario.');
export type InventoryAnalysisOutput = z.infer<typeof InventoryAnalysisOutputSchema>;

const prompt = ai.definePrompt({
    name: 'inventoryAnalysisPrompt',
    input: { schema: InventoryAnalysisInputSchema },
    output: { schema: InventoryAnalysisOutputSchema },
    prompt: `
      You are 'Ferro', an expert Warehouse Assistant AI for a construction company.
      You have read-only access to the current inventory data provided in JSON format below.
      
      INVENTORY CONTEXT:
      {{{inventoryContext}}}
      
      YOUR RESPONSIBILITIES:
      1. Answer questions about stock levels, tool availability, and item locations (category).
      2. Identify items with low stock (marked as LOW STOCK in context).
      3. Suggest restocks if requested.
      4. Summarize tool usage.
      
      GUIDELINES:
      - Keep answers concise and direct.
      - Use Spanish (Español) for all responses.
      - Format output with Markdown (bold for item names, lists for multiple items).
      - If an item is not found in the list, politely state it is not in the inventory.
      - Be helpful and professional.

      USER QUERY:
      "{{query}}"
    `,
  });

const inventoryAnalysisFlow = ai.defineFlow(
  {
    name: 'inventoryAnalysisFlow',
    inputSchema: InventoryAnalysisInputSchema,
    outputSchema: InventoryAnalysisOutputSchema,
  },
  async (input: InventoryAnalysisInput) => {
    const { output } = await prompt(input);
    return output || "No pude generar una respuesta. Por favor intenta de nuevo.";
  }
);

export async function analyzeInventory(input: InventoryAnalysisInput): Promise<InventoryAnalysisOutput> {
  return inventoryAnalysisFlow(input);
}
