# ❓ Cart Rescue — Judge Q&A Prep

> Tough questions industry judges (Flipkart, Razorpay, SuperMoney, Bazaarvoice, Northern Trust, Brillio) are likely to ask — with crisp, confident answers. Practise saying these out loud.

---

### 🔴 "Your risk model's AUC — is it real, or is it leaking the answer?"
> "Great question — we specifically guarded against leakage. When we analysed dataset2 we found cart value and payment events are only recorded **at purchase time**, so naïvely they give a fake AUC of 1.0. We removed all outcome-coupled fields and train only on pre-decision signals. Our honest holdout AUC is **0.82** — genuinely predictive, not perfect."

### 🔴 "You added synthetic signals — isn't that cheating?"
> "It's the opposite — it's honesty. The problem statement itself says: *if the dataset lacks payment-failure signals, simulate them realistically and label them synthetic.* We keep dataset2's **real funnel structure and volumes**, and overlay a clearly-labelled behavioural layer. Every synthetic field is tagged in the audit log. On real store data you'd simply drop the overlay — the pipeline is unchanged."

### 🔴 "How do you *prove* it works, not just correlate?"
> "A proper **A/B holdout**. 30% of sessions are a control group that gets no intervention. We compare recovery rates: 36% treatment vs 10% control = **+26 points of true uplift**. That's causal, not correlational."

### 🔴 "Why not just send everyone a coupon? Simpler."
> "Because it destroys margin. A coupon-to-everyone approach spends **99% more discount** than us for the same recoveries — and it can't fix a failed payment. Our uplift model spends budget **only on Persuadables**; sure-buyers get 'do nothing', which protects margin."

### 🔴 "What's uplift modeling, in one sentence?"
> "We estimate the *incremental* effect of nudging each shopper with a two-model T-learner, and only spend on **Persuadables** — people who buy *only if* nudged — never on sure-things, lost-causes, or sleeping-dogs where a nudge is wasted or even backfires."

### 🔴 "You mention an LLM — isn't that expensive at scale?"
> "That's why we route by cost. ~90% of decisions are handled by a **cheap classical model** at ₹0.0002 each; only genuinely uncertain cases escalate to the LLM. Average cost per decision is **₹0.025** — about **10× cheaper** than calling an LLM for everything. And the LLM is only for explanations/edge cases, never in the hot path."

### 🔴 "What makes this India-specific?"
> "Three things: we detect **UPI/netbanking failure** patterns and offer **Cash-on-Delivery** instead of a useless coupon; a **festival mode** shrinks discounts during high-demand sales like Big Billion Days; and we enforce **TRAI/DND for SMS and WhatsApp opt-in** — we never contact a non-consented channel."

### 🔴 "How does a real store integrate this?"
> "One HTTP call. They `POST /score` with a session's signals and get back the decision in under a millisecond. It's stateless, so it scales horizontally behind a load balancer. No changes to their storefront."

### 🔴 "What's your latency? Can it run in-session?"
> "**0.19 ms** average per decision — well under the few-hundred-millisecond bar for exit-intent nudges. The classical model is basically free compute."

### 🔴 "What if the ML libraries aren't installed / it breaks in the demo?"
> "The risk model is **hybrid** — it uses XGBoost or scikit-learn if present, else a pure-numpy logistic regression. It **always runs**. Same for the LLM: no key or no network just falls back to template explanations. Nothing in the demo can hard-crash."

### 🔴 "How is it auditable / compliant?"
> "Every single decision is logged as a JSON line with the risk score, the signals behind it, the chosen action, budget overrides, and cost. Full traceability for compliance and debugging."

### 🔴 "What would you build next?"
> "An online **learning loop** — feed realized outcomes back to retrain nightly — and a **contextual bandit** to auto-tune per-reason action efficacy from live results. Plus flip on real SendGrid/Twilio sends (the code is already there)."

---

## 🧠 If you get stuck
- Buy time: *"Let me show you exactly where that lives in the code…"* then open the file.
- Redirect to strength: *"That ties into our biggest differentiator —"*
- Honesty wins: if you don't know, say *"We didn't test that yet — it's on the roadmap."* Judges respect it.
