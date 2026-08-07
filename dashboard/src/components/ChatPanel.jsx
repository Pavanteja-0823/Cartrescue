// ChatPanel.jsx — "Ask the AI" explainability panel.
// A judge can ask why the AI made a decision; answers come from the Groq LLM
// (via /api/ask) or a local template fallback — always works.
import React, { useState, useRef, useEffect } from 'react'
import { askAI } from '../api.js'

const SUGGESTIONS = ['Why this action?', 'Show the signals', 'What did it cost?']

export default function ChatPanel({ activeDecision, llmActive }) {
  const [msgs, setMsgs] = useState([
    { role: 'ai', text: "Hi! I'm the Cart Rescue AI. Click a session, then ask me why I made that decision — I'll explain in plain English." },
  ])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const endRef = useRef(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs])

  async function send(q) {
    const question = (q ?? input).trim()
    if (!question || busy) return
    setInput('')
    setMsgs((m) => [...m, { role: 'user', text: question }])
    setBusy(true)
    const decision = activeDecision || {}
    const { text, source } = await askAI(question, decision)
    setMsgs((m) => [...m, { role: 'ai', text, source }])
    setBusy(false)
  }

  return (
    <div className="flex flex-col h-full">
      <h3 className="text-sm font-bold flex items-center gap-2 mb-0.5">
        💬 Ask the AI
        <span className={`text-[9px] px-1.5 py-0.5 rounded ${llmActive ? 'bg-good/15 text-good' : 'bg-muted/15 text-muted'}`}>
          {llmActive ? 'Groq LLM live' : 'template mode'}
        </span>
      </h3>
      <p className="text-muted text-[11px] mb-3">
        {activeDecision ? `Explaining ${activeDecision.session_id || activeDecision.id || 'this session'}` : 'A judge can ask anything about a decision.'}
      </p>

      <div className="flex-1 flex flex-col gap-2.5 mb-3 overflow-y-auto min-h-[200px] max-h-[280px] pr-1">
        {msgs.map((m, i) => (
          <div key={i}
            className={`max-w-[88%] px-3 py-2 rounded-2xl text-[13px] leading-snug animate-fade-in ${
              m.role === 'user'
                ? 'self-end bg-accent-dark rounded-br-sm'
                : 'self-start bg-soft border border-line rounded-bl-sm'
            }`}>
            {m.text}
          </div>
        ))}
        {busy && <div className="self-start bg-soft border border-line px-3 py-2 rounded-2xl text-muted text-xs animate-fade-in">thinking…</div>}
        <div ref={endRef} />
      </div>

      <div className="mb-2 flex flex-wrap gap-1.5">
        {SUGGESTIONS.map((s) => (
          <button key={s} onClick={() => send(s)}
            className="text-[11px] text-accent bg-accent/10 border border-accent/30 px-2.5 py-1 rounded-2xl hover:bg-accent/20">
            {s}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <input value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="Ask why the AI decided this…"
          className="flex-1 bg-ink border border-line rounded-xl px-3 py-2 text-[13px] outline-none focus:border-accent" />
        <button onClick={() => send()} disabled={busy}
          className="bg-accent rounded-xl px-4 text-white font-semibold text-sm disabled:opacity-50">
          Ask
        </button>
      </div>
    </div>
  )
}
