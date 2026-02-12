# ZEB AI Customer Support Agent — Pro

Full-stack AI support agent with proper RAG (Retrieval-Augmented Generation), Admin panel, and secure API proxy.

---

## Architecture

```
Browser (Chat UI)          Browser (Admin Panel)
  :5173                       :5174
    │                            │
    └──────────┬─────────────────┘
               │  /api/*
               ▼
         Node.js API  :5000
               │
       ┌───────┼───────────┐
       │       │           │
   Anthropic  OpenAI   Pinecone
  (Claude AI) (Embed)  (Vector DB)
               │
         Your FAQ data
    (FAQ.xlsx + FAQS_SITE.docx)
```

**Per message pipeline:**
1. **Intent classify** — Claude detects intent, language, sentiment
2. **Order lookup** — direct in-memory lookup by email or order number
3. **RAG retrieval** — embed query → search Pinecone → return top-K FAQ chunks
4. **Response generate** — Claude answers using retrieved chunks as grounded context
5. **Guardrail check** — Claude validates for hallucination, privacy leaks, escalation

---

## Requirements

| Tool | Version | Get it |
|------|---------|--------|
| Node.js | 18+ | https://nodejs.org |
| Anthropic API key | — | https://console.anthropic.com/settings/keys |
| OpenAI API key | — | https://platform.openai.com/api-keys |
| Pinecone account | Free tier works | https://app.pinecone.io |

> **Why OpenAI?** Only for generating embeddings (text-embedding-3-large). Claude does all actual chat. You can use ~$0.01 worth of OpenAI credits to index all data.

---

## First-time Setup

### 1. Install dependencies

```cmd
npm run install:all
```

Or run `start.bat` on Windows — it installs everything automatically.

### 2. Configure the server

Copy and edit `server/.env`:

```cmd
copy server\.env.example server\.env
notepad server\.env
```

Fill in all four keys:

```env
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
PINECONE_API_KEY=...
PINECONE_INDEX=zeb-faq
ADMIN_SECRET=choose-a-strong-password
```

### 3. Create Pinecone index + seed FAQ data

```cmd
copy scripts\.env.example scripts\.env
notepad scripts\.env
```

Add the same OpenAI and Pinecone keys, then run:

```cmd
cd scripts
npm install
node seed-pinecone.js
```

This will:
- Create the `zeb-faq` index in Pinecone (serverless, dimension=1536, metric=cosine)
- Embed all 58 FAQ blog posts (NL/FR) + 280 site FAQ paragraphs (EN)
- Upsert ~100 vectors into Pinecone

Takes about 2–3 minutes. Only needs to run **once** (or when FAQ data changes).

### 4. Start the app

```cmd
npm run dev
```

Opens three servers:
- **Chat UI** → http://localhost:5173
- **Admin Panel** → http://localhost:5174
- **API** → http://localhost:5000

---

## Admin Panel

Open http://localhost:5174

Login with the `ADMIN_SECRET` you set in `server/.env`.

**What you can do:**

| Tab | Action |
|-----|--------|
| API Keys & Config | Update Anthropic / OpenAI / Pinecone keys at runtime (no restart) |
| | Change Claude model, top-K results, minimum similarity score |
| Pinecone Index | View current vector count, re-index FAQ data |
| Health | Check all API connections |

---

## Hosting on a domain

### Option A — VPS (DigitalOcean, Hetzner, etc.)

```bash
# On your server
git clone ... && cd zeb-agent
npm run install:all
cp server/.env.example server/.env
nano server/.env   # add your keys

# Seed Pinecone (one time)
cd scripts && npm install && node seed-pinecone.js && cd ..

# Build frontend apps
cd client && npm run build && cd ..
cd admin  && npm run build && cd ..

# Start API server
cd server && npm start
```

Then configure Nginx to:
- Serve `client/dist` at your domain (e.g. `support.zeb.be`)
- Serve `admin/dist` at your admin subdomain (e.g. `admin.zeb.be`)
- Proxy `/api/*` to `http://localhost:5000`

**Nginx example:**
```nginx
server {
  server_name support.yourdomain.com;

  location /api/ {
    proxy_pass http://localhost:5000;
  }

  location / {
    root /var/www/zeb/client/dist;
    try_files $uri /index.html;
  }
}
```

### Option B — Vercel (frontend) + Railway (API)

1. Deploy `server/` to Railway — set env vars in the Railway dashboard
2. Deploy `client/` to Vercel — set `VITE_API_URL` to your Railway URL
3. Deploy `admin/` to Vercel (separate project)

---

## Project structure

```
zeb-agent/
├── server/
│   ├── index.js                 ← Express entry (port 5000)
│   ├── routes/
│   │   ├── chat.js              ← POST /api/chat
│   │   ├── admin.js             ← GET/POST /api/admin/* (auth protected)
│   │   └── health.js            ← GET /api/health
│   ├── services/
│   │   ├── orchestrator.js      ← Full pipeline per message
│   │   ├── claudeService.js     ← Intent, response, guardrail LLM calls
│   │   ├── ragService.js        ← Embed query + retrieve from Pinecone
│   │   ├── pineconeService.js   ← Query/upsert/stats Pinecone
│   │   ├── embeddingService.js  ← OpenAI text-embedding-3-large
│   │   ├── orderService.js      ← In-memory order + email lookup
│   │   └── configService.js     ← Runtime config store
│   ├── data/
│   │   ├── orders.json          ← 300 real ZEB orders
│   │   ├── email_index.json     ← 294 customer emails
│   │   ├── faq_posts.json       ← 58 FAQ blog posts (NL/FR)
│   │   └── site_faq.json        ← 280 site FAQ paragraphs (EN)
│   └── .env.example
├── client/                      ← React chat UI (port 5173)
├── admin/                       ← React admin panel (port 5174)
├── scripts/
│   └── seed-pinecone.js         ← One-time Pinecone index + seed script
├── package.json                 ← Root — runs all three with concurrently
└── start.bat                    ← Windows setup + run helper
```

---

## Test queries

| Input | What happens |
|-------|-------------|
| `lieselot@msn.com` | Looks up real order #1117619 |
| `#1117619` | Direct order lookup |
| `Waar is mijn bestelling?` | NL — order status |
| `Comment retourner un article?` | FR — returns FAQ from Pinecone |
| `Is retourneren gratis?` | NL — return policy from Pinecone |
| `Do you have student discount?` | EN — FAQ from Pinecone |
| `I've been waiting 3 weeks for my refund` | Triggers escalation |

---

## API Keys Cost Estimate

| Service | Usage | Estimated Cost |
|---------|-------|---------------|
| Anthropic | 3 calls/message (intent + response + guardrail) | ~$0.01–0.02 per conversation |
| OpenAI | Seeding only (one-time) | ~$0.01 total |
| Pinecone | Free tier: 1 index, 100K vectors | $0 |
