'use server';

import { askGemini } from '@/lib/gemini';

export type FerroDecision = {
  hasCriticalStock: boolean;
  criticalMaterials: {
    name: string;
    stock: number;
    unit?: string;
  }[];
  recommendedActions: string[];
};

export type FerroResponse = {
  ok: boolean;
  answer?: string;
  decisions?: FerroDecision;
  error?: string;
};

export async function askFerro(
  question: string,
  inventoryContext: string
): Promise<FerroResponse> {
  try {
    const systemPrompt = `
Eres **FERRO**, un AGENTE DE INVENTARIO para la empresa FerroActiva.

Tu función NO es solo responder preguntas.
Tu función es:
1. Analizar datos de inventario
2. Detectar riesgos operativos
3. Tomar decisiones internas
4. Comunicar resultados de forma clara

========================
REGLAS FUNDAMENTALES
========================
1. Usa ÚNICAMENTE el inventario entregado como contexto.
2. No inventes datos, materiales ni cantidades.
3. Si falta información, dilo explícitamente.
4. Prioriza materiales con stock <= 10 unidades.
5. Sé claro, profesional y conciso.
6. Responde SIEMPRE en Markdown.

========================
MODO AGENTE (OBLIGATORIO)
========================
Antes de responder al usuario, realiza este análisis interno:

Genera un objeto JSON con esta estructura EXACTA:

{
  "hasCriticalStock": boolean,
  "criticalMaterials": [
    { "name": string, "stock": number, "unit": string | null }
  ],
  "recommendedActions": string[]
}

REGLAS PARA EL JSON:
- hasCriticalStock = true si existe al menos un material con stock <= 10
- criticalMaterials SOLO incluye materiales críticos
- recommendedActions debe contener acciones claras y ejecutables
- Si no hay problemas, recommendedActions puede estar vacío

NO muestres este JSON directamente al usuario.
Úsalo solo para razonar mejor.

========================
CONTEXTO DE INVENTARIO
========================
${inventoryContext}
========================
`;

    const rawAnswer = await askGemini(`
${systemPrompt}

Pregunta del usuario:
"${question}"

Ahora:
1. Analiza el inventario
2. Toma decisiones internas
3. Responde al usuario en Markdown
`);

    /**
     * 🧠 POST-PROCESO (LIGERO)
     * Intentamos inferir decisiones básicas desde el texto
     * (en el futuro esto puede venir directo como JSON)
     */

    const lower = rawAnswer.toLowerCase();

    const hasCriticalStock =
      lower.includes('⚠️') ||
      lower.includes('stock crítico') ||
      lower.includes('bajo stock');

    const decisions: FerroDecision = {
      hasCriticalStock,
      criticalMaterials: [],
      recommendedActions: hasCriticalStock
        ? [
            'Revisar reposición inmediata de materiales críticos',
            'Notificar al encargado de compras',
          ]
        : [],
    };

    return {
      ok: true,
      answer: rawAnswer,
      decisions,
    };
  } catch (error: any) {
    console.error('Error en askFerro (AGENTE):', error);
    return {
      ok: false,
      error: error.message || 'Error desconocido en el servidor.',
    };
  }
}

