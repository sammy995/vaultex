"""Outbound-URL guard for the one user-supplied URL the gateway dereferences:
the Ollama base URL. Defends against SSRF (cloud-metadata theft, internal port
scans) while still allowing the legitimate self-host case where Ollama runs on
loopback (``localhost:11434``) or a LAN address (RFC1918).

Policy
------
* Scheme must be http/https.
* Link-local (169.254.0.0/16 — incl. the 169.254.169.254 cloud-metadata
  endpoint), reserved, multicast, and unspecified addresses are ALWAYS rejected.
  These are never a legitimate Ollama target and are the classic SSRF jackpot.
* Loopback and private (RFC1918) addresses are allowed only when ``allow_private``
  is true (self-host / development) — the whole point of a local LLM proxy.
* When an ``allowlist`` of hostnames is configured, the host must be on it.
* Every candidate A/AAAA record is checked, so DNS that resolves to a blocked
  address (incl. DNS-rebinding) is rejected.

The caller maps ``SsrfBlocked`` to a generic 4xx and logs the detail server-side
— the reason is never echoed to the client.
"""

from __future__ import annotations

import ipaddress
import socket
from urllib.parse import urlparse


class SsrfBlocked(ValueError):
    """Raised when a URL is not permitted as an outbound target."""


def validate_ollama_url(
    url: str,
    *,
    allow_private: bool,
    allowlist: list[str] | None = None,
) -> str:
    """Return ``url`` unchanged if permitted, else raise :class:`SsrfBlocked`."""
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https"):
        raise SsrfBlocked(f"scheme {parsed.scheme!r} not allowed")
    host = parsed.hostname
    if not host:
        raise SsrfBlocked("missing host")

    if allowlist:
        if host not in allowlist:
            raise SsrfBlocked(f"host {host!r} not in allowlist")

    port = parsed.port or (443 if parsed.scheme == "https" else 80)
    try:
        infos = socket.getaddrinfo(host, port, proto=socket.IPPROTO_TCP)
    except socket.gaierror as exc:
        raise SsrfBlocked(f"cannot resolve host {host!r}: {exc}") from exc

    for info in infos:
        ip = ipaddress.ip_address(info[4][0])
        # Always blocked — never a legitimate Ollama target. Link-local covers
        # the 169.254.169.254 cloud-metadata endpoint (and IPv6 fe80::/10).
        if ip.is_link_local or ip.is_multicast or ip.is_unspecified:
            raise SsrfBlocked(f"address {ip} is link-local/multicast (blocked)")
        # Loopback/private are the legitimate self-host case — gate on policy.
        # (Checked before is_reserved because IPv6 ::1 is also "reserved".)
        if ip.is_loopback or ip.is_private:
            if not allow_private:
                raise SsrfBlocked(f"address {ip} is private/loopback (blocked in this mode)")
            continue
        # Otherwise-reserved (non-global, non-private) ranges stay blocked.
        if ip.is_reserved:
            raise SsrfBlocked(f"address {ip} is reserved (blocked)")

    return url
