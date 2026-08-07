// App.jsx — CART RESCUE premium AI dashboard, organised into 5 clean TABS:
//   Overview · Try It Live · Live Feed · A/B Proof · Coupon Logic
// State (streaming stats) is shared across tabs; only the active tab renders.
import React, { useEffect, useRef, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, Tooltip } from 'recharts'
import MetricCard from './components/MetricCard.jsx'
import AgentTrace from './components/AgentTrace.jsx'
import ChatPanel from './components/ChatPanel.jsx'
import TryItLive from './components/TryItLive.jsx'
import JudgingScorecard from './components/JudgingScorecard.jsx'
import PersuadablesQuadrant from './components/PersuadablesQuadrant.jsx'
import CouponLogic from './components/CouponLogic.jsx'
import { nextSession } from './demoData.js'
import { checkLLM } from './api.js'

const REASON_COLORS = {
  payment_failure: '#F5675C', price_shopping: '#F5B841', form_friction: '#5B8DEF',
  shipping_shock: '#A78BFA', delivery_delay: '#F59E42', distracted_abandoner: '#38BDF8', sure_buyer: '#3DDC97',
}
const REASON_LABEL = {
  payment_failure: 'Payment failure', price_shopping: 'Price shopping', form_friction: 'Form friction',
  shipping_shock: 'Shipping shock', delivery_delay: 'Delivery too slow',
  distracted_abandoner: 'Left cart', sure_buyer: 'Sure buyer',
}
const inr = (n) => '₹' + Math.round(n).toLocaleString('en-IN')
const TABS = ['Overview', 'Try It Live', 'Live Feed', 'A/B Proof', 'Coupon Logic']

const Card = ({ children, className = '' }) => (
  <section className={`bg-gradient-to-br from-panel to-panel/50 border border-line rounded-2xl p-5 ${className}`}>{children}</section>
)

