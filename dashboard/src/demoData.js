// demoData.js — self-contained session generator so the dashboard streams
// realistically WITHOUT the backend (reliable live demo). Mirrors the Python
// agents, including all 7 reasons and the coupon rule.

const DEVICES = ['mobile', 'desktop', 'tablet']
// 7 archetypes incl. delivery_delay and distracted (the biggest real group)
const ARCHES = ['sure_buyer', 'payment_fail', 'price_shopper', 'friction', 'shipping_shock', 'delivery_delay', 'distracted']
const ARCH_P = [0.22, 0.14, 0.16, 0.11, 0.10, 0.09, 0.18]

function pick(arr, probs) {
  const r = Math.random(); let acc = 0
  for (let i = 0; i < arr.length; i++) { acc += probs[i]; if (r <= acc) return arr[i] }
  return arr[arr.length - 1]
}
const randint = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a

// Mirror of ReasonClassifier + ActionSelector (same rules, simplified).
export function decideLocally(s) {
  const { archetype, cartValue, risk, consentWhatsapp, paymentAttempts, deliveryDays } = s
  let reason, action, discount = 0, channelCost = 0, explanation

  if (archetype === 'sure_buyer' || risk < 0.35) {
    reason = 'sure_buyer'; action = 'do_nothing'
    explanation = 'Low risk / sure buyer — intervening would waste margin.'
  } else if (archetype === 'payment_fail') {
    reason = 'payment_failure'
    if (paymentAttempts >= 2) { action = 'cod_offer'; explanation = `${paymentAttempts} failed UPI attempts — offer Cash-on-Delivery to bypass the broken rail (India). ₹0.` }
    else { action = 'payment_retry_help'; explanation = 'Payment failed once — offer an instant retry / alternate method. ₹0 discount.' }
  } else if (archetype === 'delivery_delay') {
    reason = 'delivery_delay'; action = 'faster_delivery'
    explanation = `Long ${deliveryDays}-day delivery estimate drove them off — offer expedited delivery / a guarantee. ₹0.`
  } else if (archetype === 'shipping_shock') {
    reason = 'shipping_shock'; action = 'free_shipping_nudge'; discount = 60
    explanation = 'Bounced at checkout on shipping cost — free-shipping nudge targets the exact objection.'
  } else if (archetype === 'friction') {
    reason = 'form_friction'
    if (consentWhatsapp) { action = 'whatsapp_reminder'; channelCost = 0.35; explanation = 'Stuck on the form — WhatsApp resume-checkout nudge, no margin spent.' }
    else { action = 'email_reminder'; channelCost = 0.05; explanation = 'Stuck on the form — email reminder to resume checkout.' }
  } else if (archetype === 'distracted') {
    reason = 'distracted_abandoner'
    if (cartValue >= 1000 && risk >= 0.65) { action = 'small_coupon'; discount = Math.min(cartValue * 0.10, 150); explanation = `High-risk abandoned cart worth ₹${cartValue} — a capped ₹${Math.round(discount)} coupon can pull them back.` }
    else if (consentWhatsapp) { action = 'whatsapp_reminder'; channelCost = 0.35; explanation = "Left items in the cart — a free WhatsApp 'you left something' reminder beats spending margin." }
    else { action = 'email_reminder'; channelCost = 0.05; explanation = 'Left items in the cart — a free email reminder to come back.' }
  } else { // price_shopper
    reason = 'price_shopping'
    if (cartValue >= 800 && risk >= 0.65) { action = 'small_coupon'; discount = Math.min(cartValue * 0.10, 150); explanation = `Genuinely price-shopping a ₹${cartValue} cart at high risk — a capped ₹${Math.round(discount)} coupon can tip it.` }
    else { action = 'email_reminder'; channelCost = 0.05; explanation = 'Price-shopping but low value — a free email nudge beats giving away margin.' }
  }

  const engine = (risk >= 0.48 && risk <= 0.58) ? 'llm_escalated' : 'classical'
  const decisionCost = engine === 'llm_escalated' ? 0.25 : 0.0002
  return { reason, action, discount, channelCost, explanation, engine, decisionCost }
}

