# KL-7-P2C — DESIGN FREEZE

# KNR Discovery Coordination (Lease · Single-Flight · Batch · Corroboration)

| Field | Value |
|-------|-------|
| **Document** | `docs/architecture/KL-7-P2C-DESIGN-FREEZE.md` |
| **Status** | **DESIGN FREEZE — ACCEPTED DESIGN (docs)** |
| **Epic** | KL-7 · Intelligent Estimator · KNR Discovery |
| **Slice** | **P2C** — orchestration only |
| **Baseline tip** | `34ab6735bda5a97b0e1b999a2388772320589784` |
| **Production baseline** | **2.66.111** / `34ab673` |
| **Depends on** | KL-7-P2A (evidence SSOT) · KL-7-P2B (HTTP foundation OFF) |
| **P2B Edge PV** | GREEN WITH GAPS |
| **HTTP / allowlist at freeze** | **OFF** / **EMPTY** |
| **IMPLEMENT** | **NOT AUTHORIZED** — requires separate `OWNER GO — KL-7-P2C IMPLEMENT` |
| **LIVE HTTP** | **NOT AUTHORIZED** — requires separate Owner GO |
| **P2D** | **OUT OF SCOPE** |

> **Normative language:** MUST / MUST NOT / SHOULD / MAY.  
> Owner Decisions **OD-P2C-1…12** below are **FINAL / ACCEPTED DESIGN** for this freeze.  
> This document does **not** authorize code, commit, push, deploy, allowlist population, or FEATURE ON.

---

## 1. Status / version / baseline

This Design Freeze locks the **coordination architecture** for KL-7-P2C on tip:

- HEAD / origin/main: `34ab6735bda5a97b0e1b999a2388772320589784`
- P2B foundation: `feat(ik): add knr discovery http foundation`
- HTTP: `KNR_DISCOVERY_HTTP_FEATURE_DEFAULT = false`
- Allowlist: `KNR_DISCOVERY_HTTP_ALLOWLIST = []` (and Edge empty copy)

P2C is **NOT IMPLEMENTED** at freeze time. Future IMPLEMENT MUST remain OFF-mode unless a later live-HTTP GO exists.

---

## 2. Scope

P2C MUST be **only** an orchestration layer over existing P2A/P2B:

```text
Host
  ↓
P2C orchestration (lease · SF · batch · concurrency · corroboration trigger)
  ↓
P2B planner / executor / ingest
  ↓
P2A evidence store / merge / indexes
```

P2C MUST:

- coordinate multi-source discovery jobs
- claim/reclaim/release leases
- apply client anti-storm single-flight
- bound batch and concurrency
- trigger corroboration via existing P2A clamp (no new status engine)
- ship and test in **OFF-mode** (fixtures / mocks / fake executor)

P2C MUST NOT become a second evidence store, second discovery-status system, or authority layer.

---

## 3. Non-goals

The following MUST remain **out of P2C**:

- live production corroboration / outbound HTTP
- allowlist population
- HTTP feature enablement (`FEATURE ON`)
- KL-6 verification / catalog authority writes
- pricing · PLN · OUR RATE · companyPrice
- Owner Map
- 12J / Work Catalog persistence / selective research SSOT
- P2D (telemetry / PROPOSED / advanced UX)
- DNS rebinding hardening beyond P2B v1
- dual client/Edge allowlist unification
- streaming 400k body-cap improvement
- Edge legal-gate parity with client
- residual P2A/P2B cleanup (auth UI smoke, fixture UX, etc.)
- changing single-GOVERNMENT → READY semantics

---

## 4. Architectural boundary

```text
DISCOVERY_REQUIRED (P2A lookup)
  → select allowlisted sourceIds (planning only; may be empty under OFF)
  → P2C: deterministic batch · claim lease per source · concurrency pool
  → P2B: plan → exec → ingest (MUST NOT be bypassed)
  → P2A: upsert/merge evidence · clampDiscoveryStatusForSources
  → P2C: release leases
```

**MUST NOT:**

- invent a parallel `kw-knr-discovery-evidence-*` store
- call raw `fetch` outside P2B exec
- write `kw-knr-catalog` or `kw-knr-evidence` (ATH)
- set `VERIFIED` / `PRICED` / PLN fields

