import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const load  = f => JSON.parse(readFileSync(join(__dir, '../data', f), 'utf-8'));

// orders.json is keyed by orderNumber e.g. { "#1117619": { orderNumber, email, ... } }
const ordersRaw  = load('orders.json');
const emailIndex = load('email_index.json');

// Normalize email keys to lowercase
const emailNorm = Object.fromEntries(
  Object.entries(emailIndex).map(([k, v]) => [k.toLowerCase(), v])
);

console.log(`  📦 ${Object.keys(ordersRaw).length} orders | 📧 ${Object.keys(emailNorm).length} emails`);

const EMAIL_RE = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/;
const ORDER_RE = /#?\d{6,8}/;

export function extractIdentifier(text) {
  const email = text.match(EMAIL_RE)?.[0]?.toLowerCase();
  if (email) return { type: 'email', value: email };
  const order = text.match(ORDER_RE)?.[0];
  if (order) return { type: 'order', value: order };
  return null;
}

export function lookupOrders(identifier) {
  if (!identifier) return null;

  if (identifier.type === 'order') {
    // Normalize: ensure it has a # prefix
    const key = identifier.value.startsWith('#')
      ? identifier.value.toUpperCase()
      : '#' + identifier.value;
    const order = ordersRaw[key];
    return order ? [formatOrder(order)] : null;
  }

  if (identifier.type === 'email') {
    const nums = emailNorm[identifier.value];
    if (!nums?.length) return null;
    const found = nums.map(n => ordersRaw[n]).filter(Boolean);
    return found.length ? found.map(formatOrder) : null;
  }

  return null;
}

function formatOrder(o) {
  return {
    orderNumber:       o.orderNumber,
    date:              o.date,
    paymentStatus:     o.paymentStatus,
    fulfillmentStatus: o.fulfillmentStatus,
    total:             `€${parseFloat(o.total || 0).toFixed(2)}`,
    refunded:          o.totalRefund > 0 ? `€${parseFloat(o.totalRefund).toFixed(2)}` : null,
    refundDate:        o.refundDate || null,
    shippingCity:      o.shippingCity,
    shippingCountry:   o.shippingCountry,
    customerName:      `${o.firstName || ''} ${o.lastName || ''}`.trim(),
    cancelled:         !!o.cancelled,
    items: (o.items || []).map(i => ({
      product: i.title + (i.variant && i.variant !== 'Default Title' ? ` – ${i.variant}` : ''),
      qty:     i.quantity,
      price:   `€${parseFloat(i.price || 0).toFixed(2)}`,
    })),
  };
}
