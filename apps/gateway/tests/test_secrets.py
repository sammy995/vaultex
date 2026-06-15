import os

from gateway.secrets import (
    DopplerSecretsProvider,
    EnvSecretsProvider,
    VaultSecretsProvider,
    get_secret,
    get_secrets_provider,
    reset_secrets_provider,
)


def test_env_provider_reads_environment():
    os.environ["__T_SECRET"] = "v"
    assert EnvSecretsProvider().get("__T_SECRET") == "v"
    del os.environ["__T_SECRET"]


def test_env_provider_missing():
    assert EnvSecretsProvider().get("__NOPE__") is None


def test_default_provider_is_env():
    reset_secrets_provider()
    os.environ.pop("SECRETS_PROVIDER", None)
    assert isinstance(get_secrets_provider(), EnvSecretsProvider)


def test_select_vault():
    reset_secrets_provider()
    os.environ["SECRETS_PROVIDER"] = "vault"
    try:
        assert isinstance(get_secrets_provider(), VaultSecretsProvider)
    finally:
        os.environ.pop("SECRETS_PROVIDER", None)
        reset_secrets_provider()


def test_select_doppler():
    reset_secrets_provider()
    os.environ["SECRETS_PROVIDER"] = "doppler"
    try:
        assert isinstance(get_secrets_provider(), DopplerSecretsProvider)
    finally:
        os.environ.pop("SECRETS_PROVIDER", None)
        reset_secrets_provider()


def test_get_secret_fallback():
    reset_secrets_provider()
    assert get_secret("__MISSING__", "fallback") == "fallback"
