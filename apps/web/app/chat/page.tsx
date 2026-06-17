"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Shield, LogOut, Users, RotateCcw, Settings } from "lucide-react";
import { getSessionId, getJWT, getRole, updateRole, ROLES, type Role } from "@/lib/session";
import { sendChat, type ChatResponse, type ChatMeta } from "@/lib/api";
import TokenizationPanel from "@/components/TokenizationPanel";
import ActivityLog from "@/components/ActivityLog";
import ChatInterface from "@/components/ChatInterface";
import HowItWorks from "@/components/HowItWorks";
import SettingsPanel from "@/components/SettingsPanel";
import CsvUpload, { type CsvData, csvToSystemPrompt } from "@/components/CsvUpload";

export interface MessageTurn {
  id: string;
  userContent: string;
  assistantContent: string;
  meta: ChatMeta;
  timestamp: number;
}

export interface LogEntry {
  id: string;
  timestamp: number;
  type: "pii_detected" | "masked" | "sent" | "received" | "detokenized" | "error";
  message: string;
}

export interface RoleEvent {
  id: string;
  timestamp: number;
  role: Role;
  label: string;
  color: string;
}

export default function ChatPage() {
  const router = useRouter();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [jwt, setJwt] = useState<string | null>(null);
  const [role, setRole] = useState<Role>("junior_analyst");
  const [csvData, setCsvData] = useState<CsvData | null>(null);
  const [turns, setTurns] = useState<MessageTurn[]>([]);
  const [roleEvents, setRoleEvents] = useState<RoleEvent[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [selectedTurnId, setSelectedTurnId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);

  useEffect(() => {
    const sid = getSessionId();
    const token = getJWT();
    const r = getRole();
    if (!sid || !token) {
      router.replace("/setup");
      return;
    }
    setSessionId(sid);
    setJwt(token);
    setRole(r);
  }, []);

  function addLog(type: LogEntry["type"], message: string) {
    setLogs((prev) => [
      ...prev,
      { id: crypto.randomUUID(), timestamp: Date.now(), type, message },
    ]);
  }

  function handleNewChat() {
    setTurns([]);
    setLogs([]);
    setRoleEvents([]);
    setCsvData(null);
    setSelectedTurnId(null);
    setError("");
    addLog("sent", "New chat started — session preserved, conversation cleared.");
  }

  async function handleRoleChange(newRole: Role) {
    const prevRole = role;
    setRole(newRole);
    try {
      // Login-gated mode: re-minting a role token only succeeds if the gateway
      // allows it for this account. Privileged roles (vp_risk/admin) and the
      // disabled direct-token endpoint will reject — degrade gracefully.
      await updateRole(newRole);
      setJwt(getJWT());
      const roleInfo = ROLES.find((r) => r.value === newRole)!;
      setRoleEvents((prev) => [
        ...prev,
        { id: crypto.randomUUID(), timestamp: Date.now(), role: newRole, label: roleInfo.label, color: roleInfo.color },
      ]);
      addLog("detokenized", `Persona switched → ${newRole}. Re-send a message to see updated de-masking.`);
    } catch {
      setRole(prevRole);
      addLog("sent", `Can't switch to ${newRole} — sign in as a user with that role. You're acting as ${prevRole}.`);
    }
  }

  async function handleSend(message: string) {
    if (!sessionId || !jwt || loading) return;
    setLoading(true);
    setError("");

    addLog("sent", `User: "${message.slice(0, 80)}${message.length > 80 ? "..." : ""}"`);

    const historyMessages = turns.flatMap((t) => [
      { role: "user", content: t.userContent },
      { role: "assistant", content: t.assistantContent },
    ]);

    // Build message array — inject CSV as system context when data is loaded
    const systemMessages: { role: string; content: string }[] = csvData
      ? [{ role: "system", content: csvToSystemPrompt(csvData) }]
      : [];

    if (csvData) {
      addLog("sent", `Dataset context injected: ${csvData.fileName} (${csvData.rows.length} rows)`);
    }

    try {
      const response: ChatResponse = await sendChat(sessionId, jwt, [
        ...systemMessages,
        ...historyMessages,
        { role: "user", content: message },
      ]);

      const meta = response._meta;

      // Log entities found
      if (meta.entities_found.length > 0) {
        meta.entities_found.forEach((e) => {
          addLog("pii_detected", `Detected ${e.entity_type} → masked as ${e.token}`);
        });
        addLog("masked", `${meta.entities_found.length} entities tokenized before LLM call`);
      } else {
        addLog("sent", "No PII detected — prompt sent as-is");
      }

      addLog("received", `LLM responded (${response.choices[0].message.content.length} chars)`);

      if (meta.entities_allowed.length > 0) {
        addLog("detokenized", `De-tokenized for role "${meta.role}": ${meta.entities_allowed.join(", ")}`);
      }

      const turn: MessageTurn = {
        id: response.id,
        userContent: message,
        assistantContent: response.choices[0].message.content,
        meta,
        timestamp: Date.now(),
      };

      setTurns((prev) => [...prev, turn]);
      setSelectedTurnId(turn.id);
    } catch (e: unknown) {
      const msg = String(e);
      setError(msg);
      addLog("error", msg);
    } finally {
      setLoading(false);
    }
  }

  const selectedTurn = turns.find((t) => t.id === selectedTurnId) ?? null;
  const currentRole = ROLES.find((r) => r.value === role);

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "var(--bg-base)",
        overflow: "hidden",
      }}
    >
      {/* Background glow */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          background:
            "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(13,90,64,0.05) 0%, transparent 60%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* Top navbar */}
      <header
        style={{
          height: "52px",
          borderBottom: "1px solid var(--border-subtle)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 20px",
          flexShrink: 0,
          position: "relative",
          zIndex: 10,
          background: "rgba(250,247,239,0.85)",
          backdropFilter: "blur(12px)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: "28px", height: "28px", borderRadius: "8px", background: "linear-gradient(135deg, #0d5a40, #0055cc)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 12px rgba(13,90,64,0.35)" }}>
            <Shield size={14} color="var(--paper)" />
          </div>
          <span style={{ fontWeight: 800, fontSize: "0.92rem", color: "var(--ink)", letterSpacing: "-0.02em" }}>
            PII Gateway
          </span>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              fontSize: "0.67rem",
              color: "var(--color-safe)",
              background: "var(--color-safe-dim)",
              border: "1px solid var(--border-safe)",
              borderRadius: "100px",
              padding: "2px 10px 2px 7px",
              fontWeight: 700,
              letterSpacing: "0.04em",
            }}
          >
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--color-safe)", boxShadow: "0 0 6px var(--color-safe)", display: "inline-block", animation: "pulse-soft 2s ease-in-out infinite" }} />
            LIVE
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button
            className="btn-ghost"
            onClick={() => router.push("/tokenize")}
            style={{ padding: "6px 12px", fontSize: "0.82rem", display: "flex", alignItems: "center", gap: "6px", color: "#0d5a40", borderColor: "rgba(13,90,64,0.25)" }}
            title="Standalone PII tokenizer — no LLM needed"
          >
            PII Tokenizer
          </button>
          <button
            className="btn-ghost"
            onClick={() => setGuideOpen(true)}
            style={{ padding: "6px 12px", fontSize: "0.82rem", display: "flex", alignItems: "center", gap: "6px" }}
            title="How it works"
          >
            ? Guide
          </button>
          <button
            className="btn-ghost"
            onClick={() => setSettingsOpen(true)}
            style={{ padding: "6px 12px", fontSize: "0.82rem", display: "flex", alignItems: "center", gap: "6px" }}
            title="Settings"
          >
            <Settings size={14} /> Settings
          </button>
          <button
            className="btn-ghost"
            onClick={handleNewChat}
            style={{ padding: "6px 12px", fontSize: "0.82rem", display: "flex", alignItems: "center", gap: "6px" }}
            title="Clear conversation and start fresh (session stays active)"
          >
            <RotateCcw size={13} /> New Chat
          </button>
          {role === "admin" && (
            <button
              className="btn-ghost"
              onClick={() => router.push("/admin")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "0.8rem",
                padding: "6px 12px",
                color: "var(--color-warn)",
                borderColor: "rgba(138,106,34,0.3)",
              }}
            >
              Admin Console
            </button>
          )}
          <button
            className="btn-ghost"
            onClick={() => {
              if (turns.length > 0 && !window.confirm("Leave setup? Your current conversation will be cleared.")) return;
              router.push("/setup");
            }}
            style={{ padding: "6px 12px", fontSize: "0.82rem", display: "flex", alignItems: "center", gap: "6px" }}
          >
            <LogOut size={14} /> Reconfigure
          </button>
        </div>
      </header>

      {/* ── Persona bar ──────────────────────────────────────────────────────── */}
      <div
        data-tour="persona-bar"
        style={{
          borderBottom: "1px solid var(--border-subtle)",
          background: "rgba(250,247,239,0.7)",
          backdropFilter: "blur(8px)",
          padding: "6px 20px",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          flexShrink: 0,
          zIndex: 9,
          position: "relative",
        }}
      >
        <Users size={13} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
        <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", flexShrink: 0 }}>
          Persona
        </span>
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {ROLES.map((r) => {
            const active = role === r.value;
            return (
              <button
                key={r.value}
                onClick={() => handleRoleChange(r.value)}
                style={{
                  padding: "5px 16px",
                  borderRadius: "100px",
                  border: `1px solid ${active ? r.color + "88" : "rgba(23,21,15,0.08)"}`,
                  background: active ? `${r.color}15` : "rgba(23,21,15,0.03)",
                  color: active ? r.color : "var(--text-muted)",
                  fontSize: "0.76rem",
                  fontWeight: active ? 700 : 400,
                  cursor: "pointer",
                  transition: "all 160ms ease",
                  lineHeight: 1.5,
                  boxShadow: active ? `0 0 18px ${r.color}33, inset 0 0 14px ${r.color}0d` : "none",
                  letterSpacing: active ? "-0.01em" : "0",
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    (e.currentTarget as HTMLElement).style.borderColor = `${r.color}66`;
                    (e.currentTarget as HTMLElement).style.color = r.color;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    (e.currentTarget as HTMLElement).style.borderColor = "rgba(23,21,15,0.1)";
                    (e.currentTarget as HTMLElement).style.color = "var(--text-muted)";
                  }
                }}
              >
                {r.label}
              </button>
            );
          })}
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>
            Viewing as:
          </span>
          <span style={{ fontSize: "0.76rem", fontWeight: 700, color: currentRole?.color }}>
            {currentRole?.label}
          </span>
        </div>
      </div>

      {/* Main layout */}
      <div
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "1fr 380px",
          gridTemplateRows: "1fr 160px",
          gap: 0,
          overflow: "hidden",
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* Chat column — top left */}
        <div
          data-tour="chat-column"
          style={{
            borderRight: "1px solid var(--border-subtle)",
            borderBottom: "1px solid var(--border-subtle)",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* CSV upload strip */}
          <div data-tour="csv-strip">
            <CsvUpload data={csvData} onDataLoaded={setCsvData} />
          </div>
          <ChatInterface
            turns={turns}
            roleEvents={roleEvents}
            loading={loading}
            error={error}
            onSend={handleSend}
            onSelectTurn={setSelectedTurnId}
            selectedTurnId={selectedTurnId}
            csvLoaded={csvData !== null}
          />
        </div>

        {/* Tokenization panel — right column spanning both rows */}
        <div
          data-tour="token-panel"
          style={{
            gridRow: "1 / 3",
            borderLeft: "1px solid var(--border-subtle)",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <TokenizationPanel turn={selectedTurn} role={role} />
        </div>

        {/* Activity log — bottom left */}
        <div
          data-tour="activity-log"
          style={{
            borderTop: "1px solid var(--border-subtle)",
            overflow: "hidden",
          }}
        >
          <ActivityLog logs={logs} />
        </div>
      </div>
      <HowItWorks open={guideOpen} onClose={() => setGuideOpen(false)} />
      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
