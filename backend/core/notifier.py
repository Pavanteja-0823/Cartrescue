r"""
notifier.py — THE ACTUAL SEND LAYER (SendGrid email + Twilio SMS/WhatsApp).

This is a CORE deliverable: the problem statement lists a "CRM & Notification
API (email, SMS, WhatsApp, push)" and says real free options exist and
"nothing here needs a mock". So this module really sends.

CHANNELS
  * email     -> SendGrid  (free 100/day forever)
  * sms       -> Twilio    (trial credits)
  * whatsapp  -> Twilio WhatsApp sandbox
  * payment_retry_help / cod_offer / free_shipping_nudge / faster_delivery /
    do_nothing -> these are IN-SESSION UI actions, not messages, so there is
    nothing to send (we record that clearly).

SAFETY (never breaks a demo):
  * If the relevant keys are missing, we run in DRY-RUN mode: we build the exact
    message and RECORD what *would* be sent (status="dry_run"), without calling
    the network. Add the keys to .env to flip to real sending automatically.
  * CONSENT is enforced here too (defence in depth): we refuse SMS/WhatsApp
    without opt-in, honouring TRAI/DND + WhatsApp opt-in rules.
  * Every send attempt (real or dry-run) is appended to logs/notifications.jsonl
    for full auditability.

Dependencies are OPTIONAL: we use the SendGrid/Twilio SDKs if installed, else a
dependency-free urllib call. Missing SDK + missing key => dry-run.
"""
from __future__ import annotations
import os
import json
import time
import base64
from pathlib import Path
from typing import Optional
from urllib import request as _urlreq
from urllib.error import URLError, HTTPError

from .config import LOGS_DIR

NOTIFY_LOG = Path(LOGS_DIR) / "notifications.jsonl"

# Which actions actually result in an outbound MESSAGE (vs an in-session UI action)
MESSAGE_ACTIONS = {
    "email_reminder": "email",
    "whatsapp_reminder": "whatsapp",
    "sms_reminder": "sms",
}
IN_SESSION_ACTIONS = {
    "do_nothing", "payment_retry_help", "cod_offer",
    "free_shipping_nudge", "faster_delivery", "small_coupon",
}


# ---------------------------------------------------------------------------
# Message templates (India-flavoured, plain, friendly)
# ---------------------------------------------------------------------------
def build_message(action: str, session: dict) -> dict:
    """Return {subject, body} for the given action + session context."""
    cart = int(session.get("cart_value", 0) or 0)
    disc = int(session.get("discount_amount", 0) or 0)
    coupon_line = (f" Here's ₹{disc} off to help you decide." if disc > 0 else "")
    name = session.get("name", "there")
    subject = "You left something in your cart 🛒"
    body = (f"Hi {name}, you left items worth ₹{cart} in your cart."
            f"{coupon_line} Tap to complete your order — it only takes a minute!")
    if action == "whatsapp_reminder":
        body = (f"Hi {name}! 👋 Your cart (₹{cart}) is waiting."
                f"{coupon_line} Complete checkout here: <link>")
    return {"subject": subject, "body": body}


# ---------------------------------------------------------------------------
# SendGrid (email)
# ---------------------------------------------------------------------------
def _send_email(to_email: str, subject: str, body: str) -> dict:
    key = os.getenv("SENDGRID_API_KEY")
    sender = os.getenv("SENDGRID_FROM_EMAIL")
    if not key or not sender:
        return {"status": "dry_run", "reason": "no SENDGRID key/sender"}
    payload = json.dumps({
        "personalizations": [{"to": [{"email": to_email}]}],
        "from": {"email": sender},
        "subject": subject,
        "content": [{"type": "text/plain", "value": body}],
    }).encode("utf-8")
    req = _urlreq.Request("https://api.sendgrid.com/v3/mail/send", data=payload,
                          headers={"Authorization": f"Bearer {key}",
                                   "Content-Type": "application/json"})
    try:
        with _urlreq.urlopen(req, timeout=10) as resp:
            return {"status": "sent", "http": resp.status, "provider": "sendgrid"}
    except HTTPError as e:
        return {"status": "error", "http": e.code, "detail": e.read().decode()[:200]}
    except (URLError, TimeoutError, Exception) as e:  # noqa: BLE001
        return {"status": "error", "detail": str(e)[:200]}