**REUSE PATTERN ≠ REUSE SEMANTICS:** algorithmic shapes from MMR lease / WR cooldown / dossier inflight / discovery fork pool MAY inspire implementation; their **domains MUST NOT** become P2C SSOT.

---

## 5. P2A SSOT reuse

P2C MUST reuse without forking semantics:

| Asset | Role |
|-------|------|
| `kw-knr-discovery-evidence` | Evidence memory SSOT |
| store / merge / indexes | Persistence & cloud merge |
| `clampDiscoveryStatusForSources` | Corroboration / READY gating SSOT |
| `evidenceKeyV1` · `identityKeyV2` | Identity |
| source priority semantics | GOVERNMENT / OFFICIAL / … |
| Lookup chain | **CATALOG → EVIDENCE → DISCOVERY_REQUIRED** |

**Discovery status (P2A SSOT — MUST NOT invent duplicates):**

- `DISCOVERED`
- `CORROBORATED`
- `CONFLICT`
- `INCOMPLETE`
- `READY_FOR_OWNER_VERIFY`

Rules (normative):

- `READY_FOR_OWNER_VERIFY` ≠ `VERIFIED`
- Single source MUST NOT auto-grant `READY_FOR_OWNER_VERIFY`
- Minimum corroboration for multi-source progression: **≥ 2 independent `sourceId`**
- MUST NOT require 2× GOVERNMENT / OFFICIAL
- Family / content mismatch → **HARD CONFLICT**
- MUST NOT invent matches or rewrite **KNR ↔ KNR-W**

`CATALOG_HIT` MUST remain authoritative: P2C MUST NOT orchestrate discovery when catalog already hits.

---

## 6. P2B SSOT reuse

P2C MUST reuse and MUST NOT bypass:

- planner · executor · ingest
- `sourceId → URL` resolution
- feature gate · allowlist gate
- SSRF · HTTPS · redirect final-host re-check
- timeout · size DENY · PDF DENY
- HTTP accounting (`httpRequestCount` / `attemptedFetch`)
- evidence-only ingest sink

P2C MUST NOT:

- implement its own fetch stack
- duplicate security gates
- populate allowlist or flip `FEATURE_DEFAULT` as part of P2C

Under production defaults (`FEATURE OFF` · empty allowlist), orchestration MUST yield **HTTP = 0**.

---

## 7. Three-axis state model

Axes MUST remain separated. Mixing them is a Design Freeze violation.

### AXIS A — HTTP / Job lifecycle (P2B + P2C)

```text
IDLE → PLANNED → LEASED → FETCHING → SUCCEEDED / DISCOVERED
                                 ↘ FAILED | DENIED | EXPIRED
```

P2B deny outcomes (e.g. `FEATURE_OFF`, `ALLOWLIST_EMPTY`, `SSRF_DENIED`, …) remain valid terminal/error job outcomes and MUST NOT be written as discovery or verification statuses.

Optional orchestration step name `CORROBORATING` MAY appear on the **job** axis only; it MUST NOT invent a new P2A discovery status.

### AXIS B — Discovery status (P2A only)

`DISCOVERED` | `CORROBORATED` | `CONFLICT` | `INCOMPLETE` | `READY_FOR_OWNER_VERIFY`

### AXIS C — Verification (KL-6 only)

`VERIFIED` — P2C MUST NEVER set verification.

**Job lifecycle ≠ discovery status ≠ verification status.**

---

## 8. Lease architecture

### OD-P2C-1 / OD-P2C-2 / OD-P2C-3 / OD-P2C-8 / OD-P2C-9 (FINAL)

| Rule | Requirement |
|------|-------------|
| Location | **HYBRID** — Edge KV authoritative; client Map anti-storm only |
| Namespace | **`kw-knr-discovery-job:`** |
| Forbidden namespace | **`kw-price-research-job:`** (MMR) — MUST NOT share |
| Identity | **`evidenceKeyV1 + sourceId`** — MUST NOT use evidenceKey-only |
| TTL | default **90s** · min **1s** · max **1h** |
| Algorithm shape | MAY reuse pattern from `research-job-lease.ts` |
| Domain semantics | MUST NOT reuse MMR / Accept / PLN / OUR RATE |

**Reuse algorithmic pattern, not domain semantics.**

### Claim algorithm (normative)

