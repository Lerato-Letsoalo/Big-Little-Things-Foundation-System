"""
Volunteer hours + approval, matching the existing frontend functions:
  - submitHours()   in dashboard/volunteer.html   -> POST /api/hours
  - renderAllHours()in dashboard/admin.html        -> GET /api/hours
  - approveHours(id)in dashboard/admin.html        -> POST /api/hours/<id>/approve
  - rejectHours(id) in dashboard/admin.html        -> POST /api/hours/<id>/reject
"""
from datetime import datetime, timezone, date

from flask import Blueprint, request, jsonify, g

from db.client import get_supabase
from auth.middleware import require_auth, require_admin
from services.certificate_issuer import issue_certificates_for_user
from services.email_service import send_email

hours_bp = Blueprint("hours", __name__)

MIN_HOURS = 0.5
MAX_HOURS = 24


@hours_bp.route("/api/hours", methods=["POST"])
@require_auth
def submit_hours():
    body = request.get_json(silent=True) or {}

    event_name = (body.get("event_name") or "").strip()
    event_date = body.get("date")
    hours = body.get("hours")

    if not event_name:
        return jsonify(error="Event name is required"), 400

    try:
        parsed_date = datetime.fromisoformat(event_date).date()
    except (TypeError, ValueError):
        return jsonify(error="Invalid date"), 400
    if parsed_date > date.today():
        return jsonify(error="Date cannot be in the future"), 400

    try:
        hours = float(hours)
    except (TypeError, ValueError):
        return jsonify(error="Invalid hours value"), 400
    if not (MIN_HOURS <= hours <= MAX_HOURS):
        return jsonify(error=f"Hours must be between {MIN_HOURS} and {MAX_HOURS}"), 400

    record = {
        "user_id": g.user["id"],          # from the authenticated session, never client-supplied
        "event_name": event_name,
        "date": parsed_date.isoformat(),
        "hours": hours,
        "status": "pending",
        "submitted_at": datetime.now(timezone.utc).isoformat(),
    }

    supabase = get_supabase()
    result = supabase.table("volunteer_hours").insert(record).execute()
    return jsonify(hours=result.data[0]), 201


@hours_bp.route("/api/hours", methods=["GET"])
@require_admin
def list_hours():
    status = request.args.get("status")  # e.g. ?status=pending
    supabase = get_supabase()
    query = supabase.table("volunteer_hours").select("*, users(name, email)")
    if status:
        query = query.eq("status", status)
    result = query.order("submitted_at", desc=True).execute()
    return jsonify(hours=result.data)


@hours_bp.route("/api/hours/mine", methods=["GET"])
@require_auth
def my_hours():
    supabase = get_supabase()
    result = (
        supabase.table("volunteer_hours")
        .select("*")
        .eq("user_id", g.user["id"])
        .order("submitted_at", desc=True)
        .execute()
    )
    return jsonify(hours=result.data)


@hours_bp.route("/api/hours/<hour_id>/approve", methods=["POST"])
@require_admin
def approve_hours(hour_id):
    supabase = get_supabase()
    entry = supabase.table("volunteer_hours").select("*").eq("id", hour_id).single().execute()
    if not entry.data:
        return jsonify(error="Hour entry not found"), 404
    if entry.data["status"] == "approved":
        return jsonify(hours=entry.data)  # idempotent

    supabase.table("volunteer_hours").update({"status": "approved"}).eq("id", hour_id).execute()

    volunteer = (
        supabase.table("users").select("name, email").eq("id", entry.data["user_id"]).single().execute()
    ).data

    issued = issue_certificates_for_user(entry.data["user_id"], volunteer["name"], volunteer["email"])

    email_sent = send_email(
        to=volunteer["email"],
        subject="Your volunteer hours were approved",
        html=f"<p>Hi {volunteer['name']}, your {entry.data['hours']} hours for "
             f"'{entry.data['event_name']}' have been approved. Thank you!</p>",
    )

    return jsonify(status="approved", certificates_issued=issued, email_sent=email_sent)


@hours_bp.route("/api/hours/<hour_id>/reject", methods=["POST"])
@require_admin
def reject_hours(hour_id):
    supabase = get_supabase()
    entry = supabase.table("volunteer_hours").select("*").eq("id", hour_id).single().execute()
    if not entry.data:
        return jsonify(error="Hour entry not found"), 404

    if entry.data["status"] == "approved":
        # Once approved, a certificate may already have been issued off the
        # back of this entry's hours — silently flipping it to 'rejected'
        # would leave that certificate's hours uncorrected. Require an
        # explicit separate "revoke" flow for that case instead of allowing
        # a same-endpoint reject to paper over it.
        return jsonify(error="Cannot reject an already-approved entry"), 409

    supabase.table("volunteer_hours").update({"status": "rejected"}).eq("id", hour_id).execute()

    volunteer = (
        supabase.table("users").select("name, email").eq("id", entry.data["user_id"]).single().execute()
    ).data
    email_sent = send_email(
        to=volunteer["email"],
        subject="About your submitted volunteer hours",
        html=f"<p>Hi {volunteer['name']}, your {entry.data['hours']} hours for "
             f"'{entry.data['event_name']}' were not approved. Reach out to an admin if you "
             f"think this was a mistake.</p>",
    )

    return jsonify(status="rejected", email_sent=email_sent)
