# 07 — Known Risks (WGDOM)

> Źródła: Final Production Audit Sync Storm, AGENT-CONTINUITY, PROJECT-GUIDE Known Issues, open EPICs.

Legenda statusu: **FIXED** · **MITIGATED** · **BACKLOG** · **MONITOR** · **GATED**.

---

## CRITICAL

| ID | Opis | Objawy | Monitor | Status |
|----|------|--------|---------|--------|
| — | *Brak otwartego CRITICAL po Sync Storm P0 audit* | — | Edge 522, thrash builtAt | — |

---

## HIGH

| ID | Opis | Objawy | Monitor | Status |
|----|------|--------|---------|--------|
| **H-BOOT-CLOUD** | Bootstrap discovery/shell mid-flight bez local → fat cloud | Wiele fat `batch-set` przy open Dokumenty | Network pipe set/open | **FIXED** @ **2.65.40** (HARDENING-01A) — residual kill-switch OFF = legacy |
| **H-LEGACY-OPTS** | Legacy panel `onUpdate` gubi persist opts | Manual patch zawsze cloud / drop arity | Wrappers Detail/List | **FIXED** @ **2.65.40** (adapter `bindTenderPipelineOnUpdate`) — panel emit nadal default cloud (by design 01A) |
| **H-FP-CHURN** | `gateFingerprint` restart heavy; breaker per FP | Bounded re-parse przy rosnących docs | heavyRunAttempts / Network | **MITIGATED** / monitor (H3) · **EPIC B** |
| **H-FAT-PIPELINE** | `kw-tenders-pipeline` = monolityczny fat KV | Duże payloady, koszt egress/CPU | batch timing, 546/500 | **MONITOR** · chunk Edge **GATED** |
| **H-PAYROLL-REGRESS** | FEATURE miesza CORE sync/payroll | LP pusta / wipe / resurrection | Gate B payroll; dual-session | **MITIGATED** process (#CORE-013) — ryzyko ludzkie |
| **H-MIXED-WT** | Lokalne WIP (ARCH-02F, Edge chunk, TEUX) w tym samym branchu co CORE | Zły commit scope | `git status` przed commit | **MONITOR** |

---

## MEDIUM

| ID | Opis | Objawy | Monitor | Status |
|----|------|--------|---------|--------|
| **M-DEADLOCK-RETRY** | Retry ×4 przy 40P01 amplifikuje load | Powtórzone batch-set | Edge logs, status 500 body | **FIXED** N1 / **MONITOR** amplifier |
| **M-EDGE-546** | Sporadyczne 546 przy multi-open | 546 w Network | Smoke multi-tender | **MONITOR** |
| **M-AUTONOMOUS-BUILTAT** | Autonomous FP zawiera `builtAt` | Gate UI re-run | Autonomous Gate | **BACKLOG** niskopriorytetowy |
| **M-EGRESS** | Pełne batch-get focus | 402 historycznie | Billing egress | **MITIGATED** ops; delta-sync **BACKLOG** |
| **M-STALE-LS** | Stary LS przywraca klucze | Passwords / martwe URL | Hard refresh; merge cloud-wins | **MITIGATED** P15+ |
| **M-ADR-SYNC** | ADR Cloud Sync PROPOSED; Evidence Gate OPEN | Brak pełnej migracji sync | ADR doc | **GATED** |

---

## LOW

| ID | Opis | Objawy | Monitor | Status |
|----|------|--------|---------|--------|
| **L-FP-PARSER-DEP** | Fingerprint string ma parserVersion, useMemo deps nie | Stale FP | Code review | **BACKLOG** |
| **L-TEMP-DIAG** | Moduły TEMP w bundle | Hałas jeśli włączone | AUTO_ENABLE false | **MITIGATED** 2.65.39 |
| **L-CI-TEUX7D** | Gate B `GuideView` `\bAI\b` fail w TEST-INFRA | CI red na tipie | `test-tender-copy-teux7d.mjs` | **OPEN** follow-up · **nie** regresja HARDENING-01A |
| **L-TS5101** | baseUrl deprecated | tsc warning | tsc | **BACKLOG** tooling |
| **L-NO-ESLINT-FLAT** | Brak eslint.config | eslint CLI fail | — | **INFO** |
| **L-PLAYWRIGHT-SAFARI** | E2E ≠ iPhone | False confidence mobile | Real device | **MONITOR** |

---

## INFORMATIONAL

| ID | Opis | Status |
|----|------|--------|
| **I-STABILIZATION** | STABILIZATION WINDOW ACTIVE | Process |
| **I-HARDENING-01A** | Persist SSOT CLOSED @ 2.65.40 / 23d7723 | CLOSED |
| **I-HARDENING-01B-E** | EPIC B–E PLAN ready — tylko po Owner GO | OPEN |
| **I-02F-GO** | LOCALSTORAGE-ARCH-02F GO / NOT STARTED | **GATED** |
| **I-H0X** | Persist Ledger / H3-B/C harness | **GATED** |
| **I-TWSL-WIP** | Tender workspace layout lokalny | **RELEASE NOT READY** hist. |
| **I-STRICTMODE** | Brak StrictMode w main | INFO |
| **I-NO-NEXT** | Stack Vite/React — nie Next | INFO |

---

## Jak eskalować ryzyko

1. Objaw prod → klasyfikacja CRITICAL/HIGH.  
2. RCA read-only.  
3. Jeśli Sync Storm class → sprawdź `HEAVY_E_RUN_DEP_KEYS` + live thrash.  
4. Jeśli Payroll → dual-session + fence.  
5. Owner GO przed fix CORE.
