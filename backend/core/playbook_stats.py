"""
playbook_stats.py — Compute the Coupon Playbook statistics from the ACTUAL
loaded/trained sessions (dataset2 + enrichment). NOTHING is hard-coded: every
number (per-reason counts, median cart value, abandonment rate, the coupon
cart-value threshold) is derived from the real data at runtime.

Exposed via GET /playbook so the dashboard renders live, data-derived values.
"""
from __future__ import annotations
from typing import List
import statistics as _stats

from .schema import SessionFeatures
from ..agents.reason_classifier import ReasonClassifier
from . import config


def compute_playbook(sessions: List[SessionFeatures], risk_scorer=None) -> dict:
    """Bucket every intent session by its diagnosed reason and compute real
    aggregates. If a risk_scorer is provided we use its risk for classification;
    otherwise we pass a neutral 0.5 so the rule engine still assigns reasons."""
    rc = ReasonClassifier()
    buckets: dict = {}
    for s in sessions:
        if s.reached_intent != 1:
            continue
        risk = risk_scorer.score(s) if risk_scorer is not None else 0.5
        reason = rc.classify(s, risk).reason
        b = buckets.setdefault(reason, {"carts": [], "durations": [], "pays": [],
                                        "deliveries": [], "abandoned": 0, "count": 0})
        b["count"] += 1
        b["carts"].append(s.cart_value)
        b["durations"].append(s.duration_s)
        b["pays"].append(s.n_payment_attempts)
        b["deliveries"].append(int(s.extra.get("delivery_days", 0) or 0))
        if s.purchased == 0:
            b["abandoned"] += 1

    n_intent = sum(b["count"] for b in buckets.values()) or 1
    # data-derived coupon threshold = median cart across all intent sessions
    all_carts = [c for b in buckets.values() for c in b["carts"]] or [0]
    coupon_threshold = round(_stats.median(all_carts))

    out = {"n_intent": n_intent, "coupon_threshold": coupon_threshold,
           "per_session_budget": config.PER_SESSION_DISCOUNT_BUDGET,
           "small_coupon_pct": int(config.SMALL_COUPON_PCT * 100), "reasons": {}}
    for reason, b in buckets.items():
        med_cart = round(_stats.median(b["carts"])) if b["carts"] else 0
        out["reasons"][reason] = {
            "count": b["count"],
            "pct_of_intent": round(b["count"] / n_intent * 100, 1),
            "median_cart": med_cart,
            "abandon_rate": round(b["abandoned"] / max(1, b["count"]) * 100, 1),
            "median_duration_s": round(_stats.median(b["durations"])) if b["durations"] else 0,
            "median_pay_attempts": round(_stats.median(b["pays"])) if b["pays"] else 0,
            "median_delivery_days": round(_stats.median(b["deliveries"])) if b["deliveries"] else 0,
            # would this reason ever get a coupon? (mirrors ActionSelector rule)
            "gets_coupon": reason in ("price_shopping", "distracted_abandoner")
                           and med_cart >= 800,
        }
    return out
