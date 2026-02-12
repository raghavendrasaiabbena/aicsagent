import Anthropic from '@anthropic-ai/sdk';
import { getConfig, onInvalidate } from './configService.js';

let client = null;
onInvalidate(() => { client = null; });

function getClient() {
  const { anthropicKey } = getConfig();
  if (!anthropicKey) throw new Error('ANTHROPIC_API_KEY not configured');
  if (!client) client = new Anthropic({ apiKey: anthropicKey });
  return client;
}

// ── 1. Intent classification ─────────────────────────────────────
export async function classifyIntent(message) {
  const { anthropicModel } = getConfig();
  const r = await getClient().messages.create({
    model: anthropicModel, max_tokens: 200,
    system: 'You are an intent classifier for ZEB.be. Return ONLY valid JSON.',
    messages: [{ role: 'user', content:
      `Message: "${message}"\n\nClassify into ONE intent:\n"order_lookup"|"return_exchange"|"payment_issue"|"delivery_info"|"product_question"|"store_info"|"complaint"|"escalation_needed"|"general_faq"|"greeting_smalltalk"\n\nAlso: language(nl/fr/en/unknown), sentiment(positive/neutral/frustrated/angry), has_order_number(bool), has_email(bool), confidence(0-1)\n\nJSON only: {intent,language,sentiment,has_order_number,has_email,confidence}`
    }],
  });
  try {
    const raw = r.content[0].text;
    return JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] ?? raw);
  } catch {
    return { intent: 'general_faq', language: 'en', sentiment: 'neutral',
             has_order_number: false, has_email: false, confidence: 0.5 };
  }
}

// ── 2. Response generation with RAG context ──────────────────────
export async function generateResponse(message, language, sentiment, ragContext, orderContext, history) {
  const { anthropicModel } = getConfig();
  const system = buildSystemPrompt(language, ragContext, orderContext);
  const messages = [
    ...history.slice(-10).map(h => ({ role: h.role, content: h.content })),
    { role: 'user', content: message },
  ];
  const r = await getClient().messages.create({
    model: anthropicModel, max_tokens: 1024, system, messages,
  });
  return r.content[0].text;
}

// ── 3. Guardrail check ───────────────────────────────────────────
export async function guardrailCheck(customerMsg, draftReply, language) {
  const { anthropicModel } = getConfig();
  const r = await getClient().messages.create({
    model: anthropicModel, max_tokens: 600,
    system: 'Quality control for ZEB.be support. Return ONLY valid JSON.',
    messages: [{ role: 'user', content:
      `Customer: ${customerMsg}\nDraft: ${draftReply}\nExpected language: ${language}\n\nCheck: HALLUCINATION, PROMISE_VIOLATION, PRIVACY_LEAK, WRONG_LANGUAGE, ESCALATION_MISSED, TONE_ISSUE, MISSING_LINK\n\nReturn: {"approved":bool,"issues":[],"corrected_response":null,"escalate":bool,"escalate_reason":null}`
    }],
  });
  try {
    const raw = r.content[0].text;
    return JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] ?? raw);
  } catch {
    return { approved: true, issues: [], corrected_response: null, escalate: false, escalate_reason: null };
  }
}

// ── System prompt builder ────────────────────────────────────────
function buildSystemPrompt(language, ragContext, orderContext) {
  const lang = ({
    nl: 'Respond ONLY in Dutch. Use informal "je/jouw".',
    fr: 'Respond ONLY in French. Mirror customer register.',
    en: 'Respond ONLY in English.',
  })[language] || 'Auto-detect and match customer language (NL/FR/EN).';

  const ragBlock = ragContext
    ? `\n\n## RETRIEVED FAQ CONTEXT (from ZEB knowledge base — use this as your PRIMARY source)\n${ragContext}\n\nBase your answer on the above context. If context is insufficient, use ZEB key facts below.`
    : '\n\n## FAQ CONTEXT\nNo specific FAQ retrieved. Use ZEB key facts below.';

  const orderBlock = orderContext
    ? `\n\n## VERIFIED ORDER DATA\n${JSON.stringify(orderContext, null, 2)}\nShow: order number, items, total, status, city. NEVER show full address, internal IDs.`
    : '';

  return `You are ZEB Assistant — official AI support for ZEB.be, Belgium's loved fashion retailer.

## LANGUAGE
${lang}

## TONE
Warm, friendly, helpful — like a ZEB store colleague. Short paragraphs, no walls of text. End every reply with an offer to help further.

## ZEB KEY FACTS
- Free delivery: Belgium, Netherlands, France, Luxembourg (Bpost)
- Returns: FREE from Belgium within 30 days via Bpost or ZEB store
- Return portal: https://zeb.returnless.com/
- NO returns: underwear, cosmetics, face masks, Panini items
- Gift cards: valid indefinitely, not exchangeable for cash
- Payments: Bancontact, Visa, Mastercard, PayPal, Apple Pay, Sodexo/Monizze, ZEB Gift Card
- Student discount: 10% for students aged 17–26
- Next-day delivery cutoff (Belgium): 8 PM on working days
- Refund timeline: max 10 business days after return received
- Contact: https://www.zeb.be/nl/contact
- Stores: https://www.zeb.be/nl/stores

## ESCALATION (say "I'll connect you with a colleague")
- Lost parcel but tracking shows delivered
- Refund waited > 14 days
- Chargeback / payment dispute
- Legal / GDPR queries
- Hostile or severely distressed customer

## RULES
- NEVER fabricate order details or tracking numbers
- NEVER share one customer's data with another
- Acknowledge frustration BEFORE solving
- Include relevant links (return portal, contact, stores)${ragBlock}${orderBlock}`;
}
