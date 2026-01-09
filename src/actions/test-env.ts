'use server';

import 'server-only';

export async function testEnv() {
  const key = process.env.GEMINI_API_KEY;

  console.log('🧪 TEST ENV — GEMINI_API_KEY existe:', !!key);
  console.log('🧪 TEST ENV — largo:', key?.length);

  return {
    exists: !!key,
    length: key?.length ?? 0,
    preview: key ? key.slice(0, 6) + '...' : null,
  };
}
