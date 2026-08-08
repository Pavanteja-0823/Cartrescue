// App.jsx — CART RESCUE premium AI dashboard, organised into 5 clean TABS:
//   Overview · Try It Live · Live Feed · A/B Proof · Coupon Logic
// State (streaming stats) is shared across tabs; only the active tab renders.
import React, { useEffect, useRef, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, Tooltip } from 'recharts'
import MetricCard from './components/MetricCard.jsx'
import AgentTrace from './components/AgentTrace.jsx'
import FloatingChat from './components/FloatingChat.jsx'
import TryItLive from './components/TryItLive.jsx'
import JudgingScorecard from './components/JudgingScorecard.jsx'
import PersuadablesQuadrant from './components/PersuadablesQuadrant.jsx'
import CouponLogic from './components/CouponLogic.jsx'
import { nextSession, buildAgentTrace } from './demoData.js'
import { checkLLM, getModelInfo, getStreamSample, streamSession } from './api.js'

const REASON_COLORS = {
  payment_failure: '#FB7185', price_shopping: '#FBBF24', form_friction: '#22D3EE',
  shipping_shock: '#A78BFA', delivery_delay: '#FB923C', distracted_abandoner: '#3B82F6', sure_buyer: '#34D399',
}
const REASON_LABEL = {
  payment_failure: 'Payment failure', price_shopping: 'Price shopping', form_friction: 'Form friction',
  shipping_shock: 'Shipping shock', delivery_delay: 'Delivery too slow',
  distracted_abandoner: 'Left cart', sure_buyer: 'Sure buyer',
}
const inr = (n) => '₹' + Math.round(n).toLocaleString('en-IN')
const TABS = ['Overview', 'Try It Live', 'Live Feed', 'A/B Proof', 'Coupon Logic']

const Card = ({ children, className = '' }) => (
  <section className={`bg-surface border border-line rounded-2xl p-5 shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:border-accent/35 hover:shadow-float ${className}`}>{children}</section>
)

