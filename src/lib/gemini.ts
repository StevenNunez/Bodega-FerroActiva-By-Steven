'use server';

import 'server-only';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent';

export async function askGemini(prompt: string): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error('La API Key de Gemini no está configurada en el entorno.');
  }

  const res = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': GEMINI_API_KEY,
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
    console.error('Error en la respuesta de Gemini:', errorBody);
    throw new Error(`Error en la API de Gemini: ${res.statusText}`);
  }

  const data = await res.json();
  
  if (!data.candidates || data.candidates.length === 0) {
      console.warn("Respuesta de Gemini sin candidatos:", data);
      // Check for safety ratings
      if (data.promptFeedback && data.promptFeedback.blockReason) {
          return `Mi política de seguridad me impide responder a esta pregunta. Razón: ${data.promptFeedback.blockReason}`;
      }
      return 'No pude generar una respuesta. La IA no proporcionó candidatos.';
  }

  return (
    data?.candidates?.[0]?.content?.parts?.[0]?.text ??
    'No se pudo extraer el texto de la respuesta.'
  );
}
