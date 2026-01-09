'use server';
import 'server-only';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export async function askGemini(prompt: string): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY no está definida');
  }

  const res = await fetch(
    'https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': GEMINI_API_KEY,
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }],
          },
        ],
      }),
    }
  );

  if (!res.ok) {
    const errorJson = await res.json().catch(() => null);
    console.error('🔥 GEMINI ERROR STATUS:', res.status);
    console.error('🔥 GEMINI ERROR BODY:', JSON.stringify(errorJson, null, 2));

    throw new Error('Error en la API de Gemini');
  }

  const data = await res.json();

  return (
    data?.candidates?.[0]?.content?.parts?.[0]?.text ??
    'Respuesta vacía'
  );
}
