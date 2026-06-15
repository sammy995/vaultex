import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Vaultex pricing: open-source (Apache-2.0) self-host, Professional $299/mo, and Enterprise for regulated institutions.",
  alternates: { canonical: "https://vaultex.space/pricing" },
  openGraph: { title: "Vaultex Pricing", description: "Open to start. Priced to trust." },
};

const PLANS = [
  {
    name: "Open Source",
    price: "$0",
    period: "Apache-2.0",
    desc: "Self-host the open wedge. Reference detectors, classifier, integrations, and SDKs — no lock-in, no egress.",
    cta: "View on GitHub",
    href: "https://github.com/sammy995/vaultex",
    external: true,
    feature: false,
    features: [
      "finsafe-core + classifier + integrations",
      "Python & TypeScript SDKs",
      "Governance Service contracts",
      "Self-host with Ollama (local) — zero egress",
      "Community support",
    ],
  },
  {
    name: "Professional",
    price: "$299",
    period: "/ month",
    desc: "Hosted gateway with tuned detection, the semantic classifier, and the governance console.",
    cta: "Start a trial",
    href: "/setup",
    external: false,
    feature: true,
    features: [
      "Tuned detectors + semantic classifier",
      "Anthropic · OpenAI · Ollama routing (PII-stripped)",
      "Governance dashboard + policy versioning",
      "90-day immutable audit retention",
      "Role-based detokenization controls",
      "Priority email support",
    ],
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "BFSI",
    desc: "For regulated institutions that need it on their own terms — on their own infrastructure.",
    cta: "Contact sales",
    href: "mailto:hello@vaultex.space?subject=Vaultex%20Enterprise",
    external: true,
    feature: false,
    features: [
      "On-prem / private VPC deployment",
      "SOC 2 Type II report + BFSI risk taxonomy",
      "SSO / SAML, custom RBAC, separation of duties",
      "Evidence packs + reviewer attestations",
      "Custom retention & data residency",
      "Dedicated support + 99.9% uptime SLA",
    ],
  },
];

const ROWS: [string, string, string, string][] = [
  ["Runtime detectors", "Reference heuristics", "Tuned detectors", "Tuned + custom"],
  ["Data classification", "Regex / NER", "Semantic model", "Semantic + BFSI taxonomy"],
  ["LLM routing", "Ollama (local)", "Anthropic · OpenAI · Ollama", "All + private endpoints"],
  ["Audit retention", "Self-managed", "90 days", "Custom"],
  ["Policy versioning + approvals", "–", "✓", "✓ + dual-approval"],
  ["Evidence packs", "–", "✓", "✓ + attestations"],
  ["SOC 2 Type II", "–", "–", "✓"],
  ["Deployment", "Self-host (Docker)", "Hosted / Docker", "Private VPC / on-prem"],
  ["Support", "Community", "Priority email", "Dedicated + SLA"],
];

