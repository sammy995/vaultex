# Design — Vaultex Open-Core Public Repo + Gaps 5/6/7

**Date:** 2026-06-02
**Status:** Approved (brainstorming)
**Scope:** Sub-project 1 of 2 (the repo). Sub-project 2 = vaultex.space overhaul, separate spec.

## Context

The AI Trust Infrastructure Stack (Vaultex input governance · AgentGuard runtime+FIN-SAFE · shared Governance Service) needs a **GitHub-worthy open-source wedge** that drives adoption while the moat (BFSI risk taxonomy, scoring/benchmark methodology, governance-engine internals, FIN-SAFE detectors) stays proprietary. This is the **open-core** model. Decided with the founder: new clean **public repo**, **Apache-2.0**, named **`vaultex`**.

## Decisions (founder-owned)

- **Boundary:** open-core. Open = the wedge (SDKs, contracts, integration adapters, detector/classifier *interfaces* + reference impls). Proprietary = scoring weights/tiers, BFSI taxonomy, semantic classifier model, governance internals.
- **Mechanics:** new standalone public repo (no history-leak risk). Proprietary apps stay private and consume the open packages.
- **License:** Apache-2.0 (patent grant; enterprise-friendly).
- **This round's gaps:** 5 (integrations), 6 (FIN-SAFE scaffold), 7 (classifier scaffold). Gap 3 deferred.

## Public repo layout (`vaultex/`)

```
vaultex/                       # Apache-2.0
├─ README.md · LICENSE · CONTRIBUTING.md · SECURITY.md · CODE_OF_CONDUCT.md
├─ .github/workflows/ci.yml
├─ contracts/                  # OpenAPI + JSON-Schema (canonical; copied from agentguard/contracts)
├─ packages/
│  ├─ integrations/  (TS)      # Gap 5: OTel, Prometheus, Datadog, SIEM (syslog/HEC), OIDC adapters
│  ├─ finsafe-core/  (TS)      # Gap 6: Detector interface + reference OWASP/ATLAS heuristics
│  └─ classifier/    (Python)  # Gap 7: Classifier interface + reference regex/NER pipeline
├─ sdk/
│  ├─ python/                  # Vaultex governance + tokenization client
│  └─ typescript/              # thin AgentGuard client
├─ examples/                   # runnable quickstarts
└─ docs/                       # architecture, concepts, "plugging in the proprietary core"
```

## Open/proprietary seam per gap

| Gap | Open (this repo) | Proprietary (private apps) |
|---|---|---|
| 5 Integrations | all adapters (pure plumbing) | — |
| 6 FIN-SAFE | `Detector` interface + reference heuristics (injection/PII/jailbreak) | scoring weights, model-risk tiers, tuned detectors |
| 7 Classifier | `Classifier` interface + regex/NER reference pipeline | semantic model + BFSI sensitivity taxonomy |

Private apps register **proprietary providers** behind the open interfaces (flagged ⛔ seams, not built this round).

## Wiring into existing apps

- **AgentGuard**: `apps/api/src/integrations/*` (Gap 5 → OTel + `/metrics`), `apps/api/src/finsafe/*` (Gap 6 interfaces + reference detectors hooked into the gateway interceptor).
- **Vaultex/Project-aots**: `gateway/classifier.py` (Gap 7 interface + reference pipeline behind a provider seam).

## Verification

- Reference impls unit-tested (pure where possible); `tsc`/`pytest` green.
- Public repo CI lints + tests; at least one example runs.
- Open packages import-clean with no proprietary dependency.

## Out of scope (this round)

Gap 3 security hardening; real proprietary providers (taxonomy/scoring/semantic model); the website (sub-project 2).
