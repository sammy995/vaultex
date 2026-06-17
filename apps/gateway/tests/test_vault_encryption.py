"""DB2: the de-tokenization vault (token -> real PII) must be encrypted at rest.

Today set_token_map writes json.dumps(token_map) in plaintext, so the entire
PII reversal map sits readable in Redis (which itself has no auth/TLS in the
shipped compose). Anyone with Redis access reads every customer's raw PII — the
exact thing the product promises never leaks. After the fix the map is Fernet
ciphertext at rest and round-trips through get_token_map.

DB4 (key split): the data-at-rest key is a dedicated ``encryption_secret``,
distinct from the JWT signing secret, so a deployment with a different vault key
cannot decrypt another's vault.
"""

import asyncio

import pytest
from cryptography.fernet import InvalidToken

from gateway.redis_store import SessionStore


class FakeRedis:
    def __init__(self, shared=None):
        self.kv = shared if shared is not None else {}

    async def get(self, key):
        return self.kv.get(key)

    async def setex(self, key, ttl, value):
        self.kv[key] = value


def _store(redis):
    s = SessionStore("redis://localhost:6379")  # lazy client, no connection
    s.redis = redis
    return s


def test_token_map_is_ciphertext_at_rest_and_round_trips():
    redis = FakeRedis()
    s = _store(redis)
    secrets = {"{{SSN_1}}": "123-45-6789", "{{PERSON_1}}": "John Smith"}

    async def go():
        await s.set_token_map("sess1", secrets)
        raw = redis.kv["session:sess1:tokens"]
        # Raw stored value must not contain the plaintext PII.
        assert "123-45-6789" not in raw
        assert "John Smith" not in raw
        # ...but it must decrypt back to the original mapping.
        assert await s.get_token_map("sess1") == secrets

    asyncio.run(go())


def test_get_token_map_empty_when_missing():
    s = _store(FakeRedis())
    assert asyncio.run(s.get_token_map("nope")) == {}


def test_update_token_map_merges_under_encryption():
    s = _store(FakeRedis())

    async def go():
        await s.set_token_map("s", {"{{SSN_1}}": "111-22-3333"})
        await s.update_token_map("s", {"{{PERSON_1}}": "Jane Roe"})
        assert await s.get_token_map("s") == {
            "{{SSN_1}}": "111-22-3333",
            "{{PERSON_1}}": "Jane Roe",
        }

    asyncio.run(go())


def test_vault_not_decryptable_with_a_different_encryption_key(monkeypatch):
    from gateway.config import settings

    shared = {}
    monkeypatch.setattr(settings, "jwt_previous_secrets", "")
    monkeypatch.setattr(settings, "encryption_previous_secrets", "")

    monkeypatch.setattr(settings, "encryption_secret", "vault-key-A")
    writer = _store(FakeRedis(shared))
    asyncio.run(writer.set_token_map("s", {"{{SSN_1}}": "1"}))

    # A separate deployment with a different vault key and no grace secret
    # cannot read the ciphertext.
    monkeypatch.setattr(settings, "encryption_secret", "vault-key-B")
    reader = _store(FakeRedis(shared))
    with pytest.raises(InvalidToken):
        asyncio.run(reader.get_token_map("s"))
