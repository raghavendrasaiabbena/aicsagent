import ReactMarkdown from 'react-markdown';
import type { Message } from '../types';
import OrderCard from './OrderCard';
import SourceBadges from './SourceBadges';

const ZEB = '#E31837';

const INTENT_COLORS: Record<string, { bg: string; color: string }> = {
  order_lookup:       { bg: '#EEF2FF', color: '#4F46E5' },
  return_exchange:    { bg: '#FEF3C7', color: '#D97706' },
  payment_issue:      { bg: '#F0FDF4', color: '#16A34A' },
  delivery_info:      { bg: '#F0F9FF', color: '#0369A1' },
  complaint:          { bg: '#FEF2F2', color: '#DC2626' },
  escalation_needed:  { bg: '#FFF1F2', color: '#BE123C' },
  product_question:   { bg: '#F5F3FF', color: '#7C3AED' },
  general_faq:        { bg: '#F5F3FF', color: '#7C3AED' },
};

const INTENT_LABELS: Record<string, string> = {
  order_lookup:      '📦 Order Status',
  return_exchange:   '↩️ Return & Exchange',
  payment_issue:     '💳 Payment',
  delivery_info:     '🚚 Delivery',
  store_info:        '🏪 Store Info',
  complaint:         '⚠️ Complaint',
  general_faq:       '❓ FAQ',
  product_question:  '👕 Product',
  escalation_needed: '🔴 Escalation',
  greeting_smalltalk:'👋 Greeting',
};

function formatTime(date = new Date()) {
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export default function ChatBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user';
  const intent = msg.intent && INTENT_COLORS[msg.intent];

  return (
    <div style={{ display: 'flex', gap: 10, marginBottom: 18,
      flexDirection: isUser ? 'row-reverse' : 'row',
      animation: 'fadeUp 0.25s ease' }}>

      {/* Avatar */}
      <div style={{ width: 32, height: 32, borderRadius: 9, flexShrink: 0, marginTop: 2,
        background: isUser ? '#1A1A2E' : `linear-gradient(135deg, ${ZEB}, #ff6b6b)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: isUser ? 12 : 15, color: 'white', fontWeight: 600 }}>
        {isUser ? 'Y' : '🤖'}
      </div>

      <div style={{ maxWidth: '68%' }}>
        {/* Intent badge */}
        {!isUser && msg.intent && msg.intent !== 'greeting_smalltalk' && intent && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '3px 10px', borderRadius: 20, fontSize: 10, fontWeight: 600,
            letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6,
            background: intent.bg, color: intent.color }}>
            {INTENT_LABELS[msg.intent] || msg.intent}
            {msg.sentiment && msg.sentiment !== 'neutral' && (
              <span style={{ marginLeft: 4, opacity: 0.7 }}>
                {msg.sentiment === 'frustrated' ? '😟' : msg.sentiment === 'angry' ? '😠' : '🙂'}
              </span>
            )}
          </div>
        )}

        {/* Bubble */}
        <div style={{
          padding: '12px 16px', borderRadius: 16, fontSize: 14, lineHeight: 1.65,
          background: isUser ? '#1A1A2E' : '#fff',
          color:      isUser ? '#fff'     : '#2D2D3A',
          borderTopLeftRadius:  isUser ? 16 : 4,
          borderTopRightRadius: isUser ? 4  : 16,
          border: isUser ? 'none' : '1px solid #e8e4df',
          boxShadow: isUser ? 'none' : '0 1px 8px rgba(26,26,46,0.06)',
        }}>
          <ReactMarkdown
            components={{
              a: ({ href, children }) => (
                <a href={href} target="_blank" rel="noopener noreferrer"
                  style={{ color: isUser ? '#ff9eb5' : ZEB, textUnderlineOffset: 2 }}>
                  {children}
                </a>
              ),
              p: ({ children }) => <p style={{ margin: '0 0 6px' }}>{children}</p>,
              ul: ({ children }) => <ul style={{ paddingLeft: 18, margin: '6px 0' }}>{children}</ul>,
              ol: ({ children }) => <ol style={{ paddingLeft: 18, margin: '6px 0' }}>{children}</ol>,
              li: ({ children }) => <li style={{ marginBottom: 3 }}>{children}</li>,
            }}>
            {msg.content}
          </ReactMarkdown>
        </div>

        {/* Order cards */}
        {!isUser && msg.orders?.map((o, i) => <OrderCard key={i} order={o} />)}

        {/* RAG sources */}
        {!isUser && <SourceBadges sources={msg.sources || []} />}

        {/* Escalation banner */}
        {!isUser && msg.escalated && (
          <div style={{ marginTop: 10, background: 'linear-gradient(135deg,#fff1f2,#ffe4e6)',
            border: '1px solid #fecdd3', borderRadius: 10, padding: '10px 14px',
            display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <span style={{ fontSize: 18 }}>🔴</span>
            <div style={{ fontSize: 12, color: '#9f1239', lineHeight: 1.5 }}>
              <strong>Escalation triggered</strong>
              {msg.escalationReason && <div style={{ opacity: 0.8 }}>{msg.escalationReason}</div>}
            </div>
          </div>
        )}

        {/* Meta */}
        <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 4,
          textAlign: isUser ? 'right' : 'left',
          display: 'flex', gap: 8, justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
          <span>{formatTime()}</span>
          {!isUser && msg.ms && <span>{msg.ms}ms</span>}
        </div>
      </div>
    </div>
  );
}
