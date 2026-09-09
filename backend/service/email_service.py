"""
Minimal email sending stub — this is the same module referenced in the
backend API layer doc (services/email_service.py) that will also handle
hour-approval and certificate emails later. Swap the body of send_email()
for Resend, SMTP, or whichever provider you settle on.

send_email() returns True/False rather than assuming success — a network
error or a non-2xx response from Resend previously vanished silently, which
meant an approval or certificate could "succeed" while the volunteer never
found out. Callers now get a signal they can log or surface.
"""
import os
import requests

RESEND_API_KEY = os.environ.get("RESEND_API_KEY")
FROM_ADDRESS = os.environ.get("EMAIL_FROM", "donations@biglittlethings.org.za")


def send_email(to: str, subject: str, html: str) -> bool:
    """Returns True if the email was accepted by the provider, False otherwise."""
    if not RESEND_API_KEY:
        print(f"[email_service] RESEND_API_KEY not set — skipping email to {to}: {subject}")
        return False

    try:
        resp = requests.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {RESEND_API_KEY}"},
            json={"from": FROM_ADDRESS, "to": [to], "subject": subject, "html": html},
            timeout=10,
        )
    except Exception as exc:
        # Deliberately broad: an email provider failing in any way (network
        # error, timeout, unexpected client exception) must never bubble up
        # and fail the request that triggered it — approving hours or
        # completing a donation has already succeeded by this point, and
        # that success shouldn't be undone by a notification problem.
        print(f"[email_service] ERROR: sending to {to} ({subject!r}) failed: {exc}")
        return False

    if not resp.ok:
        print(f"[email_service] ERROR: Resend returned {resp.status_code} for {to} "
              f"({subject!r}): {resp.text[:300]}")
        return False

    return True


def send_donation_receipt(donation: dict) -> bool:
    return send_email(
        to=donation["donor_email"],
        subject="Thank you for your donation to BLTF",
        html=(
            f"<p>Hi {donation['donor_name']},</p>"
            f"<p>Your donation of R{donation['amount']:.2f} has been received and confirmed. "
            f"Thank you for supporting Big Little Things Foundation!</p>"
        ),
    )