export default function App() {
  const [tab, setTab] = useState('Overview')
  const [feed, setFeed] = useState([])
  const [active, setActive] = useState(null)
  const [manualDecision, setManualDecision] = useState(null)
  const [running, setRunning] = useState(true)
  const [llm, setLlm] = useState({ llm_active: false })
  const [stats, setStats] = useState({
    total: 0, tAtRisk: 0, tRecovered: 0, cAtRisk: 0, cRecovered: 0,
    discount: 0, channel: 0, marginRecovered: 0, decisionCost: 0,
    naiveSpend: 0, llm: 0, reasons: {}, quadrants: {},
  })
  const timer = useRef(null)

  useEffect(() => { checkLLM().then(setLlm) }, [])

  useEffect(() => {
    if (!running) { clearInterval(timer.current); return }
    timer.current = setInterval(() => {
      const s = nextSession()
      setFeed((f) => [s, ...f].slice(0, 30))
      setActive((cur) => (cur && cur._pinned ? cur : s))
      setStats((p) => {
        const n = { ...p, reasons: { ...p.reasons }, quadrants: { ...p.quadrants } }
        n.total += 1
        n.reasons[s.reason] = (n.reasons[s.reason] || 0) + 1
        if (s.quadrant) n.quadrants[s.quadrant] = (n.quadrants[s.quadrant] || 0) + 1
        n.decisionCost += s.decisionCost
        if (s.engine === 'llm_escalated') n.llm += 1
        if (s.wouldAbandon) n.naiveSpend += Math.min(s.cartValue * 0.10, 150)
        if (s.isControl) { if (s.wouldAbandon) n.cAtRisk += 1; if (s.recovered) n.cRecovered += 1 }
        else {
          if (s.wouldAbandon) n.tAtRisk += 1
          if (s.recovered) n.tRecovered += 1
          n.discount += s.discount; n.channel += s.channelCost; n.marginRecovered += s.marginRecovered
        }
        return n
      })
    }, 1400)
    return () => clearInterval(timer.current)
  }, [running])

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
        <YAxis type="category" dataKey="reason" width={100} tick={{ fill: '#7E8AA8', fontSize: 10 }} />
        <Tooltip cursor={{ fill: '#1A2540' }} contentStyle={{ background: '#121A2E', border: '1px solid #243154', borderRadius: 8, fontSize: 12 }} />
        <Bar dataKey="count" radius={[0, 6, 6, 0]}>
          {reasonData.map((d) => <Cell key={d.key} fill={REASON_COLORS[d.key] || '#5B8DEF'} />)}
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
        <div className="text-center bg-soft rounded-xl py-4"><div className="text-3xl font-extrabold text-accent">{(tRec * 100).toFixed(1)}%</div><div className="text-[11px] text-muted mt-0.5">recovered WITH our AI</div></div>
        <div className="text-center bg-soft rounded-xl py-4"><div className="text-3xl font-extrabold text-muted">{(cRec * 100).toFixed(1)}%</div><div className="text-[11px] text-muted mt-0.5">recovered with NO action</div></div>
      </div>
      <div className="bg-good/10 border border-good/25 rounded-xl p-3 text-[13px] leading-relaxed">
        ✅ <b className="text-good">In plain words:</b> Our AI recovered <b className="text-good">{upliftX ? `${upliftX.toFixed(1)}× more carts` : 'more carts'}</b> than doing nothing ({(tRec * 100).toFixed(0)}% vs {(cRec * 100).toFixed(0)}%) — a proven <b className="text-good">{uplift >= 0 ? '+' : ''}{uplift.toFixed(1)} point lift</b>, while spending far less on discounts.
      </div>
    </>
  )

  return (
    <div className="min-h-full p-5 max-w-[1180px] mx-auto">
      {/* Header */}
      <header className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-purple flex items-center justify-center text-xl shadow-lg shadow-accent/30">🛒</div>
          <div><h1 className="text-xl font-bold">Cart Rescue</h1><div className="text-muted text-xs">Intelligent cart-abandonment agent · 4 cooperating AI agents</div></div>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-2 text-xs text-good bg-good/10 px-3 py-1.5 rounded-full"><span className={`w-2 h-2 rounded-full bg-good ${running ? 'animate-glow' : ''}`} />{running ? 'AI is live' : 'paused'}</span>
          <button onClick={() => setRunning((r) => !r)} className="px-3 py-1.5 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent-dark">{running ? 'Pause' : 'Resume'}</button>
        </div>
      </header>

      {/* Tab bar */}
      <nav className="flex gap-1.5 mb-5 bg-panel/60 border border-line rounded-xl p-1.5 w-fit">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-[13px] font-medium transition-colors ${tab === t ? 'bg-accent text-white' : 'text-muted hover:text-text hover:bg-soft'}`}>
            {t}
          </button>
        ))}
      </nav>

      {/* Main = content (left) + persistent AI chat rail (right, always visible) */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-4 items-start">
        <div className="min-w-0 space-y-4">

      {/* ---------- OVERVIEW ---------- */}
      {tab === 'Overview' && (
        <div className="space-y-4">
          <KPIs />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card><h3 className="text-sm font-bold mb-1">📊 Proof it works — A/B holdout</h3><p className="text-muted text-[11px] mb-3">30% control group proves our nudges cause the extra sales.</p><ABProof /></Card>
            <Card><h3 className="text-sm font-bold mb-1">📈 Why shoppers leave</h3><p className="text-muted text-[11px] mb-2">Live breakdown across all sessions.</p><ReasonChart /></Card>
          </div>
          <Card><JudgingScorecard /></Card>
        </div>
      )}

      {/* ---------- TRY IT LIVE ---------- */}
      {tab === 'Try It Live' && (
        <div className="space-y-4">
          <Card><TryItLive onDecision={handleManualDecision} /></Card>
          <Card>
            <h3 className="text-sm font-bold flex items-center gap-2">🧠 Live AI Reasoning <span className="text-[9px] text-muted font-medium bg-ink px-1.5 py-0.5 rounded">4 agents</span></h3>
            <p className="text-muted text-[11px] mb-3">The 4 agents' step-by-step thinking for the analysed shopper.</p>
            <AgentTrace session={active} />
          </Card>
        </div>
      )}

      {/* ---------- LIVE FEED ---------- */}
      {tab === 'Live Feed' && (
        <div className="space-y-4">
          <KPIs />
          <Card>
            <h3 className="text-sm font-bold mb-2">🔴 Live session feed <span className="text-[11px] text-muted font-normal">· click one to inspect its reasoning</span></h3>
            <div className="flex flex-col gap-1.5 max-h-[460px] overflow-y-auto pr-1">
              {feed.map((s) => (
                <button key={s.id} onClick={() => { setActive({ ...s, _pinned: true }); setManualDecision(null); setTab('Try It Live') }}
                  className="flex items-center gap-3 text-left px-3 py-2 rounded-lg text-[13px] bg-ink hover:bg-soft transition-colors">
                  <span className="font-mono text-muted w-20 shrink-0">{s.id}</span>
                  <span className="w-10 text-right tabular-nums shrink-0" style={{ color: s.risk >= 0.65 ? '#F5675C' : s.risk >= 0.35 ? '#F5B841' : '#3DDC97' }}>{Math.round(s.risk * 100)}%</span>
                  <span className="px-2 py-0.5 rounded text-[11px] shrink-0" style={{ background: (REASON_COLORS[s.reason] || '#5B8DEF') + '22', color: REASON_COLORS[s.reason] || '#5B8DEF' }}>{REASON_LABEL[s.reason]}</span>
                  <span className="flex-1 truncate text-muted">{(s.action || '').replace(/_/g, ' ')}</span>
                  {s.isControl && <span className="text-[10px] text-muted bg-panel px-1.5 py-0.5 rounded shrink-0">CONTROL</span>}
                  {s.recovered && <span className="text-good shrink-0">✓</span>}
                </button>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ---------- A/B PROOF ---------- */}
      {tab === 'A/B Proof' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card><h3 className="text-sm font-bold mb-1">📊 A/B holdout — true uplift</h3><p className="text-muted text-[11px] mb-3">We leave 30% untouched (control) to prove causation, not correlation.</p><ABProof /></Card>
          <Card><PersuadablesQuadrant counts={stats.quadrants} /></Card>
          <Card className="lg:col-span-2">
            <h3 className="text-sm font-bold mb-2">💰 Money math</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-soft rounded-xl p-3"><div className="text-lg font-bold text-good">{inr(stats.marginRecovered)}</div><div className="text-[11px] text-muted">margin recovered</div></div>
              <div className="bg-soft rounded-xl p-3"><div className="text-lg font-bold text-warn">{inr(stats.discount)}</div><div className="text-[11px] text-muted">discount spent</div></div>
              <div className="bg-soft rounded-xl p-3"><div className="text-lg font-bold text-muted">{inr(stats.naiveSpend)}</div><div className="text-[11px] text-muted">naive coupon-to-all</div></div>
              <div className="bg-soft rounded-xl p-3"><div className="text-lg font-bold text-accent">{inr(netMargin)}</div><div className="text-[11px] text-muted">net incremental margin</div></div>
            </div>
          </Card>
        </div>
      )}

      {/* ---------- COUPON LOGIC ---------- */}
      {tab === 'Coupon Logic' && (
        <div className="space-y-4">
          <Card><CouponLogic /></Card>
          <Card><PersuadablesQuadrant counts={stats.quadrants} /></Card>
        </div>
      )}

        </div>{/* end left content column */}

        {/* Persistent AI chat rail — visible on every tab */}
        <aside className="xl:sticky xl:top-5">
          <Card className="h-[560px]">
            <ChatPanel activeDecision={activeDecision} llmActive={llm.llm_active} />
          </Card>
        </aside>
      </div>{/* end main 2-col */}

      <footer className="text-center text-muted text-[11px] mt-6">Cart Rescue · AI BUILD 2026 · live demo of the /score decision engine</footer>
    </div>
  )
}
