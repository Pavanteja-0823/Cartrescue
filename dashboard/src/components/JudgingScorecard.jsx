// JudgingScorecard.jsx — a premium panel that maps the project to the exact
// hackathon judging weights, so judges instantly see we hit every criterion.
import React from 'react'

const CRITERIA = [
  { icon: '💰', label: 'Business Impact', weight: 20, tone: 'good',
    proof: 'Margin ₹ saved + Money Math at scale' },
  { icon: '🧠', label: 'AI Innovation & Depth', weight: 20, tone: 'purple',
    proof: 'Multi-agent + uplift modeling (Persuadables)' },
  { icon: '⚙️', label: 'Technical Excellence', weight: 20, tone: 'accent',
    proof: 'Clean stack · leakage-free 0.82 AUC · working pipeline' },
  { icon: '🔌', label: 'Enterprise Architecture', weight: 15, tone: 'accent',
    proof: 'Pluggable POST /score API · stateless · <1ms' },
  { icon: '🎨', label: 'User Experience', weight: 10, tone: 'warn',
    proof: 'Live dashboard · explainable AI chat' },
  { icon: '📈', label: 'Scalability, Security & Cost', weight: 10, tone: 'good',
    proof: 'Cost-per-decision routing · consent policy' },
  { icon: '🗣️', label: 'Presentation', weight: 5, tone: 'muted',
    proof: 'Pitch deck · 8-min demo · Q&A prep' },
]

const TONE = {
  good: 'text-good', purple: 'text-purple', accent: 'text-accent',
  warn: 'text-warn', muted: 'text-muted',
}
const BAR = {
  good: 'bg-good', purple: 'bg-purple', accent: 'bg-accent',
  warn: 'bg-warn', muted: 'bg-muted',
}

export default function JudgingScorecard() {
  return (
    <div>
      <h3 className="text-sm font-bold flex items-center gap-2">🏆 Judging Scorecard
        <span className="text-[9px] text-muted font-medium bg-ink px-1.5 py-0.5 rounded">every criterion covered</span>
      </h3>
      <p className="text-muted text-[11px] mb-3">How Cart Rescue maps to the 7 scoring dimensions.</p>
      <div className="flex flex-col gap-2">
        {CRITERIA.map((c) => (
          <div key={c.label} className="flex items-center gap-3 bg-soft/60 rounded-xl px-3 py-2">
            <span className="text-lg w-6 text-center">{c.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-semibold">{c.label}</span>
                <span className={`text-[11px] font-bold ${TONE[c.tone]}`}>{c.weight}%</span>
              </div>
              <div className="h-1 rounded-full bg-ink mt-1 overflow-hidden">
                <div className={`h-full ${BAR[c.tone]}`} style={{ width: `${c.weight * 4}%` }} />
              </div>
              <div className="text-[10px] text-muted mt-1 truncate">✅ {c.proof}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
