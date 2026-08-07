// api.js — talks to the FastAPI backend. Every call has a safe fallback so the
// dashboard works even if the backend is down (reliable live demo).
import { decideLocally } from './demoData.js'

const BASE = '/api' // proxied to http://localhost:8000 by vite.config.js

export async function checkBackend() {
  try {
    const r = await fetch(`${BASE}/health`, { signal: AbortSignal.timeout(1500) })
    return r.ok
  } catch { return false }
}

export async function checkLLM() {
  try {
    const r = await fetch(`${BASE}/llm_status`, { signal: AbortSignal.timeout(1500) })
    if (!r.ok) return { llm_active: false }
    return await r.json()
  } catch { return { llm_active: false } }
}

// Ask the AI a question about a decision. Falls back to a local template answer.
export async function askAI(question, decision) {
  try {
    const r = await fetch(`${BASE}/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, decision }),
      signal: AbortSignal.timeout(12000),
    })
    if (!r.ok) throw new Error('bad status')
    const data = await r.json()
    return { text: data.text, source: data.source }
  } catch {
    return { text: localAnswer(question, decision), source: 'template' }
  }
}

// Local fallback answer built from the decision fields (no network needed).
function localAnswer(question, d) {
  const risk = Math.round((d.risk || 0) * 100)
  const reason = (d.reason || 'sure_buyer').replace(/_/g, ' ')
  const action = (d.action || 'do_nothing').replace(/_/g, ' ')
  const disc = d.discount_amount || 0
  const q = question.toLowerCase()
  if (q.includes('cost')) {
    return d.engine === 'llm_escalated'
      ? 'This was a borderline case, so it was routed to the LLM (~₹0.25). Easy cases use cheap classical ML (~₹0.0002) — that keeps the average cost per decision tiny.'
      : 'This was a clear case decided by the cheap classical model (~₹0.0002). We only route genuinely uncertain sessions to the LLM, so the average cost stays very low.'
  }
  if (q.includes('signal')) {
    const sigs = (d.top_signals || []).map((s) => s.signal).join('; ')
    return `The main signals driving this were: ${sigs || 'smooth funnel progression'}. Risk came out at ${risk}%.`
  }
  return `With a ${risk}% abandonment risk driven by ${reason}, the AI chose to ${action}. ` +
    (disc > 0 ? `The ₹${Math.round(disc)} spend stays within budget.` : 'This spends ₹0 discount, protecting margin.')
}

export { decideLocally }

// Score ONE session via the backend /score. Falls back to local decideLocally.
export async function scoreSession(payload) {
  try {
    const r = await fetch(`${BASE}/score`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(6000),
    })
    if (!r.ok) throw new Error('bad status')
    return await r.json()
  } catch {
    // Local fallback: mirror the backend decision logic from demoData.
    return localScore(payload)
  }
}

// Ask the backend for a rich LLM explanation of a decision. Falls back to the
// decision's own explanation string.
export async function explainDecision(decision) {
  try {
    const r = await fetch(`${BASE}/explain`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: decision.session_id || '', risk: decision.risk || 0,
        reason: decision.reason || '', action: decision.action || '',
        discount_amount: decision.discount_amount || 0,
        top_signals: decision.top_signals || [],
      }),
      signal: AbortSignal.timeout(12000),
    })
    if (!r.ok) throw new Error('bad status')
    return await r.json()
  } catch {
    return { text: decision.explanation || '', source: 'template' }
  }
}

// Local scoring fallback — derives a decision from raw inputs (no backend).
function localScore(p) {
  const pageViews = p.n_page_view || 0, atc = p.n_add_to_cart || 0
  const checkout = p.n_checkout || 0, dur = p.duration_s || 0
  const pay = p.n_payment_attempts || 0, payFail = !!p.payment_failed
  const cart = p.cart_value || 0, waConsent = !!p.consent_whatsapp
  // simple risk heuristic mirroring the trained model's tendencies
  let risk = 0.3
  if (payFail) risk = 0.85
  else if (pageViews >= 15 && atc <= 1) risk = 0.68
  else if (checkout > 0 && dur > 600) risk = 0.62
  else if (checkout > 0 && dur < 200) risk = 0.55
  else if (checkout > 0 && pay >= 1) risk = 0.15
  risk = Math.max(0.02, Math.min(0.98, risk))

  const deliveryDays = p.delivery_days || 0
  let reason, action, discount = 0, engine = 'classical'
  if (risk < 0.35) { reason = 'sure_buyer'; action = 'do_nothing' }
  else if (payFail || pay >= 2) {
    reason = 'payment_failure'
    action = pay >= 2 ? 'cod_offer' : 'payment_retry_help'
  } else if (deliveryDays >= 7 && checkout > 0 && pay === 0) {
    reason = 'delivery_delay'; action = 'faster_delivery'
  } else if (atc > 0 && checkout === 0 && pay === 0) {
    // distracted abandoner — added to cart, never checked out
    reason = 'distracted_abandoner'
    if (cart >= 1000 && risk >= 0.65) { action = 'small_coupon'; discount = Math.min(cart * 0.1, 150) }
    else action = waConsent ? 'whatsapp_reminder' : 'email_reminder'
  } else if (checkout > 0 && dur > 400 && pay === 0) { reason = 'form_friction'; action = waConsent ? 'whatsapp_reminder' : 'email_reminder' }
  else if (checkout > 0 && dur < 200) { reason = 'shipping_shock'; action = 'free_shipping_nudge'; discount = 60 }
  else { reason = 'price_shopping'; if (cart >= 800 && risk >= 0.65) { action = 'small_coupon'; discount = Math.min(cart * 0.1, 150) } else action = 'email_reminder' }

  if (risk >= 0.48 && risk <= 0.58) engine = 'llm_escalated'
  const expl = {
    do_nothing: 'Low risk / sure buyer — a coupon would just waste margin on a sale we would win anyway.',
    payment_retry_help: 'Payment failed once — offer a one-tap retry / alternate method. No discount needed.',
    cod_offer: `${pay} failed payment attempts — the payment rail is the blocker, so offer Cash-on-Delivery to bypass it (India-specific).`,
    free_shipping_nudge: 'Bounced at checkout — likely shipping cost. Free shipping targets the exact objection.',
    whatsapp_reminder: 'Stuck on the form — a WhatsApp resume-checkout nudge removes friction, no margin spent.',
    email_reminder: 'A free email nudge beats giving away margin here.',
    small_coupon: `Genuine price-shopper / high-risk abandoned cart worth ₹${Math.round(cart)} — a capped ₹${Math.round(discount)} coupon can tip the decision, within budget.`,
    cod_offer: `${pay} failed payment attempts — the payment rail is the blocker, so offer Cash-on-Delivery to bypass it (India-specific). ₹0 discount.`,
    faster_delivery: `Left over a ${deliveryDays}-day delivery estimate — offer an expedited-delivery option / guarantee. Fixes the real objection, ₹0 discount.`,
  }[action]
  return {
    session_id: p.session_id, risk, reason, reason_confidence: 0.8, action,
    discount_amount: discount, channel_cost: 0, explanation: expl,
    top_signals: [{ signal: payFail ? 'payment failed after attempts' : 'browsing/checkout pattern', weight: 0.8 }],
    decision_cost: engine === 'llm_escalated' ? 0.25 : 0.0002, engine, latency_ms: 0.2,
  }
}

// Actually send the recovery nudge (email/SMS/WhatsApp) via backend /send.
// Falls back to a local dry-run description if the backend is down.
export async function sendNudge(decision, contact = {}) {
  try {
    const r = await fetch(`${BASE}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: decision.action, session_id: decision.session_id || '',
        cart_value: decision.cart_value || 0, discount_amount: decision.discount_amount || 0,
        consent_email: decision.consent_email !== false,
        consent_sms: !!decision.consent_sms, consent_whatsapp: !!decision.consent_whatsapp,
        email: contact.email || null, phone: contact.phone || null,
      }),
      signal: AbortSignal.timeout(12000),
    })
    if (!r.ok) throw new Error('bad status')
    return await r.json()
  } catch {
    return localDispatch(decision)
  }
}

