"use client";

import { useRef, useEffect } from "react";
import { Activity } from "lucide-react";
import type { LogEntry } from "@/app/chat/page";

const TYPE_STYLES: Record<
  LogEntry["type"],
  { color: string; bg: string; label: string }
> = {
  pii_detected: {
    color: "var(--color-danger)",
    bg: "var(--color-danger-dim)",
    label: "DETECT",
  },
  masked: {
    color: "var(--color-safe)",
    bg: "var(--color-safe-dim)",
    label: "MASK",
  },
  sent: {
    color: "var(--color-primary)",
    bg: "var(--color-primary-dim)",
    label: "SEND",
  },
  received: {
    color: "var(--color-warn)",
    bg: "rgba(138,106,34,0.08)",
    label: "RECV",
  },
  detokenized: {
    color: "var(--color-safe)",
    bg: "var(--color-safe-dim)",
    label: "DETOK",
  },
  error: {
    color: "var(--color-danger)",
    bg: "var(--color-danger-dim)",
    label: "ERROR",
  },
};

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

interface Props {
  logs: LogEntry[];
}

export default function ActivityLog({ logs }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "rgba(0,0,0,0.5)",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "7px 16px",
          borderBottom: "1px solid var(--border-subtle)",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          flexShrink: 0,
          background: "rgba(0,0,0,0.3)",
        }}
      >
        <Activity size={11} style={{ color: "var(--color-safe)" }} />
        <span
          style={{
            fontSize: "0.68rem",
            fontWeight: 700,
            color: "var(--text-muted)",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          Activity Log
        </span>
        {logs.length > 0 && (
          <span
            style={{
              fontSize: "0.63rem",
              color: "var(--color-safe)",
              background: "var(--color-safe-dim)",
              border: "1px solid rgba(13,90,64,0.2)",
              borderRadius: "100px",
              padding: "1px 7px",
              fontWeight: 700,
              marginLeft: "auto",
              fontFamily: "var(--font-mono)",
            }}
          >
            {logs.length}
          </span>
        )}
      </div>

      {/* Log entries */}
      <div style={{ flex: 1, overflowY: "auto", padding: "4px 0" }}>
        {logs.length === 0 && (
          <p
            style={{
              color: "var(--text-muted)",
              fontSize: "0.72rem",
              margin: "14px 16px",
              fontFamily: "var(--font-mono)",
              opacity: 0.6,
            }}
          >
            › waiting for activity...
          </p>
        )}
        {logs.map((log) => {
          const style = TYPE_STYLES[log.type];
          return (
            <div
              key={log.id}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "8px",
                padding: "4px 16px 4px 13px",
                fontFamily: "var(--font-mono)",
                fontSize: "0.74rem",
                lineHeight: 1.45,
                borderLeft: `2px solid ${style.color}55`,
                marginLeft: "2px",
                transition: "background 140ms ease",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = `${style.bg}`; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            >
              <span
                style={{
                  color: "var(--text-muted)",
                  flexShrink: 0,
                  fontSize: "0.7rem",
                  paddingTop: "1px",
                }}
              >
                {formatTime(log.timestamp)}
              </span>
              <span
                style={{
                  color: style.color,
                  background: style.bg,
                  borderRadius: "3px",
                  padding: "0 5px",
                  fontSize: "0.65rem",
                  fontWeight: 700,
                  letterSpacing: "0.04em",
                  flexShrink: 0,
                  paddingTop: "1px",
                }}
              >
                {style.label}
              </span>
              <span style={{ color: "var(--text-secondary)", flex: 1, wordBreak: "break-word" }}>
                {log.message}
              </span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
