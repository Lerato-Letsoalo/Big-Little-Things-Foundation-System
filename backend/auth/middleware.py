"""
Auth guard used by every sensitive route.

require_auth   -> caller must have a valid Supabase session AND an
                  'approved' status in the users table; attaches the user
                  to flask.g.user (id, email, role, status). Pending or
                  suspended accounts are rejected here, in one place, so no
                  individual route can forget the check.
require_admin  -> caller must additionally have role == 'admin'
"""
from functools import wraps
from flask import request, g, jsonify

from db.client import get_supabase


def _extract_token() -> str | None:
    header = request.headers.get("Authorization", "")
    if header.startswith("Bearer "):
        return header[len("Bearer "):]
    return None


def require_auth(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        token = _extract_token()
        if not token:
            return jsonify(error="Missing or invalid Authorization header"), 401

        supabase = get_supabase()
        try:
            auth_response = supabase.auth.get_user(token)
        except Exception:
            return jsonify(error="Invalid or expired session"), 401

        user = getattr(auth_response, "user", None)
        if not user:
            return jsonify(error="Invalid or expired session"), 401

        # Look up the app-level role from the users table (id matches auth.uid()).
        profile = (
            supabase.table("users")
            .select("id, name, email, role, status")
            .eq("id", user.id)
            .single()
            .execute()
        )
        if not profile.data:
            return jsonify(error="No matching user profile"), 403

        if profile.data.get("status") != "approved":
            # 'pending' (awaiting admin approval) and 'suspended' both fail closed.
            return jsonify(error="Account is not active"), 403

        g.user = profile.data
        return f(*args, **kwargs)

    return wrapper


def require_admin(f):
    @wraps(f)
    @require_auth
    def wrapper(*args, **kwargs):
        if g.user.get("role") != "admin":
            return jsonify(error="Admin access required"), 403
        return f(*args, **kwargs)

    return wrapper
