"""DB4: JWT signing-key rotation must keep in-flight tokens valid.

Today ``validate_token`` only tries ``settings.jwt_secret``, so rotating the
secret is a hard cutover that 401s every live token — contradicting the
"grace window" the config advertises. After the fix, ``validate_token`` tries
the current secret first, then each configured previous secret, so tokens signed
before a rotation keep working until they expire. A token signed by neither is
still rejected.
"""

import time

import jwt as pyjwt
import pytest

from gateway import auth
from gateway.config import settings


def _make_token(secret: str, **overrides) -> str:
    now = int(time.time())
    payload = {
        "sub": "u",
        "role": "admin",
        "tenant": "default",
        "iss": settings.jwt_issuer,
        "aud": settings.jwt_audience,
        "jti": "j1",
        "iat": now,
        "exp": now + 3600,
    }
    payload.update(overrides)
    return pyjwt.encode(payload, secret, algorithm="HS256")


def test_token_signed_with_previous_secret_still_validates(monkeypatch):
    old_secret = "old-signing-secret"
    token = _make_token(old_secret)
    monkeypatch.setattr(settings, "jwt_secret", "new-signing-secret")
    monkeypatch.setattr(settings, "jwt_previous_secrets", old_secret)

    claims = auth.validate_token(token)

    assert claims["sub"] == "u"
    assert claims["role"] == "admin"


def test_token_signed_with_current_secret_validates(monkeypatch):
    monkeypatch.setattr(settings, "jwt_secret", "current-secret")
    monkeypatch.setattr(settings, "jwt_previous_secrets", "")
    token = _make_token("current-secret")

    assert auth.validate_token(token)["role"] == "admin"


def test_token_signed_with_unknown_secret_is_rejected(monkeypatch):
    token = _make_token("attacker-secret")
    monkeypatch.setattr(settings, "jwt_secret", "new-signing-secret")
    monkeypatch.setattr(settings, "jwt_previous_secrets", "old-signing-secret")

    with pytest.raises(pyjwt.InvalidTokenError):
        auth.validate_token(token)


def test_expired_token_signed_with_previous_secret_raises_expired(monkeypatch):
    """A matching-but-expired token must surface ExpiredSignatureError, not be
    silently retried against other secrets and reported as a bad signature."""
    old_secret = "old-signing-secret"
    expired = _make_token(old_secret, exp=int(time.time()) - 10)
    monkeypatch.setattr(settings, "jwt_secret", "new-signing-secret")
    monkeypatch.setattr(settings, "jwt_previous_secrets", old_secret)

    with pytest.raises(pyjwt.ExpiredSignatureError):
        auth.validate_token(expired)
