// LandingPage.jsx — premium animated intro. "Get Started" enters the dashboard.
// Features: drifting aurora blobs, a live cycling "AI decision" demo strip,
// staggered entrance, animated gradient title, and a "how it works" flow.
import React, { useEffect, useState } from 'react'

const FEATURES = [
  { icon: '🧠', title: '4 Cooperating AI Agents', desc: 'Risk → Reason → Action → Self-Check work as a team to decide the smartest move for each shopper.' },
  { icon: '🎯', title: 'Coupon Only for Persuadables', desc: 'Uplift modeling spends budget only on shoppers who buy if nudged — never on sure-buyers.' },
  { icon: '💳', title: 'India-Specific', desc: 'Detects UPI failures → offers Cash-on-Delivery, festival-aware pricing, TRAI/WhatsApp consent.' },
  { icon: '📊', title: 'Proven with A/B Holdout', desc: 'A 30% control group proves real uplift — causation, not correlation.' },
  { icon: '⚡', title: 'Cheap ML, not costly LLM', desc: '~90% of decisions run on fast classical ML at ₹0.0002 — only hard cases hit the LLM.' },
  { icon: '📤', title: 'Real Recovery Nudges', desc: 'Actually sends email (SendGrid) & SMS/WhatsApp (Twilio) — consent enforced, fully logged.' },
]

const STATS = [
  { value: '+30pp', label: 'True A/B uplift' },
  { value: '₹1L+', label: 'Net margin saved' },
  { value: '0.82', label: 'Model AUC' },
  { value: '0.2ms', label: 'Decision latency' },
]

const STEPS = [
  { n: '1', icon: '🔍', t: 'Score risk', d: 'How likely to abandon?' },
  { n: '2', icon: '🎯', t: 'Find reason', d: 'Payment? Price? Delivery?' },
  { n: '3', icon: '⚡', t: 'Pick action', d: 'One move, within budget' },
  { n: '4', icon: '✅', t: 'Self-check', d: 'Consent + margin verified' },
]

// A tiny cycling "live decision" ticker to show the AI in action on the intro.
const DEMOS = [
  { risk: 88, reason: 'Payment failure', action: 'Cash on Delivery', tone: '#FB7185' },
  { risk: 12, reason: 'Sure buyer', action: 'Do nothing', tone: '#34D399' },
  { risk: 68, reason: 'Price shopping', action: 'Small coupon ₹150', tone: '#FBBF24' },
  { risk: 62, reason: 'Delivery too slow', action: 'Faster delivery', tone: '#FB923C' },
  { risk: 70, reason: 'Left cart', action: 'WhatsApp reminder', tone: '#3B82F6' },
]

