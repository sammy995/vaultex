"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, Eye, EyeOff, ArrowRight } from "lucide-react";
import { loginUser } from "@/lib/api";
import { setUsername } from "@/lib/session";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [focusEmail, setFocusEmail] = useState(false);
  const [focusPass, setFocusPass] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password) { setError("Email and password are required."); return; }
    setLoading(true);
    try {
      const user = await loginUser(email.trim(), password);
      // Store auth
      localStorage.setItem("pii_gw_jwt", user.token);
      localStorage.setItem("pii_gw_role", user.role);
      setUsername(user.username);
      router.push("/setup");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      // Parse the gateway error body
      const match = msg.match(/Login failed: (.*)/s);
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
          top: "20%",
          left: "50%",
          transform: "translateX(-50%)",
          width: "600px",
          height: "400px",
          background: "radial-gradient(ellipse, rgba(13,90,64,0.08) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* Logo */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          marginBottom: "40px",
          cursor: "pointer",
        }}
        onClick={() => router.push("/")}
      >
        <div
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "9px",
            background: "linear-gradient(135deg,#0d5a40,#0a4631)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Shield size={18} color="var(--paper)" />
        </div>
        <span style={{ fontWeight: 700, fontSize: "1.05rem", letterSpacing: "-0.01em" }}>PII Gateway</span>
      </div>

      {/* Card */}
      <div
        style={{
          width: "100%",
          maxWidth: "440px",
          background: "rgba(23,21,15,0.03)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(23,21,15,0.08)",
          borderRadius: "20px",
          padding: "40px",
        }}
      >
        <h1
          style={{
            fontSize: "1.6rem",
            fontWeight: 800,
            letterSpacing: "-0.02em",
            color: "var(--text-primary)",
            marginBottom: "8px",
          }}
        >
          Welcome back
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: "0.88rem", marginBottom: "32px" }}>
          Sign in to your PII Gateway account.
        </p>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>
              Email address
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onFocus={() => setFocusEmail(true)}
              onBlur={() => setFocusEmail(false)}
              placeholder="you@company.com"
              autoComplete="email"
              style={{
                width: "100%",
                background: "rgba(23,21,15,0.04)",
                border: `1px solid ${focusEmail ? "var(--color-primary)" : "rgba(23,21,15,0.08)"}`,
                borderRadius: "10px",
                padding: "12px 16px",
                color: "var(--text-primary)",
                fontSize: "0.9rem",
                outline: "none",
                boxSizing: "border-box",
                transition: "border-color 150ms",
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>
              Password
            </label>
            <div style={{ position: "relative" }}>
              <input
                type={showPass ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                onFocus={() => setFocusPass(true)}
                onBlur={() => setFocusPass(false)}
                placeholder="••••••••"
                autoComplete="current-password"
                style={{
                  width: "100%",
                  background: "rgba(23,21,15,0.04)",
                  border: `1px solid ${focusPass ? "var(--color-primary)" : "rgba(23,21,15,0.08)"}`,
                  borderRadius: "10px",
                  padding: "12px 44px 12px 16px",
                  color: "var(--text-primary)",
                  fontSize: "0.9rem",
                  outline: "none",
                  boxSizing: "border-box",
                  transition: "border-color 150ms",
                }}
              />
              <button
                type="button"
                onClick={() => setShowPass(s => !s)}
                style={{
                  position: "absolute",
                  right: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-muted)",
                  padding: "4px",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <div
              style={{
                background: "rgba(255,68,68,0.08)",
                border: "1px solid rgba(255,68,68,0.25)",
                borderRadius: "10px",
                padding: "12px 16px",
                fontSize: "0.82rem",
                color: "var(--color-danger)",
                lineHeight: 1.5,
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            style={{
              marginTop: "8px",
              padding: "13px",
              fontSize: "0.92rem",
              borderRadius: "10px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Signing in…" : <>Sign In <ArrowRight size={16} /></>}
          </button>
        </form>

        <p style={{ textAlign: "center", marginTop: "24px", fontSize: "0.84rem", color: "var(--text-muted)" }}>
          No account?{" "}
          <span
            onClick={() => router.push("/register")}
            style={{ color: "var(--color-primary)", cursor: "pointer", fontWeight: 600 }}
          >
            Create one free
          </span>
        </p>
      </div>
    </div>
  );
}
