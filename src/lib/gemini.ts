'use server';

import 'server-only';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

export async function askGemini(prompt: string): Promise<string> {
  if (!GEMINI_API_KEY) {
    console.error('❌ GEMINI_API_KEY no definida');
    throw new Error('La API Key de Gemini no está configurada en el entorno.');
  }

  const res = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: prompt }],
        },
      ],
    }),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    console.error('❌ Error Gemini:', res.status, errorBody);
    throw new Error(`Error en la API de Gemini (${res.status})`);
  }

  const data = await res.json();

  // 🛡️ DEFENSIVE CHECK (clave para producción)
  if (!data.candidates || data.candidates.length === 0) {
    console.warn('⚠️ Gemini respondió sin candidatos:', data);

    if (data.promptFeedback?.blockReason) {
      return `Mi política de seguridad me impide responder a esta pregunta. Razón: ${data.promptFeedback.blockReason}`;
    }

    return 'No pude generar una respuesta válida.';
  }

  return (
    data?.candidates?.[0]?.content?.parts?.[0]?.text ??
    'No se pudo extraer el texto de la respuesta.'
  );
}
