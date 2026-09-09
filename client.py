"""
Single shared Supabase client, built with the service_role key.
Only backend code should ever import this — the service_role key bypasses
row-level security, which is exactly why it must never reach the browser.
"""
from supabase import create_client, Client
from config import Config

_supabase: Client | None = None


def get_supabase() -> Client:
    global _supabase
    if _supabase is None:
        if not Config.SUPABASE_URL or not Config.SUPABASE_SERVICE_KEY:
            raise RuntimeError("SUPABASE_URL / SUPABASE_SERVICE_KEY are not set")
        _supabase = create_client(Config.SUPABASE_URL, Config.SUPABASE_SERVICE_KEY)
    return _supabase
