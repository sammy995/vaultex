"""Error tracking (Sentry) — opt-in, PII-safe.

No-ops unless ``SENTRY_DSN`` is set, so local/dev/CI stay clean. Because this is
a PII-handling gateway, two safeguards are mandatory:

* ``send_default_pii=False`` — never attach request bodies/headers/cookies.
* a ``before_send`` hook that runs the same regex+entropy scrubber used for logs
  over the event's message and exception text, so a stray identifier inside an
  error string is redacted before it leaves the process.

Sentry is an optional dependency; if it isn't installed, this module no-ops.
"""

from __future__ import annotations

from gateway.config import settings
from gateway.log_scrubber import scrub

try:
    import sentry_sdk
    from sentry_sdk.integrations.logging import LoggingIntegration
except ImportError:  # pragma: no cover - optional dependency
    sentry_sdk = None
    LoggingIntegration = None


def _scrub_event(event, _hint):
    """Last-line scrubber. Collection is already minimized at init (no frame
    locals / breadcrumbs / request), so the only free-text fields that can carry
    PII are the message and exception values — scrub those, and defensively drop
    request/extra/contexts.user in case a future integration repopulates them.

    We do NOT recursively scrub the whole event: Sentry's own metadata (event_id,
    trace ids, content hashes) is high-entropy and would be mangled by the
    entropy redactor, breaking ingestion."""
    event.pop("request", None)
    event.pop("extra", None)
    if isinstance(event.get("contexts"), dict):
        event["contexts"].pop("user", None)
    event.pop("user", None)

    msg = event.get("logentry", {}).get("message")
    if isinstance(msg, str):
        event["logentry"]["message"] = scrub(msg)
    for exc in event.get("exception", {}).get("values", []) or []:
        if isinstance(exc.get("value"), str):
            exc["value"] = scrub(exc["value"])
    return event


def init_sentry() -> bool:
    """Initialise Sentry if configured. Returns True if active."""
    if sentry_sdk is None or not settings.sentry_dsn:
        return False
    sentry_sdk.init(
        dsn=settings.sentry_dsn,
        environment=settings.environment,
        traces_sample_rate=settings.sentry_traces_sample_rate,
        # PII minimization for a PII gateway — keep the dangerous data out of the
        # event entirely, not just scrub it after the fact:
        send_default_pii=False,            # no request body/headers/cookies/user
        include_local_variables=False,     # no stack-frame locals (hold prompt text/PII)
        max_breadcrumbs=0,                  # no breadcrumb trail
        # Don't auto-capture log records as breadcrumbs or events.
        integrations=[LoggingIntegration(level=None, event_level=None)] if LoggingIntegration else [],
        before_send=_scrub_event,
    )
    return True
