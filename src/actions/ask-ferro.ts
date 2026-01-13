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

  // 🛡️ Fallback defensivo si no hay bloque JSON
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
  contextData: string
): Promise<FerroResponse> {
  try {
    if (!question?.trim()) {
      return {
        ok: false,
        error: 'La pregunta no puede estar vacía.',
      };
    }

    const systemPrompt = `
Eres **FERRO**, un asistente experto en gestión de construcción para la empresa FerroActiva.

Tu función es:
1. Analizar el contexto de la obra (inventario, solicitudes, avance, usuarios).
2. Generar un bloque de análisis JSON interno y oculto para la toma de decisiones.
3. Responder la pregunta del usuario de forma clara, profesional y concisa en Markdown.

========================
REGLAS FUNDAMENTALES
========================
1. Usa ÚNICAMENTE los datos entregados en el contexto. No inventes datos.
2. Si falta información, indícalo explícitamente.
3. Prioriza la detección de riesgos (ej: stock crítico, solicitudes pendientes).

========================
FORMATO DE RESPUESTA OBLIGATORIO
========================
Tu respuesta DEBE contener dos partes:

1. **Bloque de Decisión (OCULTO)**  
Genera un objeto JSON envuelto EXACTAMENTE en etiquetas <decision_block>...</decision_block>:

<decision_block>
{
  "hasCriticalStock": boolean,
  "criticalMaterials": [
    { "name": string, "stock": number, "unit": string | null }
  ],
  "recommendedActions": string[]
}
</decision_block>

REGLAS PARA EL JSON:
- hasCriticalStock: true si algún material tiene stock <= 10.
- criticalMaterials: SOLO materiales críticos.
- recommendedActions: acciones claras y ejecutables (ej: "Generar orden de compra para Cemento").

2. **Respuesta al Usuario (VISIBLE)**  
DESPUÉS del bloque XML, responde en Markdown de forma profesional y amigable.
NO incluyas el bloque JSON ni las etiquetas en esta respuesta.

========================
CONTEXTO DE LA OBRA
========================
${contextData}
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

export async function suggestSafetyTalkTopic(): Promise<FerroResponse> {
    try {
        const prompt = `
        Eres un experto en prevención de riesgos para la construcción en Chile. 
        Sugiere un tema específico y conciso para una "charla de 5 minutos". 
        El tema debe ser relevante para la construcción y práctico para un equipo en terreno.
        Dame solo el título del tema, sin explicaciones adicionales. Máximo 15 palabras.
        Ejemplo: "Uso correcto del arnés de seguridad en altura" o "Riesgos eléctricos en zonas húmedas".
        `;
        const topic = await askGemini(prompt);
        return { ok: true, answer: topic.replace(/"/g, '') };
    } catch (error: any) {
        return { ok: false, error: error.message || "No se pudo generar un tema." };
    }
}
