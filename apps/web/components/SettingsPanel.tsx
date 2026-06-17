"use client";

import { useEffect, useState } from "react";
import { X, Palette, Monitor, Zap } from "lucide-react";

interface Theme {
  name: string;
  primary: string;
  safe: string;
  warn: string;
  danger: string;
  bg: string;
}

const THEMES: Theme[] = [
  { name: "Cyan (Default)", primary: "#0d5a40", safe: "#0d5a40", warn: "#6f5519", danger: "#b3261e", bg: "#000000" },
  { name: "Purple Neon", primary: "#a855f7", safe: "#0d5a40", warn: "#6f5519", danger: "#b3261e", bg: "#000000" },
  { name: "Emerald", primary: "#10b981", safe: "#0d5a40", warn: "#6f5519", danger: "#b3261e", bg: "#000000" },
  { name: "Rose Gold", primary: "#f43f5e", safe: "#0d5a40", warn: "#6f5519", danger: "#ff6b35", bg: "#000000" },
  { name: "Amber", primary: "#f59e0b", safe: "#0d5a40", warn: "#0d5a40", danger: "#b3261e", bg: "#000000" },
];

const THEME_KEY = "pii_gw_theme";

function applyTheme(t: Theme) {
  const r = document.documentElement;
  r.style.setProperty("--color-primary", t.primary);
  r.style.setProperty("--color-safe", t.safe);
  r.style.setProperty("--color-warn", t.warn);
  r.style.setProperty("--color-danger", t.danger);
  r.style.setProperty("--bg-base", t.bg);
  r.style.setProperty("--color-primary-dim", t.primary + "22");
  r.style.setProperty("--color-primary-glow", t.primary + "44");
}

