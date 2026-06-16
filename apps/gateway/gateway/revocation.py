"""JWT revocation denylist (Gap 3 / SOC 2: token revocation).

Tokens carry a unique ``jti`` (see gateway/auth.py). To revoke a token before
it expires, add its ``jti`` to a Redis denylist with a TTL covering the token's
remaining lifetime; protected routes check the denylist on every request.

This closes the "jti present but unused" gap noted in the audit.
"""

from __future__ import annotations

from typing import Optional


def denylist_key(jti: str) -> str:
    return f"revoked_jti:{jti}"


async def revoke(redis, jti: str, ttl_seconds: int) -> None:
    """Add a jti to the denylist for at least its remaining lifetime."""
    await redis.setex(denylist_key(jti), max(int(ttl_seconds), 1), "1")


async def is_revoked(redis, jti: Optional[str]) -> bool:
    """True if the jti has been revoked. Missing jti → not revoked."""
    if not jti:
        return False
    return bool(await redis.exists(denylist_key(jti)))
