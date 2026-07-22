# MCQ Ventures — API Key Specification

> Governance document. Last updated: 2026-07-22  
> Maintained by: MCQ Ventures Engineering (robert.m@mcqventures.com)

---

## Purpose

This document defines the MCQ API key format, tier structure, and validation architecture. It serves two functions:

1. **Internal governance** — establishes the credential standard for all enterprise, professional, and internal operator keys issued by MCQ Ventures.
2. **GitHub Secret Scanning Partner Program enrollment** — the regex pattern below is the submission artifact for GitHub's partner program, enabling automated detection of any MCQ key inadvertently committed to a public repository anywhere on GitHub.

---

## Key Format

```
MCQ_{TIER}_{TIMESTAMP_B62}_{ENTROPY_B62}_{CRC32_HEX}
```

### Example
```
MCQ_ENT_4mZqR1_xK9pL2mNvQwRtYuJhGfDs_a3f1b2c4
```

### Component Breakdown

| Component | Example | Description |
|-----------|---------|-------------|
| `MCQ_` | `MCQ_` | Static prefix — GitHub regex anchor. Uniquely identifies MCQ Ventures as the issuing authority. |
| `{TIER}` | `ENT` | 3-char tier code. One of `ENT` (Enterprise), `PRO` (Professional), `OPS` (Internal Ops). Encodes access scope without a DB lookup. |
| `{TIMESTAMP_B62}` | `4mZqR1` | Base62-encoded Unix epoch seconds at issuance. Enables issuance audit trail and key age policies without storing metadata externally. |
| `{ENTROPY_B62}` | `xK9pL2mNvQwRtYuJhGfDs` | Base62-encoded 20 cryptographically random bytes (~119 bits of entropy). Resistant to enumeration and brute force. |
| `{CRC32_HEX}` | `a3f1b2c4` | 8-char hex checksum (SHA-256 truncated) over all preceding components. Enables fast malformation rejection before any database call. |

---

## Tier Definitions

| Tier | Code | Audience | Access Scope |
|------|------|----------|--------------|
| Enterprise | `ENT` | Fund managers, asset allocators, family offices | Full panel access, governance queue, ledger replay, investor dashboard |
| Professional | `PRO` | Fintech operators, analytics integrators | Panel data read, governance scoring API, no action queue |
| Internal Ops | `OPS` | MCQ Ventures internal agents, MCQVBot, CI/CD | Admin routes, seed scripts, system health, debug endpoints |

---

## GitHub Secret Scanning Partner Program

### Enrollment Regex

Submit the following pattern to GitHub at `secret-scanning@github.com` during partner program enrollment:

```regex
MCQ_(ENT|PRO|OPS)_[0-9A-Za-z]+_[0-9A-Za-z]{20,}_[0-9a-f]{8}
```

### Pattern Rationale

- **Prefix `MCQ_`** — uniquely namespaced; low false positive risk against open-source code.
- **Tier alternation `(ENT|PRO|OPS)`** — constrains the match to known valid tiers; malformed tier codes do not trigger alerts.
- **Timestamp `[0-9A-Za-z]+`** — base62 character class, variable length.
- **Entropy `[0-9A-Za-z]{20,}`** — minimum 20 chars ensures the pattern does not match short test strings or example values like `REPLACE_ME`.
- **Checksum `[0-9a-f]{8}`** — hex-constrained, exactly 8 chars. Eliminates most accidental collisions.

### Alert Service Requirements

When enrolled, MCQ must operate a publicly accessible HTTPS endpoint that:

1. Accepts `POST` requests from GitHub with `Content-Type: application/json`
2. Verifies the `Github-Public-Key-Signature` header using ECDSA-NIST-P256V1-SHA256 against GitHub's rotating public keys at `https://api.github.com/meta/public_keys/secret_scanning`
3. Revokes the identified key immediately (mark `revoked = true` in `api_keys` table)
4. Notifies the key owner via email or Telegram
5. Returns `HTTP 200` to acknowledge receipt

### Suggested Endpoint
```
POST /api/webhooks/github-secret-scan
```

---

## Storage Requirements

**Never store the raw key.** The `api_keys` table stores only:

```sql
CREATE TABLE api_keys (
  key_hash      TEXT        PRIMARY KEY,  -- SHA-256(raw_key)
  key_prefix    TEXT        NOT NULL,     -- e.g. MCQ_ENT — safe to display
  tier          TEXT        NOT NULL,     -- ENT | PRO | OPS
  customer_id   TEXT        NOT NULL,     -- FK to customers table
  label         TEXT,                     -- human-readable name
  revoked       BOOLEAN     NOT NULL DEFAULT FALSE,
  revoked_at    TIMESTAMPTZ,
  revoked_by    TEXT,                     -- 'user' | 'github-scanner' | 'admin'
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at  TIMESTAMPTZ
);
```

---

## Issuance Flow

```
1. Customer requests key via dashboard or API
2. generateApiKey(tier) → { raw, prefix, tier, issuedAt, checksum }
3. hashApiKey(raw) → key_hash
4. INSERT into api_keys (key_hash, key_prefix, tier, customer_id, ...)
5. Return raw key to customer ONCE — never retrievable again
6. Customer stores raw key in their own secrets manager
```

---

## Revocation Flow

```
Source: user request | admin action | github-scanner webhook
  ↓
UPDATE api_keys SET revoked = true, revoked_at = NOW(), revoked_by = '{source}'
WHERE key_hash = SHA256(raw_key)
  ↓
Notify customer (email + Telegram if configured)
  ↓
Log revocation event to event_ledger
```

---

*MCQ Ventures · Governance-first. Regulator-ready. Built to last.*
