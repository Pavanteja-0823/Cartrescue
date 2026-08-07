"""
api.py — FastAPI backend exposing the plug-and-play POST /score endpoint.

This is THE integration surface. Any real store (Flipkart, etc.) sends one
session's data and gets back {risk, reason, action, explanation, cost} in a few
hundred ms. For the demo we call it with dataset rows to simulate live traffic.

Run:
    uvicorn backend.api:app --reload --port 8000
Then open http://localhost:8000/docs for the interactive Swagger UI.
"""
from __future__ import annotations
import pickle
from pathlib import Path
from typing import Optional

# Load .env (Groq key etc.) if python-dotenv is installed — optional, safe if missing.
try:
    from dotenv import load_dotenv
    from pathlib import Path as _P
    load_dotenv(_P(__file__).resolve().parents[1] / ".env")
except Exception:
    pass

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from backend.core.schema import SessionFeatures
from backend.core.orchestrator import Orchestrator
from backend.core.config import MODELS_DIR
from backend.core.data_loader import load_sessions
from backend.core import llm_explainer
from backend.core import notifier
from backend.core.playbook_stats import compute_playbook

app = FastAPI(
    title="CART RESCUE — Abandonment Diagnosis & Remediation API",
    version="1.0.0",
    description="Real-time, multi-agent cart-abandonment decision service.",
)

# CORS so the React dashboard (localhost:5173) can call us.
app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"],
)

# ---- one orchestrator for the process; model loaded/trained at startup ----
orch = Orchestrator()


class ScoreRequest(BaseModel):
    """One shopping session. Mirrors SessionFeatures; a real store fills these."""
    session_id: str = Field(..., examples=["sess_12345"])
    n_events: int = 0
    n_page_view: int = 0
    n_add_to_cart: int = 0
    n_checkout: int = 0
    duration_s: float = 0.0
    cart_value: float = 0.0
    cart_size: int = 0
    n_payment_attempts: int = 0
    payment_failed: bool = False
    delivery_days: int = 0       # promised delivery days — drives the delivery_delay reason
    device: str = "unknown"
    source: str = "unknown"
    country: str = "IN"
    consent_email: bool = True
    consent_sms: bool = False
    consent_whatsapp: bool = False
    reached_intent: int = 1
    is_control: bool = False
    send: bool = False              # if true, actually send the nudge (email/SMS/WA)
    email: Optional[str] = None     # contact for real sending
    phone: Optional[str] = None


class ScoreResponse(BaseModel):
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
    decision_cost: float
    engine: str
    latency_ms: float
    notification: dict = {}


_PLAYBOOK_CACHE = {}
_SCORED_SESSIONS = []  # real dataset rows scored through the trained model


@app.on_event("startup")
def _startup():
    """Load or train the risk model, attach uplift, compute the playbook, and
    score a real dataset sample for the live feed. Always leaves the API ready."""
    model_path = Path(MODELS_DIR) / "risk_model.pkl"
    sessions = load_sessions(limit=20000)

    if model_path.exists():
        with open(model_path, "rb") as fh:
            orch.risk = pickle.load(fh)
        print(f"[api] loaded trained model ({orch.risk.backend})")
    else:
        print("[api] no saved model — training a quick one on load...")
        info = orch.train(sessions)
        print(f"[api] trained: {info}")

    # DIFFERENTIATOR: spend budget only on Persuadables.
    import random
    from backend.agents.uplift_model import UpliftModel
    random.seed(42)
    treated = [random.random() < 0.7 for _ in sessions]
    uplift = UpliftModel()
    try:
        uinfo = uplift.train(sessions, treated, risk_scorer=orch.risk)
        orch.attach_uplift(uplift)
        print(f"[api] uplift attached: {uinfo}")
    except Exception as e:  # noqa: BLE001
        print(f"[api] uplift skipped: {e}")

    # Data-derived Coupon Playbook from the real sessions.
    try:
        _PLAYBOOK_CACHE.update(compute_playbook(sessions, orch.risk))
        print(f"[api] playbook computed for {_PLAYBOOK_CACHE.get('n_intent')} sessions")
    except Exception as e:  # noqa: BLE001
        print(f"[api] playbook skipped: {e}")

    # Score a REAL dataset sample through the trained model for the live feed.
    try:
        random.seed(7)
        sample = [x for x in sessions if x.reached_intent == 1]
        random.shuffle(sample)
        for _s in sample[:400]:
            _d = orch.decide(_s, is_control=(random.random() < 0.30), log=False)
            _SCORED_SESSIONS.append({
                "session_id": _d.session_id, "risk": _d.risk, "reason": _d.reason,
                "action": _d.action, "discount": _d.discount_amount,
                "engine": _d.engine, "is_control": _d.is_control,
                "cart_value": _s.cart_value, "purchased": _s.purchased,
            })
        print(f"[api] scored {len(_SCORED_SESSIONS)} real sessions for the feed")
    except Exception as e:  # noqa: BLE001
        print(f"[api] session scoring skipped: {e}")


