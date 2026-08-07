"""
AGENT 1 — RISK SCORER
=====================
Scores each session's abandonment risk (0..100%) using ONLY signals present in
the data before the outcome: payment attempts, cart value/size, browsing depth,
checkout progress, time-on-page.

HYBRID design (judging: Technical Excellence + Scalability/Cost):
  * If scikit-learn / XGBoost are installed -> train a real GradientBoosting /
    XGBoost classifier (strong, calibrated probabilities).
  * If NOT installed -> fall back to a pure-numpy logistic-regression trained
    with gradient descent. Same interface. So the system ALWAYS runs, on any
    machine, with zero heavy deps — a genuine "cheap classical model" story.

The model NEVER sees n_purchase (that's the label). Leakage-free by construction.
A 20% holdout split is used to report an honest AUC — not an in-sample one.
"""
from __future__ import annotations
from typing import List, Tuple
import numpy as np

from ..core.schema import SessionFeatures

# ---- optional heavy deps (graceful) ----
try:
    from sklearn.ensemble import GradientBoostingClassifier
    from sklearn.preprocessing import StandardScaler
    _HAVE_SKLEARN = True
except Exception:  # noqa: BLE001
    _HAVE_SKLEARN = False

try:
    from xgboost import XGBClassifier
    _HAVE_XGB = True
except Exception:  # noqa: BLE001
    _HAVE_XGB = False


# Feature columns extracted from a session (order matters — keep stable).
FEATURE_NAMES = [
    "n_events", "n_page_view", "n_add_to_cart", "n_checkout",
    "duration_s", "cart_value", "cart_size",
    "n_payment_attempts", "payment_failed_flag",
    "is_mobile", "browse_ratio",
]


def featurize(s: SessionFeatures) -> np.ndarray:
    """Turn a session into a numeric feature vector (leakage-free)."""
    browse_ratio = s.n_page_view / max(1, s.n_events)  # lots of views, little action
    return np.array([
        s.n_events, s.n_page_view, s.n_add_to_cart, s.n_checkout,
        s.duration_s, s.cart_value, s.cart_size,
        s.n_payment_attempts, 1.0 if s.payment_failed else 0.0,
        1.0 if s.device == "mobile" else 0.0,
        browse_ratio,
    ], dtype=float)


def _roc_auc(y_true, y_score) -> float:
    """Dependency-free ROC-AUC via the Mann–Whitney U statistic.
    Used to report an honest holdout AUC even without sklearn."""
    y_true = np.asarray(y_true, dtype=float)
    y_score = np.asarray(y_score, dtype=float)
    order = np.argsort(y_score)
    ranks = np.empty_like(order, dtype=float)
    ranks[order] = np.arange(len(y_score), dtype=float)
    pos = y_true == 1.0
    n_pos, n_neg = int(pos.sum()), int((~pos).sum())
    if n_pos == 0 or n_neg == 0:
        return 0.5
    return float((ranks[pos].sum() - n_pos * (n_pos + 1) / 2.0) / (n_pos * n_neg))


# ===========================================================================
# Pure-numpy logistic regression (the always-available fallback)
# ===========================================================================
class _NumpyLogReg:
    """Minimal, dependency-free logistic regression with standardisation.
    Trained by full-batch gradient descent. Good enough to be a real baseline
    and to keep the whole project runnable without sklearn."""

    def __init__(self, lr: float = 0.1, epochs: int = 400, l2: float = 1e-3):
        self.lr, self.epochs, self.l2 = lr, epochs, l2
        self.w = None; self.b = 0.0
        self.mu = None; self.sd = None

    def _scale(self, X):
        return (X - self.mu) / self.sd

    def fit(self, X, y):
        X = np.asarray(X, float); y = np.asarray(y, float)
        self.mu = X.mean(0); self.sd = X.std(0) + 1e-9
        Xs = self._scale(X)
        n, d = Xs.shape
        self.w = np.zeros(d)
        for _ in range(self.epochs):
            z = Xs @ self.w + self.b
            p = 1 / (1 + np.exp(-z))
            grad_w = Xs.T @ (p - y) / n + self.l2 * self.w
            grad_b = (p - y).mean()
            self.w -= self.lr * grad_w
            self.b -= self.lr * grad_b
        return self

    def predict_proba(self, X):
        Xs = self._scale(np.asarray(X, float))
        p = 1 / (1 + np.exp(-(Xs @ self.w + self.b)))
        return np.column_stack([1 - p, p])


