"""Tests for gateway/rbac.py — verifies JWT decode and role→permission mapping."""

import os
import pytest
import time
import jwt as pyjwt

# Point settings at a test secret before importing gateway modules
os.environ.setdefault("JWT_SECRET", "test-secret-for-unit-tests")

from gateway.rbac import decode_jwt, get_role_permissions, ROLE_PERMISSIONS  # noqa: E402

SECRET = os.environ["JWT_SECRET"]


def make_token(role: str, secret: str = SECRET, exp_offset: int = 3600) -> str:
    payload = {
        "role": role,
        "iat": int(time.time()),
        "exp": int(time.time()) + exp_offset,
    }
    return pyjwt.encode(payload, secret, algorithm="HS256")


# ──────────────────────────────────────────────
# decode_jwt tests
# ──────────────────────────────────────────────

def test_decode_valid_token():
    token = make_token("senior_analyst")
    result = decode_jwt(token)
    assert result is not None
    assert result["role"] == "senior_analyst"


def test_decode_expired_token():
    token = make_token("admin", exp_offset=-10)  # already expired
    with pytest.raises(pyjwt.ExpiredSignatureError):
        decode_jwt(token)


def test_decode_wrong_secret():
    token = make_token("vp_risk", secret="correct-secret")
    with pytest.raises(pyjwt.InvalidSignatureError):
        decode_jwt(token)


def test_decode_malformed_token():
    with pytest.raises(Exception):
        decode_jwt("not.a.real.jwt")


def test_decode_missing_role_field():
    """A valid JWT without a 'role' claim returns a dict (no role key)."""
    payload = {"sub": "user123", "exp": int(time.time()) + 3600}
    token = pyjwt.encode(payload, SECRET, algorithm="HS256")
    result = decode_jwt(token)
    assert isinstance(result, dict)
    assert "role" not in result


# ──────────────────────────────────────────────
# get_role_permissions tests
# ──────────────────────────────────────────────

def test_junior_analyst_no_permissions():
    perms = get_role_permissions("junior_analyst")
    assert len(perms) == 0


def test_senior_analyst_can_see_person_and_currency():
    perms = get_role_permissions("senior_analyst")
    assert "PERSON" in perms
    assert "CURRENCY" in perms
    # SSN should NOT be visible
    assert "SSN" not in perms


def test_vp_risk_can_see_all():
    perms = get_role_permissions("vp_risk")
    for entity_type in ["PERSON", "SSN", "ACCOUNT_NUMBER", "ROUTING_NUMBER", "CURRENCY", "LOAN_ID"]:
        assert entity_type in perms


def test_admin_can_see_all():
    perms = get_role_permissions("admin")
    for entity_type in ["PERSON", "SSN", "ACCOUNT_NUMBER", "ROUTING_NUMBER", "CURRENCY", "LOAN_ID"]:
        assert entity_type in perms


def test_unknown_role_returns_empty():
    perms = get_role_permissions("ghost_role")
    assert len(perms) == 0


# ──────────────────────────────────────────────
# RBAC matrix: 4 roles × key entity types
# ──────────────────────────────────────────────

ENTITY_TYPES = ["PERSON", "SSN", "ACCOUNT_NUMBER", "CURRENCY", "LOAN_ID"]

@pytest.mark.parametrize("role,entity,should_see", [
    # junior_analyst sees nothing
    ("junior_analyst", "PERSON", False),
    ("junior_analyst", "SSN", False),
    ("junior_analyst", "ACCOUNT_NUMBER", False),
    ("junior_analyst", "CURRENCY", False),
    # senior_analyst sees PERSON and CURRENCY only
    ("senior_analyst", "PERSON", True),
    ("senior_analyst", "CURRENCY", True),
    ("senior_analyst", "SSN", False),
    ("senior_analyst", "ACCOUNT_NUMBER", False),
    # vp_risk sees all
    ("vp_risk", "PERSON", True),
    ("vp_risk", "SSN", True),
    ("vp_risk", "ACCOUNT_NUMBER", True),
    ("vp_risk", "CURRENCY", True),
    ("vp_risk", "LOAN_ID", True),
    # admin sees all
    ("admin", "PERSON", True),
    ("admin", "SSN", True),
    ("admin", "ACCOUNT_NUMBER", True),
    ("admin", "CURRENCY", True),
    ("admin", "LOAN_ID", True),
])
def test_rbac_matrix(role, entity, should_see):
    perms = get_role_permissions(role)
    if should_see:
        assert entity in perms, f"{role} should see {entity}"
    else:
        assert entity not in perms, f"{role} should NOT see {entity}"
