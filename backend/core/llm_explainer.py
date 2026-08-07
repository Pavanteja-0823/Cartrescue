r"""
llm_explainer.py — The LLM layer (Groq) for explanations + judge Q&A.

TWO jobs:
  1. explain(decision)  — turn a decision into a rich, plain-English narrative
     for the "hard" cases the orchestrator escalates (cost-per-decision story).
  2. ask(question, ctx) — answer a judge's free-text question about a decision
     ("why did you do nothing here?") using the decision as grounding context.

DESIGN — SAFE BY DEFAULT (never breaks the live demo):
  * If GROQ_API_KEY is set  -> calls Groq's OpenAI-compatible chat API
    (model: llama-3.1-8b-instant — fast + free tier).
  * If NO key, or the network/API fails -> falls back to a crisp TEMPLATE
    explanation built from the decision fields. The dashboard behaves
    identically; you just lose the extra LLM flourish. This means a missing key
    or flaky wifi during your 8-minute demo CANNOT crash anything.

Only the genuinely-uncertain sessions are sent to the LLM (cost routing), so
the average cost-per-decision stays tiny — exactly the differentiator the
problem statement rewards.
"""
from __future__ import annotations
import os
import json
from typing import Optional
from urllib import request as _urlreq
from urllib.error import URLError, HTTPError

GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")


def _groq_available() -> bool:
    return bool(os.getenv("GROQ_API_KEY"))


def _call_groq(system: str, user: str, max_tokens: int = 220) -> Optional[str]:
    """Minimal dependency-free Groq call (uses urllib, no SDK needed).
    Returns text, or None on any failure (caller falls back to template)."""
    key = os.getenv("GROQ_API_KEY")
    if not key:
        return None
    payload = json.dumps({
        "model": GROQ_MODEL,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        "temperature": 0.3,
        "max_tokens": max_tokens,
    }).encode("utf-8")
    req = _urlreq.Request(GROQ_URL, data=payload, headers={
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    })
    try:
        with _urlreq.urlopen(req, timeout=8) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        return data["choices"][0]["message"]["content"].strip()
    except (URLError, HTTPError, KeyError, TimeoutError, Exception):  # noqa: BLE001
        return None  # ANY failure -> template fallback


# ---------------------------------------------------------------------------
# 1. RICH EXPLANATION for a decision
# ---------------------------------------------------------------------------
def explain(decision: dict) -> dict:
    """Return {'text': str, 'source': 'llm'|'template'} explaining a decision."""
    template = _template_explanation(decision)
    if not _groq_available():
        return {"text": template, "source": "template"}

    system = ("You are Cart Rescue, an AI that decides how to save abandoning "
              "e-commerce carts for Indian shoppers. Explain decisions in 2-3 "
              "crisp, confident sentences a business judge would love. No jargon.")
    user = (
        f"Session {decision.get('session_id')}: risk={decision.get('risk')}, "
        f"reason={decision.get('reason')}, action={decision.get('action')}, "
        f"discount=₹{decision.get('discount_amount')}, "
        f"signals={decision.get('top_signals')}. "
        "Explain WHY this action is the smart, margin-protecting choice."
    )
    out = _call_groq(system, user)
    return {"text": out or template, "source": "llm" if out else "template"}


def _template_explanation(d: dict) -> str:
    """Deterministic, always-available explanation from the decision fields."""
    action = d.get("action", "do_nothing")
    reason = d.get("reason", "sure_buyer")
    risk = d.get("risk", 0)
    disc = d.get("discount_amount", 0)
    pretty = {
        "do_nothing": "take no action",
        "payment_retry_help": "offer a one-tap payment retry",
        "free_shipping_nudge": "offer free shipping",
        "small_coupon": f"offer a small ₹{int(disc)} coupon",
        "whatsapp_reminder": "send a WhatsApp reminder",
        "email_reminder": "send an email reminder",
        "cod_offer": "offer Cash-on-Delivery",
    }.get(action, action)
    return (f"With a {int(risk*100)}% abandonment risk driven by "
            f"'{reason.replace('_', ' ')}', the smart move is to {pretty}. "
            + ("This spends ₹0 discount, protecting margin. "
               if disc == 0 else f"The ₹{int(disc)} spend stays within budget. ")
            + "The decision was logged for full auditability.")


# ---------------------------------------------------------------------------
# 2. JUDGE Q&A about a decision
# ---------------------------------------------------------------------------
def ask(question: str, decision: dict) -> dict:
    """Answer a free-text question grounded in a specific decision."""
    if not _groq_available():
        return {"text": _template_answer(question, decision), "source": "template"}

    system = ("You are Cart Rescue's explainability assistant. Answer the "
              "judge's question about this cart-abandonment decision in 2-4 "
              "plain-English sentences. Be specific and reference the signals. "
              "If asked about cost, note easy cases use cheap ML and only hard "
              "ones use an LLM.")
    user = (f"Decision context: {json.dumps(decision, default=str)}\n\n"
            f"Judge's question: {question}")
    out = _call_groq(system, user, max_tokens=260)
    return {"text": out or _template_answer(question, decision),
            "source": "llm" if out else "template"}


def _template_answer(question: str, d: dict) -> str:
    base = _template_explanation(d)
    return (f"{base} (Ask me about the risk score, the signals, the budget, or "
            "the cost of this decision.)")
