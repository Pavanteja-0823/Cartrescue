"""
schema.py — The canonical Session shape flowing through all 4 agents.

Whatever raw dataset we load (dataset1/2/3/4 or a live store), we normalise it
into this ONE structure. Agents only ever see `SessionFeatures`, so they don't
care which Kaggle file it came from. This is the "dataset-agnostic" contract
that lets any real store integrate by populating these fields.
"""
from __future__ import annotations
from dataclasses import dataclass, field, asdict
from typing import Optional, Dict, Any


@dataclass
class SessionFeatures:
    """One shopper session, normalised. All money in the dataset's own units
    (dataset2 is USD-labelled; we treat the numbers as ₹ for the India story —
    documented clearly, not hidden)."""

    session_id: str

    # --- behavioural signals (from clickstream) ---
    n_events: int = 0
    n_page_view: int = 0
    n_add_to_cart: int = 0
    n_checkout: int = 0
    n_purchase: int = 0            # used only for ground-truth label, NOT as a feature
    duration_s: float = 0.0

    # --- cart / money ---
    cart_value: float = 0.0        # max cart amount observed
    cart_size: int = 0             # number of items

    # --- payment signals ---
    n_payment_attempts: int = 0
    payment_failed: bool = False   # >=1 attempt but no purchase => inferred failure

    # --- context ---
    device: str = "unknown"        # mobile / desktop / tablet
    source: str = "unknown"        # email / organic / ...
    country: str = "unknown"

    # --- consent (channel policy) ---
    consent_email: bool = True
    consent_sms: bool = False
    consent_whatsapp: bool = False

    # --- ground truth (for validation only, never fed to the risk model) ---
    purchased: Optional[int] = None      # 1 bought, 0 did not
    reached_intent: Optional[int] = None # added to cart or hit checkout

    # free bag for anything dataset-specific
    extra: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)
