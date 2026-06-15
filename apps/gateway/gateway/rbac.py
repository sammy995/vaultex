from typing import Set

import jwt as pyjwt

from gateway.config import settings

# Roles that may NEVER be minted by the credential-free token endpoint (DB1).
# These can detokenize regulated PII and/or read audit logs, so they require a
# real authenticated identity (SSO / bcrypt login), never a self-asserted role.
PRIVILEGED_ROLES: frozenset[str] = frozenset({"admin", "vp_risk"})

# What each role is allowed to see in plain text (all others stay tokenized)
ROLE_PERMISSIONS: dict[str, Set[str]] = {
    "junior_analyst": set(),
    "senior_analyst": {"PERSON", "CURRENCY", "MONEY"},
    "vp_risk": {
        "PERSON", "SSN", "ACCOUNT_NUMBER", "ROUTING_NUMBER",
        "CURRENCY", "MONEY", "LOAN_ID", "EMAIL_ADDRESS",
        "PHONE_NUMBER", "DATE_TIME", "LOCATION", "CREDIT_CARD",
    },
    "admin": {
        "PERSON", "SSN", "ACCOUNT_NUMBER", "ROUTING_NUMBER",
        "CURRENCY", "MONEY", "LOAN_ID", "EMAIL_ADDRESS",
        "PHONE_NUMBER", "DATE_TIME", "LOCATION", "CREDIT_CARD",
    },
}


def decode_jwt(token: str) -> dict:
    return pyjwt.decode(token, settings.jwt_secret, algorithms=["HS256"])


def get_role_permissions(role: str) -> Set[str]:
    return ROLE_PERMISSIONS.get(role, set())