1. **INSERT-first**
2. If record exists and **expired** → **AUTO RECLAIM**
3. If **same claimant** → **renew** (idempotent)
4. If **active other claimant** → **`held_by_other`** → **MUST NOT fetch**
5. On completion / failure path end → **release** (claimant only)

Owner force reclaim is **NOT** required in P2C.

Lease / job metadata MUST include at least:

- job identity (`evidenceKeyV1 + sourceId`)
- claimant id
- `leaseUntil`
- created / updated timestamps
- lease lifecycle status (e.g. ACTIVE / RELEASED)

Lease metadata MUST NOT be confused with `discoveryStatus` or verification fields.

---

## 9. Client single-flight

Client Map MUST provide only:

- anti-storm
- duplicate suppression
- short-lived cooldown
- UX coordination

Identity MUST be **`evidenceKeyV1 + sourceId`**.

Client Map MUST NOT be lease authority.  
Cross-tab correctness MUST rely on **Edge KV**.

Pattern inspiration MAY come from `work-rate-research-cooldown.ts` and/or `ik-entry-p2-ingest-latch.ts` / dossier inflight Sets — keys MUST remain KNR discovery identity, never `workId|unit`.

---

## 10. Batch orchestration

### OD-P2C-4 (FINAL)

- Maximum **5** `sourceId` per orchestration pass
- Ordering MUST be **deterministic**
- Per source: plan → claim → P2B plan/exec/ingest → release
- Partial failure of one source MUST NOT wipe other sources' evidence
- Retries MUST be idempotent and MUST NOT create duplicate authority

Batch is **not** a new authority layer.

---

## 11. Concurrency

### OD-P2C-5 (FINAL)

- Maximum **3** concurrent source fetches
- MUST use a network-pool pattern (shape MAY follow `tender-discovery-fork.ts`)
- MUST NOT use unlimited `Promise.all` over sources
- MUST NOT use Work Catalog selective research or MMR demand queue as SSOT

---

## 12. Corroboration

### OD-P2C-6 / OD-P2C-11 (FINAL)

After source fetches complete:

- P2C MUST NOT implement a new status engine
- P2C MUST reuse **`clampDiscoveryStatusForSources`**
- Minimum independent sources for multi-source corroboration path: **≥ 2 `sourceId`**
- MUST NOT require 2× GOVERNMENT/OFFICIAL
- Single GOVERNMENT MUST NOT auto-grant `READY_FOR_OWNER_VERIFY`
- Single source remains `DISCOVERED` / `INCOMPLETE` per existing P2A semantics

---

## 13. Conflict handling

### OD-P2C-7 (FINAL)

- **HARD CONFLICT** on family / content mismatch
- Status: `CONFLICT`
- MUST NOT invent reconciliation
- MUST NOT rewrite or convert **KNR ↔ KNR-W**

---

## 14. Stale lease recovery

### OD-P2C-8 (FINAL)

- **AUTO RECLAIM** after `leaseUntil`
- Same claimant → renew
- Other claimant while valid → `held_by_other` → zero fetch
- Owner force → **not in P2C**

---

## 15. Persistence

### OD-P2C-9 (FINAL)

| Store | Role |
|-------|------|
| Edge KV `kw-knr-discovery-job:` | Authoritative lease / job metadata |
| localStorage | MUST NOT be lease authority (cache/UX only if used) |
| `kw-knr-discovery-evidence` (P2A) | Evidence SSOT |

Job metadata ≠ `discoveryStatus` ≠ verification status.

---

## 16. Authority wall

P2C MUST NOT:

- write `kw-knr-catalog`
- write `kw-knr-evidence` (ATH)
- set `VERIFIED`
- set `PRICED` / PLN / `ourRate` / `companyPrice`
- modify Owner Map
- touch 12J / Work Catalog WIP
- bypass KL-6

**P2C success** means: orchestration + P2B execution + P2B ingest + P2A evidence merge — nothing more.

---

## 17. Security / HTTP OFF boundary

### OD-P2C-10 (FINAL) + security freeze

This Design Freeze **does not** authorize live HTTP.

| Gate | Freeze value |
|------|----------------|
| Feature | MUST remain **OFF** (`FEATURE_DEFAULT = false`) unless later live GO |
| Allowlist | MUST remain **EMPTY** unless later live GO |
| Outbound HTTP in P2C OFF-mode | MUST be **0** |
| Tests | fixtures / mocks / fake executor only |

