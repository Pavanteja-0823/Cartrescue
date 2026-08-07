// FloatingChat.jsx — AI agent as an animated floating button (bottom-right).
// Opens a SOLID-background chat popup (no transparency bleed). Uses Groq via
// /api/ask with a local fallback (always works).
import React, { useState, useRef, useEffect } from 'react'
import { askAI } from '../api.js'

const SUGGESTIONS = ['Why this action?', 'Show the signals', 'What did it cost?', 'What is Cart Rescue?']

export default function FloatingChat({ activeDecision, llmActive }) {
  const [open, setOpen] = useState(false)
  const [msgs, setMsgs] = useState([
    { role: 'ai', text: "Hi! I'm the Cart Rescue AI 🤖 Ask me why I made any decision — I'll explain in plain English." },
  ])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const endRef = useRef(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs, open])

  async function send(q) {
    const question = (q ?? input).trim()
    if (!question || busy) return
    setInput('')
    setMsgs((m) => [...m, { role: 'user', text: question }])
    setBusy(true)
    const { text } = await askAI(question, activeDecision || {})
    setMsgs((m) => [...m, { role: 'ai', text }])
    setBusy(false)
  }

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-[60] w-16 h-16 rounded-full bg-gradient-to-br from-accent to-purple text-white text-2xl shadow-float animate-float-pulse flex items-center justify-center"
          title="Ask the Cart Rescue AI">
          🤖
        </button>
      )}

      {/* Dim backdrop so nothing bleeds through the popup */}
      {open && (
        <div className="fixed inset-0 z-[55] bg-ink/20" onClick={() => setOpen(false)} />
      )}

      {/* Chat popup — SOLID white, high z-index, no transparency */}
      {open && (
        <div
          className="fixed bottom-6 right-6 z-[60] w-[370px] max-w-[92vw] rounded-2xl shadow-float border border-line flex flex-col overflow-hidden animate-bounce-in"
          style={{ height: '520px', backgroundColor: '#1A1F38' }}>
          {/* header — royal indigo gradient */}
          <div className="flex items-center justify-between px-4 py-3 text-white"
               style={{ background: 'linear-gradient(135deg,#818CF8,#A78BFA,#C084FC)' }}>
            <div className="flex items-center gap-2">
              <span className="text-lg">🤖</span>
              <div>
                <div className="text-sm font-bold leading-tight">Cart Rescue AI</div>
                <div className="text-[10px] flex items-center gap-1 opacity-90">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal animate-dot-blink" />
                  {llmActive ? 'Groq LLM live' : 'ready'}
                </div>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-white/90 hover:text-white text-lg leading-none">✕</button>
          </div>

          {/* messages — solid light background */}
          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2.5" style={{ backgroundColor: '#12162A' }}>
            {msgs.map((m, i) => (
              <div key={i} className={`max-w-[85%] px-3 py-2 rounded-2xl text-[13px] leading-snug animate-fade-in ${
                m.role === 'user' ? 'self-end text-white rounded-br-sm' : 'self-start text-ink border border-line rounded-bl-sm'}`}
                style={{ backgroundColor: m.role === 'user' ? '#6D5CE8' : '#232A4A' }}>
                {m.text}
              </div>
            ))}
            {busy && <div className="self-start text-muted px-3 py-2 rounded-2xl text-xs animate-fade-in border border-line" style={{ backgroundColor: '#232A4A' }}>thinking…</div>}
            <div ref={endRef} />
          </div>

          {/* suggestions */}
          <div className="px-3 pt-2 flex flex-wrap gap-1.5" style={{ backgroundColor: '#232A4A' }}>
            {SUGGESTIONS.map((s) => (
              <button key={s} onClick={() => send(s)}
                className="text-[11px] text-accent bg-accent/10 border border-accent/30 px-2 py-1 rounded-full hover:bg-accent/20">
                {s}
              </button>
            ))}
          </div>

          {/* input */}
          <div className="flex gap-2 p-3 border-t border-line" style={{ backgroundColor: '#232A4A' }}>
            <input value={input} onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder="Ask the AI…"
              className="flex-1 border border-line rounded-xl px-3 py-2 text-[13px] text-ink outline-none focus:border-accent"
              style={{ backgroundColor: '#12162A' }} />
            <button onClick={() => send()} disabled={busy}
              className="bg-gradient-to-r from-accent to-accent-2 hover:from-accent-dark hover:to-accent-3 text-white rounded-xl px-4 text-sm font-semibold disabled:opacity-50 transition-all">➤</button>
          </div>
        </div>
      )}
    </>
  )
}
