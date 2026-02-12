import { useState, useEffect, useCallback } from 'react';

const API = (import.meta.env.VITE_API_URL || '') + '/api/admin';
//const API = '/api/admin';
const ZEB = '#E31837';

// ── Tiny UI primitives ───────────────────────────────────────────
const Card = ({ children, style = {} }: any) => (
  <div style={{ background: '#fff', borderRadius: 12, padding: 24,
    boxShadow: '0 1px 8px rgba(0,0,0,0.08)', border: '1px solid #e8e4df', ...style }}>
    {children}
  </div>
);

const Btn = ({ children, onClick, disabled, variant = 'primary', style = {} }: any) => (
  <button onClick={onClick} disabled={disabled} style={{
    padding: '10px 20px', borderRadius: 8, border: 'none', fontFamily: 'DM Sans,sans-serif',
    fontSize: 13, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1, transition: 'all 0.15s',
    background: variant === 'primary' ? ZEB : variant === 'danger' ? '#dc2626' : '#f3f4f6',
    color: variant === 'ghost' ? '#374151' : '#fff',
    ...style,
  }}>{children}</button>
);

const Input = ({ label, value, onChange, type = 'text', placeholder = '' }: any) => (
  <label style={{ display: 'block', marginBottom: 16 }}>
    <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e8e4df', borderRadius: 8,
        fontSize: 14, fontFamily: 'DM Sans,sans-serif', outline: 'none', boxSizing: 'border-box' as const }} />
  </label>
);

const Tag = ({ color, children }: any) => (
  <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
    background: color + '18', color, border: `1px solid ${color}33` }}>{children}</span>
);

// ── Login screen ─────────────────────────────────────────────────
function Login({ onLogin }: { onLogin: (s: string) => void }) {
  const [secret, setSecret] = useState('');
  const [err, setErr]       = useState('');

  const attempt = async () => {
    const r = await fetch(`${API}/config`, { headers: { 'x-admin-secret': secret } });
    if (r.ok) { onLogin(secret); }
    else       { setErr('Wrong password. Check ADMIN_SECRET in server .env'); }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f7f5f2', display: 'flex',
      alignItems: 'center', justifyContent: 'center', fontFamily: 'DM Sans,sans-serif' }}>
      <Card style={{ width: 380 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 32, fontWeight: 700, color: ZEB, letterSpacing: 3 }}>ZEB</div>
          <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>Admin Configuration Panel</div>
        </div>
        <Input label="Admin Password" type="password" value={secret}
          onChange={setSecret} placeholder="Enter ADMIN_SECRET from .env" />
        {err && <div style={{ color: '#dc2626', fontSize: 13, marginBottom: 12 }}>{err}</div>}
        <Btn onClick={attempt} style={{ width: '100%' }}>Sign In</Btn>
      </Card>
    </div>
  );
}

