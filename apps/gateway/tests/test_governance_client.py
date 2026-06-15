"""Tests for the Governance Service client (gateway/governance_client.py).

Uses httpx.MockTransport so no network is touched, and asyncio.run so no
pytest-asyncio dependency is required.
"""

import asyncio
import json

import httpx

from gateway.governance_client import GovernanceClient


def _make_client(handler, *, api_key="test-key", base_url="https://gov.test"):
    """Build a GovernanceClient backed by a MockTransport handler."""
    transport = httpx.MockTransport(handler)
    http_client = httpx.AsyncClient(
        transport=transport,
        base_url=base_url,
        headers={"x-api-key": api_key},
    )
    return GovernanceClient(
        base_url=base_url, api_key=api_key, http_client=http_client
    )


def test_disabled_when_unconfigured():
    client = GovernanceClient(base_url="", api_key="")
    assert client.enabled is False
    # No request is attempted; returns None.
    result = asyncio.run(client.append_audit_event(event_type="chat_request"))
    assert result is None


def test_enabled_with_url_and_key():
    client = GovernanceClient(base_url="https://gov.test", api_key="k")
    assert client.enabled is True


def test_append_audit_event_posts_correct_payload():
    captured = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["url"] = str(request.url)
        captured["api_key"] = request.headers.get("x-api-key")
        captured["json"] = json.loads(request.content)
        return httpx.Response(201, json={"id": "evt-1", "seq": 1})

    client = _make_client(handler)
    result = asyncio.run(
        client.append_audit_event(
            event_type="pii_detokenized",
            actor_type="user",
            actor_id="vp_risk",
            resource_type="session",
            resource_id="sess-1",
            action="detokenize",
            reason="role permits PERSON",
            confidence=0.99,
            payload={"entities": ["PERSON"]},
        )
    )

    assert result == {"id": "evt-1", "seq": 1}
    assert captured["url"].endswith("/v1/governance/audit")
    assert captured["api_key"] == "test-key"
    body = captured["json"]
    # Wire format is camelCase to match AgentGuard's AppendAuditEventSchema.
    assert body["eventType"] == "pii_detokenized"
    assert body["actorType"] == "user"
    assert body["actorId"] == "vp_risk"
    assert body["policyVersionId"] is None
    assert body["confidence"] == 0.99
    assert body["payload"] == {"entities": ["PERSON"]}


def test_collect_evidence_posts_to_evidence_endpoint():
    captured = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["url"] = str(request.url)
        captured["json"] = json.loads(request.content)
        return httpx.Response(201, json={"id": "ev-1"})

    client = _make_client(handler)
    result = asyncio.run(
        client.collect_evidence(
            evidence_type="call_record",
            ref_type="chat_request",
            ref_id="req-1",
            description="tokenized request",
            content={"entitiesMasked": 3},
        )
    )

    assert result == {"id": "ev-1"}
    assert captured["url"].endswith("/v1/governance/evidence")
    assert captured["json"]["evidenceType"] == "call_record"
    assert captured["json"]["refId"] == "req-1"


def test_http_error_is_swallowed_best_effort():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(500, json={"error": "boom"})

    client = _make_client(handler)
    # A 500 must not raise — telemetry shipping is best-effort.
    result = asyncio.run(client.append_audit_event(event_type="chat_request"))
    assert result is None


def test_network_error_is_swallowed():
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("connection refused")

    client = _make_client(handler)
    result = asyncio.run(client.append_audit_event(event_type="chat_request"))
    assert result is None
