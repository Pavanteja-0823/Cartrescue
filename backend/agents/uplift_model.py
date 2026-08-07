"""
DIFFERENTIATOR — UPLIFT MODELING (Persuadables)
================================================
Most teams score "who will abandon" and then nudge everyone at high risk. That
wastes budget on two groups:
  * SURE THINGS   — buy whether we nudge or not (nudge = wasted margin).
  * LOST CAUSES   — never buy no matter what (nudge = wasted spend).
And it can even hurt with:
  * SLEEPING DOGS — a nudge ANNOYS them and makes them LESS likely to buy.
The only group worth spending on:
  * PERSUADABLES  — buy ONLY IF nudged. This is where budget earns its keep.

We estimate uplift with a simple, explainable T-LEARNER (two-model approach):
    uplift(x) = P(buy | treated, x) - P(buy | control, x)
Train one model on treated sessions, one on control sessions, subtract their
predicted purchase probabilities. Positive uplift => Persuadable.

This is dependency-free (reuses the numpy logistic regression) so it always
runs, and it's easy to explain to judges in one sentence.
"""
from __future__ import annotations
from typing import List
import numpy as np

from ..core.schema import SessionFeatures
from .risk_scorer import featurize, _NumpyLogReg


# Quadrant thresholds on estimated uplift. Calibrated to the observed uplift
# distribution: on our data, ~top quartile shows meaningfully positive uplift.
# Persuadable = uplift >= +0.01 (nudge genuinely helps). Sleeping-dog =
# uplift <= -0.03 (nudge backfires — leave them alone). The middle band is
# split into sure-things (buy anyway) vs lost-causes (won't buy) using the
# control-arm purchase probability.
UPLIFT_PERSUADABLE = 0.01    # >= this => spending budget is worth it
UPLIFT_SLEEPING_DOG = -0.03  # <= this => a nudge backfires; leave them alone


class UpliftModel:
    """T-learner uplift estimator. Classifies each session into one of four
    quadrants so the Action Selector only spends budget on Persuadables."""

    def __init__(self):
        self.m_treated = None
        self.m_control = None
        self.trained = False

    def train(self, sessions: List[SessionFeatures],
              treated_flags: List[bool]) -> dict:
        """Train two purchase models: one on treated, one on control sessions.
        `treated_flags[i]` = was session i in the treatment arm during the
        experiment that produced these outcomes."""
        Xt, yt, Xc, yc = [], [], [], []
        for s, treated in zip(sessions, treated_flags):
            if s.purchased is None:
                continue
            x = featurize(s)
            if treated:
                Xt.append(x); yt.append(s.purchased)
            else:
                Xc.append(x); yc.append(s.purchased)
        Xt, yt = np.array(Xt), np.array(yt)
        Xc, yc = np.array(Xc), np.array(yc)

        self.m_treated = _NumpyLogReg().fit(Xt, yt)
        self.m_control = _NumpyLogReg().fit(Xc, yc)
        self.trained = True
        return {"n_treated": len(yt), "n_control": len(yc)}

    def uplift(self, s: SessionFeatures) -> float:
        """Estimated incremental purchase probability from nudging this session."""
        if not self.trained:
            return 0.0
        x = featurize(s).reshape(1, -1)
        p_treated = self.m_treated.predict_proba(x)[0, 1]
        p_control = self.m_control.predict_proba(x)[0, 1]
        return float(p_treated - p_control)

    def quadrant(self, s: SessionFeatures) -> tuple:
        """Return (quadrant_name, uplift_score, spend_ok: bool)."""
        u = self.uplift(s)
        if u >= UPLIFT_PERSUADABLE:
            return "persuadable", u, True          # SPEND here
        if u <= UPLIFT_SLEEPING_DOG:
            return "sleeping_dog", u, False         # do NOT contact (backfires)
        # small positive/zero uplift: could be sure-thing or lost-cause.
        # Use the control-arm purchase prob to disambiguate for explanation.
        p_control = (self.m_control.predict_proba(featurize(s).reshape(1, -1))[0, 1]
                     if self.trained else 0.5)
        if p_control >= 0.5:
            return "sure_thing", u, False           # buys anyway -> save margin
        return "lost_cause", u, False               # won't buy -> save spend
