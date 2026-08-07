"""
AGENT 3 — ACTION SELECTOR
=========================
Given (session, risk, reason), pick exactly ONE action from a bounded menu.
"do_nothing" is a first-class, valid choice — we do NOT blast coupons at
everyone (that's the whole point of the track).

Actions:
  do_nothing | payment_retry_help | cod_offer | free_shipping_nudge
  faster_delivery | small_coupon | whatsapp_reminder | email_reminder

THE COUPON RULE (core idea):
  A coupon is ONLY justified for a genuinely-unsure **price-shopper** or a
  hesitating **distracted abandoner** on a worthwhile cart — never for someone
  who'd buy anyway (sure_buyer => do_nothing) and never when a cheaper,
  reason-specific fix exists (payment fail => retry/COD, shipping => free
  shipping, delivery => faster delivery). This is how we beat the naive
  "coupon-to-everyone" baseline on margin.
"""
from __future__ import annotations
from dataclasses import dataclass

from ..core.schema import SessionFeatures
from ..core import config


ACTIONS = ["do_nothing", "payment_retry_help", "cod_offer", "free_shipping_nudge",
           "faster_delivery", "small_coupon", "whatsapp_reminder", "email_reminder"]


@dataclass
class ActionProposal:
    action: str
    discount_amount: float      # ₹ margin given away (coupon/shipping subsidy)
    channel_cost: float         # ₹ cost to send (WhatsApp/email fee)
    rationale: str              # plain English "why this action"

    @property
    def total_cost(self) -> float:
        return round(self.discount_amount + self.channel_cost, 2)


class ActionSelector:
    """Maps reason+risk to the single best action, sized within budget."""

    def _coupon(self, s: SessionFeatures) -> float:
        coupon = min(s.cart_value * config.SMALL_COUPON_PCT,
                     config.PER_SESSION_DISCOUNT_BUDGET)
        if getattr(config, "FESTIVAL_MODE", False):
            coupon *= config.FESTIVAL_COUPON_MULTIPLIER
        return round(coupon, 2)

    def select(self, s: SessionFeatures, risk: float, reason: str) -> ActionProposal:
        # Sure buyers or low risk -> do nothing, protect margin.
        if reason == "sure_buyer" or risk < config.RISK_LOW:
            return ActionProposal(
                "do_nothing", 0.0, 0.0,
                "Low abandonment risk / sure buyer — intervening would waste margin.")

        # Payment failure -> retry, or COD after repeated UPI failures.
        if reason == "payment_failure":
            if s.n_payment_attempts >= 2:
                return ActionProposal(
                    "cod_offer", 0.0, config.CHANNEL_COST["cod_offer"],
                    f"{s.n_payment_attempts} failed UPI/netbanking attempts — the "
                    "payment rail is the blocker. Offer Cash-on-Delivery to bypass "
                    "it entirely (India-specific). No discount needed.")
            return ActionProposal(
                "payment_retry_help", 0.0, config.CHANNEL_COST["payment_retry_help"],
                "Payment failed once — offer an instant retry / alternate method "
                "(UPI→card). No discount needed; the intent to buy is already there.")

        # Shipping shock -> free shipping targets the exact objection.
        if reason == "shipping_shock":
            subsidy = min(config.FREE_SHIPPING_SUBSIDY,
                          config.PER_SESSION_DISCOUNT_BUDGET)
            return ActionProposal(
                "free_shipping_nudge", subsidy, 0.0,
                "Bounced at checkout on shipping cost — a free-shipping nudge "
                "targets the exact objection, cheaper than a blanket coupon.")

        # Delivery delay -> offer faster delivery / reassurance, not a coupon.
        if reason == "delivery_delay":
            return ActionProposal(
                "faster_delivery", 0.0, config.CHANNEL_COST.get("faster_delivery", 0.0),
                "Left over a long delivery date — offer an expedited-delivery option "
                "or a clear delivery guarantee. Fixes the real objection; ₹0 discount.")

        # Form friction -> a gentle reminder on a consented channel.
        if reason == "form_friction":
            if s.consent_whatsapp:
                return ActionProposal(
                    "whatsapp_reminder", 0.0, config.CHANNEL_COST["whatsapp_reminder"],
                    "Stuck on the form — a WhatsApp nudge with a resume-checkout "
                    "link removes the friction without spending margin.")
            if s.consent_email:
                return ActionProposal(
                    "email_reminder", 0.0, config.CHANNEL_COST["email_reminder"],
                    "Stuck on the form — an email reminder to resume checkout, "
                    "no discount required.")
            return ActionProposal(
                "do_nothing", 0.0, 0.0,
                "Friction detected but no consented channel — respect DND/opt-in.")

        # Distracted abandoner (added to cart & left) -> gentle reminder first;
        # a small coupon ONLY if they're high-risk on a worthwhile cart.
        if reason == "distracted_abandoner":
            if s.cart_value >= 1000 and risk >= config.RISK_HIGH:
                return ActionProposal(
                    "small_coupon", self._coupon(s), 0.0,
                    f"High-risk abandoned cart worth ₹{int(s.cart_value)} — a small "
                    f"capped coupon (₹{int(self._coupon(s))}) can pull them back; within budget.")
            if s.consent_whatsapp:
                return ActionProposal(
                    "whatsapp_reminder", 0.0, config.CHANNEL_COST["whatsapp_reminder"],
                    "Left items in the cart — a free WhatsApp 'you left something' "
                    "reminder beats giving away margin.")
            return ActionProposal(
                "email_reminder", 0.0, config.CHANNEL_COST["email_reminder"],
                "Left items in the cart — a free email reminder to come back.")

        # Price shopping -> the classic coupon case, but ONLY for genuinely-unsure,
        # higher-value carts at high risk. Otherwise a free reminder or nothing.
        if reason == "price_shopping":
            if s.cart_value >= 800 and risk >= config.RISK_HIGH:
                coupon = self._coupon(s)
                return ActionProposal(
                    "small_coupon", coupon, 0.0,
                    f"Genuinely price-shopping a ₹{int(s.cart_value)} cart at high risk "
                    f"— a capped {int(config.SMALL_COUPON_PCT*100)}% coupon (₹{int(coupon)}) "
                    "can tip the decision; still within budget.")
            if s.consent_email:
                return ActionProposal(
                    "email_reminder", 0.0, config.CHANNEL_COST["email_reminder"],
                    "Price-shopping but low value / uncertain — a free email nudge "
                    "beats giving away margin.")
            return ActionProposal(
                "do_nothing", 0.0, 0.0,
                "Price-shopping, low value, no consent — not worth spending margin.")

        # Fallback
        return ActionProposal(
            "do_nothing", 0.0, 0.0,
            "No clear high-value intervention — default to protecting margin.")
