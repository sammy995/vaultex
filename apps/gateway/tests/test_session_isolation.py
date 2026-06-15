"""DB3: sessions must be bound to the identity that created them.

Two holes today:
  * POST /api/session/configure has NO auth — anyone can create a session and
    stash provider config (incl. an LLM API key).
  * POST /v1/chat/completions validates a JWT but never checks that the
    X-Session-ID belongs to the caller, so a token for user B can drive user A's
    session and detokenize A's PII (an IDOR across tenants/users).

After the fix: session creation requires auth and records the owner (sub +
tenant); the chat endpoint rejects a session the caller does not own (403).

⛔ Halt-point: deep tenant isolation (RLS predicates) is founder-owned; this
binds the session to its creator's ``sub`` as the SOTA interim, fail-closed.
"""

from gateway.auth import issue_token


def _bearer(sub: str, role: str = "senior_analyst") -> dict:
    return {"Authorization": f"Bearer {issue_token(role, sub)}"}


def _configure(client, headers):
    return client.post(
        "/api/session/configure",
        json={"provider": "ollama", "model": "qwen3:4b"},
        headers=headers,
    )


def test_configure_session_requires_auth(client):
    resp = client.post(
        "/api/session/configure", json={"provider": "ollama", "model": "qwen3:4b"}
    )
    assert resp.status_code == 401


def test_cannot_use_another_users_session(client):
    alice = _bearer("alice@bank.test")
    sid = _configure(client, alice).json()["session_id"]

    mallory = _bearer("mallory@bank.test")
    resp = client.post(
        "/v1/chat/completions",
        json={"model": "qwen3:4b", "messages": [{"role": "user", "content": "hi"}]},
        headers={**mallory, "X-Session-ID": sid},
    )
    assert resp.status_code == 403


def test_owner_can_use_own_session(client, monkeypatch):
    """Regression guard: the ownership gate must not block the legitimate owner."""
    import gateway.main as m

    async def fake_tokenize(content, session_id, store):
        return content, [], {}

    async def fake_llm(**kwargs):
        return "hello back"

    monkeypatch.setattr(m, "run_tokenize", fake_tokenize)
    monkeypatch.setattr(m, "route_to_llm", fake_llm)
    monkeypatch.setattr(m, "run_detokenize", lambda text, tm, allowed: text)

    alice = _bearer("alice@bank.test")
    sid = _configure(client, alice).json()["session_id"]

    resp = client.post(
        "/v1/chat/completions",
        json={"model": "qwen3:4b", "messages": [{"role": "user", "content": "hi"}]},
        headers={**alice, "X-Session-ID": sid},
    )
    assert resp.status_code == 200
