# IK-MIGRATION-01 — POST-P5.26 RECONCILIATION (I2)

> **Date:** 2026-08-16  
> **Owner GO:** TAK — TYLKO RECONCILIATION (I2)  
> **Mode:** READ-ONLY AUDIT  
> **HTTP = 0 · RESEARCH = 0 · CREATE = 0 · BIND = 0 · ACCEPT = 0 · WRITE = 0 · IMPLEMENT = 0 · EDGE DEPLOY = 0 · COMMIT = 0 · PUSH = 0**  
> **Working tree:** **PRESERVED / NOT MODIFIED**  
> **JSON:** `.tmp/ik-migration-01-post-p526-reconciliation.json`  
> **Decision I2:** P5.26 = production SSOT LOCKED · lokalne P5.27–P5.32 = UNCOMMITTED WORK (nie production-complete)

---

## AUTHORITATIVE PRODUCTION BASELINE

| Pole | Wartość |
|------|---------|
| **Stage** | **P5.26** |
| Status | **PRODUCTION_VERIFIED** · **LOCKED** |
| Commit | **`1d41f619`** |
| Branch | **`main`** |
| Push | **PASS** (`origin/main`) |
| ACCEPT | **9/9** |
| REVIEW | **9/9** untouched |
| CatalogWork | **471** |
| CREATE / USE_EXISTING / BIND / WRITE | 6 / 1 / 7 / 8 |

**Nie zmieniać P5.26.** Work Catalog + Accept = SSOT. Bez drugiego katalogu / pricing.

---

## STAGE MATRIX

| Stage | Docs | Code | Tests | Build | Commit | Push | PV | Status |
|-------|------|------|-------|-------|--------|------|-----|--------|
| **P5.26** | YES (41 tracked) | N/A* | claimed prior | claimed prior | **`1d41f619`** | **PASS** | **YES** | **PRODUCTION_VERIFIED** |
| **P5.27** | YES untracked | YES (WT allowlist + reuse gate) | YES untracked `p527` | claimed PASS | **0** | **0** | **NO** | **LOCAL_IMPLEMENTATION_UNCOMMITTED** |
| **P5.28** | YES untracked | NO (audit/triage only) | NO dedicated | N/A | **0** | **0** | **NO** | **DOC_ONLY** |
| **P5.29** | YES untracked | NO (CODE=0; `.tmp` runners) | NO prod suite | N/A | **0** | **0** | **NO** | **DOC_ONLY** |
| **P5.30** | YES untracked | NO (design only) | NO | N/A | **0** | **0** | **NO** | **DOC_ONLY** |
| **P5.31** | YES untracked | YES (WT allowlist keys flooring/repairs_*/joinery) | YES untracked `p531` | claimed PASS | **0** | **0** | **NO** | **LOCAL_IMPLEMENTATION_UNCOMMITTED** |
| **P5.32** | YES untracked | YES (WT Edge map + sync script) | YES untracked `p532` | claimed PASS | **0** | **0** | **NO**† | **LOCAL_IMPLEMENTATION_UNCOMMITTED** |
| **P5.33** | NO | NO | NO | NO | **0** | **0** | **NO** | **UNKNOWN** (nie istnieje) |

\* P5.26 closeout commit = docs; Accept rates w prod KV `kw-wgdom-work-catalog` — PV Accept read-back PASS.  
† P5.32 docs **claim** CLI `supabase functions deploy` (git push **0**). To **nie** jest PV przez `main`/`version.json`. Nie weryfikowano Edge w tym audycie (HTTP=0).

**„COMPLETE” w tytule dokumentu ≠ PRODUCTION_VERIFIED.**

---

## PER-STAGE FACTS (A–J)

### P5.26

