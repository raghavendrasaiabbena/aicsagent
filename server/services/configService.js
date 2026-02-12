/**
 * configService.js
 * Central config store — reads from .env on startup,
 * allows admin panel to override at runtime (no restart needed).
 */

const cfg = {
  anthropicKey:   process.env.ANTHROPIC_API_KEY   || '',
  anthropicModel: process.env.ANTHROPIC_MODEL      || 'claude-sonnet-4-5-20250929',
  openaiKey:      process.env.OPENAI_API_KEY        || '',
  pineconeKey:    process.env.PINECONE_API_KEY      || '',
  pineconeIndex:  process.env.PINECONE_INDEX        || 'zeb-faq',
  pineconeNs:     process.env.PINECONE_NAMESPACE    || 'production',
  adminSecret:    process.env.ADMIN_SECRET          || 'changeme',
  topK:           parseInt(process.env.PINECONE_TOP_K   || '5'),
  minScore:       parseFloat(process.env.PINECONE_MIN_SCORE || '0.55'),
};

export function getConfig() { return { ...cfg }; }

export function updateConfig(patch) {
  const allowed = [
    'anthropicKey','anthropicModel','openaiKey',
    'pineconeKey','pineconeIndex','pineconeNs',
    'topK','minScore'
  ];
  for (const key of allowed) {
    if (patch[key] !== undefined) cfg[key] = patch[key];
  }
  // Invalidate cached clients so next request uses new keys
  invalidateClients();
}

// Callback registry for client invalidation
const invalidators = [];
export function onInvalidate(fn) { invalidators.push(fn); }
function invalidateClients() { invalidators.forEach(fn => fn()); }
