import { embedText } from './embeddingService.js';
import { queryVectors } from './pineconeService.js';
import { getConfig } from './configService.js';

/**
 * Full RAG retrieval pipeline:
 * 1. Embed the customer query
 * 2. Search Pinecone for top-K similar chunks
 * 3. Format chunks as context string for the LLM
 */
export async function retrieveContext(query, language = 'en') {
  const { topK } = getConfig();

  // Embed the query
  const vector = await embedText(query);

  // Search Pinecone
  const matches = await queryVectors(vector, topK);

  if (matches.length === 0) return { context: '', sources: [] };

  // Build context string
  const contextParts = matches.map((m, i) => {
    const lang = m.language !== 'en' ? ` [${m.language.toUpperCase()}]` : '';
    const src  = m.source ? ` (${m.source})` : '';
    return `[${i + 1}] ${m.title ? m.title + '\n' : ''}${m.text}${lang}${src}`;
  });

  return {
    context: contextParts.join('\n\n---\n\n'),
    sources: matches.map(m => ({
      title:    m.title,
      source:   m.source,
      score:    m.score,
      category: m.category,
      language: m.language,
    })),
  };
}
