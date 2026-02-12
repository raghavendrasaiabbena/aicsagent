import type { Source } from '../types';

export default function SourceBadges({ sources }: { sources: Source[] }) {
  if (!sources?.length) return null;
  return (
    <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
      {sources.map((s, i) => (
        <span key={i} title={`${s.source} | score: ${s.score} | ${s.category}`}
          style={{ padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 500,
            background: '#f0f9ff', color: '#0369a1', border: '1px solid #bae6fd',
            cursor: 'default' }}>
          📄 {s.title ? s.title.slice(0, 30) + (s.title.length > 30 ? '…' : '') : s.source}
          <span style={{ opacity: 0.6, marginLeft: 4 }}>{(s.score * 100).toFixed(0)}%</span>
        </span>
      ))}
    </div>
  );
}
