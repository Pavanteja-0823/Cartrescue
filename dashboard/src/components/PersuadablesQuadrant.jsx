// PersuadablesQuadrant.jsx — visualises the core idea:
// "Spend coupons ONLY on Persuadables — never on sure-buyers or lost causes."
// This is the uplift-modeling differentiator made obvious for judges.
import React from 'react'

const QUADRANTS = [
  { key: 'sure_thing', icon: '😎', title: 'Sure Things', spend: false,
    desc: 'Buy anyway — a coupon just wastes margin.', tone: 'good' },
  { key: 'persuadable', icon: '🎯', title: 'Persuadables', spend: true,
    desc: 'Buy ONLY if nudged — spend budget HERE.', tone: 'accent' },
  { key: 'lost_cause', icon: '🚫', title: 'Lost Causes', spend: false,
    desc: "Won't buy no matter what — don't waste spend.", tone: 'muted' },
  { key: 'sleeping_dog', icon: '😴', title: 'Sleeping Dogs', spend: false,
    desc: 'A nudge annoys them — leave them alone.', tone: 'warn' },
]

const RING = {
  good: 'ring-good/40', accent: 'ring-accent/60', muted: 'ring-muted/30', warn: 'ring-warn/40',
}
const TXT = {
  good: 'text-good', accent: 'text-accent', muted: 'text-muted', warn: 'text-warn',
}

export default function PersuadablesQuadrant({ counts = {} }) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1
  return (
    <div>
      <h3 className="text-ink text-sm font-bold flex items-center gap-2">🎯 Who deserves a coupon?
        <span className="text-[9px] text-muted font-medium bg-surface-2 px-1.5 py-0.5 rounded">uplift modeling</span>
      </h3>
      <p className="text-muted text-[11px] mb-3">
        We only spend on <b className="text-accent">Persuadables</b> — shoppers who buy <i>only if</i> nudged. Never on people who'd buy anyway.
      </p>
      <div className="grid grid-cols-2 gap-2.5">
        {QUADRANTS.map((q) => {
          const n = counts[q.key] || 0
          const pct = Math.round((n / total) * 100)
          return (
            <div key={q.key}
              className={`rounded-xl p-3 bg-surface-2 ring-1 ${RING[q.tone]} ${q.spend ? 'shadow-lg' : ''}`}>
              <div className="flex items-center justify-between">
                <span className="text-lg">{q.icon}</span>
                {q.spend
                  ? <span className="text-[9px] font-bold text-accent bg-accent/15 px-1.5 py-0.5 rounded">💸 SPEND</span>
                  : <span className="text-[9px] text-muted bg-surface-2 px-1.5 py-0.5 rounded">skip</span>}
              </div>
              <div className={`text-[12px] font-bold mt-1.5 ${TXT[q.tone]}`}>{q.title}</div>
              <div className="text-[10px] text-muted leading-snug mt-0.5">{q.desc}</div>
              <div className="text-[11px] font-semibold mt-1.5 tabular-nums">
                {n.toLocaleString('en-IN')} <span className="text-muted font-normal">({pct}%)</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
