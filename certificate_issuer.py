"""
Called right after an hour approval. Ties together milestones.py (which tiers,
if any, were just reached), certificate_builder.py (renders the PDF), Supabase
Storage (holds the file), and the certificates table (the record the frontend
reads to show downloads).

Concurrency note: if two approvals for the same user race each other (e.g.
two admins approving different entries at nearly the same moment), both
requests can pass the "not yet issued" check in milestones.py before either
has committed its insert — the check alone is not a lock. The actual
safety net is the `unique (user_id, level)` constraint in sql/schema.sql:
whichever request's insert lands second gets rejected by the database, and
that is treated as a normal "someone else already issued this" outcome
below, not an error.
"""
from datetime import date, datetime, timezone

from db.client import get_supabase
from services.milestones import get_newly_reached_tiers
from services.certificate_builder import build_certificate_pdf
from services.email_service import send_email

CERTIFICATES_BUCKET = "certificates"


def _is_duplicate_key_error(exc: Exception) -> bool:
    """
    supabase-py/postgrest surface a unique-violation as an APIError whose
    message includes Postgres's own wording. Matching on that text (rather
    than a specific exception class, which varies across client versions)
    keeps this working even if the client library's exception hierarchy
    changes.
    """
    message = str(exc).lower()
    return "duplicate key" in message or "23505" in message or "already exists" in message


def issue_certificates_for_user(user_id: str, volunteer_name: str, volunteer_email: str) -> list[dict]:
    """
    Checks for newly-reached tiers and issues a certificate for each one.
    Safe to call after every approval, including two overlapping calls for
    the same user — does nothing if no new tier was reached, and never
    double-issues a tier even under a race (see module docstring).
    """
    newly_reached, total_hours = get_newly_reached_tiers(user_id)
    if not newly_reached:
        return []

    supabase = get_supabase()
    issued = []

    for tier, threshold in newly_reached:
        pdf_buffer = build_certificate_pdf(volunteer_name, tier, total_hours, date.today())
        file_path = f"{user_id}/{tier.lower()}.pdf"

        supabase.storage.from_(CERTIFICATES_BUCKET).upload(
            file_path,
            pdf_buffer.read(),
            {"content-type": "application/pdf", "upsert": "true"},
        )

        record = {
            "user_id": user_id,
            "level": tier,
            "hours_at_issue": total_hours,
            "file_path": file_path,
            "issued_at": datetime.now(timezone.utc).isoformat(),
        }

        try:
            result = supabase.table("certificates").insert(record).execute()
        except Exception as exc:
            if _is_duplicate_key_error(exc):
                # A concurrent approval already issued this tier's
                # certificate between our check and our insert — the
                # storage file we just uploaded is a harmless duplicate
                # (same deterministic path, upsert=true), and skipping the
                # record/email here is correct: the other request's insert
                # is the one that succeeded and will send its own email.
                continue
            raise

        issued.append(result.data[0])

        email_sent = send_email(
            to=volunteer_email,
            subject=f"You've earned your {tier} certificate!",
            html=(
                f"<p>Hi {volunteer_name},</p>"
                f"<p>Congratulations — you've reached the <b>{tier}</b> tier with "
                f"{total_hours:.1f} approved volunteer hours. Your certificate is "
                f"ready to download from your dashboard.</p>"
            ),
        )
        if not email_sent:
            print(f"[certificate_issuer] WARNING: {tier} certificate issued for "
                  f"user {user_id} but the notification email failed to send.")

    return issued
