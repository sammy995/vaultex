import re
from typing import Set, Dict

import structlog

log = structlog.get_logger()

# Maps the short code inside a token (e.g. ACCT) back to the canonical entity type
_SHORT_TO_ENTITY: Dict[str, str] = {
    "PERSON": "PERSON",
    "SSN": "SSN",
    "ACCT": "ACCOUNT_NUMBER",
    "ROUTING": "ROUTING_NUMBER",
    "CURRENCY": "CURRENCY",
    "LOAN": "LOAN_ID",
    "EMAIL": "EMAIL_ADDRESS",
    "PHONE": "PHONE_NUMBER",
    "DATE": "DATE_TIME",
    "LOCATION": "LOCATION",
    "CARD": "CREDIT_CARD",
}

_TOKEN_RE = re.compile(r"\{\{([A-Z]+)_(\d+)\}\}")


def run_detokenize(
    text: str,
    token_map: Dict[str, str],
    allowed_entity_types: Set[str],
) -> str:
    """
    Replace tokens in `text` with real values where the role permits it.
    Tokens for entity types not in `allowed_entity_types` are left as-is.
    """
    if not token_map or not text:
        return text

    result = text
    for token, real_value in token_map.items():
        m = _TOKEN_RE.match(token)
        if not m:
            continue
        short = m.group(1)
        entity_type = _SHORT_TO_ENTITY.get(short, short)
        if entity_type in allowed_entity_types:
            result = result.replace(token, real_value)

    replacements = text.count("{{") - result.count("{{")
    log.info("detokenized", replacements=replacements)
    return result