export default function PricingPage() {
  return (
    <>
      <SiteNav />
      <main style={{ background: "var(--paper)", minHeight: "100vh", paddingTop: "120px" }}>
        <div className="wrap">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              paddingBottom: "14px",
              borderBottom: "1px solid var(--rule-strong)",
            }}
          >
            <span className="eyebrow">Pricing</span>
            <span className="eyebrow">Open core · Apache-2.0</span>
          </div>

          <div style={{ maxWidth: "60ch", marginTop: "48px" }}>
            <h1 className="display display-lg">Open to start. Priced to trust.</h1>
            <p className="lede" style={{ marginTop: "18px" }}>
              The interfaces, reference detectors, classifier, and SDKs are{" "}
              <a className="link-underline" href="https://github.com/sammy995/vaultex" target="_blank" rel="noopener noreferrer">
                open source
              </a>{" "}
              and always will be. We earn on what regulated institutions actually need: tuned
              detection, managed governance, and compliance evidence.
            </p>
          </div>

          {/* Plan cards */}
          <div className="cols-3" style={{ marginTop: "56px", gap: "20px", alignItems: "stretch" }}>
            {PLANS.map((p) => (
              <div
                key={p.name}
                className="panel"
                style={{
                  padding: "32px 28px",
                  display: "flex",
                  flexDirection: "column",
                  background: p.feature ? "var(--ink)" : "var(--paper-card)",
                  color: p.feature ? "var(--paper)" : "var(--ink)",
                  border: p.feature ? "1px solid var(--ink)" : "1px solid var(--rule)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span className="eyebrow" style={{ color: p.feature ? "rgba(241,236,225,0.6)" : "var(--ink-faint)" }}>
                    {p.name}
                  </span>
                  {p.feature && (
                    <span
                      className="mono"
                      style={{ fontSize: "0.6rem", color: "var(--vault)", background: "var(--paper)", padding: "2px 8px", borderRadius: "100px", letterSpacing: "0.08em" }}
                    >
                      POPULAR
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginTop: "16px" }}>
                  <span className="display" style={{ fontSize: "2.6rem", fontWeight: 600, color: "inherit" }}>{p.price}</span>
                  <span className="mono" style={{ fontSize: "0.74rem", color: p.feature ? "rgba(241,236,225,0.6)" : "var(--ink-faint)" }}>{p.period}</span>
                </div>
                <p style={{ fontSize: "0.9rem", lineHeight: 1.55, marginTop: "10px", color: p.feature ? "rgba(241,236,225,0.78)" : "var(--ink-soft)" }}>
                  {p.desc}
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "11px", margin: "26px 0", flex: 1 }}>
                  {p.features.map((f) => (
                    <div key={f} style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                      <Check size={15} color={p.feature ? "var(--paper)" : "var(--vault)"} strokeWidth={2.5} style={{ flexShrink: 0, marginTop: "2px" }} />
                      <span style={{ fontSize: "0.86rem", color: p.feature ? "rgba(241,236,225,0.9)" : "var(--ink-soft)" }}>{f}</span>
                    </div>
                  ))}
                </div>
                {p.external ? (
                  <a href={p.href} target="_blank" rel="noopener noreferrer" className={`btn ${p.feature ? "btn-vault" : "btn-line"}`} style={{ width: "100%" }}>
                    {p.cta}
                  </a>
                ) : (
                  <Link href={p.href} className={`btn ${p.feature ? "btn-vault" : "btn-line"}`} style={{ width: "100%" }}>
                    {p.cta}
                  </Link>
                )}
              </div>
            ))}
          </div>

          {/* Scoped pilot band — the regulated-buyer on-ramp */}
          <div className="panel-ink" style={{ marginTop: "clamp(56px,8vw,96px)", padding: "clamp(28px,4vw,48px)" }}>
            <div className="split-2" style={{ alignItems: "center" }}>
              <div>
                <span className="eyebrow" style={{ color: "rgba(241,236,225,0.6)" }}>For regulated buyers · early access</span>
                <h2 className="display" style={{ fontSize: "clamp(1.6rem,3vw,2.4rem)", fontWeight: 500, color: "var(--paper)", marginTop: "14px", maxWidth: "20ch" }}>
                  Start with a scoped pilot — built to pass security review, not just a demo.
                </h2>
              </div>
              <div>
                <p style={{ color: "rgba(241,236,225,0.78)", fontSize: "1rem", lineHeight: 1.7 }}>
                  A fixed-scope, 2–4 week proof of concept on your infrastructure. Includes:
                </p>
                <div style={{ margin: "16px 0 24px", display: "flex", flexDirection: "column", gap: "9px" }}>
                  {[
                    "Hands-on deployment in your environment",
                    "Source review of the open-core components (SAST/SCA-friendly)",
                    "Written answers to your security questionnaire + architecture brief",
                    "PII-detection tuning on a sample of your real workflows",
                  ].map((t) => (
                    <div key={t} style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                      <Check size={15} color="var(--paper)" strokeWidth={2.5} style={{ flexShrink: 0, marginTop: "3px" }} />
                      <span style={{ fontSize: "0.9rem", color: "rgba(241,236,225,0.9)" }}>{t}</span>
                    </div>
                  ))}
                </div>
                <a href="mailto:hello@vaultex.space?subject=Vaultex%20pilot" className="btn" style={{ background: "var(--paper)", color: "var(--ink)" }}>
                  Scope a pilot →
                </a>
              </div>
            </div>
          </div>

          {/* Comparison ledger */}
          <h2 className="display display-md" style={{ marginTop: "clamp(64px,9vw,110px)", marginBottom: "28px" }}>
            Full comparison
          </h2>
          <div className="panel" style={{ overflow: "hidden" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.6fr 1fr 1fr 1fr",
                padding: "14px 22px",
                borderBottom: "1px solid var(--rule-strong)",
                background: "var(--paper-deep)",
              }}
            >
              {["Capability", "Open Source", "Professional", "Enterprise"].map((h, i) => (
                <span key={h} className="eyebrow" style={{ textAlign: i === 0 ? "left" : "center" }}>{h}</span>
              ))}
            </div>
            {ROWS.map((r, i) => (
              <div
                key={r[0]}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.6fr 1fr 1fr 1fr",
                  padding: "13px 22px",
                  borderBottom: i < ROWS.length - 1 ? "1px solid var(--rule)" : "none",
                  alignItems: "center",
                  fontSize: "0.84rem",
                }}
              >
                <span style={{ color: "var(--ink)", fontWeight: 500 }}>{r[0]}</span>
                {[r[1], r[2], r[3]].map((c, j) => (
                  <span
                    key={j}
                    style={{ textAlign: "center", color: c === "–" ? "var(--ink-faint)" : "var(--ink-soft)" }}
                    className={c === "✓" ? "mono" : ""}
                  >
                    {c}
                  </span>
                ))}
              </div>
            ))}
          </div>

          <div style={{ textAlign: "center", padding: "64px 0 20px" }}>
            <p style={{ color: "var(--ink-soft)", fontSize: "0.95rem", marginBottom: "20px" }}>
              Questions about Enterprise terms or a compliance review?
            </p>
            <a href="mailto:hello@vaultex.space" className="btn btn-ink" style={{ padding: "13px 26px" }}>
              Talk to sales →
            </a>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
