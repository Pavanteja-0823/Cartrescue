# 🎤 Cart Rescue — 8-Minute Live Demo Script

> Goal: lead with the **money story**, show the **AI thinking**, and **prove it works**. Speak in plain English. Times are guides.

---

### ⏱️ 0:00–1:00 — The Problem (hook with money)
> "Every online store loses huge revenue to abandoned carts. The reflex is to **blast a coupon at everyone**. But that's dumb — you waste margin on people who'd have bought anyway, and you do nothing for someone whose **UPI payment just failed**. A coupon can't fix a failed payment."

**Say the one-liner:** *"We recover more carts AND spend 99% less on discounts — and we can prove it."*

---

### ⏱️ 1:00–2:30 — The Solution & Architecture
> "Cart Rescue is a plug-and-play decision service. Any store sends us one session; we return the smartest single action in under a millisecond."

Show the **README architecture diagram**. Point to the 4 agents:
1. **Risk Scorer** — how likely to leave?
2. **Reason Classifier** — *why*? (payment fail vs price-shopping vs friction…)
3. **Action Selector** — one bounded action, budget-aware, "do nothing" allowed.
4. **Self-Check** — reviews budget, consent, margin before finalizing.

> "Four small cooperating agents — not one giant prompt. Every decision is logged and explainable."

---

### ⏱️ 2:30–4:30 — LIVE DASHBOARD (the wow moment) 🌟
Open `http://localhost:5173`. Let sessions stream.

> "Watch the AI **think out loud**. Here's a real session…"

Click a **payment-failure** session. Walk the 4 agent cards aloud:
> "Risk says 88%. Reason says payment failure — not price shopping. Action says: their UPI keeps failing, so a coupon is useless — **offer Cash on Delivery** to bypass the broken rail, at **zero discount**. Self-Check approves: within budget, consent respected."

Then click a **sure-buyer**:
> "Here the AI chose **do nothing** — because sending a coupon would just give away margin on a sale we'd win anyway. *Knowing when NOT to act is the whole point.*"

**Use the "Ask the AI" panel** — type: *"Why did you do nothing here?"* Let the LLM answer live.

---

### ⏱️ 4:30–6:00 — Prove It Works (A/B + money)
Point to the **A/B holdout card**:
> "We hold out 30% of shoppers as a control — they get nothing. Treatment recovers **36%**, control only **10%**. That's a **+26 point true uplift** — causation, not correlation."

Point to the KPI tiles:
> "Discount per recovered cart: **₹4.8**. The naive coupon-to-everyone approach would spend **99% more**. Net incremental margin at demo scale: **₹47 lakh**."

---

### ⏱️ 6:00–7:00 — AI Depth & Cost (differentiators)
> "Two things most teams won't do:
> 1. **Uplift modeling** — we only spend budget on **Persuadables** (buy *only if* nudged), never on sure-things or lost-causes.
> 2. **Cost-per-decision routing** — 90% of decisions run on a **cheap classical model** costing ₹0.0002; only genuinely uncertain cases hit the LLM. Average cost per decision: **₹0.025** — 10× cheaper than calling an LLM for everything."

---

### ⏱️ 7:00–8:00 — Impact, Scale & Roadmap
> "This is India-aware: UPI-failure detection, COD fallback, festival-mode pricing, and TRAI/DND + WhatsApp consent built in."

**Money Math at scale:** show the projection.
> "At a large retailer's cart volume, that per-cart margin compounds to **crores of rupees a year** — with an auditable, low-cost, explainable engine any store can integrate by calling one API."

**Close:**
> "Cart Rescue: recover more, spend less, and prove every rupee. Thank you."

---

## ✅ Pre-demo checklist
- [ ] Backend running on :8000 (`uvicorn backend.api:app --port 8000`)
- [ ] Dashboard running on :5173 (`npm run dev`)
- [ ] `.env` has `GROQ_API_KEY` (for live Q&A) — optional, template fallback works
- [ ] Let the dashboard run ~20s before presenting so metrics look populated
- [ ] Have the README open in a browser tab (for the diagrams)
- [ ] `python -m scripts.run_demo` output ready as a backup if the UI hiccups
