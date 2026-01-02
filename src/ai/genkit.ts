// src/ai/genkit.ts
// ¡IMPORTANTE! NO poner 'use server' ni 'server-only' aquí

import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

const plugins = [];

// Usa GEMINI_API_KEY o GOOGLE_API_KEY (ambas funcionan)
const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

if (apiKey) {
  plugins.push(
    googleAI({
      apiKey,
    })
  );
} else {
  // Fallback (solo si estás en Vercel con configuración automática)
  plugins.push(googleAI());
}

export const ai = genkit({
  plugins,
  model: 'google-genai/gemini-1.5-flash',
});