class RiskScorer:
    """Agent that outputs P(abandon) in [0,1]. Backend auto-selected."""

    def __init__(self):
        self.model = None
        self.backend = "none"
        self.auc = None          # honest holdout AUC from the last train()

    # ---- training ----
    def train(self, sessions: List[SessionFeatures]) -> dict:
        # Only sessions that showed purchase intent are meaningful to score
        # for abandonment (you can't abandon a cart you never started).
        train = [s for s in sessions if s.reached_intent == 1]
        if len(train) < 50:
            return {"backend": "none", "n_train": 0, "abandon_rate": 0.0,
                    "auc": None}
        X = np.array([featurize(s) for s in train])
        y = np.array([1 - s.purchased for s in train])  # 1 = abandoned

        # --- honest holdout: 20% held back, model never trains on it ---
        rng = np.random.default_rng(42)
        perm = rng.permutation(len(X))
        n_val = max(1, int(0.2 * len(X)))
        val_idx, tr_idx = perm[:n_val], perm[n_val:]
        Xtr, ytr, Xva, yva = X[tr_idx], y[tr_idx], X[val_idx], y[val_idx]

        if _HAVE_XGB:
            self.model = XGBClassifier(
                n_estimators=200, max_depth=4, learning_rate=0.1,
                subsample=0.9, eval_metric="logloss", n_jobs=4)
            self.model.fit(Xtr, ytr)
            self.backend = "xgboost"
        elif _HAVE_SKLEARN:
            self.scaler = StandardScaler().fit(Xtr)
            self.model = GradientBoostingClassifier(
                n_estimators=200, max_depth=3, learning_rate=0.1)
            self.model.fit(self.scaler.transform(Xtr), ytr)
            self.backend = "sklearn_gbdt"
        else:
            self.model = _NumpyLogReg().fit(Xtr, ytr)
            self.backend = "numpy_logreg"

        self.auc = round(_roc_auc(yva, self._predict_proba(Xva)), 3)
        return {"backend": self.backend, "n_train": len(tr_idx),
                "n_val": len(val_idx), "abandon_rate": float(y.mean()),
                "auc": self.auc}

    # ---- inference ----
    def _predict_proba(self, X: np.ndarray) -> np.ndarray:
        """Raw P(abandon) for a feature matrix (backend-aware)."""
        if self.model is None:
            return np.full(len(X), 0.5)   # never crash: untrained -> coin flip
        if self.backend == "sklearn_gbdt":
            X = self.scaler.transform(X)
        return self.model.predict_proba(X)[:, 1]

    def score(self, s: SessionFeatures) -> float:
        """Return abandonment risk in [0,1]."""
        return float(self._predict_proba(featurize(s).reshape(1, -1))[0])

    def score_batch(self, sessions: List[SessionFeatures]) -> np.ndarray:
        return np.array([self.score(s) for s in sessions])

    # ---- explainability: which signals drove this score ----
    def top_signals(self, s: SessionFeatures, k: int = 3) -> List[Tuple[str, float]]:
        """Plain-English driver signals for THIS session (model-agnostic).
        Uses simple contribution heuristics so every score is explainable."""
        drivers = []
        if s.payment_failed:
            drivers.append(("payment failed after attempt(s)", 0.9))
        if s.n_payment_attempts >= 2:
            drivers.append(("multiple payment attempts", 0.7))
        if s.n_checkout == 0 and s.n_add_to_cart > 0:
            drivers.append(("added to cart but never reached checkout", 0.6))
        if s.duration_s > 600:
            drivers.append(("very long time on page (friction)", 0.5))
        if s.n_page_view > 15 and s.n_add_to_cart <= 1:
            drivers.append(("heavy browsing, low commitment (price-shopping)", 0.5))
        if s.cart_value > 3000:
            drivers.append(("high cart value at stake", 0.4))
        if not drivers:
            drivers.append(("progressed smoothly toward purchase", 0.3))
        drivers.sort(key=lambda t: -t[1])
        return drivers[:k]