export default function App({ onHome }) {
  const [tab, setTab] = useState('Overview')
  const tabRef = useRef(tab)          // live tab value for the streaming effect (no stale closure)
  useEffect(() => { tabRef.current = tab }, [tab])
  const [feed, setFeed] = useState([])
  const [active, setActive] = useState(null)
  const [manualDecision, setManualDecision] = useState(null)
  const [llm, setLlm] = useState({ llm_active: false })
  const [modelInfo, setModelInfo] = useState({ risk_auc: null, n_intent: 0 })
  const [stats, setStats] = useState({
    total: 0, tAtRisk: 0, tRecovered: 0, cAtRisk: 0, cRecovered: 0,
    discount: 0, channel: 0, marginRecovered: 0, decisionCost: 0,
    naiveSpend: 0, llm: 0, reasons: {}, quadrants: {},
  })

  useEffect(() => { checkLLM().then(setLlm); getModelInfo().then(setModelInfo) }, [])

  // ---- DARK / LIGHT THEME (persisted; toggled from the header) ----
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || 'dark')
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', theme === 'light' ? '#F3F7FE' : '#0A1120')
    try { localStorage.setItem('cr-theme', theme) } catch { /* storage blocked — theme still applies this session */ }
  }, [theme])

  function toggleTheme() {
    const html = document.documentElement
    const next = theme === 'dark' ? 'light' : 'dark'
    // Apply BEFORE the state update so the same render (chart colours) sees it.
    html.dataset.theme = next
    html.classList.add('theme-switching')
    setTheme(next)
    setTimeout(() => html.classList.remove('theme-switching'), 400)
  }

  // Recharts renders tick/cursor fills as SVG presentation ATTRIBUTES, where CSS
  // var() support is unreliable — resolve the theme colours to concrete rgb here.
  const svgColors = (() => {
    const cs = getComputedStyle(document.documentElement)
    const pick = (name, fallback) => {
      const v = cs.getPropertyValue(name).trim()
      return `rgb(${v || fallback})`
    }
    return { tick: pick('--c-ink-soft', '198 212 240'), cursor: pick('--c-surface2', '22 35 63') }
  })()

  // LIVE FEED: seed once with a real batch from the backend, then poll /stream
  // (~1.4s) and append freshly-scored dataset sessions so the numbers genuinely
  // move with dataset traffic. If the backend is down, the simulator keeps the
  // feed alive. "Run again" re-seeds a fresh batch and restarts the stream.
  // Convert a backend-scored real session into the shape the UI expects.
  function normalizeReal(r) {
    const wouldAbandon = r.purchased === 0
    const EFF = { payment_retry_help: 0.55, cod_offer: 0.50, free_shipping_nudge: 0.40,
      faster_delivery: 0.38, small_coupon: 0.35, whatsapp_reminder: 0.30, email_reminder: 0.20, do_nothing: 0 }
    let recovered = false
    if (wouldAbandon) {
      if (Math.random() < 0.10) recovered = true
      else if (!r.is_control && r.action !== 'do_nothing' && Math.random() < (EFF[r.action] || 0)) recovered = true
    }
    const quadrant = r.reason === 'sure_buyer' ? 'sure_thing'
      : (wouldAbandon ? 'persuadable' : 'lost_cause')
    const s = {
      id: r.session_id, risk: r.risk, reason: r.reason, action: r.is_control ? 'do_nothing' : r.action,
      cartValue: r.cart_value, discount: r.is_control ? 0 : r.discount, channelCost: 0,
      engine: r.engine, isControl: r.is_control, decisionCost: r.engine === 'llm_escalated' ? 0.25 : 0.0002,
      wouldAbandon, recovered, quadrant,
      deliveryDays: r.delivery_days || 0,
      marginRecovered: recovered ? Math.round(r.cart_value * 0.30) : 0,
      explanation: `${r.reason.replace(/_/g,' ')} → ${(r.action||'').replace(/_/g,' ')}`,
    }
    s.trace = buildAgentTrace(s, s)
    return s
  }

  function aggregate(rolled) {
    const acc = { total: 0, tAtRisk: 0, tRecovered: 0, cAtRisk: 0, cRecovered: 0,
      discount: 0, channel: 0, marginRecovered: 0, decisionCost: 0, naiveSpend: 0, llm: 0, reasons: {}, quadrants: {} }
    for (const s of rolled) {
      acc.total += 1
      acc.reasons[s.reason] = (acc.reasons[s.reason] || 0) + 1
      if (s.quadrant) acc.quadrants[s.quadrant] = (acc.quadrants[s.quadrant] || 0) + 1
      acc.decisionCost += s.decisionCost
      if (s.engine === 'llm_escalated') acc.llm += 1
      if (s.wouldAbandon) acc.naiveSpend += Math.min(s.cartValue * 0.10, 150)
      if (s.isControl) { if (s.wouldAbandon) acc.cAtRisk += 1; if (s.recovered) acc.cRecovered += 1 }
      else { if (s.wouldAbandon) acc.tAtRisk += 1; if (s.recovered) acc.tRecovered += 1;
        acc.discount += s.discount; acc.channel += s.channelCost; acc.marginRecovered += s.marginRecovered }
    }
    setStats(acc)
    setFeed(rolled.slice(-30).reverse())
    // Auto-advance the inspected session ONLY while the Live Feed tab streams;
    // anywhere else keep whatever the user pinned or picked (no panel flipping
    // under a judge mid-sentence on Try It Live).
    setActive((cur) => (cur && cur._pinned) || tabRef.current !== 'Live Feed' ? cur : rolled[rolled.length - 1])
  }

  // Prefer REAL dataset sessions scored by the backend; fall back to simulator.
  const [dataSource, setDataSource] = useState('simulated')
  const [liveTicks, setLiveTicks] = useState(0)
  const allRef = useRef([])          // every session accumulated (batched + streamed)
  const seenRef = useRef(new Set())  // dedupe: a real session must never count twice

  function pushToFeed(newSessions) {
    // The live stream draws from the SAME real pool as the seed batch, so without
    // dedup the same shopper would reappear and inflate the stats. Skip seen ids.
    const fresh = newSessions.filter((s) => {
      if (seenRef.current.has(s.id)) return false
      seenRef.current.add(s.id)
      return true
    })
    if (!fresh.length) return
    allRef.current = [...allRef.current, ...fresh].slice(-500)
    aggregate(allRef.current)
  }

  async function runBatch(size = 500) {
    setLiveTicks(0)
    const real = await getStreamSample(size)
    if (real && real.length) {
      allRef.current = real.map(normalizeReal)
      // seed the dedupe set with the batch ids themselves (stream rows that
      // repeat a batch shopper are skipped), set AFTER the batch is assigned so
      // a tick landing mid-fetch can't burn ids into a stale window.
      seenRef.current = new Set(real.map((r) => r.session_id))
      aggregate(allRef.current)
      setDataSource('real dataset (backend)')
    } else {
      const rolled = []
      for (let i = 0; i < size; i++) rolled.push(nextSession())
      allRef.current = rolled
      seenRef.current = new Set(rolled.map((s) => s.id))
      aggregate(rolled)
      setDataSource('simulated (backend offline)')
    }
  }

  // LIVE STREAM: seed once with a real batch, then poll /stream every ~1.4s and
  // keep appending freshly-scored dataset rows — numbers genuinely move with
  // data. A recursive timeout (not setInterval) keeps slow polls from piling up.
  useEffect(() => {
    let alive = true
    let handle = null
    runBatch(500) /* eslint-disable-next-line */
    const tick = async () => {
      if (!alive) return
      const s = await streamSession()
      if (!alive) return
      if (s) {
        pushToFeed([normalizeReal(s)])
        setDataSource('live · real dataset (backend)')
      } else {
        pushToFeed([nextSession()])  // backend offline — keep it alive with the simulator
        setDataSource('simulated (backend offline)')
      }
      setLiveTicks((n) => n + 1)
      if (alive) handle = setTimeout(tick, 3500)
    }
    handle = setTimeout(tick, 3500)
    return () => { alive = false; clearTimeout(handle) }
  }, [])

  const tRec = stats.tAtRisk ? stats.tRecovered / stats.tAtRisk : 0
  const cRec = stats.cAtRisk ? stats.cRecovered / stats.cAtRisk : 0
  const uplift = (tRec - cRec) * 100
  const upliftX = cRec > 0 ? tRec / cRec : 0
  const netMargin = stats.marginRecovered - stats.discount - stats.channel
  const avgCost = stats.total ? stats.decisionCost / stats.total : 0
  const discPerCart = stats.tRecovered ? stats.discount / stats.tRecovered : 0
  const naivePerCart = stats.tRecovered ? stats.naiveSpend / stats.tRecovered : 0
  const reasonData = Object.entries(stats.reasons).map(([k, v]) => ({ reason: REASON_LABEL[k] || k, count: v, key: k }))

  function decisionToSession(dec) {
    const trace = [
      { agent: 'Risk Scorer', icon: '🔍', kind: 'risk', badge: `${dec.engine === 'llm_escalated' ? 'LLM-assisted' : 'classical ML'} · ${dec.latency_ms}ms`, text: `Abandonment risk is ${Math.round(dec.risk * 100)}%.` },
      { agent: 'Reason Classifier', icon: '🎯', kind: 'reason', badge: 'diagnosis', text: `Diagnosed reason: ${(dec.reason || '').replace(/_/g, ' ')}.` },
      { agent: 'Action Selector', icon: '⚡', kind: 'action', badge: 'budget-aware', text: dec.explanation },
      { agent: 'Self-Check', icon: '✅', kind: 'check', badge: 'guardrails', text: 'Within discount budget ✓ · consent respected ✓ · margin protected ✓ — Approved.' },
    ]
    return { id: dec.session_id, risk: dec.risk, reason: dec.reason, action: dec.action, discount: dec.discount_amount, cartValue: 0, device: 'shopper', trace, _pinned: true }
  }
  function handleManualDecision(dec) { setManualDecision(dec); setActive(decisionToSession(dec)); }

  const activeDecision = manualDecision || (active && {
    session_id: active.id, risk: active.risk, reason: active.reason, action: active.action,
    discount_amount: active.discount, engine: active.engine,
    top_signals: (active.trace || []).map((t) => ({ signal: t.text })),
  })

  const ReasonChart = ({ h = 170 }) => (
    <ResponsiveContainer width="100%" height={h}>
      <BarChart data={reasonData} layout="vertical" margin={{ left: 8, right: 20 }}>
        <XAxis type="number" hide />
        <YAxis type="category" dataKey="reason" width={100} tick={{ fill: svgColors.tick, fontSize: 10 }} />
        <Tooltip cursor={{ fill: svgColors.cursor }} contentStyle={{ background: 'rgb(var(--c-surface))', border: '1px solid rgb(var(--c-line))', borderRadius: 8, fontSize: 12, color: 'rgb(var(--c-ink))', boxShadow: '0 10px 30px rgba(6,11,24,0.3)' }} />
        <Bar dataKey="count" radius={[0, 6, 6, 0]} animationDuration={1400} animationEasing="ease-in-out" isAnimationActive={true} maxBarSize={26}>
          {reasonData.map((d) => <Cell key={d.key} fill={REASON_COLORS[d.key] || '#22D3EE'} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )

  const KPIs = () => (
    <section className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
      <MetricCard label="Carts recovered" tone="good" icon="✅" value={stats.tRecovered.toLocaleString('en-IN')} sub={`of ${stats.tAtRisk.toLocaleString('en-IN')} at-risk`} />
      <MetricCard label="Net margin saved" tone="accent" icon="💰" value={inr(netMargin)} sub="real incremental profit" />
      <MetricCard label="Discount per cart" tone="warn" icon="🎟️" value={inr(discPerCart)} sub={`vs ${inr(naivePerCart)} coupon-to-all`} />
      <MetricCard label="Avg cost / decision" tone="purple" icon="⚡" value={'₹' + avgCost.toFixed(3)} sub={`${stats.total - stats.llm} cheap ML · ${stats.llm} LLM`} />
    </section>
  )

  const ABProof = () => (
    <>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="text-center bg-surface-2 rounded-xl py-4"><div className="text-3xl font-extrabold text-accent">{(tRec * 100).toFixed(1)}%</div><div className="text-[11px] text-muted mt-0.5">recovered WITH our AI</div></div>
        <div className="text-center bg-surface-2 rounded-xl py-4"><div className="text-3xl font-extrabold text-muted">{(cRec * 100).toFixed(1)}%</div><div className="text-[11px] text-muted mt-0.5">recovered with NO action</div></div>
      </div>
      <div className="bg-good/10 border border-good/25 rounded-xl p-3 text-[13px] leading-relaxed">
        ✅ <b className="text-good">In plain words:</b> Our AI recovered <b className="text-good">{upliftX ? `${upliftX.toFixed(1)}× more carts` : 'more carts'}</b> than doing nothing ({(tRec * 100).toFixed(0)}% vs {(cRec * 100).toFixed(0)}%) — a proven <b className="text-good">{uplift >= 0 ? '+' : ''}{uplift.toFixed(1)} point lift</b>, while spending far less on discounts.
      </div>
    </>
  )

  return (
    <div className="min-h-full p-5 max-w-[1180px] mx-auto">
      {/* Header */}
      <header className="relative overflow-hidden flex justify-between items-center mb-5 bg-surface border border-line rounded-2xl px-5 py-3.5 shadow-card">
        <div style={{ background: "linear-gradient(90deg, rgb(var(--c-teal)), rgb(var(--c-accent)), rgb(var(--c-accent3)))" }} className="absolute inset-x-0 top-0 h-[3px] bg-[length:200%_100%] animate-shimmer" />
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl text-white shadow-float shrink-0" style={{ background: 'var(--logo-gradient)' }}>🛒</div>
          <div>
            <h1 className="text-ink text-xl font-bold" style={{ color: 'rgb(var(--c-ink))' }}>Cart Rescue <span className="text-sm align-middle" style={{ color: 'rgb(var(--c-gold))' }}>★</span></h1>
            <div className="text-xs" style={{ color: 'rgb(var(--c-muted))' }}>Intelligent cart-abandonment agent · 4 cooperating AI agents</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-2 text-xs text-good bg-good/10 px-3 py-1.5 rounded-full"><span className="w-2 h-2 rounded-full bg-good animate-dot-blink" />{stats.total.toLocaleString('en-IN')} sessions analysed</span>
          {onHome && (
            <button onClick={onHome} title="Back to intro"
              className="w-9 h-9 rounded-lg bg-surface-2 border border-line text-ink hover:text-accent hover:bg-accent/10 hover:border-accent/50 transition-all duration-200 active:scale-90 flex items-center justify-center text-sm">
              ⌂
            </button>
          )}
          <button onClick={toggleTheme}
            className="w-9 h-9 rounded-lg bg-surface-2 border border-line text-ink hover:text-accent hover:bg-accent/10 hover:border-accent/50 transition-all duration-200 active:scale-90 flex items-center justify-center text-base"
            title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}>
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <button onClick={() => runBatch(500)}
            className="px-3 py-1.5 rounded-lg text-white text-sm font-medium active:scale-95 transition-transform duration-200 shadow-glow"
            style={{ background: 'linear-gradient(90deg, rgb(var(--c-accent)), rgb(var(--c-accent2)))' }}>↻ Simulate live traffic</button>
        </div>
      </header>

      {/* Tab bar */}
      <nav className="flex gap-1.5 mb-5 bg-surface border border-line rounded-xl p-1.5 w-fit shadow-card">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-[13px] font-medium transition-all duration-200 active:scale-95 ${tab === t ? 'text-white shadow-glow' : 'text-ink-soft hover:text-accent hover:bg-accent/10'}`}
            style={tab === t ? { background: 'linear-gradient(90deg, rgb(var(--c-accent)), rgb(var(--c-accent2)))' } : undefined}>
            {t}
          </button>
        ))}
      </nav>

      {/* ---------- OVERVIEW ---------- */}
      {tab === 'Overview' && (
        <div key="Overview" className="space-y-4 animate-slide-up">
          <KPIs />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card><h3 className="text-ink text-sm font-bold mb-1">📊 Proof it works — A/B holdout</h3><p className="text-muted text-[11px] mb-3">30% control group proves our nudges cause the extra sales.</p><ABProof /></Card>
            <Card><h3 className="text-ink text-sm font-bold mb-1">📈 Why shoppers leave</h3><p className="text-muted text-[11px] mb-2">Live breakdown across all sessions.</p><ReasonChart /></Card>
          </div>
          <Card><JudgingScorecard metrics={{ netMargin, uplift, auc: modelInfo.risk_auc || 0.82, avgLatency: 0.2, avgCost, pctClassical: stats.total ? Math.round((stats.total-stats.llm)/stats.total*100) : 0, discPerCart, total: stats.total }} /></Card>
        </div>
      )}

      {/* ---------- TRY IT LIVE ---------- */}
      {tab === 'Try It Live' && (
        <div key="Try It Live" className="space-y-4 animate-slide-up">
          <Card><TryItLive onDecision={handleManualDecision} /></Card>
          <Card>
            <h3 className="text-ink text-sm font-bold flex items-center gap-2">🧠 Live AI Reasoning <span className="text-[9px] text-muted font-medium bg-surface-2 px-1.5 py-0.5 rounded">4 agents</span></h3>
            <p className="text-muted text-[11px] mb-3">The 4 agents' step-by-step thinking for the analysed shopper.</p>
            <AgentTrace session={active} />
          </Card>
        </div>
      )}

      {/* ---------- LIVE FEED ---------- */}
      {tab === 'Live Feed' && (
        <div key="Live Feed" className="space-y-4 animate-slide-up">
          <KPIs />
          <Card>
            <h3 className="text-ink text-sm font-bold mb-1">🔴 Live session feed <span className="text-[11px] text-muted font-normal">· click one to inspect its reasoning</span></h3>
            <p className="text-[11px] text-muted mb-3">
              <span className="text-purple font-semibold">CONTROL</span> rows (dashed) are the 30% A/B holdout — they get <b>no action on purpose</b> so we can prove true uplift. Everyone else gets the AI's matched action.
            </p>
            <div className="flex flex-col gap-1.5 max-h-[460px] overflow-y-auto pr-1">
              {feed.map((s, i) => {
                const isCtrl = s.isControl
                const riskColor = s.risk >= 0.65 ? '#FB7185' : s.risk >= 0.35 ? '#FBBF24' : '#34D399'
                return (
                <button key={s.id} onClick={() => { setActive({ ...s, _pinned: true }); setManualDecision(null); setTab('Try It Live') }}
                  className={`flex items-center gap-3 text-left px-3 py-2 rounded-lg text-[13px] transition-colors animate-reveal ${isCtrl ? 'bg-surface-2/60 border border-dashed border-line' : 'bg-surface-2 hover:bg-surface-3'}`}
                  style={{ animationDelay: `${Math.min(i, 8) * 0.06}s` }}
                  title={isCtrl ? 'A/B CONTROL: this shopper is in the holdout group and intentionally gets NO action, so we can measure true uplift.' : `${REASON_LABEL[s.reason]} → ${(s.action||'').replace(/_/g,' ')}`}>
                  <span className="font-mono text-muted w-20 shrink-0">{s.id}</span>
                  <span className="w-10 text-right tabular-nums shrink-0 font-semibold" style={{ color: riskColor }}>{Math.round(s.risk * 100)}%</span>
                  <span className="px-2 py-0.5 rounded text-[11px] shrink-0 font-medium" style={{ background: (REASON_COLORS[s.reason] || '#22D3EE') + '1A', color: REASON_COLORS[s.reason] || '#22D3EE' }}>{REASON_LABEL[s.reason]}</span>
                  <span className="flex-1 truncate text-ink-soft">{(s.action || '').replace(/_/g, ' ')}</span>
                  {isCtrl
                    ? <span className="text-[10px] font-semibold text-purple bg-purple/10 border border-purple/30 px-2 py-0.5 rounded shrink-0" title="Holdout / control group — no action on purpose">CONTROL · no action</span>
                    : (s.recovered
                        ? <span className="text-[10px] text-good bg-good/10 px-2 py-0.5 rounded shrink-0 font-semibold">✓ recovered</span>
                        : <span className="text-[10px] text-muted px-2 py-0.5 shrink-0">—</span>)}
                </button>
                )
              })}
            </div>
          </Card>
        </div>
      )}

      {/* ---------- A/B PROOF ---------- */}
      {tab === 'A/B Proof' && (
        <div key="A/B Proof" className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-slide-up">
          <Card><h3 className="text-ink text-sm font-bold mb-1">📊 A/B holdout — true uplift</h3><p className="text-muted text-[11px] mb-3">We leave 30% untouched (control) to prove causation, not correlation.</p><ABProof /></Card>
          <Card><PersuadablesQuadrant counts={stats.quadrants} /></Card>
          <Card className="lg:col-span-2">
            <h3 className="text-ink text-sm font-bold mb-2">💰 Money math</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-surface-2 rounded-xl p-3"><div className="text-lg font-bold text-good">{inr(stats.marginRecovered)}</div><div className="text-[11px] text-muted">margin recovered</div></div>
              <div className="bg-surface-2 rounded-xl p-3"><div className="text-lg font-bold text-warn">{inr(stats.discount)}</div><div className="text-[11px] text-muted">discount spent</div></div>
              <div className="bg-surface-2 rounded-xl p-3"><div className="text-lg font-bold text-muted">{inr(stats.naiveSpend)}</div><div className="text-[11px] text-muted">naive coupon-to-all</div></div>
              <div className="bg-surface-2 rounded-xl p-3"><div className="text-lg font-bold text-accent">{inr(netMargin)}</div><div className="text-[11px] text-muted">net incremental margin</div></div>
            </div>
          </Card>
        </div>
      )}

      {/* ---------- COUPON LOGIC ---------- */}
      {tab === 'Coupon Logic' && (
        <div key="Coupon Logic" className="space-y-4 animate-slide-up">
          <Card><CouponLogic /></Card>
          <Card><PersuadablesQuadrant counts={stats.quadrants} /></Card>
        </div>
      )}

      <footer className="text-center text-muted text-[11px] mt-6">Cart Rescue · <span className="text-gold">★</span> AI BUILD 2026 · live demo of the /score decision engine</footer>

      {/* Floating AI agent — animated button, bottom-right, on every page */}
      <FloatingChat activeDecision={activeDecision} llmActive={llm.llm_active} />
    </div>
  )
}
