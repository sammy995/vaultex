"""Enterprise-grade server-side JWT issuance and strict validation.

Replaces the MVP pattern of browser-minted JWTs with a shared secret.
All tokens are now issued by the gateway so JWT_SECRET never needs to
be exposed to the browser (NEXT_PUBLIC_JWT_SECRET is no longer needed).

Token lifecycle
---------------
* POST /api/auth/token  → issue_token()   → signed HS256 JWT
* Every protected route → validate_token() → strict validation (iss, aud, jti)
"""

import time
import uuid

import jwt as pyjwt

from gateway.config import settings
from gateway.rbac import ROLE_PERMISSIONS

_ALLOWED_ROLES: frozenset[str] = frozenset(ROLE_PERMISSIONS.keys())


def issue_token(
    role: str,
    subject: str = "gateway-user",
    tenant: str = "default",
) -> str:
    """Issue a signed HS256 JWT with proper enterprise claims.

    Args:
        role:    Must be a key in ROLE_PERMISSIONS.
        subject: Opaque user identifier (email, SSO sub, etc.).
        tenant:  Tenant the token is scoped to (Gap 3 multi-tenancy). Defaults
                 to ``"default"`` for back-compat until tenant resolution moves
                 to org/SSO. ⛔ Halt-point: real tenant derivation is founder-owned.

    Returns:
        Compact JWT string.

    Raises:
        ValueError: If role is not a recognised role.
    """
    if role not in _ALLOWED_ROLES:
        raise ValueError(f"Unknown role: {role!r}. Allowed: {sorted(_ALLOWED_ROLES)}")
    now = int(time.time())
    payload = {
        "sub": subject,
        "role": role,
        "tenant": tenant,
        "iss": settings.jwt_issuer,
        "aud": settings.jwt_audience,
        "jti": str(uuid.uuid4()),   # unique token ID — enables revocation (revocation.py)
        "iat": now,
        "exp": now + int(settings.jwt_ttl_hours * 3600),
    }
    return pyjwt.encode(payload, settings.jwt_secret, algorithm="HS256")


def _signing_secrets() -> list[str]:
    """Current signing secret first, then any configured previous secrets.

    Lets a rotated ``jwt_secret`` keep validating tokens minted under the prior
    secret until they expire (the advertised grace window). ⛔ Halt-point
    (key-rotation policy): rotation cadence and how far back to keep secrets are
    ops decisions — this honours whatever ``jwt_previous_secrets`` lists.
    """
    secrets = [settings.jwt_secret]
    previous = getattr(settings, "jwt_previous_secrets", "") or ""
    secrets += [s.strip() for s in previous.split(",") if s.strip()]
    return secrets


def validate_token(token: str) -> dict:
    """Strict gateway-token validation.

    Enforces issuer, audience, expiry, and every required claim. Tries the
    current signing secret, then each previous secret, so key rotation does not
    invalidate in-flight tokens. Only a *signature* mismatch falls through to the
    next secret; expiry/claim failures propagate immediately (so callers can
    still distinguish an expired token). Raises a pyjwt exception on any failure
    — callers must catch and 401. No silent fallback to a default role.
    """
    last_exc: pyjwt.InvalidTokenError | None = None
    for secret in _signing_secrets():
        try:
            return pyjwt.decode(
                token,
                secret,
                algorithms=["HS256"],
                audience=settings.jwt_audience,
                issuer=settings.jwt_issuer,
                options={
                    "require": ["exp", "iat", "iss", "aud", "jti", "sub", "role"],
                },
            )
        except pyjwt.InvalidSignatureError as exc:
            last_exc = exc  # wrong key — try the next configured secret
            continue
    # No configured secret produced a valid signature.
    raise last_exc if last_exc is not None else pyjwt.InvalidTokenError("no signing secret")
