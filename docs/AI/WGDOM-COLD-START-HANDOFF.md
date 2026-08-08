# WGDOM COLD START HANDOFF

> **★★ NAJWAŻNIEJSZY plik dla nowego ChatGPT / Cursor bez historii**  
> **STATUS:** **ACTIVE** · DOCUMENTATION ONLY  
> **Data:** 2026-08-08  
> **Tip numeryczny SSOT:** [`09_PRODUCTION_BASELINE.md`](09_PRODUCTION_BASELINE.md) · live `https://www.wgdom.fun/version.json`

```text
════════════════════════════════════════════════════════
WGDOM COLD START
════════════════════════════════════════════════════════
```

---

## CURRENT BASELINE

| | |
|--|--|
| **Version** | **2.66.22** |
| **Commit** | **`cb91027d`** (`cb91027dde1658184a8e290d24ba3d266b5cbfa4`) |
| **URL** | https://www.wgdom.fun |
| **Branch** | `main` |
| **PV** | **PRODUCTION VERIFIED · GREEN** |
| **Protected Core** | **GREEN** |
| **STABILIZATION WINDOW** | **ACTIVE** |

---

## CURRENT STATUS

| | |
|--|--|
| **TRYB** | **UTRZYMANIE** |
| **ACTIVE EPIC** | **NONE** |
| **ACTIVE IMPLEMENT / RELEASE / COMMIT** | **NONE** |
| **WAITING** | **NEXT OWNER GO** |
| **Tip feature** | **TENDER-MODERNIZATION-01 / S6 CLOSED** |

| Slice | Status |
|-------|--------|
| **S0** | **CLOSED** · `5beb082a` |
| **S1** | **CLOSED** · `eed3ba0e` |
| **S2** | **CLOSED** · `1888d05f` |
| **S3** | **CLOSED** · `ec8a5044` |
| **S4** | **CLOSED** · `85f4db14` |
| **S5** | **CLOSED** · `ebae3d2e` |
| **S6** | **CLOSED** · **`cb91027d`** |
| **S7–S8** | **OPEN** |

---

## PROJECT GOAL

Główny cel modułu **PRZETARGI**: jeden spójny **inteligentny kosztorysant / Expert AI**.

**Nie** budujemy kolejnych niezależnych analiz.  
**Nie** tworzymy równoległych silników PLN.  
**Nie** mieszamy legacy jako PRIMARY bez Dual Outcome.

Legacy tylko ścieżką:

```text
PARITY → MIGRATION → DEPRECATION → CONSUMER AUDIT → REMOVE
```

---

## ARCHITECTURE

App: React/Vite · UI `src/app/` · Przetargi `TendersModule` · Sync `cloud-sync.ts` · Edge `make-server-0afb8820`.

**Expert-effective** = dostęp do Przetargi (`tendersTabForStaffEnabled` / `adminCanViewTendersTab`) — **bez** osobnej flagi Expert AI.

Szczegóły: [`../architecture/EXPERT-AI-ARCHITECTURE.md`](../architecture/EXPERT-AI-ARCHITECTURE.md).

---

## EXPERT PIPELINE

```text
OfferBoq
  → Execution Expert
  → Material Expert
  → Pricing Expert
  → Cost Expert
  → Offer Expert
  → Chief
  → Session
  → Dossier
  → Expert Workspace   (EE · ME · PE · Cost · Offer — RO)
  → Validation
  → Recommendation
  → Decision Workspace
  → Decision Persist
```

`dossier.experts.*` = snapshoty EE/ME/PE/Cost/Offer (passthrough do Expert Workspace).

---

## PRICING SSOT

| Pole | Rola |
|------|------|
| `OfferBoq.directPln` | **COST** |
| `Offer.offerPricePln` | **EXPERT OFFER PRIMARY** |
| `Bid.recommendedBidPln` | **LEGACY BID** |

| Stan | PRIMARY |
|------|---------|
| Expert ON + Offer | Offer |
| Expert ON + Offer null | **NO PRIMARY** |
| Expert OFF | Bid |

**NO THIRD PLN.**

Parity tip: MATCH **1** · EXPECTED_DELTA **12** · UNEXPECTED_DELTA **0** · NOT COVERED **0**.

SSOT: [`../architecture/TENDER-PRICING-SSOT.md`](../architecture/TENDER-PRICING-SSOT.md).

---

## DECISION SSOT

| | |
|--|--|
| Expert ON | **Decision Workspace PRIMARY** |
| Legacy GO/HOLD/NO-GO | compatibility / demote |
| Persist | append-only `kw-decision-persist-v1` |
| Cloud Persist | **NIE** P0 |
| Bridge → `kw-tender-decisions` | **S6 CLOSED** · tip |
| Approve→GO map | **S6 CLOSED** (Host Persist-first) |

