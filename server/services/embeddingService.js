import OpenAI from 'openai';
import { getConfig, onInvalidate } from './configService.js';

let client = null;

onInvalidate(() => { client = null; });

function getClient() {
  const { openaiKey } = getConfig();
  if (!openaiKey) throw new Error('OPENAI_API_KEY not configured');
  if (!client) client = new OpenAI({ apiKey: openaiKey });
  return client;
}

/**
 * Embed a single string → float32 array (1536 dims)
 */
export async function embedText(text) {
  const resp = await getClient().embeddings.create({
    model: 'text-embedding-3-large',
    input: text.slice(0, 8000),   // stay within token limit
    dimensions: 1536,
  });
  return resp.data[0].embedding;
}

/**
 * Batch embed — returns array of float32 arrays
 */
export async function embedBatch(texts) {
  const chunks = [];
  const BATCH = 100;
  for (let i = 0; i < texts.length; i += BATCH) {
    const resp = await getClient().embeddings.create({
      model: 'text-embedding-3-large',
      input: texts.slice(i, i + BATCH).map(t => t.slice(0, 8000)),
      dimensions: 1536,
    });
    chunks.push(...resp.data.map(d => d.embedding));
  }
  return chunks;
}
