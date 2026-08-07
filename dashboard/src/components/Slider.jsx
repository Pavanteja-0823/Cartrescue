// Slider.jsx — a labelled range slider with a CONSISTENT coloured fill track.
// The filled portion always reflects value/(max-min) so every slider reads the
// same way. Values can NEVER go negative (min defaults to 0).
import React from 'react'

export default function Slider({ label, name, value, min = 0, max = 100, step = 1, unit = '', onChange }) {
  const pct = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100))
  const display = unit === '₹'
    ? `₹${Number(value).toLocaleString('en-IN')}`
    : `${value}${unit}`

  return (
    <div>
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-[12px] text-ink-soft font-medium">{label}</span>
        <span className="text-[13px] font-bold text-accent tabular-nums bg-accent/10 px-2 py-0.5 rounded-md">
          {display}
        </span>
      </div>
      <input
        type="range"
        name={name}
        min={min} max={max} step={step}
        value={value}
        onChange={(e) => onChange(name, Math.max(min, Number(e.target.value)))}
        className="cr-slider w-full"
        // The fill is drawn with a gradient that stops exactly at the value %,
        // so every slider shows a consistent indigo fill + grey remainder.
        style={{
          background: `linear-gradient(to right, #818CF8 0%, #818CF8 ${pct}%, #2C3460 ${pct}%, #2C3460 100%)`,
        }}
      />
    </div>
  )
}
