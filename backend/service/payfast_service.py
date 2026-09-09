"""
Everything PayFast-specific and secret-sensitive lives here:
  - build_payment_fields()  -> the signed field set the frontend posts to PayFast
  - generate_signature()    -> PayFast's MD5 signature algorithm
  - verify_itn()            -> validates an incoming webhook is genuinely from PayFast

The merchant key and passphrase never leave this module.
"""
import hashlib
import socket
from urllib.parse import quote_plus

import requests

from config import Config


def _urlencode_pf(value: str) -> str:
    """
    PayFast expects PHP-style urlencode: spaces as '+', uppercase hex escapes.
    quote_plus already gives '+' for spaces; PayFast is case-insensitive on hex
    escapes so quote_plus's lowercase hex is accepted in practice, but we upper
    it to match PayFast's own examples exactly.
    """
    encoded = quote_plus(str(value))
    # Upper-case the hex digits in %xx escapes, leave everything else alone
    result = []
    i = 0
    while i < len(encoded):
        if encoded[i] == "%" and i + 2 < len(encoded):
            result.append(encoded[i:i + 3].upper())
            i += 3
        else:
            result.append(encoded[i])
            i += 1
    return "".join(result)


def generate_signature(data: dict, passphrase: str | None = None) -> str:
    """
    PayFast signature = MD5 of all non-blank fields, in the order supplied,
    urlencoded, joined with '&', with the passphrase appended if set.
    `data` must be an ordered dict-like of the exact fields being submitted
    (excluding 'signature' itself).
    """
    pairs = []
    for key, value in data.items():
        if value is None or value == "":
            continue
        pairs.append(f"{key}={_urlencode_pf(value)}")

    payload = "&".join(pairs)
    if passphrase:
        payload += f"&passphrase={_urlencode_pf(passphrase)}"

    return hashlib.md5(payload.encode("utf-8")).hexdigest()


def build_payment_fields(donation: dict) -> dict:
    """
    Build the signed field set for a single money donation.
    `donation` is the row just inserted into the donations table
    (must include id, donor_name, donor_email, amount).
    Returns the dict the frontend renders as hidden form inputs and
    POSTs to Config.PAYFAST_PROCESS_URL.
    """
    name_parts = donation["donor_name"].split(" ", 1)
    first_name = name_parts[0]
    last_name = name_parts[1] if len(name_parts) > 1 else ""

    fields = {
        "merchant_id": Config.PAYFAST_MERCHANT_ID,
        "merchant_key": Config.PAYFAST_MERCHANT_KEY,
        "return_url": Config.RETURN_URL,
        "cancel_url": Config.CANCEL_URL,
        "notify_url": Config.NOTIFY_URL,
        "name_first": first_name,
        "name_last": last_name,
        "email_address": donation["donor_email"],
        "m_payment_id": str(donation["id"]),  # ties the ITN back to our donation row
        "amount": f"{float(donation['amount']):.2f}",
        "item_name": "BLTF Donation",
        "item_description": "Big Little Things Foundation Donation",
    }

    fields["signature"] = generate_signature(fields, Config.PAYFAST_PASSPHRASE)
    return fields


def _host_matches_payfast(ip: str) -> bool:
    """
    Forward-confirmed reverse DNS: reverse-resolve the ITN sender's IP to a
    hostname, then forward-resolve that hostname's A records and require the
    original IP to be among them. A plain reverse lookup alone is weaker —
    reverse DNS (PTR records) can be set to arbitrary values by whoever
    controls the IP's network, so confirming the forward direction too means
    an attacker would need control of both directions of DNS for a
    payfast.co.za subdomain, not just the PTR record for their own IP.
    """
    try:
        host, _, _ = socket.gethostbyaddr(ip)
    except (socket.herror, socket.gaierror):
        return False

    if not any(host.endswith(valid) for valid in Config.PAYFAST_VALID_HOSTS):
        return False

    try:
        forward_ips = socket.gethostbyname_ex(host)[2]
    except (socket.herror, socket.gaierror):
        return False

    return ip in forward_ips


def _signature_valid(posted: dict) -> bool:
    data = {k: v for k, v in posted.items() if k != "signature"}
    expected = generate_signature(data, Config.PAYFAST_PASSPHRASE)
    return expected == posted.get("signature")


def _confirm_with_payfast(posted: dict) -> bool:
    """
    Belt-and-braces check recommended by PayFast: post the ITN data straight
    back to their validate endpoint and require the literal response 'VALID'.
    """
    try:
        resp = requests.post(Config.PAYFAST_VALIDATE_URL, data=posted, timeout=10)
        return resp.text.strip() == "VALID"
    except requests.RequestException:
        return False


def verify_itn(posted: dict, source_ip: str, expected_amount: float) -> tuple[bool, str]:
    """
    Runs all PayFast-recommended checks. Returns (is_valid, reason).
    Never trust an ITN that fails ANY of these.
    """
    if not _signature_valid(posted):
        return False, "signature mismatch"

    if not _host_matches_payfast(source_ip):
        return False, "request did not originate from a PayFast host"

    if not _confirm_with_payfast(posted):
        return False, "PayFast validate endpoint rejected the payload"

    if posted.get("payment_status") != "COMPLETE":
        # PayFast sends ITNs for other statuses too (e.g. FAILED, CANCELLED) —
        # only COMPLETE means money actually settled. Treating any other
        # status as success would mark unpaid donations as paid.
        return False, f"payment_status was {posted.get('payment_status')!r}, not COMPLETE"

    try:
        posted_amount = float(posted.get("amount_gross", 0))
    except (TypeError, ValueError):
        return False, "amount missing or malformed"

    if abs(posted_amount - float(expected_amount)) > 0.01:
        return False, f"amount mismatch: expected {expected_amount}, got {posted_amount}"

    return True, "ok"
