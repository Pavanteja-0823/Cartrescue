"""
test_send.py — Quick check that your SendGrid / Twilio keys actually work.

Run from the project root:
    python -m scripts.test_send email   your@email.com
    python -m scripts.test_send whatsapp +919491989764
    python -m scripts.test_send sms      +919491989764

It loads .env, reports which channels are live, and sends ONE real test message
on the channel you pick. If keys are missing it prints a clear dry-run notice
(so you know exactly what to fix) instead of crashing.
"""
from __future__ import annotations
import sys
from pathlib import Path

# load .env (Groq/SendGrid/Twilio keys)
try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).resolve().parents[1] / ".env")
except Exception:
    pass

from backend.core import notifier


def main():
    channel = sys.argv[1] if len(sys.argv) > 1 else "email"
    target = sys.argv[2] if len(sys.argv) > 2 else None

    print("Channel status:", notifier.status())
    print("-" * 50)

    action = {"email": "email_reminder", "whatsapp": "whatsapp_reminder",
              "sms": "sms_reminder"}.get(channel, "email_reminder")

    # a realistic demo session with consent granted for the chosen channel
    session = {
        # cart_value 2450 = sample cart worth ₹2,450 (demo data, not magic)
        "session_id": "test_send", "cart_value": 2450, "discount_amount": 120,
        "name": "Pavan",
        "consent_email": True, "consent_sms": True, "consent_whatsapp": True,
        "email": target if channel == "email" else None,
        "phone": target if channel in ("whatsapp", "sms") else None,
    }
    contact = {"email": target if channel == "email" else None,
               "phone": target if channel in ("whatsapp", "sms") else None}

    result = notifier.dispatch(action, session, contact=contact)
    print(f"\nSend result for {channel} -> {target}:")
    for k, v in result.items():
        print(f"  {k}: {v}")

    if result.get("status") == "sent":
        print("\n✅ SUCCESS — check your inbox / phone!")
    elif result.get("status") == "dry_run":
        print("\n🧪 DRY-RUN — keys not set. Add them to .env to send for real.")
    elif result.get("status") == "blocked_no_consent":
        print("\n🚫 Blocked by consent policy (expected if opt-in is off).")
    else:
        print("\n⚠️ Error — check the detail above (key/sender/number issue).")


if __name__ == "__main__":
    main()
