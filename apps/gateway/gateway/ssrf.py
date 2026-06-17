"""Outbound-URL guard for the one user-supplied URL the gateway dereferences:
the Ollama base URL. Defends against SSRF (cloud-metadata theft, internal port
scans) while still allowing the legitimate self-host case where Ollama runs on
loopback (``localhost:11434``) or a LAN address (RFC1918).

Policy
------
* Scheme must be http/https.
* Link-local (169.254.0.0/16 — incl. the 169.254.169.254 cloud-metadata
  endpoint, and IPv6 fe80::/10), multicast, and unspecified addresses are
  ALWAYS rejected — never a legitimate Ollama target and the classic SSRF
  jackpot.
* Loopback and private (RFC1918) addresses are allowed only when ``allow_private``
  is true (self-host / development) — the whole point of a local LLM proxy.
* Otherwise-reserved (non-global, non-private) ranges are rejected.
* When an ``allowlist`` of hostnames is configured, the host must be on it.

DNS-rebinding defence
---------------------
Validating the resolved IP and then handing the *hostname* to the HTTP client is
a TOCTOU hole: the client re-resolves DNS at connect time, so an attacker's DNS
can return a safe IP during the check and a blocked IP at connect. ``guard_and_pin``
closes this by returning a URL whose host is the **literal validated IP**, plus
the original ``Host`` header value, so the socket connects to exactly the IP that
was checked. Callers MUST connect with the pinned URL and the returned Host header.
"""

from __future__ import annotations

import ipaddress
import socket
from urllib.parse import urlparse


class SsrfBlocked(ValueError):
    """Raised when a URL is not permitted as an outbound target."""


def _pick_validated_ip(
    host: str,
    port: int,
    *,
    allow_private: bool,
) -> ipaddress._BaseAddress:
    """Resolve ``host`` and return one IP that satisfies the policy, raising
    :class:`SsrfBlocked` if ANY resolved address violates an always-blocked rule."""
    try:
        infos = socket.getaddrinfo(host, port, proto=socket.IPPROTO_TCP)
    except socket.gaierror as exc:
        raise SsrfBlocked(f"cannot resolve host {host!r}: {exc}") from exc

    chosen: ipaddress._BaseAddress | None = None
    for info in infos:
        ip = ipaddress.ip_address(info[4][0])
        # Always blocked — link-local covers 169.254.169.254 metadata + fe80::/10.
        if ip.is_link_local or ip.is_multicast or ip.is_unspecified:
            raise SsrfBlocked(f"address {ip} is link-local/multicast (blocked)")
        # Loopback/private are the legitimate self-host case — gate on policy.
        # (Checked before is_reserved because IPv6 ::1 is also "reserved".)
        if ip.is_loopback or ip.is_private:
            if not allow_private:
                raise SsrfBlocked(f"address {ip} is private/loopback (blocked in this mode)")
            chosen = chosen or ip
            continue
        if ip.is_reserved:
            raise SsrfBlocked(f"address {ip} is reserved (blocked)")
        chosen = chosen or ip
    if chosen is None:
        raise SsrfBlocked(f"host {host!r} resolved to no usable address")
    return chosen


def _check_scheme_and_host(url: str, allowlist: list[str] | None) -> tuple[str, int]:
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https"):
        raise SsrfBlocked(f"scheme {parsed.scheme!r} not allowed")
    host = parsed.hostname
    if not host:
        raise SsrfBlocked("missing host")
    if allowlist and host not in allowlist:
        raise SsrfBlocked(f"host {host!r} not in allowlist")
    port = parsed.port or (443 if parsed.scheme == "https" else 80)
    return host, port


def validate_ollama_url(
    url: str,
    *,
    allow_private: bool,
    allowlist: list[str] | None = None,
) -> str:
    """Return ``url`` unchanged if permitted, else raise :class:`SsrfBlocked`.

    Use this for an early, fail-fast check (e.g. at config time). It is NOT
    rebinding-safe on its own — the authoritative, connect-time check is
    :func:`guard_and_pin`, which the HTTP call sites must use.
    """
    host, port = _check_scheme_and_host(url, allowlist)
    _pick_validated_ip(host, port, allow_private=allow_private)
    return url


def guard_and_pin(
    url: str,
    *,
    allow_private: bool,
    allowlist: list[str] | None = None,
) -> tuple[str, str]:
    """Validate ``url`` and return ``(pinned_url, host_header)``.

    ``pinned_url`` has the validated literal IP as its host, so the HTTP client
    connects to exactly the address that was checked (no DNS-rebinding window).
    ``host_header`` is the original ``host[:port]`` to send as the ``Host`` header
    so the upstream still routes correctly.
    """
    parsed = urlparse(url)
    host, port = _check_scheme_and_host(url, allowlist)
    ip = _pick_validated_ip(host, port, allow_private=allow_private)

    ip_host = f"[{ip}]" if ip.version == 6 else str(ip)
    netloc = f"{ip_host}:{parsed.port}" if parsed.port is not None else ip_host
    pinned = parsed._replace(netloc=netloc).geturl()
    host_header = parsed.netloc  # original host[:port], minus any userinfo below
    if "@" in host_header:
        host_header = host_header.rsplit("@", 1)[1]
    return pinned, host_header
