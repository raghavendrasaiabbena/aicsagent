import { useRef, useEffect, useState, KeyboardEvent } from 'react';
import { useChat } from './hooks/useChat';
import ChatBubble from './components/ChatBubble';

const ZEB = '#E31837';

const QUICK: { label: string; text: string; icon: string }[] = [
  { icon: '📦', label: 'Track my order',   text: 'Waar is mijn bestelling?' },
  { icon: '↩️', label: 'Return an item',   text: 'I want to return an item' },
  { icon: '🚚', label: 'Delivery info',    text: 'How long does delivery take?' },
  { icon: '💳', label: 'Payment methods',  text: 'What payment methods do you accept?' },
  { icon: '🔒', label: 'Is ZEB.be safe?',  text: 'Is ZEB.be safe to order from?' },
  { icon: '🎁', label: 'Gift cards',       text: 'Heeft een ZEB cadeaubon een vervaldatum?' },
];

export default function App() {
  const { messages, loading, send, reset } = useChat();
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = () => {
    const t = input.trim();
    if (!t || loading) return;
    setInput('');
    send(t);
  };

  const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column',
      fontFamily: "'DM Sans',sans-serif", background: '#f7f5f2', overflow: 'hidden' }}>

      {/* Global animation */}
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(10px) } to { opacity:1; transform:translateY(0) } }
        @keyframes bounce { 0%,80%,100%{transform:scale(0.8);opacity:0.5} 40%{transform:scale(1.1);opacity:1} }
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.7;transform:scale(0.85)} }
        * { box-sizing: border-box; }
        textarea:focus { outline: none; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: #e8e4df; border-radius: 4px; }
      `}</style>

      {/* ── Header ── */}
      <header style={{ background: '#1A1A2E', height: 60, padding: '0 24px', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, fontWeight: 700,
            color: '#fff', letterSpacing: 3 }}>
            ZE<span style={{ color: ZEB }}>B</span>
          </div>
          <div style={{ width: 1, height: 22, background: 'rgba(255,255,255,0.15)' }} />
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>AI Customer Support</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ade80',
            animation: 'pulse 2s infinite' }} />
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>Online</span>
        </div>
      </header>

      {/* ── Body ── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Sidebar */}
        <aside style={{ width: 260, background: '#fff', borderRight: '1px solid #e8e4df',
          display: 'flex', flexDirection: 'column', flexShrink: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid #e8e4df' }}>
            <button onClick={reset} style={{ width: '100%', padding: '9px 14px', background: ZEB,
              color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="M12 5v14M5 12h14"/>
              </svg>
              New conversation
            </button>
          </div>

          <div style={{ padding: '14px 12px 0' }}>
            <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
              letterSpacing: 1, color: '#9ca3af', marginBottom: 8 }}>Quick Actions</div>
            {QUICK.map(q => (
              <button key={q.text} onClick={() => { send(q.text); }}
                style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                  padding: '8px 10px', border: 'none', background: 'none', borderRadius: 7,
                  cursor: 'pointer', textAlign: 'left', marginBottom: 2, color: '#374151',
                  transition: 'background 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#f7f5f2')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                <span style={{ fontSize: 16 }}>{q.icon}</span>
                <span style={{ fontSize: 13 }}>{q.label}</span>
              </button>
            ))}
          </div>

          <div style={{ marginTop: 'auto', padding: 14, borderTop: '1px solid #e8e4df',
            fontSize: 11, color: '#9ca3af', lineHeight: 1.6 }}>
            <div style={{ fontWeight: 600, color: '#374151', marginBottom: 4 }}>Need more help?</div>
            <a href="https://www.zeb.be/nl/contact" target="_blank" rel="noopener noreferrer"
              style={{ color: ZEB, display: 'block' }}>Contact ZEB</a>
            <a href="https://www.zeb.be/nl/stores" target="_blank" rel="noopener noreferrer"
              style={{ color: ZEB, display: 'block' }}>Find a store</a>
            <a href="https://zeb.returnless.com" target="_blank" rel="noopener noreferrer"
              style={{ color: ZEB, display: 'block' }}>Return portal</a>
          </div>
        </aside>

        {/* Chat main */}
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden',
          background: '#fdf9f4' }}>
          {/* Toolbar */}
          <div style={{ padding: '10px 20px', background: '#fff', borderBottom: '1px solid #e8e4df',
            display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, flexShrink: 0,
              background: `linear-gradient(135deg, ${ZEB}, #ff6b6b)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🤖</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>ZEB Assistant</div>
              <div style={{ fontSize: 11, color: '#9ca3af' }}>AI · NL · FR · EN · RAG powered</div>
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
            {/* Welcome chips — show only if just the welcome message */}
            {messages.length === 1 && (
              <div style={{ background: '#fff', borderRadius: 16, padding: 28, textAlign: 'center',
                boxShadow: '0 1px 8px rgba(26,26,46,0.06)', border: '1px solid #e8e4df', marginBottom: 20 }}>
                <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 32, fontWeight: 700,
                  letterSpacing: 4, marginBottom: 6 }}>ZE<span style={{ color: ZEB }}>B</span></div>
                <div style={{ fontSize: 13, color: '#9ca3af', marginBottom: 20 }}>
                  How can I help you today?
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
                  {[
                    { flag: '🇧🇪', text: 'Waar is mijn bestelling?' },
                    { flag: '🇫🇷', text: 'Comment retourner un article?' },
                    { flag: '🇬🇧', text: 'Delivery times?' },
                    { flag: '',    text: 'My order lieselot@msn.com' },
                  ].map(c => (
                    <button key={c.text} onClick={() => send(c.text)}
                      style={{ padding: '7px 14px', background: '#f7f5f2', border: '1px solid #e8e4df',
                        borderRadius: 20, fontSize: 12, cursor: 'pointer', color: '#374151',
                        transition: 'all 0.15s' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = ZEB; e.currentTarget.style.color = ZEB; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = '#e8e4df'; e.currentTarget.style.color = '#374151'; }}>
                      {c.flag && <span style={{ marginRight: 5 }}>{c.flag}</span>}{c.text}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map(m => <ChatBubble key={m.id} msg={m} />)}

            {/* Typing indicator */}
            {loading && (
              <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
                <div style={{ width: 32, height: 32, borderRadius: 9,
                  background: `linear-gradient(135deg, ${ZEB}, #ff6b6b)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>🤖</div>
                <div style={{ background: '#fff', border: '1px solid #e8e4df', borderRadius: 16,
                  borderTopLeftRadius: 4, padding: '14px 18px',
                  display: 'flex', gap: 5, alignItems: 'center',
                  boxShadow: '0 1px 8px rgba(26,26,46,0.06)' }}>
                  {[0, 0.2, 0.4].map((d, i) => (
                    <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: '#9ca3af',
                      animation: `bounce 1.2s ${d}s infinite` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ padding: '12px 20px 16px', background: '#fff',
            borderTop: '1px solid #e8e4df', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10,
              background: '#f7f5f2', border: '1.5px solid #e8e4df', borderRadius: 14,
              padding: '10px 12px 10px 16px', transition: 'border-color 0.2s' }}
              onFocus={() => {}} >
              <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey}
                placeholder="Type your question... (NL / FR / EN)" rows={1}
                style={{ flex: 1, border: 'none', background: 'none', fontSize: 14,
                  fontFamily: "'DM Sans',sans-serif", resize: 'none', maxHeight: 120,
                  lineHeight: 1.5, color: '#1a1a2e' }}
                onInput={e => {
                  const t = e.currentTarget;
                  t.style.height = 'auto';
                  t.style.height = Math.min(t.scrollHeight, 120) + 'px';
                }} />
              <button onClick={handleSend} disabled={loading || !input.trim()}
                style={{ width: 38, height: 38, background: ZEB, border: 'none',
                  borderRadius: 10, cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
                  opacity: loading || !input.trim() ? 0.5 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, transition: 'all 0.2s', color: '#fff' }}>
                <svg width="16" height="16" fill="none" stroke="currentColor"
                  strokeWidth="2.5" viewBox="0 0 24 24">
                  <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z"/>
                </svg>
              </button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between',
              marginTop: 6, padding: '0 4px', fontSize: 11, color: '#9ca3af' }}>
              <span>Enter to send · Shift+Enter for new line</span>
              <span>Powered by Claude AI + Pinecone RAG</span>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
