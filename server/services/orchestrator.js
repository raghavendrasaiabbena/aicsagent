import { classifyIntent, generateResponse, guardrailCheck } from './claudeService.js';
import { extractIdentifier, lookupOrders } from './orderService.js';
import { retrieveContext } from './ragService.js';

export async function handleMessage(message, history = []) {
  const t0 = Date.now();
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`→ "${message.slice(0, 80)}"`);

  // Step 1: Classify intent
  const intent = await classifyIntent(message);
  console.log(`  Intent:    ${intent.intent} | ${intent.language} | ${intent.sentiment}`);

  // Step 2: Order lookup
  let orderContext = null;
  const identifier = extractIdentifier(message);
  if (identifier) {
    orderContext = lookupOrders(identifier);
    console.log(`  Orders:    ${orderContext ? orderContext.length + ' found' : 'not found'} (${identifier.type}: ${identifier.value})`);
  }

  // Step 3: RAG retrieval
  let ragContext = '';
  let sources    = [];
  try {
    const rag = await retrieveContext(message, intent.language);
    ragContext = rag.context;
    sources    = rag.sources;

    if (sources.length > 0) {
      console.log(`  RAG:       ✅ ${sources.length} chunks retrieved`);
      sources.forEach((s, i) => {
        console.log(`    [${i+1}] score=${s.score} | "${s.title?.slice(0,50) || s.category}" | ${s.source}`);
      });
    } else {
      console.log(`  RAG:       ⚠️  0 chunks retrieved — Claude will use system prompt knowledge only`);
    }
  } catch (err) {
    console.warn(`  RAG:       ❌ failed (${err.message})`);
  }

  // Step 4: Generate response
  let reply;
  try {
    reply = await generateResponse(
      message, intent.language, intent.sentiment,
      ragContext, orderContext, history
    );
  } catch (err) {
    console.error('  Claude:    ❌', err.message);
    const lang = intent.language;
    reply = lang === 'nl'
      ? 'Er is een technisch probleem. Probeer opnieuw of contacteer ons via https://www.zeb.be/nl/contact'
      : lang === 'fr'
      ? 'Problème technique. Réessayez ou contactez-nous via https://www.zeb.be/nl/contact'
      : 'Technical issue. Please try again or contact us at https://www.zeb.be/nl/contact';
    return { reply, intent: intent.intent, language: intent.language,
             sentiment: intent.sentiment, orders: orderContext,
             sources: [], escalated: false, escalationReason: null, ms: Date.now() - t0 };
  }

  // Step 5: Guardrail check
  let escalated = false, escalationReason = null;
  try {
    const guard = await guardrailCheck(message, reply, intent.language);
    if (!guard.approved && guard.corrected_response) {
      console.log(`  Guardrail: ✏️  response corrected`);
      reply = guard.corrected_response;
    }
    escalated        = !!guard.escalate;
    escalationReason = guard.escalate_reason || null;

    if (guard.issues?.length) {
      console.log(`  Guardrail: ⚠️  issues: ${guard.issues.join(', ')}`);
      if (sources.length === 0 && guard.issues.includes('HALLUCINATION')) {
        console.log(`             → HALLUCINATION likely because RAG returned 0 chunks.`);
        console.log(`             → Check Pinecone: is index seeded? Is namespace correct?`);
      }
    } else {
      console.log(`  Guardrail: ✅ approved`);
    }
    if (escalated) console.log(`  Escalate:  🔴 ${escalationReason}`);
  } catch (err) {
    console.warn('  Guardrail: skipped -', err.message);
  }

  const ms = Date.now() - t0;
  console.log(`  Done:      ${ms}ms`);

  return {
    reply,
    intent:          intent.intent,
    language:        intent.language,
    sentiment:       intent.sentiment,
    orders:          orderContext,
    sources,
    escalated,
    escalationReason,
    ms,
  };
}
