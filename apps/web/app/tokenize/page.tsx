"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Shield, Copy, RefreshCw, ArrowLeft, Zap, Check, Info } from "lucide-react";
import {
  tokenize,
  createVault,
  ENTITY_COLOR,
  type TokenizeResult,
  type VaultState,
  type EntityType,
} from "@/lib/tokenizer";

const SAMPLE = `Analyze risk profile for Jane Smith (SSN: 123-45-6789, email: jane.smith@acme.com, phone: 415-555-0192).
Account ACC-00198234 has balance $42,500, credit score 742.
Loan LOAN-2024-0041: $85,000 mortgage at 6.25%, 30 days past due.
Date of birth: 01/15/1985. Card on file: 4111-1111-1111-1111.`;

const ENTITY_LABELS: Record<EntityType, string> = {
  PERSON:         "Person",
  SSN:            "SSN",
  EMAIL_ADDRESS:  "Email",
  PHONE_NUMBER:   "Phone",
  CREDIT_CARD:    "Credit Card",
  ACCOUNT_NUMBER: "Account No.",
  LOAN_ID:        "Loan ID",
  DATE_TIME:      "Date",
};

// Renders tokenized output with cyan-highlighted tokens
function TokenizedDisplay({ text }: { text: string }) {
  const parts: React.ReactNode[] = [];
  const re = /(\{\{[A-Z_]+_\d+\}\})/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(<span key={`t${last}`}>{text.slice(last, m.index)}</span>);
    parts.push(
      <span
        key={`k${m.index}`}
        style={{
          color: "#0d5a40",
          background: "rgba(13,90,64,0.1)",
          border: "1px solid rgba(13,90,64,0.2)",
          borderRadius: "4px",
          padding: "1px 5px",
          fontWeight: 700,
          fontSize: "0.8em",
        }}
      >
        {m[0]}
      </span>
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(<span key={`t${last}`}>{text.slice(last)}</span>);
  return <>{parts}</>;
}

export default function TokenizePage() {
  const router = useRouter();
  const [input, setInput]       = useState(SAMPLE);
  const [vault, setVault]       = useState<VaultState>(createVault());
  const [result, setResult]     = useState<TokenizeResult | null>(null);
  const [copied, setCopied]     = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  const handleTokenize = useCallback(() => {
    const { result: res, vault: updatedVault } = tokenize(input, vault);
    setResult(res);
    setVault(updatedVault);
  }, [input, vault]);

  const handleCopy = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.tokenized);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    setVault(createVault());
    setResult(null);
    setInput(SAMPLE);
  };

  const vaultEntries = Object.entries(vault.tokenToOrig);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-base)", display: "flex", flexDirection: "column" }}>
      {/* Ambient glow */}
      <div style={{ position: "fixed", inset: 0, background: "radial-gradient(ellipse 60% 35% at 50% 0%, rgba(13,90,64,0.04) 0%, transparent 60%)", pointerEvents: "none", zIndex: 0 }} />

      {/* Navbar */}
      <header
        style={{
          height: "52px",
          borderBottom: "1px solid var(--border-subtle)",
          display: "flex",
          alignItems: "center",
          padding: "0 20px",
          gap: "14px",
          position: "sticky",
          top: 0,
          background: "rgba(250,247,239,0.85)",
          backdropFilter: "blur(12px)",
          zIndex: 10,
          flexShrink: 0,
        }}
      >
        <button
          onClick={() => router.back()}
          className="btn-ghost"
          style={{ padding: "5px 10px", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "5px", flexShrink: 0 }}
        >
          <ArrowLeft size={14} /> Back
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: "28px", height: "28px", borderRadius: "8px", background: "linear-gradient(135deg,#0d5a40,#0055cc)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 10px rgba(13,90,64,0.3)", flexShrink: 0 }}>
            <Shield size={14} color="var(--paper)" />
          </div>
          <span style={{ fontWeight: 800, fontSize: "0.92rem", color: "var(--ink)", letterSpacing: "-0.02em" }}>
            PII Tokenizer
          </span>
          <span style={{ fontSize: "0.65rem", fontWeight: 700, color: "#0d5a40", background: "rgba(13,90,64,0.1)", border: "1px solid rgba(13,90,64,0.25)", borderRadius: "100px", padding: "2px 10px", letterSpacing: "0.05em", flexShrink: 0 }}>
            STARTER · FREE
          </span>
        </div>

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "8px" }}>
          {vaultEntries.length > 0 && (
            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", background: "rgba(255,184,0,0.08)", border: "1px solid rgba(255,184,0,0.18)", borderRadius: "100px", padding: "3px 10px" }}>
              {vaultEntries.length} in vault
            </span>
          )}
          <button
            onClick={handleReset}
            className="btn-ghost"
            style={{ padding: "5px 12px", fontSize: "0.78rem", display: "flex", alignItems: "center", gap: "5px", color: "var(--text-muted)" }}
          >
            <RefreshCw size={12} /> Reset Session
          </button>
        </div>
      </header>

      {/* Main */}
      <main style={{ flex: 1, padding: "32px 24px 48px", maxWidth: "1080px", width: "100%", margin: "0 auto", position: "relative", zIndex: 1, boxSizing: "border-box" }}>

        {/* Hero text */}
        <div style={{ marginBottom: "28px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
            <h1 style={{ fontSize: "1.55rem", fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.03em", margin: 0 }}>
              Detect &amp; tokenize PII — no AI needed
            </h1>
            <button
              onClick={() => setShowInfo(v => !v)}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex", padding: "2px" }}
              title="How it works"
            >
              <Info size={16} />
            </button>
          </div>
          {showInfo && (
            <div style={{ background: "rgba(13,90,64,0.05)", border: "1px solid rgba(13,90,64,0.15)", borderRadius: "12px", padding: "14px 18px", marginBottom: "16px", fontSize: "0.82rem", color: "var(--text-muted)", lineHeight: 1.7 }}>
              <strong style={{ color: "#0d5a40" }}>How the session vault works:</strong> Each unique PII value is assigned a deterministic token —{" "}
              <span style={{ fontFamily: "var(--font-mono)", color: "#0d5a40" }}>{"{{PERSON_1}}"}</span> for the first person detected,{" "}
              <span style={{ fontFamily: "var(--font-mono)", color: "#0d5a40" }}>{"{{SSN_1}}"}</span> for the first SSN, etc. If you tokenize another text with the same name,
              it will get the same token. Reset the session to start fresh.
            </div>
          )}
          <p style={{ fontSize: "0.88rem", color: "var(--text-muted)", margin: 0, lineHeight: 1.6 }}>
            Paste any text. The tokenizer identifies PII using regex patterns and named-entity heuristics, then replaces each
            value with a deterministic <span style={{ color: "var(--color-accent)", fontFamily: "var(--font-mono)", fontSize: "0.85em" }}>{"{{TOKEN}}"}</span>.
            Same PII → same token, always. Runs 100% in your browser.
          </p>
        </div>

        {/* Input + Output row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>

          {/* Input panel */}
          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border-subtle)", borderRadius: "14px", overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "11px 16px", borderBottom: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.07em", textTransform: "uppercase" }}>Input</span>
              <span style={{ fontSize: "0.68rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>{input.length} chars</span>
            </div>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              style={{
                flex: 1,
                minHeight: "220px",
                background: "transparent",
                border: "none",
                padding: "14px 16px",
                color: "var(--text-secondary)",
                fontSize: "0.81rem",
                fontFamily: "var(--font-mono)",
                lineHeight: 1.75,
                resize: "vertical",
                outline: "none",
                boxSizing: "border-box",
                width: "100%",
              }}
              placeholder="Paste text containing PII…"
              spellCheck={false}
            />
            <div style={{ padding: "11px 16px", borderTop: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
              <span style={{ fontSize: "0.68rem", color: "var(--text-muted)", lineHeight: 1.4 }}>
                Nothing sent to any server · runs in your browser
              </span>
              <button
                className="btn-primary"
                onClick={handleTokenize}
                style={{ padding: "8px 20px", fontSize: "0.82rem", display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}
              >
                <Zap size={13} /> Tokenize
              </button>
            </div>
          </div>

          {/* Output panel */}
          <div
            style={{
              background: "rgba(255,255,255,0.02)",
              border: `1px solid ${result ? "rgba(13,90,64,0.22)" : "var(--border-subtle)"}`,
              borderRadius: "14px",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              transition: "border-color 300ms ease",
            }}
          >
            <div style={{ padding: "11px 16px", borderBottom: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.07em", textTransform: "uppercase" }}>Tokenized Output</span>
              {result && (
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "#0d5a40", background: "rgba(13,90,64,0.1)", border: "1px solid rgba(13,90,64,0.2)", borderRadius: "100px", padding: "2px 9px" }}>
                    {result.entities.length} masked
                  </span>
                  <button
                    onClick={handleCopy}
                    className="btn-ghost"
                    style={{ padding: "4px 10px", fontSize: "0.72rem", display: "flex", alignItems: "center", gap: "4px" }}
                  >
                    {copied ? <><Check size={11} /> Copied</> : <><Copy size={11} /> Copy</>}
                  </button>
                </div>
              )}
            </div>
            <div
              style={{
                flex: 1,
                padding: "14px 16px",
                overflowY: "auto",
                fontFamily: "var(--font-mono)",
                fontSize: "0.81rem",
                lineHeight: 1.75,
                color: "var(--text-secondary)",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                minHeight: "220px",
              }}
            >
              {result ? (
                <TokenizedDisplay text={result.tokenized} />
              ) : (
                <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>Tokenized text will appear here…</span>
              )}
            </div>
            <div style={{ padding: "11px 16px", borderTop: "1px solid var(--border-subtle)" }}>
              <span style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>
                {result
                  ? "Safe to send to any LLM — zero raw PII exposed"
                  : "Click Tokenize to see the result"}
              </span>
            </div>
          </div>
        </div>

        {/* Entity table + Vault row */}
        {result && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>

            {/* Entity table */}
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border-subtle)", borderRadius: "14px", overflow: "hidden" }}>
              <div style={{ padding: "11px 16px", borderBottom: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.07em", textTransform: "uppercase" }}>PII Detected</span>
                <span style={{ fontSize: "0.68rem", color: "var(--text-muted)", background: "rgba(255,255,255,0.06)", borderRadius: "100px", padding: "1px 8px" }}>
                  {result.entities.length}
                </span>
              </div>
              {result.entities.length === 0 ? (
                <div style={{ padding: "24px 16px", fontSize: "0.82rem", color: "var(--text-muted)", textAlign: "center" }}>
                  No PII detected in this text.
                </div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                        {["Type", "Original Value", "Token"].map((h) => (
                          <th key={h} style={{ padding: "8px 12px", textAlign: "left", color: "var(--text-muted)", fontWeight: 600, fontSize: "0.67rem", letterSpacing: "0.05em", textTransform: "uppercase" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {result.entities.map((e, i) => (
                        <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                          <td style={{ padding: "8px 12px" }}>
                            <span style={{
                              fontSize: "0.67rem",
                              fontWeight: 700,
                              color: ENTITY_COLOR[e.entityType],
                              background: `${ENTITY_COLOR[e.entityType]}14`,
                              border: `1px solid ${ENTITY_COLOR[e.entityType]}28`,
                              borderRadius: "6px",
                              padding: "2px 8px",
                              whiteSpace: "nowrap",
                            }}>
                              {ENTITY_LABELS[e.entityType]}
                            </span>
                          </td>
                          <td style={{ padding: "8px 12px", color: "var(--text-secondary)", fontFamily: "var(--font-mono)", fontSize: "0.75rem", maxWidth: "150px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {e.original}
                          </td>
                          <td style={{ padding: "8px 12px", color: "#0d5a40", fontFamily: "var(--font-mono)", fontSize: "0.73rem", whiteSpace: "nowrap" }}>
                            {e.token}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Session vault */}
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border-subtle)", borderRadius: "14px", overflow: "hidden" }}>
              <div style={{ padding: "11px 16px", borderBottom: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.07em", textTransform: "uppercase" }}>Session Vault</span>
                  <span style={{ fontSize: "0.68rem", color: "var(--text-muted)", background: "rgba(255,255,255,0.06)", borderRadius: "100px", padding: "1px 8px" }}>
                    {vaultEntries.length}
                  </span>
                </div>
                <span style={{ fontSize: "0.65rem", color: "#8a5300", fontWeight: 600, letterSpacing: "0.02em" }}>
                  Persistent across tokenizations
                </span>
              </div>

              <div style={{ maxHeight: "200px", overflowY: "auto" }}>
                {vaultEntries.map(([token, orig]) => (
                  <div
                    key={token}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "7px 16px",
                      borderBottom: "1px solid rgba(255,255,255,0.025)",
                    }}
                  >
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem", color: "#0d5a40", flexShrink: 0, minWidth: "120px" }}>
                      {token}
                    </span>
                    <span style={{ fontSize: "0.65rem", color: "var(--ink-faint)", flexShrink: 0 }}>←→</span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem", color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {orig}
                    </span>
                  </div>
                ))}
              </div>

              <div style={{ padding: "10px 16px", borderTop: "1px solid var(--border-subtle)", fontSize: "0.7rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
                Tokenize multiple texts in a row —{" "}
                <span style={{ color: "#0d5a40", fontFamily: "var(--font-mono)" }}>Jane Smith</span>{" "}
                will always be{" "}
                <span style={{ color: "#0d5a40", fontFamily: "var(--font-mono)" }}>{"{{PERSON_1}}"}</span>{" "}
                until you reset.
              </div>
            </div>
          </div>
        )}

        {/* Upgrade nudge */}
        <div style={{ marginTop: "32px", background: "linear-gradient(135deg, rgba(13,90,64,0.06) 0%, rgba(13,90,64,0.04) 100%)", border: "1px solid rgba(13,90,64,0.18)", borderRadius: "16px", padding: "22px 26px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", flexWrap: "wrap" }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: "0.95rem", color: "var(--text-primary)", marginBottom: "6px" }}>
              Ready for production-grade LLM privacy?
            </div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: 1.6, maxWidth: "460px" }}>
              The full gateway connects to OpenAI, Anthropic, or a local Ollama model — PII is tokenized before every LLM call and de-tokenized per your role on return. Audit-logged. Deploys in under 30 min.
            </div>
            <div style={{ marginTop: "10px", display: "flex", gap: "16px", flexWrap: "wrap" }}>
              {["Role-aware de-tokenization", "Full audit trail", "Docker · 30 min setup"].map(feat => (
                <span key={feat} style={{ fontSize: "0.7rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "4px" }}>
                  <span style={{ color: "#0d5a40" }}>✓</span> {feat}
                </span>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "8px", flexShrink: 0 }}>
            <a
              href="/setup"
              className="btn-primary"
              style={{ padding: "12px 24px", fontSize: "0.88rem", display: "flex", alignItems: "center", gap: "7px", textDecoration: "none" }}
            >
              Deploy the Gateway →
            </a>
            <span style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>Free & open-source</span>
          </div>
        </div>
      </main>
    </div>
  );
}
