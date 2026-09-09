"""
Renders a certificate PDF entirely in memory (BytesIO) — no local disk writes,
since the backend will likely run on an ephemeral host (Render/Railway).
"""
from io import BytesIO
from datetime import date

from reportlab.lib.pagesizes import landscape, A4
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.pdfgen import canvas

TIER_COLORS = {
    "Bronze": colors.HexColor("#8C5A2B"),
    "Silver": colors.HexColor("#8A8D91"),
    "Gold": colors.HexColor("#B8860B"),
    "Platinum": colors.HexColor("#4B4E6D"),
}


def build_certificate_pdf(volunteer_name: str, tier: str, hours: float, issue_date: date = None) -> BytesIO:
    issue_date = issue_date or date.today()
    accent = TIER_COLORS.get(tier, colors.HexColor("#085041"))

    buffer = BytesIO()
    page_size = landscape(A4)
    c = canvas.Canvas(buffer, pagesize=page_size)
    width, height = page_size

    # Border
    c.setStrokeColor(accent)
    c.setLineWidth(4)
    c.rect(0.4 * inch, 0.4 * inch, width - 0.8 * inch, height - 0.8 * inch)
    c.setLineWidth(1)
    c.rect(0.55 * inch, 0.55 * inch, width - 1.1 * inch, height - 1.1 * inch)

    # Header
    c.setFont("Helvetica-Bold", 14)
    c.setFillColor(colors.HexColor("#5F5E5A"))
    c.drawCentredString(width / 2, height - 1.3 * inch, "BIG LITTLE THINGS FOUNDATION")

    c.setFont("Helvetica-Bold", 30)
    c.setFillColor(colors.HexColor("#085041"))
    c.drawCentredString(width / 2, height - 2.0 * inch, "Certificate of Volunteer Service")

    c.setFont("Helvetica", 13)
    c.setFillColor(colors.HexColor("#2C2C2A"))
    c.drawCentredString(width / 2, height - 2.7 * inch, "This certificate is proudly presented to")

    c.setFont("Helvetica-Bold", 26)
    c.setFillColor(accent)
    c.drawCentredString(width / 2, height - 3.4 * inch, volunteer_name)

    c.setFont("Helvetica", 13)
    c.setFillColor(colors.HexColor("#2C2C2A"))
    c.drawCentredString(
        width / 2, height - 4.0 * inch,
        f"in recognition of reaching the {tier} tier with {hours:.1f} hours of approved volunteer service"
    )

    # Tier badge
    c.setFont("Helvetica-Bold", 16)
    c.setFillColor(accent)
    c.drawCentredString(width / 2, height - 4.7 * inch, tier.upper())

    # Footer
    c.setFont("Helvetica", 10)
    c.setFillColor(colors.HexColor("#5F5E5A"))
    c.drawString(1.0 * inch, 0.9 * inch, f"Issued: {issue_date.isoformat()}")
    c.drawRightString(width - 1.0 * inch, 0.9 * inch, "biglittlethings.org.za")

    c.showPage()
    c.save()
    buffer.seek(0)
    return buffer
