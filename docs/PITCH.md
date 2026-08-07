# 📊 Cart Rescue — Slide-by-Slide Pitch Outline

> 10 slides. Optimised for the judging weights: Business Impact 20% · AI Innovation 20% · Technical Excellence 20% · Enterprise Architecture 15% · UX 10% · Scalability/Security/Cost 10% · Presentation 5%.

---

### Slide 1 — Title
- **Cart Rescue** — *Abandonment Diagnosis & Remediation Agent*
- One line: "Recover more carts, spend 99% less discount — and prove it."
- Your name · AI BUILD 2026 · Track 2

### Slide 2 — The Problem (Business Impact)
- Carts get abandoned for very different reasons (UPI fail, shipping shock, price-shopping, friction…).
- Everyone reacts the same dumb way: **blast a coupon**.
- Two costs: **wasted margin** on sure buyers + **no help** for failed payments.

### Slide 3 — The Solution
- A plug-and-play **decision service**: `POST /score` → risk, reason, one action, cost — in <1ms.
- **"Do nothing" is a valid action.** We act only when it pays.
- Visual: the 4-agent flow.

### Slide 4 — How the AI Thinks (AI Innovation)
- 4 cooperating agents: Risk → Reason → Action → Self-Check.
- Screenshot of the **live reasoning** panel.
- Emphasise: transparent, auditable, several small agents (not one mega-prompt).

### Slide 5 — Proof It Works (Business Impact) ⭐
- **A/B holdout**: Treatment 36% vs Control 10% recovery → **+26pp true uplift**.
- "Causation, not correlation."
- Big number: **₹4.8 discount per recovered cart**.

### Slide 6 — The Differentiators (AI Innovation) ⭐
- **Uplift modeling** → spend only on **Persuadables** (~10% of sessions).
- **Cost-per-decision routing** → 90% cheap ML / 10% LLM → **₹0.025 avg**, ~10× cheaper.
- **Self-Check** agent enforces budget + consent + margin.

### Slide 7 — India-Specific Intelligence (Enterprise/UX)
- UPI-failure detection → **COD fallback** (not a useless coupon).
- **Festival mode** (Big Billion Days) → shrink coupons when demand is high.
- **TRAI/DND + WhatsApp opt-in** consent enforced.

### Slide 8 — Architecture & Integration (Enterprise/Scalability)
- Diagram: dataset → /score → 4 agents → action + audit → dashboard / SendGrid / Twilio.
- <1ms latency, hybrid ML (runs with zero heavy deps), stateless API → scales horizontally.
- Any store integrates by calling **one endpoint**.

### Slide 9 — 💸 Money Math at Scale ⭐ (the "big money" slide)
- Net margin per cart × a large retailer's annual cart volume.
- Show the compounding: **demo ₹47L → crores/year at scale**.
- Contrast bar: our discount spend vs coupon-to-everyone (**99% less**).

### Slide 10 — Roadmap & Close
- Next: online learning loop, real SendGrid/Twilio send, contextual bandits.
- Close line: **"Recover more, spend less, prove every rupee."**
- Links: GitHub repo · live demo.

---

## 🎨 Design tips
- Dark theme, one accent colour, big numbers.
- Max ~15 words per slide — you narrate the rest.
- Slides 5, 6, 9 are your scoring slides — spend the most time there.
- Every claim has a number behind it. Judges from Razorpay/SuperMoney love hard metrics.
