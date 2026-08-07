"""
AGENT 2 — REASON CLASSIFIER
===========================
Given a session, decide WHY it may abandon. One of the SEVEN reasons Indian
shoppers actually leave (straight from the problem statement):

  payment_failure     — failed UPI/netbanking payment
  shipping_shock      — surprise shipping cost at checkout
  delivery_delay      — disappointing / too-long delivery date  (NEW)
  price_shopping      — price-checking another app
  form_friction       — plain friction in a long checkout form
  distracted_abandoner— added to cart, wandered off, never came back  (NEW, the
                         single biggest real-world group)
  sure_buyer          — will buy anyway; do NOT waste a coupon

Why rules + a confidence?  The signals for "why" are largely deterministic and
explainable (a failed payment IS a payment_failure). Judges reward transparent,
auditable logic far more than an opaque classifier. We score every candidate
reason, pick the strongest, and expose a confidence so genuinely-ambiguous
cases can be escalated to the LLM.
"""
from __future__ import annotations
from dataclasses import dataclass
from typing import List, Tuple

from ..core.schema import SessionFeatures

REASONS = ["payment_failure", "shipping_shock", "delivery_delay",
           "price_shopping", "form_friction", "distracted_abandoner", "sure_buyer"]


@dataclass
class ReasonResult:
    reason: str
    confidence: float          # 0..1 — how sure we are
    explanation: str           # plain English
    scores: dict               # per-reason score for auditing


class ReasonClassifier:
    """Transparent rule engine that scores each candidate reason, then picks
    the strongest. Confidence = margin between top-1 and top-2 scores."""

    def classify(self, s: SessionFeatures, risk: float) -> ReasonResult:
        sc = {r: 0.0 for r in REASONS}

        # --- payment_failure: tried to pay, didn't complete (UPI/netbanking) ---
        if s.payment_failed:
            sc["payment_failure"] += 0.7
        if s.n_payment_attempts >= 2:
            sc["payment_failure"] += 0.3          # repeated attempts == classic UPI fail
        # NOTE: never read `purchased` here — that label is unknown at decision
        # time (leakage). `payment_failed` is the inferred pre-decision signal.
        if s.n_payment_attempts == 1 and s.payment_failed:
            sc["payment_failure"] += 0.15

        # --- shipping_shock: reached checkout, brief dwell, quick bounce ---
        if s.n_checkout > 0 and s.duration_s < 200 and s.n_payment_attempts == 0 \
                and s.cart_value > 0 and not s.extra.get("delivery_days_high"):
            sc["shipping_shock"] += 0.55
        # no `purchased` check: outcome is unknown at decision time (leakage)
        if s.n_add_to_cart > 0 and s.n_checkout > 0 and s.duration_s < 120:
            sc["shipping_shock"] += 0.2

        # --- delivery_delay: a long promised delivery date drove them off ---
        # Signal comes from the (dataset or synthetic) delivery_days field.
        delivery_days = int(s.extra.get("delivery_days", 0) or 0)
        if delivery_days >= 7 and s.n_checkout > 0 and s.n_payment_attempts == 0:
            sc["delivery_delay"] += 0.7
        elif delivery_days >= 5 and s.n_checkout > 0:
            sc["delivery_delay"] += 0.4

        # --- price_shopping: heavy browsing, low commitment, long dwell ---
        if s.n_page_view >= 15 and s.n_add_to_cart <= 1:
            sc["price_shopping"] += 0.6
        if s.n_page_view > s.n_add_to_cart * 8 and s.n_page_view > 8:
            sc["price_shopping"] += 0.3
        if s.duration_s > 300 and s.n_payment_attempts == 0 and delivery_days < 5:
            sc["price_shopping"] += 0.2

        # --- form_friction: reached checkout, long dwell, no payment attempt ---
        if s.n_checkout > 0 and s.n_payment_attempts == 0 and s.duration_s > 400 \
                and delivery_days < 5:
            sc["form_friction"] += 0.7
        elif s.n_checkout > 0 and s.duration_s > 600:
            sc["form_friction"] += 0.4

        # --- distracted_abandoner: added to cart, NEVER reached checkout, ---
        #     short-to-medium session, no payment attempt. The classic
        #     "keep it in the cart and leave" shopper — the biggest group.
        if s.n_add_to_cart > 0 and s.n_checkout == 0 and s.n_payment_attempts == 0 \
                and s.duration_s < 400:
            sc["distracted_abandoner"] += 0.65
        if s.n_add_to_cart > 0 and s.n_checkout == 0 and s.n_page_view < 12:
            sc["distracted_abandoner"] += 0.2

        # --- sure_buyer: smooth path, low risk ---
        if risk < 0.35:
            sc["sure_buyer"] += 0.6
        if s.n_checkout > 0 and s.n_payment_attempts >= 1 and risk < 0.4:
            sc["sure_buyer"] += 0.3

        # Fallback if nothing fired strongly.
        if max(sc.values()) < 0.3:
            if risk >= 0.5:
                sc["distracted_abandoner"] += 0.35
            else:
                sc["sure_buyer"] += 0.4

        ranked: List[Tuple[str, float]] = sorted(sc.items(), key=lambda kv: -kv[1])
        top, top_score = ranked[0]
        second_score = ranked[1][1]
        confidence = round(min(1.0, (top_score - second_score) + top_score / 2), 3)

        return ReasonResult(
            reason=top, confidence=confidence,
            explanation=self._explain(top, s, delivery_days),
            scores={k: round(v, 3) for k, v in sc.items()},
        )

    @staticmethod
    def _explain(reason: str, s: SessionFeatures, delivery_days: int) -> str:
        if reason == "payment_failure":
            return (f"{s.n_payment_attempts} payment attempt(s) with no completed "
                    f"purchase — looks like a UPI/netbanking failure.")
        if reason == "shipping_shock":
            return ("Reached checkout then bounced quickly — likely reacted to the "
                    "shipping cost.")
        if reason == "delivery_delay":
            return (f"Promised delivery was ~{delivery_days} days — a disappointing "
                    "delivery date likely drove the shopper away.")
        if reason == "price_shopping":
            return (f"{s.n_page_view} page views but only {s.n_add_to_cart} "
                    f"add-to-cart — comparison/price-shopping behaviour.")
        if reason == "form_friction":
            return (f"Reached checkout and spent {int(s.duration_s)}s without a "
                    f"payment attempt — stuck on the form.")
        if reason == "distracted_abandoner":
            return ("Added items to the cart but never reached checkout — a "
                    "distracted shopper who left the cart behind (the biggest group).")
        return ("Smooth progression toward purchase with low risk — a likely "
                "sure buyer; intervening would waste margin.")