// ── Main Admin App ───────────────────────────────────────────────
export default function AdminApp() {
  const [secret, setSecret]       = useState('');
  const [tab, setTab]             = useState<'config'|'index'|'health'>('config');
  const [config, setConfig]       = useState<any>({});
  const [stats, setStats]         = useState<any>(null);
  const [health, setHealth]       = useState<any>(null);
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);
  const [indexLog, setIndexLog]   = useState<string[]>([]);
  const [indexing, setIndexing]   = useState(false);
  const [indexDone, setIndexDone] = useState(false);

  const headers = useCallback(() => ({
    'Content-Type': 'application/json', 'x-admin-secret': secret,
  }), [secret]);

  // Load config + stats
  useEffect(() => {
    if (!secret) return;
    fetch(`${API}/config`, { headers: headers() }).then(r => r.json()).then(setConfig);
    fetch(`${API}/stats`,  { headers: headers() }).then(r => r.json()).then(setStats);
    fetch('/api/health').then(r => r.json()).then(setHealth);
  }, [secret, headers]);

  const saveConfig = async () => {
    setSaving(true);
    await fetch(`${API}/config`, { method: 'POST', headers: headers(), body: JSON.stringify(config) });
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const startReindex = async () => {
    setIndexLog([]); setIndexing(true); setIndexDone(false);
    const r = await fetch(`${API}/reindex`, { method: 'POST', headers: headers() });
    const reader = r.body!.getReader();
    const dec    = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const lines = dec.decode(value).split('\n').filter(l => l.startsWith('data:'));
      for (const line of lines) {
        try {
          const d = JSON.parse(line.slice(5));
          setIndexLog(prev => [...prev, `[${d.step}] ${d.message}`]);
          if (d.step === 'done' || d.step === 'error') setIndexDone(true);
        } catch {}
      }
    }
    setIndexing(false);
    // Refresh stats
    fetch(`${API}/stats`, { headers: headers() }).then(r => r.json()).then(setStats);
  };

  if (!secret) return <Login onLogin={setSecret} />;

  const TABS = [
    { id: 'config', label: '⚙️  API Keys & Config' },
    { id: 'index',  label: '🔄  Pinecone Index' },
    { id: 'health', label: '🩺  Health' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#f7f5f2', fontFamily: 'DM Sans,sans-serif' }}>
      {/* Header */}
      <header style={{ background: '#1a1a2e', padding: '0 32px', height: 60,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 20, color: '#fff', letterSpacing: 3 }}>ZEB</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Admin Panel</div>
        </div>
        <Btn variant="ghost" onClick={() => setSecret('')}
          style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', padding: '6px 14px' }}>
          Sign Out
        </Btn>
      </header>

      <div style={{ maxWidth: 860, margin: '0 auto', padding: 32 }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 24 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id as any)}
              style={{ padding: '9px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
                fontFamily: 'DM Sans,sans-serif', fontSize: 13, fontWeight: 500,
                background: tab === t.id ? ZEB : '#fff',
                color: tab === t.id ? '#fff' : '#374151',
                boxShadow: tab === t.id ? 'none' : '0 1px 4px rgba(0,0,0,0.06)',
              }}>{t.label}</button>
          ))}
        </div>

        {/* ── Config Tab ── */}
        {tab === 'config' && (
          <div style={{ display: 'grid', gap: 20 }}>
            <Card>
              <h2 style={{ margin: '0 0 20px', fontSize: 16 }}>🤖 Anthropic</h2>
              <Input label="API Key" value={config.anthropicKey || ''} type="password"
                onChange={(v: string) => setConfig({ ...config, anthropicKey: v })}
                placeholder="sk-ant-api03-..." />
              <label style={{ display: 'block', marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6, textTransform: 'uppercase' as const, letterSpacing: 0.5 }}>Model</div>
                <select value={config.anthropicModel || ''} onChange={e => setConfig({ ...config, anthropicModel: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e8e4df',
                    borderRadius: 8, fontSize: 14, fontFamily: 'DM Sans,sans-serif', background: '#fff' }}>
                  <option value="claude-sonnet-4-5-20250929">claude-sonnet-4-5-20250929 (recommended)</option>
                  <option value="claude-opus-4-5-20251101">claude-opus-4-5-20251101 (most capable)</option>
                  <option value="claude-haiku-4-5-20251001">claude-haiku-4-5-20251001 (fastest)</option>
                </select>
              </label>
            </Card>

            <Card>
              <h2 style={{ margin: '0 0 20px', fontSize: 16 }}>🧠 OpenAI (Embeddings)</h2>
              <Input label="API Key" value={config.openaiKey || ''} type="password"
                onChange={(v: string) => setConfig({ ...config, openaiKey: v })}
                placeholder="sk-..." />
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: -8 }}>
                Used only for generating text-embedding-3-large vectors. Not used for chat.
              </div>
            </Card>

            <Card>
              <h2 style={{ margin: '0 0 20px', fontSize: 16 }}>🌲 Pinecone</h2>
              <Input label="API Key" value={config.pineconeKey || ''} type="password"
                onChange={(v: string) => setConfig({ ...config, pineconeKey: v })}
                placeholder="your-pinecone-api-key" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <Input label="Index Name" value={config.pineconeIndex || ''} 
                  onChange={(v: string) => setConfig({ ...config, pineconeIndex: v })}
                  placeholder="zeb-faq" />
                <Input label="Namespace" value={config.pineconeNs || ''}
                  onChange={(v: string) => setConfig({ ...config, pineconeNs: v })}
                  placeholder="production" />
              </div>
            </Card>

            <Card>
              <h2 style={{ margin: '0 0 20px', fontSize: 16 }}>🎛️ RAG Parameters</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: 0.5, color: '#374151' }}>
                    Top K results: {config.topK}
                  </label>
                  <input type="range" min={1} max={10} value={config.topK || 5}
                    onChange={e => setConfig({ ...config, topK: parseInt(e.target.value) })}
                    style={{ width: '100%', marginTop: 8 }} />
                  <div style={{ fontSize: 11, color: '#6b7280' }}>How many FAQ chunks to retrieve per query</div>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: 0.5, color: '#374151' }}>
                    Min similarity: {config.minScore}
                  </label>
                  <input type="range" min={0.5} max={0.95} step={0.05} value={config.minScore || 0.70}
                    onChange={e => setConfig({ ...config, minScore: parseFloat(e.target.value) })}
                    style={{ width: '100%', marginTop: 8 }} />
                  <div style={{ fontSize: 11, color: '#6b7280' }}>Minimum cosine similarity score (0.7 recommended)</div>
                </div>
              </div>
            </Card>

            <div style={{ display: 'flex', gap: 12 }}>
              <Btn onClick={saveConfig} disabled={saving}>
                {saving ? 'Saving...' : '💾 Save Configuration'}
              </Btn>
              {saved && <div style={{ color: '#16a34a', alignSelf: 'center', fontSize: 14 }}>✅ Saved! No restart needed.</div>}
            </div>
          </div>
        )}

        {/* ── Index Tab ── */}
        {tab === 'index' && (
          <div style={{ display: 'grid', gap: 20 }}>
            {stats && (
              <Card>
                <h2 style={{ margin: '0 0 16px', fontSize: 16 }}>📊 Current Index Stats</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                  {[
                    { label: 'Total Vectors', value: stats.totalVectors ?? '—' },
                    { label: 'Dimension',     value: stats.dimension    ?? 1536 },
                    { label: 'Index',         value: config.pineconeIndex || '—' },
                  ].map(s => (
                    <div key={s.label} style={{ textAlign: 'center', padding: 16, background: '#f7f5f2', borderRadius: 10 }}>
                      <div style={{ fontSize: 28, fontWeight: 700, color: ZEB }}>{s.value}</div>
                      <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            <Card>
              <h2 style={{ margin: '0 0 8px', fontSize: 16 }}>🔄 Re-Index FAQ Data</h2>
              <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 20px', lineHeight: 1.6 }}>
                This will embed all FAQ data from your data files and upsert to Pinecone.<br />
                <strong>Sources:</strong> FAQ.xlsx (58 NL/FR blog posts) + FAQS_SITE.docx (280 EN paragraphs)<br />
                <strong>Takes approx. 2–3 minutes.</strong> Existing vectors in the namespace will be replaced.
              </p>

              <div style={{ marginBottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
                <Tag color="#16a34a">58 FAQ blog posts (NL/FR)</Tag>
                <Tag color="#2563eb">280 site FAQ paragraphs (EN)</Tag>
                <Tag color="#7c3aed">text-embedding-3-large</Tag>
              </div>

              <Btn onClick={startReindex} disabled={indexing} variant={indexDone ? 'ghost' : 'primary'}>
                {indexing ? '⏳ Indexing...' : indexDone ? '🔄 Re-run Index' : '🚀 Start Indexing'}
              </Btn>
            </Card>

            {indexLog.length > 0 && (
              <Card>
                <h3 style={{ margin: '0 0 12px', fontSize: 14 }}>Index Log</h3>
                <div style={{ background: '#1a1a2e', borderRadius: 8, padding: 16, fontFamily: 'monospace',
                  fontSize: 12, color: '#a3e635', maxHeight: 300, overflowY: 'auto', lineHeight: 1.8 }}>
                  {indexLog.map((line, i) => <div key={i}>{line}</div>)}
                  {indexing && <div style={{ color: '#facc15' }}>⏳ processing...</div>}
                </div>
              </Card>
            )}
          </div>
        )}

        {/* ── Health Tab ── */}
        {tab === 'health' && (
          <Card>
            <h2 style={{ margin: '0 0 20px', fontSize: 16 }}>🩺 System Health</h2>
            {health ? (
              <div style={{ display: 'grid', gap: 12 }}>
                {Object.entries(health.checks || {}).map(([k, ok]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '12px 16px', background: '#f7f5f2', borderRadius: 8 }}>
                    <span style={{ fontSize: 14, textTransform: 'capitalize' as const }}>{k.replace(/([A-Z])/g, ' $1')}</span>
                    <Tag color={ok ? '#16a34a' : '#dc2626'}>{ok ? '✅ OK' : '❌ Missing'}</Tag>
                  </div>
                ))}
                <div style={{ padding: '12px 16px', background: '#f7f5f2', borderRadius: 8, display: 'flex', justifyContent: 'space-between' }}>
                  <span>Overall Status</span>
                  <Tag color={health.status === 'ok' ? '#16a34a' : '#d97706'}>
                    {health.status === 'ok' ? '✅ All systems ready' : '⚠️ Setup required'}
                  </Tag>
                </div>
              </div>
            ) : <div>Loading...</div>}
            <Btn variant="ghost" onClick={() => fetch('/api/health').then(r => r.json()).then(setHealth)}
              style={{ marginTop: 16 }}>
              🔁 Refresh
            </Btn>
          </Card>
        )}
      </div>
    </div>
  );
}