| | |
|--|--|
| A Docs | YES — tracked @ `1d41f619` |
| B Code | Accept path reused (existing); closeout commit docs-only |
| C Tests | Prior closeout claimed PASS |
| D Build | Prior closeout claimed PASS |
| E Edge deploy | N/A (CatalogWork KV writes earlier) |
| F Commit | **YES** `1d41f619` |
| G Push | **YES** |
| H PV | **YES** (Accept 9/9 · Catalog 471) |
| I Tracked | **YES** |
| J Align HEAD | **YES** (HEAD = `1d41f619`) |

### P5.27

| | |
|--|--|
| A Docs | YES — 3× `??` architecture |
| B Code | YES — `work-rate-discovery-allowlist.ts` (P5.27-FIX reuse gate) vs HEAD |
| C Tests | YES — `scripts/test-ik-migration-01-p527-fix-existing-category-reuse.mjs` `??` |
| D Build | Docs claim PASS — **not re-run** this audit |
| E Edge | NO dedicated |
| F/G Commit/Push | **0 / 0** |
| H PV | **NO** |
| I Tracked | Docs/tests **untracked**; allowlist **modified** vs HEAD |
| J Align HEAD | **NO** — absent from `1d41f619` |

### P5.28

| | |
|--|--|
| A Docs | YES `??` triage |
| B–C Code/Tests | NO product code |
| D–H | Commit/Push/PV = 0; CODE=0 in header |
| Status | **DOC_ONLY** |

### P5.29

| | |
|--|--|
| A Docs | YES `??` batches + closeout |
| B Code | NO (CODE=0); `.tmp/p529-*` runners only |
| Note | HTTP=0 · all RESEARCH_GAP (routing blocked) |
| Status | **DOC_ONLY** |

### P5.30

| | |
|--|--|
| A Docs | YES `??` design |
| B Code | NO (design only) |
| Status | **DOC_ONLY** |

### P5.31

| | |
|--|--|
| A Docs | YES `??` |
| B Code | YES — WT allowlist adds `flooring` · `repairs_wall` · `repairs_opening` · `joinery_finish` (HEAD = 5 legacy keys only) |
| C Tests | YES `??` `test-ik-migration-01-p531-…` |
| D Build | Docs claim PASS |
| E Edge | Keys landed later via P5.32 local Edge mirror |
| F/G/H | Commit/Push/PV = **0** |
| Status | **LOCAL_IMPLEMENTATION_UNCOMMITTED** |

### P5.32

| | |
|--|--|
| A Docs | YES `??` (FIX · STOP · batches · continuous · G-RCA) |
| B Code | YES — WT `supabase/.../index.tsx` PASS2 map 5→9 keys; `??` `scripts/sync-work-rate-pass2-edge-from-ssot.mjs` |
| C Tests | YES `??` `test-ik-migration-01-p532-…` |
| D Build | Docs claim PASS |
| E Edge | Docs claim **CLI deploy** · git push **0** · **not** verified this audit |
| F/G/H | Commit/Push/git-PV = **0** |
| Status | **LOCAL_IMPLEMENTATION_UNCOMMITTED** |

### P5.33

| | |
|--|--|
| A–J | Brak artefaktów w repo / `.tmp` / docs |
| Status | **UNKNOWN** (nie rozpoczęty) |

---

## LOCAL CODE PRESENT (P5.27–P5.32 aggregate)

| Area | Present | Notes |
|------|---------|-------|
| `src/lib/work-catalog/work-rate-discovery-allowlist.ts` | **YES** | Modified vs HEAD (+P5.27-FIX + P5.31 keys) |
| `src/lib/work-catalog/index.ts` | **YES** | Modified exports |
| `src/lib/intelligent-estimator/internal-first-*` | **YES** | Untracked (P5.25/P5.26-E dependency stack) |
| `src/lib/intelligent-estimator/index.ts` | **YES** | Modified re-exports |
| `scripts/test-ik-migration-01-p527*` / `p531*` / `p532*` | **YES** | Untracked |
| `scripts/sync-work-rate-pass2-edge-from-ssot.mjs` | **YES** | Untracked |
| `supabase/functions/make-server-0afb8820/index.tsx` | **YES** | Modified PASS2 URLs |
| `.tmp/p527*` … `p532*` | YES | Local evidence only |

