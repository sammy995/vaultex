"""Security regression tests for findings from the Phase-3 audit.

Each test encodes a vulnerability that must stay closed:

1. Registration privilege escalation — /api/users/register let any anonymous
   caller self-assign role="admin" (or "vp_risk") and receive a privileged JWT,
   defeating RBAC + audit-log protection entirely.
2. Unauthenticated SSRF — GET /api/session/models had no auth and fetched an
   attacker-supplied ollama_url server-side.
3. Audit-chain tail truncation — verify_chain() passed on a log whose trailing
   entries were deleted, because nothing anchored the expected chain length.
"""

import asyncio
import uuid

import pytest

from gateway.audit import AuditLogger, EventType
from gateway.ssrf import SsrfBlocked, validate_ollama_url
from tests.conftest import FakeAsyncRedis


# ---------------------------------------------------------------------------
# 1. Registration privilege escalation
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("role", ["admin", "vp_risk"])
def test_register_refuses_privileged_role(client, role):
    resp = client.post(
        "/api/users/register",
        json={
            "username": f"attacker_{role}",
            "email": f"attacker_{role}@evil.test",
            "password": "hunter2pass",
            "role": role,
        },
    )
    assert resp.status_code == 403, resp.text
    # No privileged token may be handed out.
    assert "token" not in resp.json()


@pytest.mark.parametrize("role", ["junior_analyst", "senior_analyst"])
def test_register_allows_nonprivileged_role(client, role):
    # Unique identity per run — the SQLite user DB persists across test sessions.
    uniq = uuid.uuid4().hex[:10]
    resp = client.post(
        "/api/users/register",
        json={
            "username": f"user_{role}_{uniq}",
            "email": f"user_{role}_{uniq}@example.test",
            "password": "hunter2pass",
            "role": role,
        },
    )
    assert resp.status_code == 201, resp.text
    assert resp.json()["role"] == role
    assert resp.json()["token"]


# ---------------------------------------------------------------------------
# 2. Unauthenticated SSRF on the model-listing endpoint
# ---------------------------------------------------------------------------

def test_models_endpoint_requires_auth(client):
    resp = client.get(
        "/api/session/models",
        params={"provider": "ollama", "ollama_url": "http://169.254.169.254/"},
    )
    assert resp.status_code == 401, resp.text


# ---------------------------------------------------------------------------
# 2b. SSRF URL guard (authenticated callers still cannot hit metadata/internal)
# ---------------------------------------------------------------------------

def test_ssrf_guard_always_blocks_cloud_metadata():
    # 169.254.169.254 is link-local — blocked even when private is allowed.
    with pytest.raises(SsrfBlocked):
        validate_ollama_url("http://169.254.169.254/", allow_private=True)


def test_ssrf_guard_blocks_non_http_scheme():
    with pytest.raises(SsrfBlocked):
        validate_ollama_url("file:///etc/passwd", allow_private=True)
    with pytest.raises(SsrfBlocked):
        validate_ollama_url("gopher://x/", allow_private=True)


def test_ssrf_guard_allows_localhost_for_selfhost():
    # Loopback is the primary self-host case and must work when private allowed.
    assert validate_ollama_url("http://localhost:11434", allow_private=True)


def test_ssrf_guard_blocks_loopback_in_production_without_allowlist():
    with pytest.raises(SsrfBlocked):
        validate_ollama_url("http://localhost:11434", allow_private=False)


def test_ssrf_guard_enforces_allowlist():
    with pytest.raises(SsrfBlocked):
        validate_ollama_url(
            "http://evil.example.com:11434",
            allow_private=True,
            allowlist=["ollama.internal"],
        )


# ---------------------------------------------------------------------------
# 3. Audit-chain tail truncation must be detected
# ---------------------------------------------------------------------------

def test_audit_truncation_is_detected():
    redis = FakeAsyncRedis()
    logger = AuditLogger(redis, tenant_id="trunc-tenant", ttl_days=30)

    async def go():
        for i in range(5):
            await logger.log_event(EventType.CHAT_REQUEST, f"corr-{i}", role="analyst")
        # Sanity: clean chain verifies.
        clean = await logger.verify_chain()
        assert clean["ok"] is True
        assert clean["entries"] == 5

        # Attacker deletes the two most recent entries from the day's list
        # (e.g. to erase a suspicious request) but cannot forge the signed
        # high-water mark.
        day_key = logger._day_key()
        del redis.lists[day_key][-2:]

        tampered = await logger.verify_chain()
        assert tampered["ok"] is False, "tail truncation went undetected"

    asyncio.run(go())
