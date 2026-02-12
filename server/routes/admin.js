import { Router } from 'express';
import { getConfig, updateConfig } from '../services/configService.js';
import { getIndexStats, deleteNamespace, upsertVectors } from '../services/pineconeService.js';
import { embedBatch } from '../services/embeddingService.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const router  = Router();
const __dir   = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dir, '../data');

// ── Auth middleware ──────────────────────────────────────────────
function auth(req, res, next) {
  const secret = req.headers['x-admin-secret'];
  if (!secret || secret !== getConfig().adminSecret)
    return res.status(401).json({ error: 'Unauthorized' });
  next();
}

// ── GET /api/admin/config ────────────────────────────────────────
router.get('/config', auth, (_req, res) => {
  const cfg = getConfig();
  res.json({
    anthropicModel: cfg.anthropicModel,
    pineconeIndex:  cfg.pineconeIndex,
    pineconeNs:     cfg.pineconeNs,
    topK:           cfg.topK,
    minScore:       cfg.minScore,
    // Mask keys — show only prefix
    anthropicKey: cfg.anthropicKey ? cfg.anthropicKey.slice(0, 16) + '…' : '',
    openaiKey:    cfg.openaiKey    ? cfg.openaiKey.slice(0, 8)     + '…' : '',
    pineconeKey:  cfg.pineconeKey  ? cfg.pineconeKey.slice(0, 8)   + '…' : '',
  });
});

// ── POST /api/admin/config ───────────────────────────────────────
router.post('/config', auth, (req, res) => {
  const patch = req.body;
  // Only update key if full key provided (not masked)
  if (patch.anthropicKey?.includes('…')) delete patch.anthropicKey;
  if (patch.openaiKey?.includes('…'))    delete patch.openaiKey;
  if (patch.pineconeKey?.includes('…'))  delete patch.pineconeKey;
  updateConfig(patch);
  res.json({ success: true, message: 'Configuration updated. New API clients will be created on next request.' });
});

// ── GET /api/admin/stats ─────────────────────────────────────────
router.get('/stats', auth, async (_req, res) => {
  try {
    const stats = await getIndexStats();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/admin/reindex ──────────────────────────────────────
// Re-embeds and upserts all FAQ data into Pinecone
router.post('/reindex', auth, async (_req, res) => {
  // Stream progress via SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const send = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  try {
    send({ step: 'start', message: 'Starting re-index...' });

    // Load data files
    const faqPosts = JSON.parse(readFileSync(join(dataDir, 'faq_posts.json'), 'utf-8'));
    const siteFaq  = JSON.parse(readFileSync(join(dataDir, 'site_faq.json'), 'utf-8'));

    // Build chunks
    const chunks = [];

    // FAQ blog posts (NL/FR)
    for (const post of faqPosts) {
      if (!post.title && !post.body) continue;
      const lang = post.tags?.toLowerCase().includes('fr') ? 'fr' : 'nl';
      chunks.push({
        id:   `faq_post_${chunks.length}`,
        text: `${post.title}\n${post.body}`.slice(0, 1000),
        meta: { source: 'FAQ.xlsx', category: 'blog_post', language: lang, title: post.title || '' },
      });
    }

    // Site FAQ (EN) — chunk every 3 lines
    let current = [], category = 'general';
    for (const line of siteFaq) {
      if (!line.trim()) continue;
      // Detect category headers
      if (line.length < 60 && !line.includes('?') && line === line.trim()) {
        if (current.length >= 2) {
          chunks.push({
            id:   `site_faq_${chunks.length}`,
            text: current.join('\n').slice(0, 1000),
            meta: { source: 'FAQS_SITE.docx', category, language: 'en', title: current[0] || '' },
          });
          current = [];
        }
        category = line;
        continue;
      }
      current.push(line);
      if (current.length >= 4) {
        chunks.push({
          id:   `site_faq_${chunks.length}`,
          text: current.join('\n').slice(0, 1000),
          meta: { source: 'FAQS_SITE.docx', category, language: 'en', title: current[0] || '' },
        });
        current = [];
      }
    }
    if (current.length) {
      chunks.push({
        id:   `site_faq_${chunks.length}`,
        text: current.join('\n').slice(0, 1000),
        meta: { source: 'FAQS_SITE.docx', category, language: 'en', title: current[0] || '' },
      });
    }

    send({ step: 'chunks', message: `Built ${chunks.length} chunks`, total: chunks.length });

    // Embed all chunks
    send({ step: 'embedding', message: 'Generating embeddings...' });
    const texts     = chunks.map(c => c.text);
    const embeddings = await embedBatch(texts);
    send({ step: 'embedded', message: `Embedded ${embeddings.length} vectors` });

    // Delete existing namespace
    send({ step: 'clearing', message: 'Clearing existing index...' });
    await deleteNamespace();

    // Upsert to Pinecone
    send({ step: 'upserting', message: 'Upserting to Pinecone...' });
    const vectors = chunks.map((c, i) => ({
      id:       c.id,
      values:   embeddings[i],
      metadata: { text: c.text, ...c.meta },
    }));
    const count = await upsertVectors(vectors);

    send({ step: 'done', message: `✅ Indexed ${count} vectors successfully`, count });
    res.end();
  } catch (err) {
    send({ step: 'error', message: err.message });
    res.end();
  }
});

export default router;
