// TryItLive.jsx — the INTERACTIVE core. Enter ONE shopper via SLIDERS
// (no typing, no negatives) → the AI analyses that exact person and replies.
import React, { useState } from 'react'
import { scoreSession, explainDecision, sendNudge } from '../api.js'
import Slider from './Slider.jsx'

// cart_value: 2450 = a sample cart worth ₹2,450 — just demo data, no hidden meaning.
const PRESETS = {
  'UPI payment failing': { cart_value: 2450, cart_size: 2, n_page_view: 6, n_add_to_cart: 1, n_checkout: 1, duration_s: 180, n_payment_attempts: 3, delivery_days: 3, payment_failed: true, consent_whatsapp: false, device: 'mobile' },
  'Price shopper': { cart_value: 1500, cart_size: 1, n_page_view: 22, n_add_to_cart: 1, n_checkout: 0, duration_s: 640, n_payment_attempts: 0, delivery_days: 3, payment_failed: false, consent_whatsapp: true, device: 'desktop' },
  'Sure buyer': { cart_value: 900, cart_size: 2, n_page_view: 4, n_add_to_cart: 2, n_checkout: 1, duration_s: 70, n_payment_attempts: 1, delivery_days: 2, payment_failed: false, consent_whatsapp: true, device: 'mobile' },
  'Long delivery': { cart_value: 2000, cart_size: 2, n_page_view: 6, n_add_to_cart: 1, n_checkout: 1, duration_s: 140, n_payment_attempts: 0, delivery_days: 10, payment_failed: false, consent_whatsapp: true, device: 'mobile' },
  'Left cart (distracted)': { cart_value: 1500, cart_size: 2, n_page_view: 7, n_add_to_cart: 2, n_checkout: 0, duration_s: 150, n_payment_attempts: 0, delivery_days: 3, payment_failed: false, consent_whatsapp: true, device: 'mobile' },
}

const REASON_LABEL = {
  payment_failure: 'Payment failure', price_shopping: 'Price shopping',
  form_friction: 'Form friction', shipping_shock: 'Shipping shock',
  delivery_delay: 'Delivery too slow', distracted_abandoner: 'Left cart (distracted)',
  sure_buyer: 'Sure buyer',
}
const ACTION_LABEL = {
  do_nothing: 'Do nothing', payment_retry_help: 'Payment retry help', cod_offer: 'Cash on Delivery',
  free_shipping_nudge: 'Free shipping', faster_delivery: 'Faster delivery',
  small_coupon: 'Small coupon', whatsapp_reminder: 'WhatsApp reminder', email_reminder: 'Email reminder',
}