export default function LandingPage({ onStart }) {
  const [demo, setDemo] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setDemo((d) => (d + 1) % DEMOS.length), 2600)
    return () => clearInterval(id)
  }, [])
  const d = DEMOS[demo]

  return (
    <div className="relative min-h-screen overflow-hidden flex flex-col items-center px-5 py-10"
      style={{ background: 'var(--body-bg)' }}>
      {/* Project-themed animated background: moving gradient mesh + floating
          cart / coupon / ₹ icons drifting upward. Works in light AND dark. */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* soft moving gradient mesh (stronger opacity so it shows on light too) */}
        <div className="absolute -top-40 -right-32 w-[560px] h-[560px] rounded-full blur-3xl animate-mesh-shift"
          style={{ background: 'radial-gradient(circle, rgb(var(--c-accent) / 0.28), transparent 70%)' }} />
        <div className="absolute top-1/4 -left-40 w-[520px] h-[520px] rounded-full blur-3xl animate-mesh-shift"
          style={{ background: 'radial-gradient(circle, rgb(var(--c-purple) / 0.22), transparent 70%)', animationDelay: '4s' }} />
        <div className="absolute -bottom-32 right-1/4 w-[480px] h-[480px] rounded-full blur-3xl animate-mesh-shift"
          style={{ background: 'radial-gradient(circle, rgb(var(--c-teal) / 0.20), transparent 70%)', animationDelay: '8s' }} />

        {/* floating shop-themed icons rising slowly */}
        {[
          { e: '🛒', l: '8%',  d: '0s',   s: '30px' },
          { e: '🎟️', l: '22%', d: '2.5s', s: '26px' },
          { e: '💳', l: '38%', d: '5s',   s: '28px' },
          { e: '₹',  l: '54%', d: '1.5s', s: '30px' },
          { e: '📦', l: '70%', d: '3.5s', s: '26px' },
          { e: '🛍️', l: '86%', d: '6s',   s: '28px' },
          { e: '✅', l: '46%', d: '7.5s', s: '22px' },
          { e: '💰', l: '14%', d: '4.5s', s: '26px' },
        ].map((ic, i) => (
          <span key={i}
            className="absolute bottom-0 animate-float-up select-none"
            style={{ left: ic.l, fontSize: ic.s, animationDelay: ic.d, color: 'rgb(var(--c-accent))', filter: 'grayscale(0.1)' }}>
            {ic.e}
          </span>
        ))}
      </div>

      {/* Hero */}
      <div className="relative z-10 max-w-4xl w-full text-center mt-6">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-6 animate-fade-in"
          style={{ backgroundColor: 'rgb(var(--c-accent) / 0.12)', color: 'rgb(var(--c-accent))' }}>
          <span className="w-2 h-2 rounded-full animate-dot-blink" style={{ backgroundColor: 'rgb(var(--c-accent))' }} />
          AI BUILD 2026 · E-Commerce India · Track 2
        </div>

        <div className="flex items-center justify-center gap-4 mb-5 animate-reveal">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl text-white shadow-float animate-float-y"
            style={{ background: 'var(--logo-gradient)' }}>🛒</div>
          <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight bg-[length:200%_auto] animate-gradient-x bg-clip-text text-transparent"
            style={{ backgroundImage: 'linear-gradient(90deg, rgb(var(--c-teal)), rgb(var(--c-accent)), rgb(var(--c-accent2)), rgb(var(--c-purple)))' }}>
            Cart Rescue
          </h1>
        </div>

        <p className="text-lg font-semibold mb-3 animate-slide-up" style={{ color: 'rgb(var(--c-ink))' }}>
          Stop blasting coupons at everyone.
        </p>
        <p className="text-base max-w-2xl mx-auto mb-7 animate-slide-up" style={{ color: 'rgb(var(--c-ink-soft))' }}>
          A real-time, multi-agent AI that scores each shopping session's abandonment risk,
          diagnoses <i>why</i> they might leave, and picks the one smartest action —
          including doing nothing — all within a strict discount budget.
        </p>

        {/* Live cycling AI decision ticker */}
        <div className="inline-flex items-center gap-3 px-4 py-2.5 rounded-2xl border mb-8 animate-fade-in"
          style={{ backgroundColor: 'rgb(var(--c-surface))', borderColor: 'rgb(var(--c-line))' }}>
          <span className="text-[11px] uppercase tracking-wide" style={{ color: 'rgb(var(--c-muted))' }}>AI live</span>
          <span key={demo} className="flex items-center gap-2 animate-fade-in">
            <span className="text-sm font-bold tabular-nums" style={{ color: d.tone }}>{d.risk}%</span>
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: d.tone + '22', color: d.tone }}>{d.reason}</span>
            <span className="text-xs" style={{ color: 'rgb(var(--c-muted))' }}>→</span>
            <span className="text-sm font-semibold" style={{ color: 'rgb(var(--c-ink))' }}>{d.action}</span>
          </span>
        </div>

        <div>
          <button onClick={onStart}
            className="px-8 py-3.5 rounded-xl text-white text-base font-semibold shadow-float active:scale-95 transition-transform duration-200 animate-ring-pulse"
            style={{ background: 'linear-gradient(90deg, rgb(var(--c-accent)), rgb(var(--c-accent2)))' }}>
            Get Started  →
          </button>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-12 max-w-2xl mx-auto">
          {STATS.map((s, i) => (
            <div key={s.label} className="rounded-xl p-4 border animate-slide-up hover:-translate-y-1 transition-transform"
              style={{ backgroundColor: 'rgb(var(--c-surface))', borderColor: 'rgb(var(--c-line))', animationDelay: `${i * 80}ms` }}>
              <div className="text-2xl font-extrabold" style={{ color: 'rgb(var(--c-accent))' }}>{s.value}</div>
              <div className="text-[11px] mt-1" style={{ color: 'rgb(var(--c-muted))' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* How it works flow */}
      <div className="relative z-10 max-w-4xl w-full mt-16">
        <h2 className="text-center text-sm uppercase tracking-widest mb-6" style={{ color: 'rgb(var(--c-muted))' }}>
          How it works
        </h2>
        <div className="flex flex-wrap items-stretch justify-center gap-3">
          {STEPS.map((st, i) => (
            <React.Fragment key={st.n}>
              <div className="flex-1 min-w-[150px] rounded-2xl p-4 border text-center"
                style={{ backgroundColor: 'rgb(var(--c-surface))', borderColor: 'rgb(var(--c-line))' }}>
                <div className="w-10 h-10 mx-auto rounded-xl flex items-center justify-center text-lg mb-2"
                  style={{ backgroundColor: 'rgb(var(--c-accent) / 0.12)' }}>{st.icon}</div>
                <div className="text-sm font-bold" style={{ color: 'rgb(var(--c-ink))' }}>{st.t}</div>
                <div className="text-[11px] mt-1" style={{ color: 'rgb(var(--c-muted))' }}>{st.d}</div>
              </div>
              {i < STEPS.length - 1 && (
                <div className="hidden sm:flex items-center text-lg" style={{ color: 'rgb(var(--c-accent))' }}>→</div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Feature grid */}
      <div className="relative z-10 max-w-5xl w-full mt-16">
        <h2 className="text-center text-sm uppercase tracking-widest mb-6" style={{ color: 'rgb(var(--c-muted))' }}>
          What makes it win
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f, i) => (
            <div key={f.title}
              className="rounded-2xl p-5 border transition-all duration-200 hover:-translate-y-1 animate-slide-up"
              style={{ backgroundColor: 'rgb(var(--c-surface))', borderColor: 'rgb(var(--c-line))', animationDelay: `${i * 70}ms` }}>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl mb-3"
                style={{ backgroundColor: 'rgb(var(--c-accent) / 0.12)' }}>{f.icon}</div>
              <h3 className="text-base font-bold mb-1.5" style={{ color: 'rgb(var(--c-ink))' }}>{f.title}</h3>
              <p className="text-[13px] leading-relaxed" style={{ color: 'rgb(var(--c-ink-soft))' }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Secondary CTA */}
      <button onClick={onStart}
        className="relative z-10 mt-14 px-8 py-3.5 rounded-xl text-white text-base font-semibold shadow-float active:scale-95 transition-transform duration-200"
        style={{ background: 'linear-gradient(90deg, rgb(var(--c-accent)), rgb(var(--c-accent2)))' }}>
        Enter the Live Dashboard  →
      </button>

      <p className="relative z-10 mt-10 text-[11px]" style={{ color: 'rgb(var(--c-muted))' }}>
        Cart Rescue · AI BUILD 2026 · built by Pavan Teja Kanithi
      </p>
    </div>
  )
}
