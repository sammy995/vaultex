"""Secrets-provider abstraction (Gap 3 / SOC 2).

Decouples secret *retrieval* from the gateway so credentials can come from env
(default) or a managed store (Vault, Doppler, cloud secret managers) without
code changes.

⛔ Halt-point (MANIFESTO.md §6): which backend is authoritative, and the key
   material itself, are founder/ops decisions. This ships the interface + an
   env-backed default; managed adapters are stubs to wire with the provider SDK.
"""

from __future__ import annotations

import os
from typing import Optional, Protocol


class SecretsProvider(Protocol):
    def get(self, key: str) -> Optional[str]: ...


class EnvSecretsProvider:
    """Default: read from environment variables (12-factor)."""

    def get(self, key: str) -> Optional[str]:
        return os.environ.get(key)


class VaultSecretsProvider:
    """HashiCorp Vault adapter — stub. Wire with `hvac` (KV v2)."""

    def __init__(self, addr: str, token: str, mount: str = "secret") -> None:
        self.addr = addr
        self.token = token
        self.mount = mount

    def get(self, key: str) -> Optional[str]:
        raise NotImplementedError(
            f"VaultSecretsProvider not implemented — wire hvac against {self.addr}"
        )


class DopplerSecretsProvider:
    """Doppler adapter — stub. Wire with the Doppler API / DOPPLER_TOKEN."""

    def get(self, key: str) -> Optional[str]:
        raise NotImplementedError("DopplerSecretsProvider not implemented")


_provider: Optional[SecretsProvider] = None


def get_secrets_provider() -> SecretsProvider:
    """Select the provider from SECRETS_PROVIDER (default: env)."""
    global _provider
    if _provider is not None:
        return _provider
    kind = os.environ.get("SECRETS_PROVIDER", "env").lower()
    if kind == "vault":
        _provider = VaultSecretsProvider(
            addr=os.environ.get("VAULT_ADDR", ""),
            token=os.environ.get("VAULT_TOKEN", ""),
            mount=os.environ.get("VAULT_MOUNT", "secret"),
        )
    elif kind == "doppler":
        _provider = DopplerSecretsProvider()
    else:
        _provider = EnvSecretsProvider()
    return _provider


def get_secret(key: str, fallback: Optional[str] = None) -> Optional[str]:
    value = get_secrets_provider().get(key)
    return value if value is not None else fallback


def reset_secrets_provider() -> None:
    """Test seam — reset the cached provider."""
    global _provider
    _provider = None