export function initTheme() {
  if (typeof window === "undefined") return;
  const saved = localStorage.getItem(THEME_KEY);
  if (saved) {
    try { applyTheme(JSON.parse(saved) as Theme); } catch (_) {}
  }
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function SettingsPanel({ open, onClose }: Props) {
  const [activeTheme, setActiveTheme] = useState<string>("Cyan (Default)");
  const [animationsEnabled, setAnimationsEnabled] = useState(true);
  const [compactMode, setCompactMode] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved) {
      try { setActiveTheme((JSON.parse(saved) as Theme).name); } catch (_) {}
    }
    if (localStorage.getItem("pii_gw_animations") === "0") setAnimationsEnabled(false);
    if (localStorage.getItem("pii_gw_compact") === "1") setCompactMode(true);
  }, []);

  function selectTheme(t: Theme) {
    setActiveTheme(t.name);
    applyTheme(t);
    localStorage.setItem(THEME_KEY, JSON.stringify(t));
  }

  function toggleAnimations(val: boolean) {
    setAnimationsEnabled(val);
    localStorage.setItem("pii_gw_animations", val ? "1" : "0");
    if (!val) document.documentElement.classList.add("no-animations");
    else document.documentElement.classList.remove("no-animations");
  }

  function toggleCompact(val: boolean) {
    setCompactMode(val);
    localStorage.setItem("pii_gw_compact", val ? "1" : "0");
    if (val) document.documentElement.classList.add("compact-mode");
    else document.documentElement.classList.remove("compact-mode");
  }

  if (!open) return null;

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 500, display: "flex", alignItems: "flex-start", justifyContent: "flex-end" }}
      onClick={onClose}
    >
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }} />

      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: "relative",
          width: "340px",
          height: "100vh",
          background: "rgba(6,10,22,0.98)",
          borderLeft: "1px solid rgba(23,21,15,0.08)",
          display: "flex",
          flexDirection: "column",
          animation: "fade-in-up 180ms ease forwards",
          boxShadow: "-24px 0 60px rgba(0,0,0,0.7)",
        }}
      >
        {/* Header */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(23,21,15,0.07)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Palette size={16} color="var(--color-primary)" />
            <span style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--text-primary)" }}>Settings</span>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex", padding: "4px" }}>
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>

          {/* Theme section */}
          <div style={{ marginBottom: "28px" }}>
            <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)", letterSpacing: "0.08em", marginBottom: "12px" }}>ACCENT COLOR</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {THEMES.map(t => {
                const isActive = activeTheme === t.name;
                return (

                  <button
                    key={t.name}
                    onClick={() => selectTheme(t)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      padding: "10px 14px",
                      borderRadius: "10px",
                      background: isActive ? t.primary + "12" : "rgba(23,21,15,0.025)",
                      border: "1px solid " + (isActive ? t.primary + "55" : "rgba(23,21,15,0.07)"),
                      cursor: "pointer",
                      transition: "all 160ms ease",
                      textAlign: "left",
                      width: "100%",
                    }}
                  >
                    {/* Color swatch */}
                    <div style={{ width: "22px", height: "22px", borderRadius: "50%", background: "linear-gradient(135deg, " + t.primary + ", " + t.primary + "88)", boxShadow: isActive ? "0 0 10px " + t.primary + "66" : "none", flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "0.82rem", fontWeight: isActive ? 700 : 400, color: isActive ? t.primary : "var(--text-secondary)" }}>{t.name}</div>
                      <div style={{ display: "flex", gap: "5px", marginTop: "4px" }}>
                        {[t.primary, t.safe, t.warn, t.danger].map((clr, i) => (
                          <div key={i} style={{ width: "8px", height: "4px", borderRadius: "2px", background: clr, opacity: 0.8 }} />
                        ))}
                      </div>
                    </div>
                    {isActive && (
                      <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: t.primary, boxShadow: "0 0 8px " + t.primary, flexShrink: 0 }} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Display settings */}
          <div style={{ marginBottom: "28px" }}>
            <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)", letterSpacing: "0.08em", marginBottom: "12px" }}>DISPLAY</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {[
                { icon: <Zap size={14} />, label: "Animations", desc: "Fade-in, pulse, typing dots", value: animationsEnabled, onChange: toggleAnimations },
                { icon: <Monitor size={14} />, label: "Compact Mode", desc: "Tighter spacing in panels", value: compactMode, onChange: toggleCompact },
              ].map(({ icon, label, desc, value, onChange }) => (
                <div
                  key={label}
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", borderRadius: "10px", background: "rgba(23,21,15,0.025)", border: "1px solid rgba(23,21,15,0.06)" }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ color: "var(--color-primary)" }}>{icon}</span>
                    <div>
                      <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-primary)" }}>{label}</div>
                      <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{desc}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => onChange(!value)}
                    style={{ width: "38px", height: "22px", borderRadius: "100px", background: value ? "var(--color-primary)" : "rgba(23,21,15,0.12)", border: "none", cursor: "pointer", position: "relative", transition: "background 200ms ease", flexShrink: 0 }}
                  >
                    <span style={{ position: "absolute", top: "3px", left: value ? "19px" : "3px", width: "16px", height: "16px", borderRadius: "50%", background: "#fff", transition: "left 180ms ease", boxShadow: "0 1px 4px rgba(0,0,0,0.4)" }} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Reset */}
          <div>
            <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)", letterSpacing: "0.08em", marginBottom: "12px" }}>RESET</div>
            <button
              className="btn-ghost"
              onClick={() => {
                localStorage.removeItem(THEME_KEY);
                localStorage.removeItem("pii_gw_animations");
                localStorage.removeItem("pii_gw_compact");
                localStorage.removeItem("pii_gw_guide_seen");
                selectTheme(THEMES[0]);
                setAnimationsEnabled(true);
                setCompactMode(false);
                document.documentElement.classList.remove("no-animations", "compact-mode");
              }}
              style={{ width: "100%", padding: "9px", fontSize: "0.82rem", justifyContent: "center" }}
            >
              Reset All Settings
            </button>
            <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "8px", lineHeight: 1.5, textAlign: "center" }}>
              Also resets the product guide so it shows again on next load.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: "14px 20px", borderTop: "1px solid rgba(23,21,15,0.06)", flexShrink: 0 }}>
          <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", lineHeight: 1.5, margin: 0 }}>
            Theme changes apply <span style={{ color: "var(--color-primary)" }}>instantly</span> across all pages via CSS variables.
          </p>
        </div>
      </div>
    </div>
  );
}