export default function TryItLive({ onDecision }) {
  const [form, setForm] = useState(PRESETS['UPI payment failing'])
  const [result, setResult] = useState(null)
  const [explanation, setExplanation] = useState('')
  const [busy, setBusy] = useState(false)
  const [sendResult, setSendResult] = useState(null)
  const [sending, setSending] = useState(false)

  const setField = (name, value) => setForm((f) => ({ ...f, [name]: value }))
  const toggle = (name) => setForm((f) => ({ ...f, [name]: !f[name] }))
  const applyPreset = (k) => { setForm(PRESETS[k]); setResult(null); setExplanation('') }

  async function analyze() {
    setBusy(true); setExplanation(''); setSendResult(null)
    const payload = {
      session_id: 'live_' + Date.now(), ...form,
      n_events: (form.n_page_view || 0) + (form.n_add_to_cart || 0) + (form.n_checkout || 0),
      country: 'IN', consent_email: true, reached_intent: 1,
    }
    const dec = await scoreSession(payload)
    setResult(dec); onDecision?.(dec)
    const ex = await explainDecision(dec)
    setExplanation(ex.text); setBusy(false)
  }

  async function sendNow() {
    if (!result) return
    setSending(true)
    const payload = { ...result, cart_value: form.cart_value,
      consent_email: true, consent_whatsapp: form.consent_whatsapp }
    const r = await sendNudge(payload, {})
    setSendResult(r); setSending(false)
  }

  const riskPct = result ? Math.round(result.risk * 100) : 0
  const riskColor = riskPct >= 65 ? 'text-bad' : riskPct >= 35 ? 'text-warn' : 'text-good'

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {/* LEFT: inputs */}
      <div>
        <h3 className="text-base font-bold flex items-center gap-2">🎮 Try It Live
          <span className="text-[9px] text-muted font-medium bg-surface-2 px-1.5 py-0.5 rounded">enter a shopper → AI decides</span>
        </h3>
        <p className="text-muted text-[12px] mb-4">Drag the sliders to describe ONE shopper, then let the AI analyse that exact person.</p>

        <div className="flex flex-wrap gap-1.5 mb-4">
          {Object.keys(PRESETS).map((k) => (
            <button key={k} onClick={() => applyPreset(k)}
              className="text-[11px] text-accent bg-accent/10 border border-accent/30 px-2.5 py-1 rounded-2xl hover:bg-accent/20">
              {k}
            </button>
          ))}
        </div>

        <div className="space-y-3.5">
          <Slider label="Cart value" name="cart_value" value={form.cart_value} min={0} max={10000} step={100} unit="₹" onChange={setField} />
          <Slider label="Items in cart" name="cart_size" value={form.cart_size} min={0} max={10} onChange={setField} />
          <Slider label="Page views" name="n_page_view" value={form.n_page_view} min={0} max={40} onChange={setField} />
          <Slider label="Add-to-cart actions" name="n_add_to_cart" value={form.n_add_to_cart} min={0} max={8} onChange={setField} />
          <Slider label="Reached checkout (times)" name="n_checkout" value={form.n_checkout} min={0} max={3} onChange={setField} />
          <Slider label="Time on page" name="duration_s" value={form.duration_s} min={0} max={1200} step={30} unit="s" onChange={setField} />
          <Slider label="Payment attempts" name="n_payment_attempts" value={form.n_payment_attempts} min={0} max={5} onChange={setField} />
          <Slider label="Promised delivery" name="delivery_days" value={form.delivery_days} min={1} max={14} unit=" days" onChange={setField} />
        </div>

        <div className="flex items-center gap-5 mt-4">
          <label className="flex flex-col gap-1">
            <span className="text-[12px] text-muted">Device</span>
            <select value={form.device} onChange={(e) => setField('device', e.target.value)}
              className="bg-surface-2 border border-line rounded-lg px-2.5 py-1.5 text-[13px] outline-none focus:border-accent">
              <option value="mobile">mobile</option><option value="desktop">desktop</option><option value="tablet">tablet</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-[12px] cursor-pointer mt-5">
            <input type="checkbox" checked={form.payment_failed} onChange={() => toggle('payment_failed')} className="accent-accent" /> Payment failed
          </label>
          <label className="flex items-center gap-2 text-[12px] cursor-pointer mt-5">
            <input type="checkbox" checked={form.consent_whatsapp} onChange={() => toggle('consent_whatsapp')} className="accent-accent" /> WhatsApp opt-in
          </label>
        </div>

        <button onClick={analyze} disabled={busy}
          className="w-full mt-5 bg-gradient-to-r from-accent to-accent-2 hover:from-accent-dark hover:to-accent-3 text-white font-semibold rounded-xl py-3 text-sm disabled:opacity-50 shadow-glow transition-all">
          {busy ? '🤖 AI is analysing…' : '🚀 Analyse this shopper'}
        </button>
      </div>

      {/* RIGHT: result */}
      <div>
        <h3 className="text-base font-bold mb-1">🤖 AI Decision</h3>
        <p className="text-muted text-[12px] mb-4">The AI's verdict for this exact shopper.</p>
        {!result ? (
          <div className="h-[300px] flex items-center justify-center text-muted text-sm bg-surface-2 rounded-2xl border border-line">
            Set the sliders and click "Analyse this shopper" →
          </div>
        ) : (
          <div className="animate-fade-in">
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-surface-2 rounded-xl p-4 text-center">
                <div className={`text-3xl font-extrabold ${riskColor}`}>{riskPct}%</div>
                <div className="text-[11px] text-muted mt-1">abandonment risk</div>
              </div>
              <div className="bg-surface-2 rounded-xl p-4 text-center flex flex-col justify-center">
                <div className="text-sm font-bold text-warn">{REASON_LABEL[result.reason] || result.reason}</div>
                <div className="text-[11px] text-muted mt-1">diagnosed reason</div>
              </div>
              <div className="bg-surface-2 rounded-xl p-4 text-center flex flex-col justify-center">
                <div className="text-sm font-bold text-accent">{ACTION_LABEL[result.action] || result.action}</div>
                <div className="text-[11px] text-muted mt-1">{result.discount_amount > 0 ? `−₹${Math.round(result.discount_amount)}` : '₹0 spent'}</div>
              </div>
            </div>
            <div className="bg-accent/10 border border-accent/25 rounded-xl p-4 text-[13px] leading-relaxed">
              <b className="text-accent">🤖 AI explains:</b> {explanation || result.explanation}
              {result.engine === 'llm_escalated' && <span className="ml-1 text-[10px] text-purple">[LLM-analysed]</span>}
            </div>
            <div className="mt-3 text-[11px] text-muted">
              ⏱️ decided in {result.latency_ms}ms · engine: {result.engine === 'llm_escalated' ? 'LLM (hard case)' : 'classical ML (cheap)'}
            </div>

            {/* ACTUALLY SEND the recovery nudge */}
            {['email_reminder', 'whatsapp_reminder', 'sms_reminder'].includes(result.action) ? (
              <div className="mt-3">
                <button onClick={sendNow} disabled={sending}
                  className="w-full bg-good/90 hover:bg-good text-ink font-semibold rounded-xl py-2.5 text-sm disabled:opacity-50">
                  {sending ? 'Sending…' : `📤 Send the ${result.action.replace('_reminder','')} nudge now`}
                </button>
                {sendResult && (
                  <div className={`mt-2 rounded-xl p-3 text-[12px] border ${
                    sendResult.status === 'sent' ? 'bg-good/10 border-good/30 text-good'
                    : sendResult.status === 'blocked_no_consent' ? 'bg-bad/10 border-bad/30 text-bad'
                    : 'bg-warn/10 border-warn/30 text-warn'}`}>
                    {sendResult.status === 'sent' && `✅ Sent via ${sendResult.provider || sendResult.channel}!`}
                    {sendResult.status === 'dry_run' && `🧪 Dry-run: ${sendResult.note || 'would send (add SendGrid/Twilio keys to send for real)'}`}
                    {sendResult.status === 'blocked_no_consent' && `🚫 ${sendResult.note}`}
                    {sendResult.status === 'error' && `⚠️ ${sendResult.detail || 'send failed'}`}
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-3 text-[11px] text-muted">
                ℹ️ This is an in-session action (retry / COD / free shipping / coupon) — handled in the checkout UI, no message to send.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
