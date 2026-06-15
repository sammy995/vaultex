"use client";

import { useRef, useEffect, useState } from "react";
import { Send, Loader2, Users, Shield } from "lucide-react";
import type { MessageTurn, RoleEvent } from "@/app/chat/page";

interface Props {
  turns: MessageTurn[];
  roleEvents: RoleEvent[];
  loading: boolean;
  error: string;
  onSend: (msg: string) => void;
  onSelectTurn: (id: string) => void;
  selectedTurnId: string | null;
  csvLoaded?: boolean;
}

const SAMPLE_PROMPTS = [
  "Summarize the loan history for John Doe, SSN 123-45-6789, balance $5,000",
  "Customer Jane Smith, account number 987654321, owes $12,500 on loan LOAN-ABC123",
  "Flag account routing number 021000021 for review, balance $230,000",
];

const CSV_SAMPLE_PROMPTS = [
  "Which customers have a HIGH risk flag and are more than 30 days past due?",
  "What is the average credit score broken down by risk flag?",
  "List all self-employed customers with a balance over $100,000",
  "Show customers in California or Texas with an interest rate above 7%",
  "Which loan types have the highest default risk based on days past due?",
  "Compare average income vs outstanding balance for MEDIUM and HIGH risk customers",
];

export default function ChatInterface({
  turns,
  roleEvents,
  loading,
  error,
  onSend,
  onSelectTurn,
  selectedTurnId,
  csvLoaded = false,
}: Props) {
  const [input, setInput] = useState("");
  const [inputFocused, setInputFocused] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns, roleEvents, loading]);

  function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    const msg = input.trim();
    if (!msg || loading) return;
    setInput("");
    onSend(msg);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  // Merge turns and role events into a time-sorted thread
  type ThreadItem =
    | { kind: "turn"; data: MessageTurn }
    | { kind: "roleEvent"; data: RoleEvent };

  const thread: ThreadItem[] = [
    ...turns.map((t) => ({ kind: "turn" as const, data: t })),
    ...roleEvents.map((e) => ({ kind: "roleEvent" as const, data: e })),
  ].sort((a, b) => a.data.timestamp - b.data.timestamp);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
        {turns.length === 0 && !loading && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: "32px", gap: "20px", padding: "0 16px" }}>
            {/* Header */}
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  background: "rgba(13,90,64,0.07)",
                  border: "1px solid rgba(13,90,64,0.18)",
                  borderRadius: "100px",
                  padding: "5px 14px",
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  color: "var(--color-primary)",
                  letterSpacing: "0.04em",
                  marginBottom: "12px",
                }}
              >
                {csvLoaded ? "📊 Dataset ready" : "✦ PII Gateway Active"}
              </div>
              <p style={{ color: "var(--text-muted)", fontSize: "0.82rem", margin: 0, lineHeight: 1.6, maxWidth: "380px" }}>
                {csvLoaded
                  ? "Ask anything about the uploaded data. Switch personas to see different levels of PII visibility."
                  : "Send any message containing names, SSNs, account numbers, or loan IDs — then watch the tokenization happen in real time."}
              </p>
            </div>

            {/* Sample prompt chips */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", width: "100%", maxWidth: "520px" }}>
              <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "2px" }}>
                Try one of these →
              </div>
              {(csvLoaded ? CSV_SAMPLE_PROMPTS : SAMPLE_PROMPTS).map((p, i) => (
                <button
                  key={i}
                  onClick={() => { setInput(p); }}
                  style={{
                    background: "rgba(23,21,15,0.025)",
                    border: "1px solid rgba(23,21,15,0.07)",
                    borderRadius: "10px",
                    padding: "10px 16px",
                    color: "var(--text-secondary)",
                    fontSize: "0.82rem",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 150ms ease",
                    lineHeight: 1.45,
                    fontFamily: "var(--font-ui)",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = "rgba(13,90,64,0.3)";
                    (e.currentTarget as HTMLElement).style.color = "var(--text-primary)";
                    (e.currentTarget as HTMLElement).style.background = "rgba(13,90,64,0.04)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = "rgba(23,21,15,0.07)";
                    (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)";
                    (e.currentTarget as HTMLElement).style.background = "rgba(23,21,15,0.025)";
                  }}
                >
                  <span style={{ color: "var(--color-primary)", fontSize: "0.75rem", fontWeight: 700, flexShrink: 0 }}>→</span>
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {thread.map((item) => {
          if (item.kind === "roleEvent") {
            const ev = item.data;
            return (
              <div
                key={ev.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  margin: "16px 0",
                  padding: "0 4px",
                }}
              >
                <div style={{ flex: 1, height: "1px", background: `${ev.color}30` }} />
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "4px 12px",
                    borderRadius: "100px",
                    border: `1px solid ${ev.color}40`,
                    background: `${ev.color}0d`,
                    fontSize: "0.72rem",
                    color: ev.color,
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                  }}
                >
                  <Users size={11} />
                  Viewing as {ev.label} — resend a message to see updated PII visibility
                </div>
                <div style={{ flex: 1, height: "1px", background: `${ev.color}30` }} />
              </div>
            );
          }

          const turn = item.data as MessageTurn;
          return (
          <div
            key={turn.id}
            onClick={() => onSelectTurn(turn.id)}
            style={{ marginBottom: "24px", cursor: "pointer" }}
          >
            {/* User bubble */}
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "8px", paddingLeft: "18%" }}>
              <div
                style={{
                  background: selectedTurnId === turn.id
                    ? "linear-gradient(135deg, rgba(13,90,64,0.22), rgba(0,80,220,0.17))"
                    : "linear-gradient(135deg, rgba(13,90,64,0.12), rgba(0,60,180,0.09))",
                  border: selectedTurnId === turn.id
                    ? "1px solid rgba(13,90,64,0.45)"
                    : "1px solid rgba(13,90,64,0.2)",
                  borderRadius: "18px 18px 4px 18px",
                  padding: "11px 16px",
                  maxWidth: "100%",
                  fontSize: "0.88rem",
                  color: "var(--text-primary)",
                  lineHeight: 1.55,
                  transition: "all 180ms ease",
                  boxShadow: selectedTurnId === turn.id
                    ? "0 0 22px rgba(13,90,64,0.22), 0 4px 20px rgba(0,0,0,0.35)"
                    : "0 2px 14px rgba(0,0,0,0.28)",
                  wordBreak: "break-word",
                }}
              >
                {turn.userContent}
              </div>
            </div>
            {/* Entity count badge */}
            {turn.meta.entities_found.length > 0 && (
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "8px" }}>
                <span className="pii-badge">
                  {turn.meta.entities_found.length} PII entities masked
                </span>
              </div>
            )}
            {/* Assistant bubble */}
            <div style={{ display: "flex", justifyContent: "flex-start", alignItems: "flex-start", gap: "8px", paddingRight: "18%" }}>
              <div
                style={{
                  width: "26px", height: "26px", borderRadius: "50%", flexShrink: 0,
                  background: "linear-gradient(135deg, rgba(13,90,64,0.22), rgba(0,80,200,0.16))",
                  border: "1px solid rgba(13,90,64,0.28)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  marginTop: "6px",
                }}
              >
                <Shield size={12} style={{ color: "var(--color-primary)" }} />
              </div>
              <div
                style={{
                  background: "rgba(11, 17, 30, 0.9)",
                  backdropFilter: "blur(24px)",
                  border: "1px solid rgba(23,21,15,0.07)",
                  borderLeft: "2px solid rgba(13,90,64,0.32)",
                  borderRadius: "4px 18px 18px 18px",
                  padding: "11px 16px",
                  maxWidth: "100%",
                  fontSize: "0.88rem",
                  color: "var(--text-primary)",
                  lineHeight: 1.65,
                  wordBreak: "break-word",
                  boxShadow: "0 2px 18px rgba(0,0,0,0.32)",
                }}
              >
                {turn.assistantContent}
              </div>
            </div>
          </div>
          );
        })}

        {loading && (
          <div style={{ display: "flex", justifyContent: "flex-start", alignItems: "flex-start", gap: "8px", marginBottom: "24px" }}>
            <div
              style={{
                width: "26px", height: "26px", borderRadius: "50%", flexShrink: 0,
                background: "linear-gradient(135deg, rgba(13,90,64,0.2), rgba(0,80,200,0.14))",
                border: "1px solid rgba(13,90,64,0.25)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <Shield size={12} style={{ color: "var(--color-primary)", opacity: 0.8 }} />
            </div>
            <div
              style={{
                background: "rgba(11, 17, 30, 0.9)",
                border: "1px solid rgba(23,21,15,0.07)",
                borderLeft: "2px solid rgba(13,90,64,0.28)",
                borderRadius: "4px 18px 18px 18px",
                padding: "13px 20px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
            </div>
          </div>
        )}

        {error && (
          <div
            style={{
              background: "var(--color-danger-dim)",
              border: "1px solid rgba(255,68,68,0.3)",
              borderRadius: "8px",
              padding: "12px 16px",
              color: "var(--color-danger)",
              fontSize: "0.85rem",
              marginBottom: "16px",
            }}
          >
            {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div
        style={{
          padding: "10px 14px 12px",
          background: "rgba(4, 7, 16, 0.97)",
          backdropFilter: "blur(24px)",
          borderTop: "1px solid rgba(23,21,15,0.06)",
          boxShadow: "0 -6px 30px rgba(0,0,0,0.45)",
        }}
      >
        <form onSubmit={handleSubmit}>
          <div
            style={{
              display: "flex",
              gap: "8px",
              alignItems: "flex-end",
              background: "rgba(23,21,15,0.04)",
              border: `1px solid ${inputFocused ? "rgba(13,90,64,0.38)" : "rgba(23,21,15,0.08)"}`,
              borderRadius: "14px",
              padding: "8px 8px 8px 14px",
              transition: "border-color 180ms ease, box-shadow 180ms ease",
              boxShadow: inputFocused ? "0 0 0 3px rgba(13,90,64,0.08)" : "none",
            }}
          >
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              placeholder={csvLoaded ? "Ask a question about the uploaded dataset…" : "Type a message with customer data (e.g. John Doe, SSN 123-45-6789)…"}
              rows={2}
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                padding: "4px 0",
                color: "var(--text-primary)",
                fontSize: "0.88rem",
                fontFamily: "var(--font-ui)",
                outline: "none",
                resize: "none",
                lineHeight: 1.55,
              }}
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              style={{
                width: "38px",
                height: "38px",
                borderRadius: "10px",
                border: "none",
                background: input.trim() && !loading
                  ? "linear-gradient(135deg, #0d5a40, #0a4631)"
                  : "rgba(23,21,15,0.07)",
                color: input.trim() && !loading ? "var(--paper)" : "var(--text-muted)",
                cursor: input.trim() && !loading ? "pointer" : "not-allowed",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                transition: "all 180ms ease",
                boxShadow: input.trim() && !loading ? "0 0 16px rgba(13,90,64,0.32)" : "none",
              }}
            >
              {loading
                ? <Loader2 size={15} style={{ animation: "spin 1s linear infinite", color: "var(--color-primary)" }} />
                : <Send size={15} />
              }
            </button>
          </div>
          <p style={{ margin: "6px 4px 0", fontSize: "0.69rem", color: "var(--text-muted)", letterSpacing: "0.01em" }}>
            Shift+Enter for new line · Click any message to inspect tokenization
          </p>
        </form>
      </div>
    </div>
  );
}