SSOT: [`../architecture/DECISION-ARCHITECTURE.md`](../architecture/DECISION-ARCHITECTURE.md).

---

## LEGACY MAP

Żywe systemy **nie** są REMOVE. Bid / TRE / DecisionView / `kw-tender-decisions` / Strategy = KEEP lub MIGRATE według slice.

SSOT: [`../architecture/TENDER-LEGACY-DEPRECATION-MAP.md`](../architecture/TENDER-LEGACY-DEPRECATION-MAP.md).

---

## S0–S8

| Slice | Cel | Status |
|-------|-----|--------|
| S0 | Orphan cleanup | **CLOSED** |
| S1 | Module enablement | **CLOSED** |
| S2 | Dual Outcome / DW primary | **CLOSED** |
| S3 | Align Pricing | **CLOSED** |
| S4 | Hub UX ANALIZA→…→DECYZJA | **CLOSED** |
| **S5** | **Tab Decyzja → DW** | **CLOSED** |
| **S6** | **Persist / store bridge** | **CLOSED** |
| **S7** | **TRE-01 deprecation** | **NEXT** |
| S8 | Hard REMOVE / Bid retirement | OPEN |

MASTER: [`../architecture/TENDER-MODERNIZATION-01-MASTER.md`](../architecture/TENDER-MODERNIZATION-01-MASTER.md).  
DF: [`../architecture/TENDER-MODERNIZATION-01-DESIGN-FREEZE.md`](../architecture/TENDER-MODERNIZATION-01-DESIGN-FREEZE.md).

---

## NEXT OWNER GO

```text
TENDER-MODERNIZATION-01 / S7
→ Persist / store bridge
→ tylko Owner GO
→ start = AUDIT (nie PLAN / DF / IMPLEMENT bez GO)
```

---

## WIP

| Item | Stan |
|------|------|
| **`src/app/hooks/useTenderOfferRun.ts`** | **LOCAL WIP / M** · **NIE** część S5 · **nie** stage bez osobnego Owner GO |
| Bid Time-Load Guard | lokalny WIP · nie tip |

---

## 8 LOCK

**NO TOUCH** bez jawnego scope Owner:

1. Expert BC  
2. Chief  
3. Session  
4. Validation  
5. Adapters  
6. Technology / TF  
7. OfferBoq / Bid domain calc  
8. Domain calculation  

---

## DO NOT TOUCH

- OST-03 · XFA · cache filled PDF · `vercel deploy` · `git add -A`  
- Payroll CORE / merge bez Gate G1–G9  
- Auto-start S7–S8 · S3-D · Bid retirement · global ON `tendersTabForStaffEnabled`  
- Third PLN · hard REMOVE przed S8  
- Cloud Persist / Audit Hub bez AUDIT + Owner GO  
- `useTenderOfferRun.ts` bez osobnego Owner GO  

---

## WORKFLOW

```text
AUDIT → PLAN → DESIGN FREEZE → OWNER GO → IMPLEMENT
  → OWNER VERIFY → COMMIT → PUSH → PRODUCTION VERIFY → CLOSEOUT
```

Commit/push **tylko** na jawne polecenie Ownera.  
Stabilization: **nie** auto-start EPIC.

---

## FILES TO READ FIRST

```text
1. docs/AI/WGDOM-COLD-START-HANDOFF.md     ← JESTEŚ TUTAJ
2. docs/AI/MASTER-AI-HANDOFF.md
3. docs/AI/MASTER_HANDOFF.md              (thin pointer)
4. docs/AI/AI_QUICK_START.md
5. docs/AI/09_PRODUCTION_BASELINE.md + version.json
6. docs/architecture/TENDER-MODERNIZATION-01-MASTER.md
7. docs/architecture/TENDER-MODERNIZATION-01-DESIGN-FREEZE.md
8. docs/architecture/EXPERT-AI-ARCHITECTURE.md
9. docs/architecture/TENDER-PRICING-SSOT.md
10. docs/architecture/DECISION-ARCHITECTURE.md
11. docs/architecture/TENDER-LEGACY-DEPRECATION-MAP.md
12. docs/AI/AI_ENTRY.md + PAYROLL_SAFETY_GATE.md (przed kodem)
```

**Zakaz cold-start:** zaczynać IMPLEMENT od samego `CURRENT-TASK.md`.

---

## NEXT ACTION

**S7 — WAITING FOR OWNER GO** (TRE-01 deprecation · AUDIT first)
