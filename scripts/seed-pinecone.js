/**
 * seed-pinecone.js
 * ─────────────────────────────────────────────────────────────────
 * Run this ONCE before starting the app to index all FAQ data.
 *
 * Usage:
 *   cd scripts
 *   npm install
 *   node seed-pinecone.js
 *
 * What it does:
 *   1. Creates the Pinecone index (dimension=1536, metric=cosine)
 *   2. Reads FAQ.xlsx data   → faq_posts.json   (58 NL/FR blog posts)
 *   3. Reads FAQS_SITE.docx  → site_faq.json    (280 EN FAQ paragraphs)
 *   4. Chunks the content
 *   5. Embeds with text-embedding-3-large (OpenAI)
 *   6. Upserts all vectors into Pinecone
 */

import 'dotenv/config';
import { Pinecone }   from '@pinecone-database/pinecone';
import OpenAI         from 'openai';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir   = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dir, '../server/data');

// ── Config ────────────────────────────────────────────────────────
const OPENAI_KEY    = process.env.OPENAI_API_KEY;
const PINECONE_KEY  = process.env.PINECONE_API_KEY;
const INDEX_NAME    = process.env.PINECONE_INDEX     || 'zeb-faq';
const NAMESPACE     = process.env.PINECONE_NAMESPACE || 'production';
const DIMENSION     = 1536;
const EMBED_MODEL   = 'text-embedding-3-large';
const BATCH_EMBED   = 50;
const BATCH_UPSERT  = 100;

if (!OPENAI_KEY || !PINECONE_KEY) {
  console.error('\n❌  Missing keys. Create a .env file in the scripts/ folder:\n');
  console.error('   OPENAI_API_KEY=sk-...');
  console.error('   PINECONE_API_KEY=...');
  console.error('   PINECONE_INDEX=zeb-faq\n');
  process.exit(1);
}

const openai   = new OpenAI({ apiKey: OPENAI_KEY });
const pinecone = new Pinecone({ apiKey: PINECONE_KEY });

// ── Helpers ───────────────────────────────────────────────────────
function log(msg) { console.log('  ' + msg); }

async function ensureIndex() {
  log(`Checking index "${INDEX_NAME}"...`);
  const { indexes } = await pinecone.listIndexes();
  const exists = (indexes || []).some(i => i.name === INDEX_NAME);

  if (exists) {
    log(`Index "${INDEX_NAME}" already exists ✓`);
  } else {
    log(`Creating index "${INDEX_NAME}" (dim=${DIMENSION}, metric=cosine)...`);
    await pinecone.createIndex({
      name:      INDEX_NAME,
      dimension: DIMENSION,
      metric:    'cosine',
      spec: {
        serverless: {
          cloud:  'aws',
          region: 'us-east-1',
        },
      },
    });
    // Wait for index to be ready
    log('Waiting for index to be ready...');
    let ready = false;
    while (!ready) {
      await new Promise(r => setTimeout(r, 3000));
      const desc = await pinecone.describeIndex(INDEX_NAME);
      ready = desc.status?.ready === true;
      log(`  Status: ${desc.status?.state || 'initializing'}...`);
    }
    log('Index ready ✓');
  }
  return pinecone.index(INDEX_NAME);
}

async function embedBatch(texts) {
  const all = [];
  for (let i = 0; i < texts.length; i += BATCH_EMBED) {
    const batch = texts.slice(i, i + BATCH_EMBED);
    const resp  = await openai.embeddings.create({
      model:      EMBED_MODEL,
      input:      batch.map(t => t.slice(0, 8000)),
      dimensions: DIMENSION,
    });
    all.push(...resp.data.map(d => d.embedding));
    log(`  Embedded ${Math.min(i + BATCH_EMBED, texts.length)}/${texts.length}`);
  }
  return all;
}

async function upsertAll(idx, vectors) {
  let done = 0;
  for (let i = 0; i < vectors.length; i += BATCH_UPSERT) {
    await idx.namespace(NAMESPACE).upsert(vectors.slice(i, i + BATCH_UPSERT));
    done += Math.min(BATCH_UPSERT, vectors.length - i);
    log(`  Upserted ${done}/${vectors.length}`);
  }
}

