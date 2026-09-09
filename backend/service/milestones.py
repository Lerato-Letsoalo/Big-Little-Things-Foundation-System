"""
Tier thresholds match the existing frontend helper in dashboard/volunteer.html
exactly (Bronze/Silver/Gold/Platinum), so certificate labels line up with what
volunteers already see on their dashboard.
"""
from db.client import get_supabase

# Ordered highest-to-lowest so we can find "every tier reached so far" easily.
TIERS = [
    ("Platinum", 100),
    ("Gold", 50),
    ("Silver", 25),
    ("Bronze", 10),
]


def get_total_approved_hours(user_id: str) -> float:
    supabase = get_supabase()
    result = (
        supabase.table("volunteer_hours")
        .select("hours")
        .eq("user_id", user_id)
        .eq("status", "approved")
        .execute()
    )
    return sum(row["hours"] for row in (result.data or []))


def get_issued_tiers(user_id: str) -> set[str]:
    supabase = get_supabase()
    result = (
        supabase.table("certificates")
        .select("level")
        .eq("user_id", user_id)
        .execute()
    )
    return {row["level"] for row in (result.data or [])}


def get_newly_reached_tiers(user_id: str) -> list[tuple[str, int]]:
    """
    Returns [(tier_name, threshold), ...] for every tier the volunteer has
    reached but doesn't have a certificate for yet. Usually zero or one, but
    a big single approval can cross more than one tier at once.
    """
    total = get_total_approved_hours(user_id)
    already_issued = get_issued_tiers(user_id)

    newly_reached = [
        (tier, threshold)
        for tier, threshold in TIERS
        if total >= threshold and tier not in already_issued
    ]
    return newly_reached, total
