import { Pinecone } from '@pinecone-database/pinecone';
import { getConfig, onInvalidate } from './configService.js';

let pc    = null;
let index = null;

onInvalidate(() => { pc = null; index = null; });

function getIndex() {
  const { pineconeKey, pineconeIndex } = getConfig();
  if (!pineconeKey) throw new Error('PINECONE_API_KEY not configured');
  if (!pc) {
    pc    = new Pinecone({ apiKey: pineconeKey });
    index = pc.index(pineconeIndex);
  }
  return index;
}

/**
 * Query Pinecone with automatic score-threshold fallback.
 * First tries minScore, then falls back to 0.40 if nothing found.
 */
export async function queryVectors(vector, topK = 5, namespace = null) {
  const { pineconeNs, minScore } = getConfig();
  const ns = namespace || pineconeNs;

  // Fetch more candidates than needed so filtering has room
  const results = await getIndex().namespace(ns).query({
    vector,
    topK: topK * 3,          // fetch 3× so filter has candidates
    includeMetadata: true,
  });

  const all = results.matches || [];

  // Log actual scores so you can tune the threshold
  if (all.length > 0) {
    const scores = all.slice(0, 5).map(m => m.score?.toFixed(3)).join(', ');
    console.log(`  Pinecone scores (top 5): [${scores}] | threshold: ${minScore}`);
  } else {
    console.log(`  Pinecone returned 0 candidates (namespace: "${ns}")`);
  }

  // First pass — apply configured threshold
  let filtered = all.filter(m => m.score >= minScore).slice(0, topK);

  // Fallback — if nothing passed the threshold, use top-3 with minimum 0.40
  if (filtered.length === 0 && all.length > 0) {
    const fallbackMin = 0.40;
    filtered = all.filter(m => m.score >= fallbackMin).slice(0, 3);
    if (filtered.length > 0) {
      console.log(`  ⚠️  No results above ${minScore} — using ${filtered.length} fallback results (score ≥ ${fallbackMin})`);
    }
  }

  return filtered.map(m => ({
    id:       m.id,
    score:    Math.round(m.score * 1000) / 1000,
    text:     m.metadata?.text     || '',
    source:   m.metadata?.source   || '',
    category: m.metadata?.category || '',
    language: m.metadata?.language || 'en',
    title:    m.metadata?.title    || '',
  }));
}

/**
 * Upsert vectors (used by seed script + admin re-index)
 */
export async function upsertVectors(vectors, namespace = null) {
  const { pineconeNs } = getConfig();
  const ns = namespace || pineconeNs;
  const BATCH = 100;
  let upserted = 0;
  for (let i = 0; i < vectors.length; i += BATCH) {
    await getIndex().namespace(ns).upsert(vectors.slice(i, i + BATCH));
    upserted += Math.min(BATCH, vectors.length - i);
    console.log(`  Upserted ${upserted}/${vectors.length}`);
  }
  return upserted;
}

/**
 * Get index stats — also shows namespaces so you can debug
 */
export async function getIndexStats() {
  const stats = await getIndex().describeIndexStats();
  console.log('  Index stats:', JSON.stringify(stats.namespaces || {}));
  return {
    totalVectors: stats.totalRecordCount || 0,
    namespaces:   stats.namespaces       || {},
    dimension:    stats.dimension,
  };
}

/**
 * Delete all vectors in namespace (before re-indexing)
 */
export async function deleteNamespace(namespace = null) {
  const { pineconeNs } = getConfig();
  const ns = namespace || pineconeNs;
  await getIndex().namespace(ns).deleteAll();
}
