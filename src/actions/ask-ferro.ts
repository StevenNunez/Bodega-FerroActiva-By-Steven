'use server';

import 'server-only';
import { askGemini } from '@/lib/gemini';

/* =====================================================
   TIPOS
===================================================== */

export type FerroDecision = {
  hasCriticalStock: boolean;
  criticalMaterials: {
    name: string;
    stock: number;
    unit?: string | null;
  }[];
  recommendedActions: string[];
};

export type FerroResponse = {
  ok: boolean;
  answer?: string;
  decisions?: FerroDecision | null;
  error?: string;
};

/* =====================================================
   PARSER DE RESPUESTA GEMINI
===================================================== */

function parseResponse(
  text: string
): { decisions: FerroDecision | null; cleanedAnswer: string } {
  const decisionRegex = /<decision_block>([\s\S]*?)<\/decision_block>/;
  const match = text.match(decisionRegex);

  let decisions: FerroDecision | null = null;
  let cleanedAnswer = text;

  if (match?.[1]) {
    try {
      decisions = JSON.parse(match[1].trim());
    } catch (error) {
      console.error('❌ Error parsing decision_block JSON:', error);
    }

    cleanedAnswer = text.replace(decisionRegex, '').trim();
  }

  // 🛡️ Fallback defensivo
  if (!decisions) {
    const lower = text.toLowerCase();
    const hasCriticalStock =
      lower.includes('stock crítico') ||
      lower.includes('bajo stock') ||
      lower.includes('crítico');

    decisions = {
      hasCriticalStock,
      criticalMaterials: [],
      recommendedActions: hasCriticalStock
        ? ['Revisar reposición inmediata de materiales críticos']
        : [],
    };
  }

  return { decisions, cleanedAnswer };
}

/* =====================================================
   SERVER ACTION PRINCIPAL
===================================================== */

export async function askFerro(
  question: string,
  inventoryContext: string
): Promise<FerroResponse> {
  try {
    // Logs útiles en Firebase
    console.log('🧠 askFerro ejecutándose');
    console.log('🔑 GEMINI_API_KEY presente:', !!process.env.GEMINI_API_KEY);

    if (!question?.trim()) {
      return {
        ok: false,
        error: 'La pregunta no puede estar vacía.',
      };
    }

    const systemPrompt = `
Eres **FERRO**, un AGENTE DE INVENTARIO para la empresa FerroActiva.

Tu función es:
1. Analizar el contexto de inventario proporcionado.
2. Generar un bloque de análisis JSON interno y oculto.
3. Responder la pregunta del usuario de forma clara y profesional en Markdown.

========================
REGLAS FUNDAMENTALES
========================
1. Usa ÚNICAMENTE el inventario entregado como contexto. No inventes datos.
2. Si falta información, indícalo explícitamente.
3. Prioriza materiales con stock <= 10 unidades.

========================
FORMATO DE RESPUESTA OBLIGATORIO
========================
Tu respuesta DEBE contener dos partes:

1. **Bloque de Decisión (OCULTO)**  
Genera un objeto JSON envuelto EXACTAMENTE así:

<decision_block>
{
  "hasCriticalStock": boolean,
  "criticalMaterials": [
    { "name": string, "stock": number, "unit": string | null }
  ],
  "recommendedActions": string[]
}
</decision_block>

REGLAS:
- hasCriticalStock: true si algún material tiene stock <= 10
- criticalMaterials: SOLO materiales críticos
- recommendedActions: acciones claras y ejecutables

2. **Respuesta al Usuario (VISIBLE)**  
Después del bloque XML, responde en Markdown de forma profesional.

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

Sigue estrictamente el formato indicado.
`);

    const { decisions, cleanedAnswer } = parseResponse(rawAnswer);

    return {
      ok: true,
      answer: cleanedAnswer,
      decisions,
    };
  } catch (error: any) {
    console.error('❌ Error en askFerro:', error);

    return {
      ok: false,
      error:
        error?.message ||
        'Ocurrió un error inesperado al procesar la solicitud.',
    };
  }
}
