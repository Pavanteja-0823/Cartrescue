// MetricCard.jsx — KPI tile with a coloured left accent and a smooth rolling
// number count-up (the digits genuinely roll from the old value to the new one).
import React, { useEffect, useRef, useState } from 'react'

// Split a display string like "₹37,45,123" / "1,234" / "₹0.016" into
// { prefix, numeric value, suffix, decimal places, has-commas } for animating.
function parseNum(s) {
  const m = String(s).match(/([^\d]*)([\d,.]+)(.*)/)
  if (!m) return { pre: '', num: 0, post: '', decimals: 0, commas: false }
  const body = m[2]
  return {
    pre: m[1],
    num: parseFloat(body.replace(/,/g, '')) || 0,
    post: m[3],
    decimals: body.includes('.') ? (body.split('.')[1] || '').length : 0,
    commas: body.includes(','),
  }
}

// Roll the numeric part of `target` over `duration` ms with an ease-out curve,
// keeping the original ₹ prefix / en-IN comma format. Animates from the LAST
// DISPLAYED number (not the last target), so a value that changes mid-roll
// glides on smoothly instead of jumping back.
function useRollingNumber(target, duration = 700) {
  const [display, setDisplay] = useState(target)
  const numRef = useRef(null)   // last displayed numeric value (null = first render)
  useEffect(() => {
    const b = parseNum(target)
    const start = numRef.current !== null ? numRef.current : b.num
    numRef.current = b.num
    if (start === b.num) { setDisplay(target); return }
    const t0 = performance.now()
    let raf
    const step = (now) => {
      const p = Math.min(1, (now - t0) / duration)
      const e = 1 - Math.pow(1 - p, 3)  // easeOutCubic — starts fast, settles gently
      const cur = start + (b.num - start) * e
      numRef.current = cur
      const body = b.decimals > 0
        ? cur.toFixed(b.decimals)
        : Math.round(cur).toLocaleString('en-IN')
      setDisplay(b.pre + body + b.post)
      if (p < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])
  return display
}

export default function MetricCard({ label, value, sub, tone = 'accent', icon }) {
  const border = { accent: 'border-l-accent', good: 'border-l-good', warn: 'border-l-warn', purple: 'border-l-purple' }[tone]
  const txt = { accent: 'text-accent', good: 'text-good', warn: 'text-warn', purple: 'text-purple' }[tone]
  const chip = { accent: 'bg-accent/10', good: 'bg-good/10', warn: 'bg-warn/10', purple: 'bg-purple/10' }[tone]
  const rolled = useRollingNumber(value)
  return (
    <div className={`bg-surface border border-line ${border} border-l-4 rounded-2xl p-4 shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:border-accent/35 hover:shadow-float`}>
      <div className="flex items-center gap-2 text-ink-soft text-[11px] uppercase tracking-wide font-medium">
        {icon && <span className={`w-6 h-6 rounded-lg ${chip} flex items-center justify-center text-sm`}>{icon}</span>}
        {label}
      </div>
      <div key={value} className={`text-2xl font-extrabold mt-2 tabular-nums ${txt} animate-pop`}>{rolled}</div>
      {sub && <div className="text-[11px] text-muted mt-1">{sub}</div>}
    </div>
  )
}
