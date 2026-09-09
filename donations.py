"""
POST /api/donations/create

Mirrors the fields donate.html already collects (see submitDonation() in the
existing frontend): donor_name, donor_email, type, amount, item_description,
city, message, anonymous.

- type == 'money'  -> insert a 'pending' donation, return signed PayFast
                       fields + the process URL for the frontend to POST to.
- type != 'money'  -> insert directly as 'recorded' (no payment involved),
                       nothing further to do.
"""
from flask import Blueprint, request, jsonify
from datetime import datetime, timezone

from db.client import get_supabase
from services.payfast_service import build_payment_fields
from config import Config

donations_bp = Blueprint("donations", __name__)

MIN_MONEY_DONATION = 10


@donations_bp.route("/api/donations/create", methods=["POST"])
def create_donation():
    body = request.get_json(silent=True) or {}

    donor_name = (body.get("donor_name") or "").strip()
    donor_email = (body.get("donor_email") or "").strip().lower()
    donation_type = body.get("type")
    amount = body.get("amount")
    item_description = (body.get("item_description") or "").strip()
    anonymous = bool(body.get("anonymous", False))

    # --- Same validation rules as the existing frontend, re-checked server-side ---
    if not donor_name or not donor_email:
        return jsonify(error="Name and email are required"), 400

    if donation_type == "money":
        try:
            amount = float(amount)
        except (TypeError, ValueError):
            return jsonify(error="Invalid amount"), 400
        if amount < MIN_MONEY_DONATION:
            return jsonify(error=f"Minimum donation is R{MIN_MONEY_DONATION}"), 400
    else:
        if len(item_description) < 3:
            return jsonify(error="Please describe the items you'd like to donate"), 400

    record = {
        "donor_name": "Anonymous" if anonymous else donor_name,
        "donor_email": donor_email,
        "type": donation_type,
        "amount": amount if donation_type == "money" else None,
        "item_description": item_description if donation_type != "money" else None,
        "city": body.get("city"),
        "message": body.get("message"),
        "anonymous": anonymous,
        "status": "pending" if donation_type == "money" else "recorded",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    supabase = get_supabase()
    result = supabase.table("donations").insert(record).execute()
    donation = result.data[0]

    if donation_type != "money":
        # Item donation — nothing further to do, no payment involved.
        return jsonify(donation=donation), 201

    # Money donation — build the signed PayFast field set for the frontend
    # to render as a hidden auto-submitting form.
    payment_fields = build_payment_fields(donation)

    return jsonify(
        donation=donation,
        payfast_process_url=Config.PAYFAST_PROCESS_URL,
        payfast_fields=payment_fields,
    ), 201
