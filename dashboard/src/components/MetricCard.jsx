// MetricCard.jsx — premium KPI tile with a soft glow accent.
import React from 'react'

export default function MetricCard({ label, value, sub, tone = 'accent', icon }) {
  const glow = { accent: 'bg-accent', good: 'bg-good', warn: 'bg-warn', purple: 'bg-purple' }[tone]
  const txt = { accent: 'text-accent', good: 'text-good', warn: 'text-warn', purple: 'text-purple' }[tone]
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-panel to-panel/60 border border-line rounded-2xl p-4">
      <div className={`absolute top-0 right-0 w-16 h-16 rounded-full blur-2xl opacity-40 ${glow}`} />
      <div className="relative">
        <div className="text-muted text-[11px] uppercase tracking-wide flex items-center gap-1.5">
          {icon && <span>{icon}</span>}{label}
        </div>
        <div key={value} className={`text-2xl font-extrabold mt-1.5 ${txt} animate-count-up`}>{value}</div>
        {sub && <div className="text-[11px] text-muted mt-1">{sub}</div>}
      </div>
    </div>
  )
}
