// Slider.jsx — a labelled range slider. Values can NEVER go negative
// (min defaults to 0), so no "-1" inputs are possible.
import React from 'react'

export default function Slider({ label, name, value, min = 0, max = 100, step = 1, unit = '', onChange }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-[12px] text-muted">{label}</span>
        <span className="text-[13px] font-semibold text-text tabular-nums">
          {unit === '₹' ? `₹${Number(value).toLocaleString('en-IN')}` : `${value}${unit}`}
        </span>
      </div>
      <input
        type="range"
        name={name}
        min={min} max={max} step={step}
        value={value}
        onChange={(e) => onChange(name, Math.max(min, Number(e.target.value)))}
        className="w-full accent-accent cursor-pointer"
      />
    </div>
  )
}