**MUST NOT** (implied by this DF):

- populate allowlist
- enable feature
- outbound HTTP
- live corroboration
- production source fetching

**Separate future GO required** for live HTTP (name reserved):  
`OWNER GO — KL-7-P2C LIVE HTTP` (or equivalent).  
P2C IMPLEMENT (OFF-mode) MUST NOT be interpreted as live-HTTP authorization.

---

## 18. Host integration

Host thin wire (P2B side-channel) MUST remain lookup-oriented:

- CATALOG / EVIDENCE / DISCOVERY_REQUIRED observability
- `priced: false` · `verified: false`
- HTTP=0 under OFF defaults

P2C orchestration MAY later attach to `DISCOVERY_REQUIRED` paths, but MUST NOT:

- price lines
- verify catalog entries
- auto-start live fetch without live GO

UI surfacing of side-channel remains a residual (MAY), not a P2C authority requirement.

---

## 19. Error handling

| Condition | Required behavior |
|-----------|-------------------|
| Feature OFF / allowlist empty | Plan deny · HTTP=0 · no lease fetch path |
| `held_by_other` | No fetch |
| P2B deny (SSRF, PDF, size, …) | Job DENIED/FAILED · no authority write |
| Partial batch failure | Retain other sources' evidence · release failed source lease |
| Conflict | Persist/surface `CONFLICT` via P2A rules · no invent |

Failures MUST NOT invent verification or pricing semantics.

---

## 20. Idempotency

MUST:

- same claimant renew / continue without duplicate authority
- `held_by_other` → zero fetch
- expired → reclaim
- duplicate client requests → single-flight
- successful ingest → idempotent P2A merge
- failure end → release lease (claimant)

---

## 21. Test strategy

P2C tests MUST use **fixtures / mocks / fake executor only**.  
**ZERO outbound HTTP.**

Minimum coverage MUST include:

- lease acquire
- same claimant renew
- `held_by_other`
- expired reclaim
- release
- TTL validation (default / min / max bounds)
- client SF duplicate suppression
- batch max 5
- deterministic source ordering
- concurrency max 3
- partial failure isolation
- retry / idempotency
- corroboration ≥ 2
- single source no READY
- family conflict
- CATALOG precedence
- authority wall (no catalog / VERIFIED / PLN)
- HTTP=0 · feature OFF · allowlist EMPTY

Regression MUST remain green:

- P0 · P1 · P2A · P2B · Host KL-3

12J / pre-existing WIP MUST remain untouched by P2C work.

---

## 22. Regression / isolation

**Forbidden to stage or modify for P2C:**

- `src/lib/work-catalog/**`
- `work-rate-preserve.ts`
- `scripts/test-our-work-rate-persistence-12j.mjs`
- `knr-corpus-*`
- `knr-kl6-hydration.ts`
- `knr-pdf-match-*`
- `resolve-knr-knowledge-contract.ts`
- `knr-catalog-write-router.ts`
- `knr-verify-orchestrator.ts`
- `ik-knr-owner-mapping.ts`
- `changelog-data.ts` / `CHANGELOG.md` (unless separate RELEASE GO)
- any P2D scope

**MUST NEVER** use `git add -A` / `git add .` for P2C commits.

---

## 23. Acceptance criteria

Future OFF-mode IMPLEMENT is acceptable only if **all** hold:

- [ ] P2C works OFF-mode
- [ ] HTTP outbound = 0
- [ ] Allowlist EMPTY · feature OFF
- [ ] P2A store remains SSOT
- [ ] P2B planner/exec/ingest remains SSOT
- [ ] Job / discovery / verification axes remain separated
- [ ] Lease identity = `evidenceKeyV1 + sourceId`
- [ ] Edge KV authoritative under `kw-knr-discovery-job:`
- [ ] Client Map anti-storm only
- [ ] TTL 90s / 1s / 1h
- [ ] Batch max 5 · concurrency max 3
- [ ] Corroboration ≥ 2 · single GOVERNMENT does not auto READY
- [ ] Conflict = HARD CONFLICT
- [ ] Stale leases auto reclaim · `held_by_other` means no fetch
- [ ] No authority writes (catalog / ATH / VERIFIED / PLN / OUR RATE / companyPrice)
- [ ] No 12J changes · no P2D · no live HTTP

