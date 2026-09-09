"""
POST /api/payfast-webhook

PayFast calls this server-to-server after a payment attempt (the "ITN" —
Instant Transaction Notification). This must NEVER trust the payload blindly:
services.payfast_service.verify_itn() runs all of PayFast's recommended checks
(signature, source host, their own validate endpoint, and amount match)
before the donation is marked complete.

Always return HTTP 200 once the ITN has been received and processed —
PayFast retries on anything else, which would duplicate processing.
"""
from flask import Blueprint, request

from db.client import get_supabase
from services.payfast_service import verify_itn
from services.email_service import send_donation_receipt

payfast_webhook_bp = Blueprint("payfast_webhook", __name__)


@payfast_webhook_bp.route("/api/payfast-webhook", methods=["POST"])
def payfast_webhook():
    posted = request.form.to_dict()
    source_ip = request.headers.get("X-Forwarded-For", request.remote_addr)
    if source_ip and "," in source_ip:
        source_ip = source_ip.split(",")[0].strip()

    m_payment_id = posted.get("m_payment_id")
    if not m_payment_id:
        return "missing m_payment_id", 200  # malformed — ack so PayFast stops retrying

    supabase = get_supabase()
    existing = (
        supabase.table("donations")
        .select("*")
        .eq("id", m_payment_id)
        .single()
        .execute()
    )
    donation = existing.data
    if not donation:
        return "unknown donation", 200

    if donation["status"] == "complete":
        return "already processed", 200  # idempotent — PayFast can send duplicate ITNs

    is_valid, reason = verify_itn(posted, source_ip, expected_amount=donation["amount"])

    new_status = "complete" if is_valid else "failed"
    supabase.table("donations").update({
        "status": new_status,
        "payfast_payment_id": posted.get("pf_payment_id"),
        "verification_note": reason,
    }).eq("id", m_payment_id).execute()

    if is_valid:
        email_sent = send_donation_receipt(donation)
        if not email_sent:
            print(f"[payfast-webhook] WARNING: donation {m_payment_id} verified and marked "
                  f"complete, but the receipt email failed to send.")
    else:
        # Log for follow-up — a failed verification on a real attempt is worth a human look.
        print(f"[payfast-webhook] verification failed for donation {m_payment_id}: {reason}")

    return "ok", 200