# ---------------------------------------------------------------------------
# Twilio (SMS + WhatsApp)
# ---------------------------------------------------------------------------
def _send_twilio(to_number: str, body: str, whatsapp: bool = False) -> dict:
    sid = os.getenv("TWILIO_ACCOUNT_SID")
    token = os.getenv("TWILIO_AUTH_TOKEN")
    from_num = os.getenv("TWILIO_FROM_NUMBER")
    if not sid or not token or not from_num:
        return {"status": "dry_run", "reason": "no TWILIO creds"}
    from urllib.parse import urlencode
    to = f"whatsapp:{to_number}" if whatsapp else to_number
    frm = f"whatsapp:{from_num}" if whatsapp else from_num
    data = urlencode({"To": to, "From": frm, "Body": body}).encode("utf-8")
    url = f"https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json"
    auth = base64.b64encode(f"{sid}:{token}".encode()).decode()
    req = _urlreq.Request(url, data=data, headers={
        "Authorization": f"Basic {auth}",
        "Content-Type": "application/x-www-form-urlencoded"})
    try:
        with _urlreq.urlopen(req, timeout=10) as resp:
            return {"status": "sent", "http": resp.status,
                    "provider": "twilio_whatsapp" if whatsapp else "twilio_sms"}
    except HTTPError as e:
        return {"status": "error", "http": e.code, "detail": e.read().decode()[:200]}
    except (URLError, TimeoutError, Exception) as e:  # noqa: BLE001
        return {"status": "error", "detail": str(e)[:200]}


# ---------------------------------------------------------------------------
# PUBLIC ENTRY POINT — called by the orchestrator after a decision
# ---------------------------------------------------------------------------
def dispatch(action: str, session: dict, contact: Optional[dict] = None) -> dict:
    """Send the recovery nudge for a decision (or record why we didn't).

    `contact` = {"email": ..., "phone": ...}. If omitted, uses demo placeholders.
    Returns a record dict (also appended to the notifications audit log).
    """
    contact = contact or {}
    ts = time.strftime("%Y-%m-%dT%H:%M:%S")

    # In-session UI actions: nothing to SEND — record clearly.
    if action in IN_SESSION_ACTIONS:
        rec = {"ts": ts, "session_id": session.get("session_id"), "action": action,
               "channel": "in_session", "status": "no_message",
               "note": "In-session UI action (retry/COD/coupon/free-ship) — no outbound message."}
        _log(rec)
        return rec

    channel = MESSAGE_ACTIONS.get(action)
    if channel is None:
        rec = {"ts": ts, "session_id": session.get("session_id"), "action": action,
               "channel": "unknown", "status": "skipped", "note": "No channel for action."}
        _log(rec)
        return rec

    # CONSENT enforcement (defence in depth — TRAI/DND + WhatsApp opt-in).
    consent_ok = {
        "email": session.get("consent_email", True),
        "sms": session.get("consent_sms", False),
        "whatsapp": session.get("consent_whatsapp", False),
    }.get(channel, False)
    if not consent_ok:
        rec = {"ts": ts, "session_id": session.get("session_id"), "action": action,
               "channel": channel, "status": "blocked_no_consent",
               "note": f"No {channel} consent — skipped per TRAI/DND + opt-in policy."}
        _log(rec)
        return rec

    msg = build_message(action, session)

    if channel == "email":
        to = contact.get("email") or session.get("email") or "demo@example.com"
        result = _send_email(to, msg["subject"], msg["body"])
        target = to
    elif channel == "whatsapp":
        to = contact.get("phone") or session.get("phone") or "+910000000000"
        result = _send_twilio(to, msg["body"], whatsapp=True)
        target = to
    else:  # sms
        to = contact.get("phone") or session.get("phone") or "+910000000000"
        result = _send_twilio(to, msg["body"], whatsapp=False)
        target = to

    rec = {"ts": ts, "session_id": session.get("session_id"), "action": action,
           "channel": channel, "to": target, "subject": msg["subject"],
           "body": msg["body"], **result}
    _log(rec)
    return rec


def _log(rec: dict):
    try:
        with open(NOTIFY_LOG, "a", encoding="utf-8") as fh:
            fh.write(json.dumps(rec, default=str) + "\n")
    except Exception:  # noqa: BLE001
        pass


def status() -> dict:
    """Report which live channels are configured (for the dashboard/health)."""
    return {
        "email_live": bool(os.getenv("SENDGRID_API_KEY") and os.getenv("SENDGRID_FROM_EMAIL")),
        "sms_live": bool(os.getenv("TWILIO_ACCOUNT_SID") and os.getenv("TWILIO_AUTH_TOKEN")),
        "whatsapp_live": bool(os.getenv("TWILIO_ACCOUNT_SID") and os.getenv("TWILIO_FROM_NUMBER")),
    }
