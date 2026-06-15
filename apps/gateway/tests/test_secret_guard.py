"""DB4: fail-closed startup guard on weak/placeholder secrets.

Today the gateway boots happily with the shipped default
``change-me-in-production-secret-key`` (docker-compose even passes it through as
the fallback). In production that is a remote-takeover key: it signs JWTs *and*
derives the vault encryption key. ``assert_secure_secret`` refuses to start when
ENVIRONMENT is production and the secret is a known placeholder or too short,
while staying lenient in development so local runs are frictionless.

⛔ Halt-point (key-management policy): the production gate name and the strength
bar (>= 32 chars) are pre-filled SOTA defaults for the founder to adjust.
"""

import pytest

from gateway.config import Settings, assert_secure_secret


def test_production_with_placeholder_secret_refuses_to_start():
    s = Settings(
        environment="production",
        jwt_secret="change-me-in-production-secret-key",
    )
    with pytest.raises(RuntimeError):
        assert_secure_secret(s)


def test_production_with_short_secret_refuses_to_start():
    s = Settings(environment="production", jwt_secret="too-short")
    with pytest.raises(RuntimeError):
        assert_secure_secret(s)


def test_production_with_strong_secret_starts():
    s = Settings(environment="production", jwt_secret="k" * 40)
    assert assert_secure_secret(s) is None


def test_development_with_placeholder_is_allowed():
    s = Settings(
        environment="development",
        jwt_secret="change-me-in-production-secret-key",
    )
    # Dev convenience: must not raise so local/CI still boots.
    assert assert_secure_secret(s) is None
