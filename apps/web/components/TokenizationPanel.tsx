"use client";

import { useState } from "react";
import { Eye, EyeOff, ChevronDown, ChevronUp, ShieldCheck, Copy, Check } from "lucide-react";
import type { MessageTurn } from "@/app/chat/page";
import type { Role } from "@/lib/session";
import { ROLES } from "@/lib/session";

interface Props {
  turn: MessageTurn | null;
  role: Role;
}

function renderWithTokens(text: string) {
  const parts = text.split(/({{[A-Z_]+_\d+}})/g);
  return parts.map((part, i) => {
    if (/^{{[A-Z_]+_\d+}}$/.test(part)) {
      return (
        <span key={i} className="token-badge" style={{ margin: "0 2px" }}>
          {part}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

function Section({
  label,
  color,
  children,
  defaultOpen = true,
  badge,
  action,
}: {
  label: string;
  color: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  badge?: React.ReactNode;
  action?: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ borderBottom: "1px solid var(--border-subtle)", borderLeft: `3px solid ${color}48` }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 16px 10px 13px",
          background: `linear-gradient(90deg, ${color}0b, transparent 55%)`,
          border: "none",
          cursor: "pointer",
          color: color,
          fontSize: "0.72rem",
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          fontFamily: "var(--font-ui)",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {label}
          {badge}
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          {action}
          {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </span>
      </button>
      {open && (
        <div
          style={{
            padding: "0 16px 14px",
            fontSize: "0.83rem",
            lineHeight: 1.6,
            color: "var(--text-primary)",
            fontFamily: "var(--font-mono)",
            wordBreak: "break-word",
            whiteSpace: "pre-wrap",
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

export default function TokenizationPanel({ turn, role }: Props) {
  const roleInfo = ROLES.find((r) => r.value === role);
  const [copied, setCopied] = useState(false);

  function copyTokenized() {
    const msg = turn?.meta.tokenized_messages.find((m) => m.role === "user")?.content ?? "";
    navigator.clipboard.writeText(msg).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }

  if (!turn) {
    return (
      <div
        style={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: "62px", height: "62px", borderRadius: "50%",
            background: "rgba(13,90,64,0.07)",
            border: "1px solid rgba(13,90,64,0.2)",
            display: "flex", alignItems: "center", justifyContent: "center",
            marginBottom: "16px",
            animation: "pulse-ring 2.5s ease-in-out infinite",
          }}
        >
          <ShieldCheck size={26} style={{ color: "var(--color-primary)", opacity: 0.75 }} />
        </div>
        <p style={{ color: "var(--text-muted)", fontSize: "0.82rem", margin: 0, lineHeight: 1.6, maxWidth: "200px", textAlign: "center" }}>
          Click any message to inspect how PII was tokenized
        </p>
      </div>
    );
  }

  const tokenizedUserMsg =
    turn.meta.tokenized_messages.find((m) => m.role === "user")?.content ?? "";
  const entitiesFound = turn.meta.entities_found;
  const allowed = turn.meta.entities_allowed;

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Panel header */}
      <div
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid var(--border-subtle)",
          background: "rgba(0,0,0,0.3)",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            fontSize: "0.7rem",
            color: "var(--text-muted)",
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            marginBottom: "6px",
          }}
        >
          Tokenization Inspector
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <span
            style={{
              fontSize: "0.72rem",
              color: roleInfo?.color,
              background: `${roleInfo?.color}18`,
              border: `1px solid ${roleInfo?.color}44`,
              borderRadius: "4px",
              padding: "2px 8px",
              fontWeight: 700,
              fontFamily: "var(--font-mono)",
            }}
          >
            {roleInfo?.label}
          </span>
          {entitiesFound.length > 0 ? (
            <span className="pii-badge">{entitiesFound.length} PII masked</span>
          ) : (
            <span
              style={{
                fontSize: "0.72rem",
                color: "var(--color-safe)",
                background: "var(--color-safe-dim)",
                border: "1px solid var(--border-safe)",
                borderRadius: "4px",
                padding: "2px 8px",
                fontWeight: 600,
              }}
            >
              No PII
            </span>
          )}
        </div>
      </div>

      {/* Scrollable sections */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {/* Section 1: Original input */}
        <Section label="Original Input" color="var(--text-secondary)">
          {turn.userContent}
        </Section>

        {/* Section 2: What LLM received */}
        <Section
          label="LLM Received"
          color="var(--color-danger)"
          badge={
            entitiesFound.length > 0 ? (
              <span className="token-badge" style={{ fontSize: "0.65rem" }}>
                {entitiesFound.length} tokens
              </span>
            ) : null
          }
          action={
            tokenizedUserMsg ? (
              <button
                onClick={(e) => { e.stopPropagation(); copyTokenized(); }}
                title="Copy tokenized prompt"
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: copied ? "var(--color-safe)" : "var(--text-muted)",
                  padding: "2px 4px",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  fontSize: "0.68rem",
                  borderRadius: "4px",
                  transition: "color 150ms",
                }}
              >
                {copied ? <Check size={11} /> : <Copy size={11} />}
                {copied ? "Copied" : "Copy"}
              </button>
            ) : undefined
          }
        >
          {renderWithTokens(tokenizedUserMsg)}
        </Section>

        {/* Entity breakdown */}
        {entitiesFound.length > 0 && (
          <Section label="Entity Map" color="var(--color-warn)" defaultOpen={false}>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {entitiesFound.map((e, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "8px",
                    padding: "6px 8px",
                    background: "var(--bg-surface)",
                    borderRadius: "6px",
                    flexWrap: "wrap",
                  }}
                >
                  <span className="pii-badge">{e.entity_type}</span>
                  <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>→</span>
                  <span className="token-badge">{e.token}</span>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Section 3: Your view */}
        <Section
          label="Your View"
          color="var(--color-safe)"
          badge={
            <span
              style={{
                fontSize: "0.65rem",
                color: roleInfo?.color,
                background: `${roleInfo?.color}15`,
                border: `1px solid ${roleInfo?.color}33`,
                borderRadius: "3px",
                padding: "1px 5px",
                fontWeight: 600,
              }}
            >
              {roleInfo?.label}
            </span>
          }
        >
          {turn.assistantContent}
          {allowed.length === 0 && entitiesFound.length > 0 && (
            <div
              style={{
                marginTop: "8px",
                fontSize: "0.73rem",
                color: "var(--color-warn)",
                fontFamily: "var(--font-ui)",
              }}
            >
              ⚠ Tokens remain masked — your role ({role}) does not allow de-masking.
              <br />
              Switch to VP Risk or Admin to see real values.
            </div>
          )}
          {allowed.length > 0 && entitiesFound.length > 0 && (
            <div
              style={{
                marginTop: "8px",
                fontSize: "0.73rem",
                color: "var(--color-safe)",
                fontFamily: "var(--font-ui)",
              }}
            >
              ✓ De-tokenized: {allowed.join(", ")}
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}