export async function notifyStatus() {
  try {
    const r = await fetch(`${BASE}/notify_status`, { signal: AbortSignal.timeout(1500) })
    if (!r.ok) return { email_live: false, sms_live: false, whatsapp_live: false }
    return await r.json()
  } catch { return { email_live: false, sms_live: false, whatsapp_live: false } }
}

// Local fallback describing what WOULD be sent.
function localDispatch(d) {
  const IN_SESSION = ['do_nothing','payment_retry_help','cod_offer','free_shipping_nudge','faster_delivery','small_coupon']
  if (IN_SESSION.includes(d.action)) {
    return { channel: 'in_session', status: 'no_message', note: 'In-session UI action — no outbound message.' }
  }
  const channel = d.action === 'whatsapp_reminder' ? 'whatsapp' : d.action === 'sms_reminder' ? 'sms' : 'email'
  const consentOk = channel === 'email' ? (d.consent_email !== false) : (channel === 'whatsapp' ? !!d.consent_whatsapp : !!d.consent_sms)
  if (!consentOk) return { channel, status: 'blocked_no_consent', note: `No ${channel} consent — skipped per TRAI/DND + opt-in policy.` }
  return { channel, status: 'dry_run', note: `Would send a ${channel} nudge (add SendGrid/Twilio keys to send for real).` }
}

// Fetch the data-derived Coupon Playbook (real per-reason stats from training).
export async function getPlaybook() {
  try {
    const r = await fetch(`${BASE}/playbook`, { signal: AbortSignal.timeout(3000) })
    if (!r.ok) throw new Error('bad status')
    const data = await r.json()
    if (!data || !data.reasons) throw new Error('empty')
    return data
  } catch {
    return null  // caller shows a "start backend for live values" note
  }
}

// Fetch real model facts (AUC, backend, decisions). Null-safe fallback.
export async function getModelInfo() {
  try {
    const r = await fetch(`${BASE}/model_info`, { signal: AbortSignal.timeout(2000) })
    if (!r.ok) throw new Error('bad')
    return await r.json()
  } catch { return { risk_auc: null, backend: 'classical', n_intent: 0 } }
}

// Fetch REAL dataset sessions scored by the trained backend (for the live feed).
export async function getStreamSample(limit = 400) {
  try {
    const r = await fetch(`${BASE}/stream_sample?limit=${limit}`, { signal: AbortSignal.timeout(3000) })
    if (!r.ok) throw new Error('bad')
    const d = await r.json()
    if (!d.sessions || !d.sessions.length) throw new Error('empty')
    return d.sessions
  } catch { return null }  // caller falls back to the simulator
}
