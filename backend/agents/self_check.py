"""
AGENT 4 — SELF-CHECK
====================
The last agent. Before an action is finalised it must pass review against the
BUSINESS GOALS and GUARDRAILS:

  1. BUDGET: never exceed per-session budget; never blow the campaign budget.
     If a ₹200 coupon is proposed but ₹150 is left, downgrade it.
  2. CONSENT / CHANNEL POLICY: never use a channel the user didn't opt into
     (TRAI/DND for SMS, WhatsApp opt-in). Downgrade to a consented channel or
     do_nothing.
  3. MARGIN SANITY: never spend more discount than the margin we'd recover
     (don't lose money to "save" a cart).

This is the "review its own output before final" step the brief asks for.
Every override is logged with a reason -> full auditability.
"""
from __future__ import annotations
from dataclasses import dataclass, field
from typing import List

from ..core.schema import SessionFeatures
from ..core import config
from .action_selector import ActionProposal


@dataclass
class FinalDecision:
    action: str
    discount_amount: float
    channel_cost: float
    rationale: str
    overrides: List[str] = field(default_factory=list)   # what self-check changed

    @property
    def total_cost(self) -> float:
        return round(self.discount_amount + self.channel_cost, 2)


class SelfCheck:
    """Stateful: tracks campaign spend so the campaign budget is enforced
    across the whole run, not just per session."""

    def __init__(self):
        self.campaign_spend = 0.0

    def review(self, s: SessionFeatures, proposal: ActionProposal) -> FinalDecision:
        overrides: List[str] = []
        action = proposal.action
        discount = proposal.discount_amount
        channel_cost = proposal.channel_cost
        rationale = proposal.rationale

        # --- 1. per-session budget cap ---
        if discount > config.PER_SESSION_DISCOUNT_BUDGET:
            overrides.append(
                f"Discount ₹{discount:.0f} exceeded per-session budget "
                f"₹{config.PER_SESSION_DISCOUNT_BUDGET:.0f}; capped.")
            discount = config.PER_SESSION_DISCOUNT_BUDGET

        # --- 2. campaign budget cap ---
        if self.campaign_spend + discount > config.PER_CAMPAIGN_DISCOUNT_BUDGET:
            remaining = max(0.0, config.PER_CAMPAIGN_DISCOUNT_BUDGET - self.campaign_spend)
            if remaining <= 0 and discount > 0:
                overrides.append("Campaign budget exhausted; dropped discount action.")
                action, discount, channel_cost = "do_nothing", 0.0, 0.0
                rationale = "Campaign discount budget exhausted — protect remaining margin."
            elif discount > remaining:
                overrides.append(
                    f"Trimmed discount ₹{discount:.0f}→₹{remaining:.0f} to fit campaign budget.")
                discount = remaining

        # --- 3. consent / channel policy ---
        if action == "whatsapp_reminder" and not s.consent_whatsapp:
            overrides.append("No WhatsApp opt-in — downgraded per channel policy.")
            if s.consent_email:
                action, channel_cost = "email_reminder", config.CHANNEL_COST["email_reminder"]
                rationale = "Downgraded to email (WhatsApp not consented)."
            else:
                action, channel_cost = "do_nothing", 0.0
                rationale = "No consented channel available — respecting DND."
        if action == "email_reminder" and not s.consent_email:
            overrides.append("No email consent — dropped.")
            action, channel_cost = "do_nothing", 0.0
            rationale = "No consented channel — respecting user preferences."

        # --- 4. margin sanity: don't spend more than we'd recover ---
        recoverable_margin = s.cart_value * config.GROSS_MARGIN_RATE
        if discount > recoverable_margin and discount > 0:
            overrides.append(
                f"Discount ₹{discount:.0f} > recoverable margin ₹{recoverable_margin:.0f}; "
                "downgraded to do_nothing (would lose money).")
            action, discount, channel_cost = "do_nothing", 0.0, 0.0
            rationale = "Cost to recover exceeds the margin at stake — not worth it."

        # commit campaign spend
        self.campaign_spend += discount

        return FinalDecision(
            action=action, discount_amount=round(discount, 2),
            channel_cost=round(channel_cost, 2), rationale=rationale,
            overrides=overrides,
        )
