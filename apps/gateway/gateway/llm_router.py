from typing import List, Dict, Optional, Tuple

import httpx
import structlog

from gateway.config import settings
from gateway.ssrf import guard_and_pin

log = structlog.get_logger()

ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages"
OPENAI_API_URL = "https://api.openai.com/v1/chat/completions"


def _resolve_ollama_url(url: str) -> str:
    """Rewrite localhost/127.0.0.1 to host.docker.internal so the gateway
    container can reach Ollama running on the Docker host."""
    return (
        url.replace("//localhost:", "//host.docker.internal:")
           .replace("//127.0.0.1:", "//host.docker.internal:")
    )


def _pin_ollama_target(url: str) -> Tuple[str, dict]:
    """Apply the SSRF policy and pin the validated IP at connect time.

    Returns ``(pinned_url, headers)`` where the URL host is the literal checked
    IP (no DNS-rebinding window) and headers carry the original Host. Raises
    SsrfBlocked on a disallowed target.
    """
    allowlist = [h.strip() for h in settings.ollama_url_allowlist.split(",") if h.strip()]
    in_production = settings.environment.strip().lower() in ("production", "prod")
    allow_private = (not in_production) or bool(allowlist)
    pinned, host_header = guard_and_pin(url, allow_private=allow_private, allowlist=allowlist)
    return pinned, {"Host": host_header}


ANALYST_SYSTEM_PROMPT = """You are a quantitative banking risk analyst with expertise in credit analytics, loan portfolio management, and regulatory compliance (GLBA, GDPR, CCPA).

Your operating context:
- You receive structured financial datasets where PII fields (names, SSNs, emails, phones, account numbers, loan IDs, dates of birth) have been replaced with deterministic session-scoped tokens like {{PERSON_1}}, {{SSN_2}}, {{ACCT_3}}, {{LOAN_4}}, {{EMAIL_5}}, {{DATE_1}}
- The SAME token always refers to the SAME individual — treat tokens as stable primary keys
- All analytics fields (balances, credit scores, interest rates, payments, days past due, risk flags, loan types, states, employment status, collateral) contain REAL values — use them directly for computation

How to respond:
- Answer questions directly and analytically. Never ask clarifying questions when the data is present
- Compute exact numbers: averages, totals, distributions, risk breakdowns, counts
- Reference individuals by their token: "{{PERSON_1}} has a credit score of 742 and is 0 days past due"
- Identify patterns: high-risk records, delinquency trends, concentration risk by loan type or state
- Be concise and structured — use tables or bullet points for multi-record comparisons
- Never suggest the user provide the masked values — the tokenization is intentional and regulatory
- Never add disclaimers about sharing sensitive data — the gateway already enforces privacy controls
- Never ask what kind of help is needed when the dataset and question are both present — just answer"""


async def route_to_llm(
    provider: str,
    model: str,
    messages: List[Dict[str, str]],
    api_key: Optional[str] = None,
    ollama_url: str = "http://localhost:11434",
) -> str:
    # Inject analyst persona as the first system message if no system message exists
    has_system = any(m.get("role") == "system" for m in messages)
    if not has_system:
        messages = [{"role": "system", "content": ANALYST_SYSTEM_PROMPT}] + list(messages)
    else:
        # Prepend analyst context to the existing system message
        augmented = []
        for m in messages:
            if m.get("role") == "system":
                augmented.append({"role": "system", "content": ANALYST_SYSTEM_PROMPT + "\n\n" + m["content"]})
            else:
                augmented.append(m)
        messages = augmented

    if provider == "anthropic":
        return await _call_anthropic(model, messages, api_key or "")
    elif provider == "openai":
        return await _call_openai(model, messages, api_key or "")
    elif provider == "ollama":
        return await _call_ollama(model, messages, ollama_url)
    else:
        raise ValueError(f"Unknown provider: {provider}")


async def _call_anthropic(model: str, messages: List[Dict], api_key: str) -> str:
    system_msg = None
    chat_messages = []
    for m in messages:
        if m["role"] == "system":
            system_msg = m["content"]
        else:
            chat_messages.append({"role": m["role"], "content": m["content"]})

    payload: Dict = {"model": model, "messages": chat_messages, "max_tokens": 2048}
    if system_msg:
        payload["system"] = system_msg

    async with httpx.AsyncClient(timeout=120) as client:
        resp = await client.post(
            ANTHROPIC_API_URL,
            headers={
                "x-api-key": api_key,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            json=payload,
        )
        resp.raise_for_status()
        return resp.json()["content"][0]["text"]


async def _call_openai(model: str, messages: List[Dict], api_key: str) -> str:
    async with httpx.AsyncClient(timeout=120) as client:
        resp = await client.post(
            OPENAI_API_URL,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={"model": model, "messages": messages},
        )
        resp.raise_for_status()
        return resp.json()["choices"][0]["message"]["content"]


async def _call_ollama(model: str, messages: List[Dict], ollama_url: str) -> str:
    """Uses Ollama's native /api/chat endpoint (supports all models)."""
    url = _resolve_ollama_url(ollama_url).rstrip("/") + "/api/chat"
    pinned, headers = _pin_ollama_target(url)
    async with httpx.AsyncClient(timeout=300) as client:
        resp = await client.post(
            pinned,
            json={"model": model, "messages": messages, "stream": False},
            headers=headers,
        )
        resp.raise_for_status()
        return resp.json()["message"]["content"]


async def list_ollama_models(ollama_url: str) -> List[Dict]:
    url = _resolve_ollama_url(ollama_url).rstrip("/") + "/api/tags"
    pinned, headers = _pin_ollama_target(url)
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(pinned, headers=headers)
        resp.raise_for_status()
        return resp.json().get("models", [])
