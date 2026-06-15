"""DB1: the credential-free POST /api/auth/token endpoint is an auth bypass.

Today it returns a signed JWT for ANY role — including admin — with no
authentication, allowing anyone who can reach the gateway to mint an admin token
and read every audit log / detokenize all PII. After the fix the legacy endpoint
is disabled by default (the supported path is /api/users/login, bcrypt-backed);
even when explicitly enabled for a dev/pilot it refuses privileged roles.

⛔ Halt-point: keeping a flag-gated legacy endpoint vs deleting it once SSO/OIDC
lands is a founder decision. Default-off + no-privileged is the SOTA interim.
"""


def test_anonymous_admin_token_is_refused_by_default(client):
    resp = client.post(
        "/api/auth/token", json={"role": "admin", "subject": "attacker"}
    )
    assert resp.status_code == 403
    assert "token" not in resp.json()


def test_anonymous_analyst_token_is_refused_by_default(client):
    resp = client.post("/api/auth/token", json={"role": "junior_analyst"})
    assert resp.status_code == 403


def test_legacy_endpoint_when_enabled_still_refuses_privileged_roles(
    client, monkeypatch
):
    from gateway.config import settings

    monkeypatch.setattr(settings, "allow_insecure_token_endpoint", True)
    resp = client.post("/api/auth/token", json={"role": "admin"})
    assert resp.status_code == 403


def test_legacy_endpoint_when_enabled_allows_nonprivileged_role(client, monkeypatch):
    from gateway.config import settings

    monkeypatch.setattr(settings, "allow_insecure_token_endpoint", True)
    resp = client.post("/api/auth/token", json={"role": "junior_analyst"})
    assert resp.status_code == 200
    assert resp.json()["token"]
