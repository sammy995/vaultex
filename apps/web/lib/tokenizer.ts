// Client-side deterministic PII tokenizer
// Pure functions — vault state is managed by the calling React component.
// Nothing is sent to any server; all detection runs in the browser.

export type EntityType =
  | "PERSON"
  | "SSN"
  | "EMAIL_ADDRESS"
  | "PHONE_NUMBER"
  | "CREDIT_CARD"
  | "ACCOUNT_NUMBER"
  | "LOAN_ID"
  | "DATE_TIME";

export interface TokenEntity {
  entityType: EntityType;
  original: string;
  token: string;
  start: number;
  end: number;
}

export interface TokenizeResult {
  original: string;
  tokenized: string;
  entities: TokenEntity[];
}

// Immutable vault state — safe to store in React useState
export interface VaultState {
  tokenToOrig: Record<string, string>;  // {{TOKEN}} → original value
  keyToToken: Record<string, string>;   // "TYPE:lower_original" → {{TOKEN}}
  counters: Partial<Record<EntityType, number>>;
}

export function createVault(): VaultState {
  return { tokenToOrig: {}, keyToToken: {}, counters: {} };
}

// Token display prefix for each entity type
const TOKEN_PREFIX: Record<EntityType, string> = {
  PERSON:         "PERSON",
  SSN:            "SSN",
  EMAIL_ADDRESS:  "EMAIL",
  PHONE_NUMBER:   "PHONE",
  CREDIT_CARD:    "CARD",
  ACCOUNT_NUMBER: "ACCT",
  LOAN_ID:        "LOAN",
  DATE_TIME:      "DATE",
};

// Darker, AA-compliant (>=4.5:1 on the light "paper" palette) jewel tones —
// still hue-distinct so each entity type reads as a different category.
export const ENTITY_COLOR: Record<EntityType, string> = {
  PERSON:         "#0b6a86", // teal
  SSN:            "#b3261e", // red
  EMAIL_ADDRESS:  "#8a5300", // amber
  PHONE_NUMBER:   "#0d5a40", // vault green
  CREDIT_CARD:    "#b01b4b", // rose
  ACCOUNT_NUMBER: "#6b21a8", // violet
  LOAN_ID:        "#1d4ed8", // blue
  DATE_TIME:      "#475569", // slate
};

// Ordered by specificity — more structured patterns matched first.
// PERSON is last to avoid swallowing other tokens.
const PATTERNS: Array<{ type: EntityType; regex: RegExp }> = [
  { type: "SSN",            regex: /\b\d{3}-\d{2}-\d{4}\b/g },
  { type: "CREDIT_CARD",    regex: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g },
  { type: "EMAIL_ADDRESS",  regex: /\b[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}\b/g },
  { type: "LOAN_ID",        regex: /\bLOAN-[\w-]+\b/gi },
  { type: "ACCOUNT_NUMBER", regex: /\bACC-\d+\b/gi },
  // Matches US-formatted (###-###-####), international (+1-...), and bare 10-digit (9876543210)
  { type: "PHONE_NUMBER",   regex: /(?:\b(?:\+1[-.\.\s]?)?\(?\d{3}\)?[-.\.\s]\d{3}[-.\.\s]\d{4}\b|\b\d{10}\b)/g },
  { type: "DATE_TIME",      regex: /\b(?:\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}-\d{2}-\d{2})\b/g },
  // Requires 2+ consecutive Title Case words, each 3+ chars
  { type: "PERSON",         regex: /\b([A-Z][a-z]{2,15}(?:\s+[A-Z][a-z]{2,15}){1,3})\b/g },
];

// Title-case phrases that are NOT names — filtered before PERSON tokens are assigned
const NON_NAMES = new Set([
  "social security", "credit score", "risk profile", "account number",
  "loan amount", "loan type", "interest rate", "annual percentage",
  "united states", "new york", "los angeles", "san francisco",
  "north america", "south america", "middle east",
  "past due", "days past", "monthly payment", "pay per",
  "federal reserve", "internal revenue", "department of",
  "state of", "city of", "county of", "bank of",
  "wells fargo", "goldman sachs", "morgan stanley",
  "bank america", "chase bank", "citibank",
  "dear sir", "dear madam", "to whom", "best regards", "kind regards",
  "high risk", "low risk", "medium risk", "risk flag", "risk score",
  "net worth", "gross income", "take home",
  "the following", "the above", "per month",
]);

// Assign or retrieve a deterministic token for a given type + original value.
// Returns [token, updatedVault].
function assignToken(
  type: EntityType,
  original: string,
  vault: VaultState
): [string, VaultState] {
  const key = `${type}:${original.toLowerCase()}`;
  if (vault.keyToToken[key]) return [vault.keyToToken[key], vault];

  const count = (vault.counters[type] ?? 0) + 1;
  const token = `{{${TOKEN_PREFIX[type]}_${count}}}`;

  return [
    token,
    {
      tokenToOrig: { ...vault.tokenToOrig, [token]: original },
      keyToToken:  { ...vault.keyToToken, [key]: token },
      counters:    { ...vault.counters, [type]: count },
    },
  ];
}

/**
 * Tokenize PII in `text` using the provided `vault`.
 * Returns the tokenized string, a list of detected entities, and the updated vault.
 * The same original value will always produce the same token within a vault.
 */
export function tokenize(
  text: string,
  vault: VaultState
): { result: TokenizeResult; vault: VaultState } {
  const claimed = new Set<number>();
  const rawMatches: Array<{ type: EntityType; original: string; start: number; end: number }> = [];

  for (const { type, regex } of PATTERNS) {
    regex.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(text)) !== null) {
      const start = m.index;
      const end   = start + m[0].length;

      // Skip if any position already claimed by a higher-priority match
      let overlaps = false;
      for (let i = start; i < end; i++) {
        if (claimed.has(i)) { overlaps = true; break; }
      }
      if (overlaps) continue;

      const original = m[0];

      if (type === "PERSON") {
        const lower = original.toLowerCase();
        // Skip known non-name title-case phrases
        if (
          NON_NAMES.has(lower) ||
          [...NON_NAMES].some((n) => lower.startsWith(n))
        ) continue;
        // Require at least 2 words (already enforced by regex but double-check)
        if (original.trim().split(/\s+/).length < 2) continue;
      }

      for (let i = start; i < end; i++) claimed.add(i);
      rawMatches.push({ type, original, start, end });
    }
  }

  rawMatches.sort((a, b) => a.start - b.start);

  const entities: TokenEntity[] = [];
  let tokenized = "";
  let cursor = 0;
  let currentVault = vault;

  for (const m of rawMatches) {
    tokenized += text.slice(cursor, m.start);
    const [token, updatedVault] = assignToken(m.type, m.original, currentVault);
    currentVault = updatedVault;
    entities.push({ entityType: m.type, original: m.original, token, start: m.start, end: m.end });
    tokenized += token;
    cursor = m.end;
  }
  tokenized += text.slice(cursor);

  return {
    result: { original: text, tokenized, entities },
    vault: currentVault,
  };
}

/**
 * Reverse-substitute tokens in `tokenized` using the vault.
 * Only replaces tokens that exist in the vault (i.e. were produced by this session).
 */
export function detokenize(tokenized: string, vault: VaultState): string {
  let result = tokenized;
  for (const [token, original] of Object.entries(vault.tokenToOrig)) {
    result = result.split(token).join(original);
  }
  return result;
}
