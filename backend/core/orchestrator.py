r"""
orchestrator.py — The "AI brain" that wires the 4 agents together.

Pipeline per session:
   RiskScorer  ->  ReasonClassifier  ->  ActionSelector  ->  SelfCheck
        |               |                     |                 |
      risk%          reason              proposed action    final action
        \_______________\____________________\_________________/
                                |
                          AUDIT LOG (every decision, every signal)

Also implements COST-PER-DECISION routing: easy cases (clearly low/high risk)
are decided by the cheap classical model; genuinely ambiguous cases (risk in the
uncertain band) are flagged as "escalate_to_llm" and priced at the LLM rate.
For the demo we simulate the LLM cost — the routing LOGIC is the differentiator.
"""
from __future__ import annotations
import json
import time
from dataclasses import dataclass, asdict, field
from typing import List, Optional

from .schema import SessionFeatures
from . import config
from ..agents.risk_scorer import RiskScorer
from ..agents.reason_classifier import ReasonClassifier
from ..agents.action_selector import ActionSelector
from ..agents.self_check import SelfCheck


@dataclass
class Decision:
    session_id: str
    risk: float
    reason: str
    reason_confidence: float
    action: str
    discount_amount: float
    channel_cost: float
    explanation: str
    top_signals: list
    overrides: list
    decision_cost: float          # cost-per-decision (classical vs llm)
    engine: str                   # "classical" or "llm_escalated"
    latency_ms: float
    is_control: bool = False      # A/B holdout flag
    # ground truth (for validation, not used in decision)
    purchased: Optional[int] = None
    reached_intent: Optional[int] = None
    notification: dict = field(default_factory=dict)   # what we sent (email/SMS/WA)
    extra: dict = field(default_factory=dict)


class Orchestrator:
    def __init__(self, audit_path: Optional[str] = None):
        self.risk = RiskScorer()
        self.reason = ReasonClassifier()
        self.action = ActionSelector()
        self.check = SelfCheck()
        self.uplift = None   # optional UpliftModel; set via attach_uplift()
        self.audit_path = audit_path or str(config.AUDIT_LOG_PATH)
        self._audit_fh = None
        self._pending = 0   # buffered writes: flush in batches (OneDrive-safe)

    # ---- training passes through to the risk model ----
    def train(self, sessions: List[SessionFeatures]) -> dict:
        return self.risk.train(sessions)

    def attach_uplift(self, uplift_model):
        """Attach a trained UpliftModel so budget is spent only on Persuadables."""
        self.uplift = uplift_model

    # ---- cost routing ----
    def _route_cost(self, risk: float) -> tuple:
        lo, hi = config.LLM_ESCALATION_BAND
        if lo <= risk <= hi:
            return config.COST_LLM_CALL, "llm_escalated"
        return config.COST_CLASSICAL_ML, "classical"

    # ---- single decision (this is what POST /score calls) ----
    def decide(self, s: SessionFeatures, is_control: bool = False,
               log: bool = True, send: bool = False,
               contact: Optional[dict] = None) -> Decision:
        t0 = time.perf_counter()

        risk = self.risk.score(s)
        signals = self.risk.top_signals(s)
        rr = self.reason.classify(s, risk)
        decision_cost, engine = self._route_cost(risk)

        if is_control:
            # A/B CONTROL: no intervention at all (measures natural recovery).
            final_action, discount, chan_cost = "do_nothing", 0.0, 0.0
            explanation = "A/B control group — no intervention (baseline)."
            overrides = []
        else:
            proposal = self.action.select(s, risk, rr.reason)
            # UPLIFT GATING: if we have an uplift model and it says this shopper
            # is NOT a Persuadable (a sure-thing, lost-cause or sleeping-dog),
            # don't spend discount budget on them — downgrade to do_nothing.
            uplift_note = ""
            if self.uplift is not None and proposal.discount_amount > 0:
                quad, u, spend_ok = self.uplift.quadrant(s)
                # Uplift model acts as a SAFETY NET: block budget only where a
                # nudge backfires (sleeping_dog) or the sale is guaranteed
                # anyway (sure_thing). Genuinely at-risk carts that cleared the
                # Action Selector's cart-value + risk gates keep their budget
                # (they are the persuasive population a coupon can actually move).
                if quad in ("sure_thing", "sleeping_dog"):
                    proposal.action = "do_nothing"
                    proposal.discount_amount = 0.0
                    proposal.channel_cost = 0.0
                    proposal.rationale = (f"Uplift model: {quad} (uplift={u:+.2f}) — "
                                          "sale guaranteed or nudge backfires; "
                                          "spending budget here is wasted.")
                else:
                    uplift_note = f" [{quad}, uplift={u:+.2f}]"
            final = self.check.review(s, proposal)
            final_action = final.action
            discount = final.discount_amount
            chan_cost = final.channel_cost
            explanation = f"{rr.explanation} → {final.rationale}{uplift_note}"
            overrides = final.overrides

        latency_ms = round((time.perf_counter() - t0) * 1000, 2)

        # ACTUALLY SEND the recovery nudge (email/SMS/WhatsApp) when asked.
        # Control group never gets contacted. In-session actions record "no message".
        notification = {}
        if send and not is_control:
            from . import notifier
            notification = notifier.dispatch(
                final_action,
                {"session_id": s.session_id, "cart_value": s.cart_value,
                 "discount_amount": discount, "consent_email": s.consent_email,
                 "consent_sms": s.consent_sms, "consent_whatsapp": s.consent_whatsapp,
                 "email": (contact or {}).get("email"), "phone": (contact or {}).get("phone")},
                contact=contact,
            )

        d = Decision(
            session_id=s.session_id, risk=round(risk, 4),
            reason=rr.reason, reason_confidence=rr.confidence,
            action=final_action, discount_amount=discount, channel_cost=chan_cost,
            explanation=explanation,
            top_signals=[{"signal": n, "weight": w} for n, w in signals],
            overrides=overrides, decision_cost=decision_cost, engine=engine,
            latency_ms=latency_ms, is_control=is_control,
            purchased=s.purchased, reached_intent=s.reached_intent,
            notification=notification,
            extra=s.extra,
        )
        if log:
            self._append_audit(d)
        return d

    # ---- audit log (JSON Lines, one decision per line) ----
    def _append_audit(self, d: Decision):
        if self._audit_fh is None:
            self._audit_fh = open(self.audit_path, "a", encoding="utf-8")
        self._audit_fh.write(json.dumps(asdict(d), default=str) + "\n")
        # PERF FIX: flushing after EVERY decision is brutally slow on
        # cloud-synced folders (OneDrive re-syncs on each flush). Buffer and
        # flush every 32 decisions; close() flushes the tail.
        self._pending += 1
        if self._pending >= 32:
            self._audit_fh.flush()
            self._pending = 0

    def close(self):
        if self._audit_fh:
            self._audit_fh.flush()
            self._audit_fh.close()
            self._audit_fh = None
