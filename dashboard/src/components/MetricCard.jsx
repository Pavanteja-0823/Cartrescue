// MetricCard.jsx — clean light-theme KPI tile with a coloured left accent.
import React from 'react'

export default function MetricCard({ label, value, sub, tone = 'accent', icon }) {
  const border = { accent: 'border-l-accent', good: 'border-l-good', warn: 'border-l-warn', purple: 'border-l-purple' }[tone]
  const txt = { accent: 'text-accent', good: 'text-good', warn: 'text-warn', purple: 'text-purple' }[tone]
  const chip = { accent: 'bg-accent/10', good: 'bg-good/10', warn: 'bg-warn/10', purple: 'bg-purple/10' }[tone]
  return (
    <div className={`bg-surface border border-line ${border} border-l-4 rounded-2xl p-4 shadow-card`}>
      <div className="flex items-center gap-2 text-ink-soft text-[11px] uppercase tracking-wide font-medium">
        {icon && <span className={`w-6 h-6 rounded-lg ${chip} flex items-center justify-center text-sm`}>{icon}</span>}
        {label}
      </div>
      <div key={value} className={`text-2xl font-extrabold mt-2 ${txt} animate-count-up`}>{value}</div>
      {sub && <div className="text-[11px] text-muted mt-1">{sub}</div>}
    </div>
  )
}