// Build the 4-agent reasoning trace (plain English) for the "thinking" view.
export function buildAgentTrace(s, dec) {
  const riskPct = Math.round(s.risk * 100)
  const reasonText = {
    payment_failure: 'This is a payment failure, not price-shopping. Repeated attempts point to a bank/gateway problem — the intent to buy is clearly there.',
    price_shopping: 'Lots of browsing with little commitment — price-shopping / comparison behaviour across apps.',
    form_friction: 'Reached checkout but stalled a long time without paying — stuck on the form.',
    shipping_shock: 'Reached checkout then bounced quickly — a classic reaction to the shipping cost.',
    delivery_delay: `Promised delivery was ~${s.deliveryDays} days — a disappointing delivery date likely drove them away.`,
    distracted_abandoner: 'Added items to the cart but never reached checkout — a distracted shopper who left the cart behind (the biggest group).',
    sure_buyer: 'Smooth, direct progression toward payment with low risk — a sure buyer.',
  }[dec.reason]
  return [
    { agent: 'Risk Scorer', icon: '🔍', kind: 'risk', badge: 'classical ML · 0.2ms', text: `Abandonment risk is ${riskPct}%.` },
    { agent: 'Reason Classifier', icon: '🎯', kind: 'reason', badge: 'rule engine', text: reasonText },
    { agent: 'Action Selector', icon: '⚡', kind: 'action', badge: 'budget-aware', text: dec.explanation },
    { agent: 'Self-Check', icon: '✅', kind: 'check', badge: 'guardrails', text: 'Within discount budget ✓ · respects consent ✓ · protects margin ✓ — Approved.' },
  ]
}

let counter = 1
export function nextSession() {
  const archetype = pick(ARCHES, ARCH_P)
  const device = pick(DEVICES, [0.7, 0.25, 0.05])
  const cartValue = randint(300, 8000)
  const consentWhatsapp = Math.random() < 0.55
  const paymentAttempts = archetype === 'payment_fail' ? randint(1, 3) : (archetype === 'sure_buyer' ? 1 : 0)
  const deliveryDays = archetype === 'delivery_delay' ? randint(7, 12) : randint(1, 4)

  const baseRisk = { sure_buyer: 0.12, payment_fail: 0.82, price_shopper: 0.68, friction: 0.62, shipping_shock: 0.55, delivery_delay: 0.62, distracted: 0.70 }[archetype]
  const risk = Math.max(0.02, Math.min(0.98, baseRisk + (Math.random() - 0.5) * 0.15))

  const session = {
    id: `sess_${String(counter++).padStart(5, '0')}`,
    archetype, device, cartValue, consentWhatsapp, paymentAttempts, deliveryDays, risk,
    isControl: Math.random() < 0.30,
    ts: new Date().toLocaleTimeString('en-IN', { hour12: false }),
  }
  const dec = decideLocally(session)

  const abandonP = { sure_buyer: 0.08, payment_fail: 0.75, price_shopper: 0.65, friction: 0.60, shipping_shock: 0.55, delivery_delay: 0.62, distracted: 0.70 }[archetype]
  const wouldAbandon = Math.random() < abandonP
  const efficacy = { payment_retry_help: 0.55, cod_offer: 0.50, free_shipping_nudge: 0.40, faster_delivery: 0.38, small_coupon: 0.35, whatsapp_reminder: 0.30, email_reminder: 0.20, do_nothing: 0 }[dec.action] || 0
  let recovered = false
  if (wouldAbandon) {
    if (Math.random() < 0.10) recovered = true
    else if (!session.isControl && dec.action !== 'do_nothing' && Math.random() < efficacy) recovered = true
  }
  const finalAction = session.isControl ? 'do_nothing' : dec.action
  const result = {
    ...session, ...dec, action: finalAction,
    discount: session.isControl ? 0 : dec.discount,
    channelCost: session.isControl ? 0 : dec.channelCost,
    wouldAbandon, recovered,
    marginRecovered: recovered ? Math.round(cartValue * 0.30) : 0,
  }
  result.quadrant = (() => {
    if (archetype === 'sure_buyer') return 'sure_thing'
    if (archetype === 'payment_fail') return wouldAbandon ? 'persuadable' : 'sure_thing'
    if (archetype === 'price_shopper' || archetype === 'distracted') return wouldAbandon ? 'persuadable' : 'lost_cause'
    if (archetype === 'shipping_shock' || archetype === 'delivery_delay') return wouldAbandon ? 'persuadable' : 'sure_thing'
    if (archetype === 'friction') return Math.random() < 0.5 ? 'sleeping_dog' : 'persuadable'
    return 'lost_cause'
  })()
  result.trace = buildAgentTrace(session, result)
  return result
}