---

## 24. Owner Decisions OD-P2C-1…12 (FINAL / ACCEPTED DESIGN)

| ID | Decision |
|----|----------|
| **OD-P2C-1** | **HYBRID** lease · Edge KV authoritative · client Map anti-storm · ns **`kw-knr-discovery-job:`** · NEVER `kw-price-research-job:` |
| **OD-P2C-2** | TTL **default 90s** · **min 1s** · **max 1h** |
| **OD-P2C-3** | SF / lease identity = **`evidenceKeyV1 + sourceId`** (not evidenceKey-only) |
| **OD-P2C-4** | Batch **max 5** sourceId / pass · deterministic order |
| **OD-P2C-5** | Concurrency **max 3** · network pool · no unlimited parallelism |
| **OD-P2C-6** | Corroboration **≥ 2** independent sourceId · REUSE `clampDiscoveryStatusForSources` · no 2× GOV requirement |
| **OD-P2C-7** | **HARD CONFLICT** · no invent · no KNR↔KNR-W rewrite |
| **OD-P2C-8** | **AUTO RECLAIM** · same claimant renew · `held_by_other` → no fetch · no Owner force |
| **OD-P2C-9** | Job metadata in **Edge KV** · LS not lease authority · evidence stays P2A |
| **OD-P2C-10** | **OFF-mode ship YES** · fixtures/mocks/fake exec · zero outbound |
| **OD-P2C-11** | Single GOVERNMENT → READY = **NO** |
| **OD-P2C-12** | Client/Edge allowlist unification = **OUT OF SCOPE** |

No alternate variants after this freeze without a new Owner GO amending OD-P2C-*.

---

## 25. Explicit forbidden patterns

| Forbidden | Reason |
|-----------|--------|
| MMR demand queue / Accept / PLN / OUR RATE / pricing store as SSOT | Authority contamination |
| Sharing `kw-price-research-job:` | Domain collision |
| Work Catalog selective / `workId\|unit` identity | Wrong domain / 12J risk |
| Second discovery status enum | Breaks P2A SSOT |
| Own fetch bypassing P2B | Breaks security gates |
| Auto single-source READY | Breaks OD-P2C-11 / P2A clamp |
| Live HTTP implied by IMPLEMENT | Requires separate GO |
| `git add -A` / staging 12J WIP | Isolation breach |

---

## 26. Future separate GO gates

| Gate | Purpose |
|------|---------|
| `OWNER GO — KL-7-P2C IMPLEMENT` | OFF-mode code only |
| `OWNER GO — KL-7-P2C LIVE HTTP` | Feature / allowlist / outbound (explicit) |
| Future allowlist unify GO | OD-P2C-12 residual |
| P2D GO | Telemetry / PROPOSED — not P2C |
| KL-6 GO | Verification / catalog — not P2C |

This Design Freeze Doc GO **does not** authorize IMPLEMENT, LIVE HTTP, commit, push, or deploy.

---

## 27. Open residual gaps (non-blocking for this DF)

- P2A: auth UI smoke · fixture UX · Host UI side-channel presentation
- P2B: dual allowlist drift · SSRF v1 (no full DNS rebinding) · size DENY after `text()` · Edge legal-gate parity · CT normalization
- P2C code absent until IMPLEMENT GO

These MUST NOT be “fixed along the way” inside P2C without separate Owner scope.

---

## 28. Final Design Freeze declaration

**KL-7-P2C Design Freeze is ACCEPTED as the normative coordination contract** for:

- hybrid lease under `kw-knr-discovery-job:`
- SF identity `evidenceKeyV1 + sourceId`
- batch ≤ 5 · concurrency ≤ 3 · TTL 90s (1s–1h)
- corroboration via P2A clamp (≥ 2 sources; no single-GOV auto READY)
- HARD CONFLICT · auto reclaim · OFF-mode first
- strict authority wall · HTTP OFF until separate live GO

```text
DESIGN FREEZE = ACCEPTED (DOCUMENT)
IMPLEMENT = NOT AUTHORIZED
LIVE HTTP = NOT AUTHORIZED
P2D = OUT OF SCOPE
12J = OUT OF SCOPE
```

*End of KL-7-P2C Design Freeze.*
