"""
GET /api/certificates/<user_id>            -> list a volunteer's certificates
GET /api/certificates/download/<cert_id>   -> a signed URL to the PDF
"""
from flask import Blueprint, jsonify, g

from db.client import get_supabase
from auth.middleware import require_auth
from services.certificate_issuer import CERTIFICATES_BUCKET

certificates_bp = Blueprint("certificates", __name__)

SIGNED_URL_EXPIRY_SECONDS = 60 * 10  # 10 minutes


@certificates_bp.route("/api/certificates/<user_id>", methods=["GET"])
@require_auth
def list_certificates(user_id):
    # A volunteer can see their own certificates; an admin can see anyone's.
    if g.user["id"] != user_id and g.user.get("role") != "admin":
        return jsonify(error="Not authorized to view these certificates"), 403

    supabase = get_supabase()
    result = (
        supabase.table("certificates")
        .select("*")
        .eq("user_id", user_id)
        .order("issued_at", desc=True)
        .execute()
    )
    return jsonify(certificates=result.data)


@certificates_bp.route("/api/certificates/download/<certificate_id>", methods=["GET"])
@require_auth
def download_certificate(certificate_id):
    supabase = get_supabase()
    cert = (
        supabase.table("certificates").select("*").eq("id", certificate_id).single().execute()
    ).data
    if not cert:
        return jsonify(error="Certificate not found"), 404

    if g.user["id"] != cert["user_id"] and g.user.get("role") != "admin":
        return jsonify(error="Not authorized to download this certificate"), 403

    signed = supabase.storage.from_(CERTIFICATES_BUCKET).create_signed_url(
        cert["file_path"], SIGNED_URL_EXPIRY_SECONDS
    )
    return jsonify(download_url=signed["signedURL"])
