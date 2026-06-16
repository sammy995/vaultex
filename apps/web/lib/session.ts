"use client";

const GATEWAY_URL =
  process.env.NEXT_PUBLIC_GATEWAY_URL || "http://localhost:8000";

const SESSION_KEY = "pii_gw_session_id";
const JWT_KEY = "pii_gw_jwt";
const ROLE_KEY = "pii_gw_role";
const USERNAME_KEY = "pii_gw_username";

export const ROLES = [
  { value: "junior_analyst", label: "Junior Analyst", color: "#475569" },
  { value: "senior_analyst", label: "Senior Analyst", color: "#8a5300" },
  { value: "vp_risk", label: "VP Risk", color: "#0b6a86" },
  { value: "admin", label: "Admin", color: "#0d5a40" },
] as const;

export type Role = (typeof ROLES)[number]["value"];

async function mintJWT(role: Role): Promise<string> {
  // Server-issued tokens — JWT_SECRET never touches the browser.
  const res = await fetch(`${GATEWAY_URL}/api/auth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role, subject: "ui-user" }),
  });
  if (!res.ok) {
    throw new Error(`Auth failed (${res.status}): ${await res.text()}`);
  }
  const data = await res.json();
  return data.token;
}

export function getSessionId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(SESSION_KEY);
}

export function setSessionId(id: string): void {
  localStorage.setItem(SESSION_KEY, id);
}

export function getJWT(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(JWT_KEY);
}

export function getRole(): Role {
  if (typeof window === "undefined") return "junior_analyst";
  return (localStorage.getItem(ROLE_KEY) as Role) || "junior_analyst";
}

export async function updateRole(role: Role): Promise<void> {
  const token = await mintJWT(role);
  localStorage.setItem(ROLE_KEY, role);
  localStorage.setItem(JWT_KEY, token);
}

export async function initSession(role: Role = "junior_analyst"): Promise<void> {
  const token = await mintJWT(role);
  localStorage.setItem(ROLE_KEY, role);
  localStorage.setItem(JWT_KEY, token);
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(JWT_KEY);
  localStorage.removeItem(ROLE_KEY);
  localStorage.removeItem(USERNAME_KEY);
}

export function getUsername(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(USERNAME_KEY);
}

export function setUsername(name: string): void {
  localStorage.setItem(USERNAME_KEY, name);
}

export { GATEWAY_URL };