**LOCAL CODE PRESENT = YES**

---

## LOCAL UNCOMMITTED PROGRESS

| | |
|--|--|
| Furthest stage with local implementation | **P5.32** |
| Supporting DOC_ONLY chain | P5.28 → P5.29 → P5.30 |
| Code stages | **P5.27** + **P5.31** + **P5.32** (+ dependency internal-first / P5.26-E tests) |
| In git @ HEAD | **NONE** of P5.27–P5.32 |
| Do not re-run | Research/HTTP/Accept/CREATE for these stages |

### Claimed vs proven

| Claim (local docs) | Proven in this audit |
|--------------------|----------------------|
| Docs COMPLETE | Exists untracked |
| Tests PASS / build PASS | Claimed in docs; **not re-executed** here |
| Edge deployed (P5.32) | Claimed CLI deploy; **not** in `main`; **not** HTTP-verified |
| Production complete | **FALSE** — no commit/push/PV |

---

## NEXT FORMAL STAGE

**Nie** = auto P5.27 · **Nie** = auto P5.33 · **Nie** = re-run P5.27–P5.32 research.

| Pole | Wartość |
|------|---------|
| **CURRENT AUTHORITATIVE STAGE** | **P5.26** (`PRODUCTION_VERIFIED` @ `1d41f619`) |
| **CURRENT LOCAL PROGRESS** | **P5.32** (`LOCAL_IMPLEMENTATION_UNCOMMITTED`) |
| **NEXT FORMAL STAGE** | **`LOCAL_STACK_LANDING` (P5.27–P5.32)** |

### Proposed workflow (Owner GO required — not started)

```text
LOCAL WORK (preserve WT)
→ AUDIT (scoped file list: allowlist · Edge sync · tests · P5.27–P5.32 docs)
→ TEST (existing p527/p531/p532 + regress)
→ COMMIT (explicit paths only — never git add -A; exclude unrelated ~800)
→ PUSH main
→ PV (version.json / Edge parity as applicable)
```

### Blockers / risks (not ChatGPT escalation)

| Item | Severity |
|------|----------|
| Dirty tree ~800 unrelated paths | HIGH — scope discipline on future commit |
| Edge may already differ from git HEAD (claimed CLI deploy) | MED — reconcile Edge ↔ committed SSOT at landing |
| P5.32-G FIX_REQUIRED (query/telemetry/streak) | MED — **after** landing; not reason to re-open P5.26 |
| REVIEW-9 frozen | LOCK — out of scope |
| Master tip / `09` not updated for P5.26 | LOW — docs sync later |

**No new CHATGPT_ESCALATION** — stan jednoznaczny pod I2.

---

## MASTER SSOT CHECK

| Source | Alignment |
|--------|-----------|
| P5.26 @ `1d41f619` | **Authoritative** for Accept/Catalog |
| Local P5.27–P5.32 | WIP only until commit+push+PV |
| `INTELLIGENT-ESTIMATOR-MASTER-SSOT` | NEXT nadal Owner GO → AUDIT; tip historyczny ≠ P5.26 |
| AGENTS / docs/AI | UTRZYMANIE · no auto-NEXT |
| Work Catalog | Single SSOT — no duplicate catalog/pricing |

---

## FINAL

```text
PRODUCTION BASELINE: P5.26 @ 1d41f619
LOCAL PROGRESS:      P5.27+P5.31+P5.32 code · P5.28–P5.30 docs · through P5.32
NEXT FORMAL STAGE:   LOCAL_STACK_LANDING (P5.27–P5.32) — not re-run, not P5.33
WORKING TREE:        PRESERVED / NOT MODIFIED
EXECUTION:           0
```

**STOP.**
