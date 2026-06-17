import asyncio

from gateway.revocation import denylist_key, is_revoked, revoke


class FakeRedis:
    """Minimal async Redis stub for denylist tests."""

    def __init__(self):
        self.store = {}

    async def setex(self, key, ttl, value):
        self.store[key] = value

    async def exists(self, key):
        return 1 if key in self.store else 0


def test_denylist_key():
    assert denylist_key("abc") == "revoked_jti:abc"


def test_revoke_then_revoked():
    r = FakeRedis()

    async def go():
        assert await is_revoked(r, "j1") is False
        await revoke(r, "j1", 3600)
        assert await is_revoked(r, "j1") is True

    asyncio.run(go())


def test_missing_jti_is_not_revoked():
    r = FakeRedis()
    assert asyncio.run(is_revoked(r, None)) is False