@app.get("/health")
def health():
    return {"status": "ok", "model_backend": orch.risk.backend,
            "risk_auc": getattr(orch.risk, "auc", None)}


@app.get("/model_info")
def model_info():
    """Real model facts for the dashboard (AUC, backend, decisions scored)."""
    return {
        "risk_auc": getattr(orch.risk, "auc", None),
        "backend": getattr(orch.risk, "backend", "unknown"),
        "n_intent": _PLAYBOOK_CACHE.get("n_intent", 0),
    }


@app.post("/score", response_model=ScoreResponse)
def score(req: ScoreRequest):
    """Score one session and return the full decision (risk→reason→action→check)."""
    s = SessionFeatures(
        session_id=req.session_id, n_events=req.n_events,
        n_page_view=req.n_page_view, n_add_to_cart=req.n_add_to_cart,
        n_checkout=req.n_checkout, duration_s=req.duration_s,
        cart_value=req.cart_value, cart_size=req.cart_size,
        n_payment_attempts=req.n_payment_attempts, payment_failed=req.payment_failed,
        device=req.device, source=req.source, country=req.country,
        consent_email=req.consent_email, consent_sms=req.consent_sms,
        consent_whatsapp=req.consent_whatsapp, reached_intent=req.reached_intent,
        # delivery_days drives the delivery_delay reason — must reach the agents
        extra={"delivery_days": req.delivery_days,
               "delivery_days_high": req.delivery_days >= 7},
    )
    contact = {"email": req.email, "phone": req.phone} if (req.email or req.phone) else None
    d = orch.decide(s, is_control=req.is_control, send=req.send, contact=contact)
    return ScoreResponse(
        session_id=d.session_id, risk=d.risk, reason=d.reason,
        reason_confidence=d.reason_confidence, action=d.action,
        discount_amount=d.discount_amount, channel_cost=d.channel_cost,
        explanation=d.explanation, top_signals=d.top_signals,
        overrides=d.overrides, decision_cost=d.decision_cost,
        engine=d.engine, latency_ms=d.latency_ms, notification=d.notification,
    )


class ExplainRequest(BaseModel):
    """A decision object (as returned by /score) to narrate in plain English."""
    session_id: str = ""
    risk: float = 0.0
    reason: str = ""
    action: str = ""
    discount_amount: float = 0.0
    top_signals: list = []


class AskRequest(BaseModel):
    """A judge's free-text question grounded in a specific decision."""
    question: str
    decision: dict = {}


@app.post("/explain")
def explain(req: ExplainRequest):
    """Rich, plain-English narrative for a decision. Uses Groq if a key is set,
    otherwise a crisp template (never fails)."""
    return llm_explainer.explain(req.model_dump())


@app.post("/ask")
def ask(req: AskRequest):
    """Answer a judge's question about a decision (explainable-AI panel)."""
    return llm_explainer.ask(req.question, req.decision)


@app.get("/llm_status")
def llm_status():
    """Tell the dashboard whether the live LLM is active or in template mode."""
    import os
    return {"llm_active": bool(os.getenv("GROQ_API_KEY")),
            "model": os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")}


class SendRequest(BaseModel):
    """Directly send a recovery nudge for a given action + session context."""
    action: str
    session_id: str = ""
    cart_value: float = 0.0
    discount_amount: float = 0.0
    consent_email: bool = True
    consent_sms: bool = False
    consent_whatsapp: bool = False
    email: Optional[str] = None
    phone: Optional[str] = None


@app.post("/send")
def send(req: SendRequest):
    """Actually dispatch the email/SMS/WhatsApp nudge (or dry-run if no keys)."""
    session = req.model_dump()
    contact = {"email": req.email, "phone": req.phone}
    return notifier.dispatch(req.action, session, contact=contact)


@app.get("/notify_status")
def notify_status():
    """Which live send channels are configured (email/SMS/WhatsApp)."""
    return notifier.status()


@app.get("/playbook")
def playbook():
    """Data-derived Coupon Playbook stats (computed from the trained sessions)."""
    return _PLAYBOOK_CACHE


@app.get("/stream_sample")
def stream_sample(limit: int = 60):
    """Real dataset sessions scored through the trained model (for the live feed)."""
    return {"sessions": _SCORED_SESSIONS[:limit], "total_scored": len(_SCORED_SESSIONS)}
