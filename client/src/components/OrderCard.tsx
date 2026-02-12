import type { Order } from '../types';

const pillStyle = (color: string) => ({
  padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
  background: color + '20', color, border: `1px solid ${color}40`,
});

const STATUS_COLORS: Record<string, string> = {
  paid: '#16a34a', pending: '#ca8a04', authorized: '#0369a1',
  fulfilled: '#1d4ed8', unfulfilled: '#d97706', partial: '#9333ea',
  refunded: '#dc2626', cancelled: '#dc2626', voided: '#6b7280',
};

export default function OrderCard({ order }: { order: Order }) {
  const payColor = STATUS_COLORS[order.paymentStatus?.toLowerCase()]     || '#6b7280';
  const fulColor = STATUS_COLORS[order.fulfillmentStatus?.toLowerCase()] || '#6b7280';

  return (
    <div style={{ background: '#f7f5f2', border: '1px solid #e8e4df',
      borderRadius: 12, padding: 14, marginTop: 10 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ fontWeight: 700, fontSize: 15, fontFamily: "'Playfair Display',serif" }}>
          {order.orderNumber}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <span style={pillStyle(payColor)}>{order.paymentStatus}</span>
          <span style={pillStyle(fulColor)}>{order.fulfillmentStatus}</span>
        </div>
      </div>

      {/* Meta */}
      <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 10, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {order.date        && <span>📅 {order.date}</span>}
        {order.shippingCity && <span>📍 {order.shippingCity}, {order.shippingCountry}</span>}
        {order.customerName && <span>👤 {order.customerName}</span>}
      </div>

      {/* Items */}
      {order.items?.length > 0 && (
        <div style={{ borderTop: '1px solid #e8e4df', paddingTop: 8, marginBottom: 8 }}>
          {order.items.map((item, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between',
              fontSize: 12, padding: '3px 0', color: '#374151' }}>
              <span>{item.product}{item.qty > 1 ? ` ×${item.qty}` : ''}</span>
              <span>{item.price}</span>
            </div>
          ))}
        </div>
      )}

      {/* Total */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13,
        fontWeight: 700, borderTop: '1px solid #e8e4df', paddingTop: 8 }}>
        <span>Total</span>
        <div style={{ textAlign: 'right' }}>
          <span>{order.total}</span>
          {order.refunded && (
            <div style={{ color: '#dc2626', fontSize: 11, fontWeight: 400 }}>
              Refunded: {order.refunded}{order.refundDate ? ` on ${order.refundDate}` : ''}
            </div>
          )}
        </div>
      </div>

      {order.cancelled && (
        <div style={{ marginTop: 8, color: '#dc2626', fontSize: 12, fontWeight: 500 }}>
          ⚠️ This order was cancelled
        </div>
      )}
    </div>
  );
}
