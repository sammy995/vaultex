"""DB5: Tests for hash-chained audit log integrity and tamper detection.

These tests verify:
1. Each entry carries valid prev_hash and entry_hash links.
2. The genesis sentinel anchors the first entry.
3. verify_chain() passes on an unmodified log.
4. verify_chain() fails when any entry is modified (tamper detection).
5. verify_chain() fails when a chain pointer is corrupted.
6. Concurrent-session chains are independent (tenant isolation).
"""

import asyncio
import json

import pytest

from gateway.audit import AuditLogger, EventType, GENESIS_SENTINEL, _entry_hmac, _canonical
from tests.conftest import FakeAsyncRedis


def _logger(tenant="test-tenant"):
    redis = FakeAsyncRedis()
    return AuditLogger(redis, tenant_id=tenant, ttl_days=30), redis


def test_first_entry_links_to_genesis():
    logger, _ = _logger()

    async def go():
        await logger.log_event(EventType.AUTH_TOKEN_ISSUED, "corr-1", role="analyst")
        entries = await logger.get_logs()
        assert len(entries) == 1
        assert entries[0]["prev_hash"] == GENESIS_SENTINEL

    asyncio.run(go())


def test_second_entry_links_to_first():
    logger, _ = _logger()

    async def go():
        await logger.log_event(EventType.AUTH_TOKEN_ISSUED, "corr-1", role="analyst")
        await logger.log_event(EventType.CHAT_REQUEST, "corr-2", role="analyst")
        entries = await logger.get_logs()
        assert entries[1]["prev_hash"] == entries[0]["entry_hash"]

    asyncio.run(go())


def test_entry_hash_is_valid():
    logger, _ = _logger()

    async def go():
        await logger.log_event(EventType.SESSION_CREATE, "corr-1", role="analyst")
        entries = await logger.get_logs()
        e = entries[0]
        body = {k: v for k, v in e.items() if k != "entry_hash"}
        assert e["entry_hash"] == _entry_hmac(_canonical(body))

    asyncio.run(go())


def test_verify_chain_passes_on_clean_log():
    logger, _ = _logger()

    async def go():
        for i in range(5):
            await logger.log_event(EventType.CHAT_REQUEST, f"corr-{i}", role="analyst")
        result = await logger.verify_chain()
        assert result["ok"] is True
        assert result["entries"] == 5
        assert result["first_bad"] == -1

    asyncio.run(go())


def test_verify_chain_fails_if_entry_content_modified():
    logger, fake_redis = _logger()

    async def go():
        await logger.log_event(EventType.AUTH_TOKEN_ISSUED, "corr-1", role="analyst")
        await logger.log_event(EventType.CHAT_REQUEST, "corr-2", role="analyst")

        # Tamper: silently escalate privilege in the first log entry
        day_key = logger._day_key()
        first = json.loads(fake_redis.lists[day_key][0])
        first["role"] = "admin"
        fake_redis.lists[day_key][0] = json.dumps(first)

        result = await logger.verify_chain()
        assert result["ok"] is False
        assert result["first_bad"] == 0

    asyncio.run(go())


def test_verify_chain_fails_if_prev_hash_broken():
    logger, fake_redis = _logger()

    async def go():
        await logger.log_event(EventType.AUTH_FAILURE, "corr-1", role="analyst")
        await logger.log_event(EventType.AUTH_FAILURE, "corr-2", role="analyst")

        # Tamper: corrupt the chain pointer in the second entry only
        day_key = logger._day_key()
        second = json.loads(fake_redis.lists[day_key][1])
        second["prev_hash"] = "deadbeef" * 8
        # Recompute entry_hash so that check passes — only the link should fail
        body = {k: v for k, v in second.items() if k != "entry_hash"}
        second["entry_hash"] = _entry_hmac(_canonical(body))
        fake_redis.lists[day_key][1] = json.dumps(second)

        result = await logger.verify_chain()
        assert result["ok"] is False
        assert result["first_bad"] == 1

    asyncio.run(go())


def test_verify_chain_empty_log_is_valid():
    logger, _ = _logger()
    result = asyncio.run(logger.verify_chain())
    assert result["ok"] is True
    assert result["entries"] == 0


def test_chains_are_isolated_by_tenant():
    fake_redis = FakeAsyncRedis()
    logger_a = AuditLogger(fake_redis, tenant_id="tenant-a", ttl_days=30)
    logger_b = AuditLogger(fake_redis, tenant_id="tenant-b", ttl_days=30)

    async def go():
        await logger_a.log_event(EventType.SESSION_CREATE, "corr-a1")
        await logger_b.log_event(EventType.AUTH_TOKEN_ISSUED, "corr-b1")

        entries_a = await logger_a.get_logs()
        entries_b = await logger_b.get_logs()

        assert len(entries_a) == 1
        assert len(entries_b) == 1
        assert entries_a[0]["prev_hash"] == GENESIS_SENTINEL
        assert entries_b[0]["prev_hash"] == GENESIS_SENTINEL
        # Chains are disjoint — same sentinel, different entry hashes (different content)
        assert entries_a[0]["entry_hash"] != entries_b[0]["entry_hash"]

        result_a = await logger_a.verify_chain()
        result_b = await logger_b.verify_chain()
        assert result_a["ok"] is True
        assert result_b["ok"] is True

    asyncio.run(go())


def test_all_event_types_are_loggable():
    logger, _ = _logger()

    async def go():
        for evt in [
            EventType.SESSION_CREATE,
            EventType.AUTH_TOKEN_ISSUED,
            EventType.AUTH_FAILURE,
            EventType.CHAT_REQUEST,
            EventType.PII_DETECTED,
            EventType.PII_DETOKENIZED,
            EventType.LLM_CALL,
            EventType.ADMIN_ACCESS,
            EventType.RATE_LIMIT,
        ]:
            await logger.log_event(evt, "corr-x", role="analyst", details={"k": "v"})
        result = await logger.verify_chain()
        assert result["ok"] is True
        assert result["entries"] == 9

    asyncio.run(go())
