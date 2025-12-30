
'use server';

import 'server-only';

import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

const plugins = [];

if (process.env.GEMINI_API_KEY) {
  plugins.push(googleAI({ apiKey: process.env.GEMINI_API_KEY }));
} else {
  // En Firebase Extension no se requiere API Key
  plugins.push(googleAI());
}

export const ai = genkit({
  plugins,
});
