// AgentTrace.jsx — shows the 4 agents reasoning about ONE session, step by step.
// This is the "AI is actually thinking" centrepiece.
import React from 'react'

const ICON_BG = {
  risk: 'bg-bad/15', reason: 'bg-warn/15', action: 'bg-accent/15', check: 'bg-good/15',
}

export default function AgentTrace({ session }) {
  if (!session) {
    return <div className="text-muted text-sm p-6 text-center">Waiting for a session to analyse…</div>
  }
  const riskPct = Math.round(session.risk * 100)
  const riskTone = session.risk >= 0.65 ? 'bg-bad/15 text-bad'
    : session.risk >= 0.35 ? 'bg-warn/15 text-warn' : 'bg-good/15 text-good'

  return (
    <div>
      <div className="flex justify-between items-center bg-surface-2 rounded-xl px-4 py-3 mb-4">
        <span className="font-mono text-xs text-muted">
          {session.id} · {session.device} · ₹{Math.round(session.cartValue).toLocaleString('en-IN')} cart
        </span>
        <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${riskTone}`}>
          {riskPct}% likely to leave
        </span>
      </div>

      <div className="flex flex-col gap-2.5">
        {(session.trace || []).map((a, i) => (
          <div key={i}
            className="relative flex gap-3 items-start p-3 rounded-2xl bg-surface-2 border border-line animate-reveal"
            style={{ animationDelay: `${i * 0.6}s`, opacity: 0 }}>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0 ${ICON_BG[a.kind]}`}>
              {a.icon}
            </div>
            {i < 3 && <div className="absolute left-[30px] top-[52px] w-0.5 h-3 bg-line" />}
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold flex items-center gap-2">
                {a.agent}
                <span className="text-[9px] text-muted font-medium bg-surface-2 px-1.5 py-0.5 rounded">{a.badge}</span>
              </div>
              <div className="text-[13px] text-ink-soft mt-1 leading-snug">{a.text}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
