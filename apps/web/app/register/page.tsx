"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, Eye, EyeOff, ArrowRight } from "lucide-react";
import { registerUser } from "@/lib/api";
import { setUsername } from "@/lib/session";

const ROLE_OPTIONS = [
  { value: "junior_analyst", label: "Junior Analyst", color: "#475569", desc: "No PII access. Sees tokens only." },
  { value: "senior_analyst", label: "Senior Analyst", color: "#6f5519", desc: "Sees PERSON & CURRENCY entities." },
  { value: "vp_risk", label: "VP Risk", color: "#0d5a40", desc: "Full PII access across all types." },
  { value: "admin", label: "Admin", color: "#0d5a40", desc: "Full PII + audit console access." },
] as const;

type RoleValue = (typeof ROLE_OPTIONS)[number]["value"];

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsernameState] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [role, setRole] = useState<RoleValue>("junior_analyst");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [focus, setFocus] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!username.trim()) { setError("Username is required."); return; }
    if (username.trim().length < 2) { setError("Username must be at least 2 characters."); return; }
    if (!email.trim()) { setError("Email is required."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    setLoading(true);
    try {
      const user = await registerUser(username.trim(), email.trim(), password, role);
      localStorage.setItem("pii_gw_jwt", user.token);
      localStorage.setItem("pii_gw_role", user.role);
      setUsername(user.username);
      router.push("/setup");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const match = msg.match(/Registration failed: (.*)/s);
      const body = match ? match[1] : msg;
      try {
        const parsed = JSON.parse(body);
        setError(parsed.detail || body);
      } catch {
        setError(body);
      }
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = (field: string) => ({
    width: "100%",
    background: "rgba(23,21,15,0.04)",
    border: `1px solid ${focus === field ? "var(--color-primary)" : "rgba(23,21,15,0.08)"}`,
    borderRadius: "10px",
    padding: "12px 16px",
    color: "var(--text-primary)",
    fontSize: "0.9rem",
    outline: "none",
    boxSizing: "border-box" as const,
    transition: "border-color 150ms",
  });

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg-base)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* background glow */}
      <div
        style={{
          position: "absolute",
          top: "15%",
          left: "50%",
          transform: "translateX(-50%)",
          width: "700px",
          height: "450px",
          background: "radial-gradient(ellipse, rgba(13,90,64,0.06) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* Logo */}
      <div
        style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "36px", cursor: "pointer" }}
        onClick={() => router.push("/")}
      >
        <div style={{ width: "36px", height: "36px", borderRadius: "9px", background: "linear-gradient(135deg,#0d5a40,#0a4631)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Shield size={18} color="var(--paper)" />
        </div>
        <span style={{ fontWeight: 700, fontSize: "1.05rem", letterSpacing: "-0.01em" }}>PII Gateway</span>
      </div>

      {/* Card */}
      <div
        style={{
          width: "100%",
          maxWidth: "480px",
          background: "rgba(23,21,15,0.03)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(23,21,15,0.08)",
          borderRadius: "20px",
          padding: "40px",
        }}
      >
        <h1 style={{ fontSize: "1.6rem", fontWeight: 800, letterSpacing: "-0.02em", color: "var(--text-primary)", marginBottom: "8px" }}>
          Create your account
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: "0.88rem", marginBottom: "32px" }}>
          Start protecting your AI workflows in minutes.
        </p>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Username */}
          <div>
            <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>Username</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsernameState(e.target.value)}
              onFocus={() => setFocus("username")}
              onBlur={() => setFocus(null)}
              placeholder="johndoe"
              autoComplete="username"
              style={inputStyle("username")}
            />
          </div>

          {/* Email */}
          <div>
            <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>Email address</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onFocus={() => setFocus("email")}
              onBlur={() => setFocus(null)}
              placeholder="you@company.com"
              autoComplete="email"
              style={inputStyle("email")}
            />
          </div>

          {/* Password */}
          <div>
            <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>Password</label>
            <div style={{ position: "relative" }}>
              <input
                type={showPass ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                onFocus={() => setFocus("password")}
                onBlur={() => setFocus(null)}
                placeholder="Min 8 characters"
                autoComplete="new-password"
                style={{ ...inputStyle("password"), padding: "12px 44px 12px 16px" }}
              />
              <button
                type="button"
                onClick={() => setShowPass(s => !s)}
                style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: "4px", display: "flex", alignItems: "center" }}
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Role picker */}
          <div>
            <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "10px" }}>
              Access Role
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              {ROLE_OPTIONS.map(opt => {
                const selected = role === opt.value;
                return (
                  <div
                    key={opt.value}
                    onClick={() => setRole(opt.value)}
                    style={{
                      background: selected ? `${opt.color}12` : "rgba(23,21,15,0.025)",
                      border: `1px solid ${selected ? opt.color + "55" : "rgba(23,21,15,0.07)"}`,
                      borderRadius: "10px",
                      padding: "12px",
                      cursor: "pointer",
                      transition: "all 150ms",
                      boxShadow: selected ? `0 0 14px ${opt.color}20` : "none",
                    }}
                  >
                    <div style={{ fontSize: "0.8rem", fontWeight: 700, color: selected ? opt.color : "var(--text-secondary)", marginBottom: "4px" }}>{opt.label}</div>
                    <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", lineHeight: 1.4 }}>{opt.desc}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {error && (
            <div style={{ background: "rgba(255,68,68,0.08)", border: "1px solid rgba(255,68,68,0.25)", borderRadius: "10px", padding: "12px 16px", fontSize: "0.82rem", color: "var(--color-danger)", lineHeight: 1.5 }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            style={{ marginTop: "8px", padding: "13px", fontSize: "0.92rem", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", opacity: loading ? 0.7 : 1 }}
          >
            {loading ? "Creating account…" : <>Create Account <ArrowRight size={16} /></>}
          </button>
        </form>

        <p style={{ textAlign: "center", marginTop: "24px", fontSize: "0.84rem", color: "var(--text-muted)" }}>
          Already have an account?{" "}
          <span
            onClick={() => router.push("/login")}
            style={{ color: "var(--color-primary)", cursor: "pointer", fontWeight: 600 }}
          >
            Sign in
          </span>
        </p>
      </div>
    </div>
  );
}