// ── Build chunks ──────────────────────────────────────────────────
function buildChunks() {
  const faqPosts = JSON.parse(readFileSync(join(dataDir, 'faq_posts.json'), 'utf-8'));
  const siteFaq  = JSON.parse(readFileSync(join(dataDir, 'site_faq.json'),  'utf-8'));
  const chunks   = [];

  // ── FAQ blog posts (NL / FR) ──────────────────────────────────
  for (const post of faqPosts) {
    const text = [post.title, post.body].filter(Boolean).join('\n').slice(0, 1000);
    if (text.length < 20) continue;
    const lang = (post.tags || '').toLowerCase().includes('fr') ? 'fr' : 'nl';
    chunks.push({
      id:   `faq_post_${chunks.length}`,
      text,
      meta: {
        source:   'FAQ.xlsx',
        category: 'blog_faq',
        language: lang,
        title:    post.title || '',
        text,
      },
    });
  }
  log(`FAQ blog posts: ${faqPosts.length} → chunked`);

  // ── Site FAQ (EN) — sliding window of 3-4 lines ───────────────
  let current = [];
  let category = 'General';

  const flush = () => {
    if (current.length < 2) return;
    const text  = current.join('\n').slice(0, 1000);
    const title = current[0] || '';
    chunks.push({
      id:   `site_faq_${chunks.length}`,
      text,
      meta: {
        source:   'FAQS_SITE.docx',
        category,
        language: 'en',
        title,
        text,
      },
    });
    current = [];
  };

  for (const line of siteFaq) {
    const l = line.trim();
    if (!l) { flush(); continue; }

    // Detect category header (short, no question mark, not a sentence)
    if (l.length < 50 && !l.includes('?') && !l.includes('.') && current.length === 0) {
      category = l;
      continue;
    }

    current.push(l);
    if (current.length >= 4) flush();
  }
  flush();
  log(`Site FAQ: ${siteFaq.length} lines → ${chunks.filter(c => c.meta.source === 'FAQS_SITE.docx').length} chunks`);

  return chunks;
}

// ── Main ─────────────────────────────────────────────────────────
async function main() {
  console.log('\n╔═══════════════════════════════════════════════╗');
  console.log('║      ZEB Pinecone Seeding Script              ║');
  console.log('╚═══════════════════════════════════════════════╝\n');

  console.log('1️⃣  Ensuring Pinecone index...');
  const idx = await ensureIndex();

  console.log('\n2️⃣  Building FAQ chunks...');
  const chunks = buildChunks();
  log(`Total chunks: ${chunks.length}`);

  console.log('\n3️⃣  Generating embeddings (OpenAI text-embedding-3-large)...');
  const embeddings = await embedBatch(chunks.map(c => c.text));

  console.log('\n4️⃣  Clearing existing namespace...');
  try {
    await idx.namespace(NAMESPACE).deleteAll();
    log('Namespace cleared ✓');
  } catch {
    log('Nothing to clear (new index)');
  }

  console.log('\n5️⃣  Upserting vectors to Pinecone...');
  const vectors = chunks.map((c, i) => ({
    id:       c.id,
    values:   embeddings[i],
    metadata: c.meta,
  }));
  await upsertAll(idx, vectors);

  console.log('\n6️⃣  Verifying...');
  await new Promise(r => setTimeout(r, 2000));
  const stats = await idx.describeIndexStats();
  const count = stats.namespaces?.[NAMESPACE]?.recordCount
             || stats.totalRecordCount
             || '(check console)';

  console.log('\n╔═══════════════════════════════════════════════╗');
  console.log(`║  ✅  Seeding complete!                         ║`);
  console.log(`║                                               ║`);
  console.log(`║  Index:     ${INDEX_NAME.padEnd(34)}║`);
  console.log(`║  Namespace: ${NAMESPACE.padEnd(34)}║`);
  console.log(`║  Vectors:   ${String(count).padEnd(34)}║`);
  console.log('╚═══════════════════════════════════════════════╝\n');
  console.log('  You can now start the app with: npm run dev\n');
}

main().catch(err => {
  console.error('\n❌  Seeding failed:', err.message);
  console.error(err);
  process.exit(1);
});
