# WGDOM COLD START HANDOFF

> **★★ NAJWAŻNIEJSZY plik dla nowego ChatGPT / Cursor bez historii**  
> **STATUS:** **ACTIVE** · DOCUMENTATION ONLY  
> **Data:** 2026-09-05 (pointer sync · LINE-TOLERANT) · prior 2026-09-04 (OD-OCR-47) · prior 2026-08-26 / 2026-08-24 / 2026-08-18
> **Tip numeryczny SSOT:** [`09_PRODUCTION_BASELINE.md`](09_PRODUCTION_BASELINE.md) · live `https://www.wgdom.fun/version.json`
> **CURRENT LIVE / REPOSITORY TIP:** **2.66.165 / `a5d19047`** · see [`09_PRODUCTION_BASELINE.md`](09_PRODUCTION_BASELINE.md)
> **★★ IK CURRENT NODE:** **ŚRODA A0.2** · Master §10.0 · **LINE-TOLERANT CLOSED/PV** (§2A.9) · **GLOBAL IK PRODUCTION VERIFIED = NO**
> **S6/P4 FEATURE TIP:** **`2fce3caf`** · S6-A / S6-B / P4 **CLOSED** · P4 flag **ON** · **≠** cały IK E2E GREEN  
> **Phase 2E:** targeted discovery **LANDED** **`1a9c5484`** · **FULL PHASE 2E OPEN** · **OUT OF SCOPE A08** · **≠** Phase 2E CLOSED  
> **Live tip (czytaj 09):** CURRENT **2.66.165 / `a5d19047`** · HISTORY OD-OCR-47 **2.66.147/`2f3d1847`** · **≠** cały IK E2E GREEN
> **★★ IK / costing NO REBUILD:** [`../architecture/INTELLIGENT-ESTIMATOR-MASTER-SSOT.md`](../architecture/INTELLIGENT-ESTIMATOR-MASTER-SSOT.md) · [`../architecture/INTELLIGENT-ESTIMATOR-AI-CONTINUITY.md`](../architecture/INTELLIGENT-ESTIMATOR-AI-CONTINUITY.md) · [`../architecture/INTELLIGENT-ESTIMATOR-REUSE-MAP.md`](../architecture/INTELLIGENT-ESTIMATOR-REUSE-MAP.md)  
> **★★ IK sesja 2026-08-24:** [`../architecture/IK-MASTER-CONTINUITY-HANDOFF-2026-08-24.md`](../architecture/IK-MASTER-CONTINUITY-HANDOFF-2026-08-24.md) — F5 MARGIN **CLOSED GREEN** · A08-P0/P1/P2 **CLOSED** · AUTONOMY-08 epic **NOT CLOSED** · Phase 5 **NOT AUTHORIZED**  
> **Prior Autonomy 2026-08-18:** [`../architecture/IK-MASTER-CONTINUITY-HANDOFF-2026-08-18.md`](../architecture/IK-MASTER-CONTINUITY-HANDOFF-2026-08-18.md) — historyczny  
> **Tender pricing (F0–F6 + C-MODE-1a):** [`10_TENDER_PRICING_CONTINUITY.md`](10_TENDER_PRICING_CONTINUITY.md) — tip **zawsze z 09** (nie hardcoduj tutaj)  
> *(tabele historyczne poniżej mogą mieć stare numery — **tip = 09 + version.json**)*

```text
════════════════════════════════════════════════════════
WGDOM COLD START
NIE BUDUJ PRZETARGÓW / IK / CATALOG / PRICING OD NOWA.
SEARCH BEFORE CREATE.
════════════════════════════════════════════════════════
```

---

## CURRENT BASELINE

| | |
|--|--|
| **Version** | **czytaj 09 + version.json** (CURRENT live: **2.66.165 / `a5d19047`**) |
| **Commit** | **czytaj 09** · CURRENT **`a5d19047`** · OD-OCR-47 HISTORY **`2f3d1847`** · S6/P4 FEATURE **`2fce3caf`** · Phase 2E targeted **`1a9c5484`** (FULL 2E OPEN) |
| **URL** | https://www.wgdom.fun |
| **Branch** | `main` |
| **IK SSOT** | [`INTELLIGENT-ESTIMATOR-MASTER-SSOT.md`](../architecture/INTELLIGENT-ESTIMATOR-MASTER-SSOT.md) |
| **IK session (2026-08-24)** | [`IK-MASTER-CONTINUITY-HANDOFF-2026-08-24.md`](../architecture/IK-MASTER-CONTINUITY-HANDOFF-2026-08-24.md) |
| **Protected Core** | **GREEN** |
| **STABILIZATION WINDOW** | **ACTIVE** |

---

## CURRENT STATUS

| | |
|--|--|
| **TRYB** | **UTRZYMANIE** |
| **ACTIVE EPIC IMPLEMENT** | **NONE** bez Owner GO |
| **IK A01 F5 MARGIN** | **CLOSED / PRODUCTION VERIFIED GREEN** · **`82f3520e`** · no further `--execute` |
| **IK AUTONOMY-08** | epic **NOT CLOSED** · P0/P1/P2 **CLOSED** · **NIE** start A08-P3 |
| **Observability Phase 5** | **NOT AUTHORIZED** |
| **ACTIVE IMPLEMENT / RELEASE / COMMIT** | **NONE** |
| **WAITING** | **OWNER instruction** — **nie** reopen F5 MARGIN · **nie** A08-P3 · **nie** KNR auto-bridge |
| **Tip feature** | **F5 MARGIN CLOSED** · **`82f3520e`** · prior Observability Ph 1–4 **`c1b3ad7d`** · prior IK-KNR-WC · TM-01 EPIC CLOSED |

| Slice | Status |
|-------|--------|
| **Inteligentny Kosztorysant UX** | **CLOSED** · **`ae426ad6`** · branding + Expert Conversation · PV PASS |
| **P0 Dual-Enablement** | **CLOSED** · **`1902daa7`** · M=ACCESS · D=RUNTIME · PV PASS |
| **Enablement + Q12** | **CLOSED** · **`4ba06032`** |
| **S0** | **CLOSED** · `5beb082a` |
| **S1** | **CLOSED** · `eed3ba0e` |
| **S2** | **CLOSED** · `1888d05f` |
| **S3** | **CLOSED** · `ec8a5044` |
| **S4** | **CLOSED** · `85f4db14` |
| **S5** | **CLOSED** · `ebae3d2e` |
| **S6** | **CLOSED** · **`cb91027d`** |
| **S7** | **CLOSED** · **`617f0cb5`** |
| **S8** | **CLOSED** · **HOLD** · **`9231cc6b`** |
| **S9** | **CLOSED** · **C0** · **`df6c104a`** |
| **TM-01** | **EPIC CLOSED** |

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

**M = ACCESS** = `isTenderExpertEffective` / `adminCanViewTendersTab` (module) — **nie** runtime.  
**D = RUNTIME** = `expertAiDecydentEnabled` → Session/Decision · `isExpertAiRuntimeEffective()` thin alias.  
Dual Outcome / Offer PLN / stacks follow **D**, not raw **M**. F1 M=1 D=0 ⇒ Bid PRIMARY.

SSOT P0: [`../architecture/EXPERT-AI-P0-DUAL-ENABLEMENT-CLOSEOUT.md`](../architecture/EXPERT-AI-P0-DUAL-ENABLEMENT-CLOSEOUT.md) · architektura: [`../architecture/EXPERT-AI-ARCHITECTURE.md`](../architecture/EXPERT-AI-ARCHITECTURE.md).

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
| **Runtime D ON** + Offer | Offer |
| **Runtime D ON** + Offer null | **NO PRIMARY** |
| **Runtime D OFF** (np. F1 M=1 D=0) | Bid |

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
**S8 HOLD REMOVE** pozostaje w mocy — hard REMOVE tylko nowy Owner GO → AUDIT.

SSOT: [`../architecture/TENDER-LEGACY-DEPRECATION-MAP.md`](../architecture/TENDER-LEGACY-DEPRECATION-MAP.md).

---

## S0–S9

| Slice | Cel | Status |
|-------|-----|--------|
| S0 | Orphan cleanup | **CLOSED** |
| S1 | Module enablement | **CLOSED** |
| S2 | Dual Outcome / DW primary | **CLOSED** |
| S3 | Align Pricing | **CLOSED** |
| S4 | Hub UX ANALIZA→…→DECYZJA | **CLOSED** |
| **S5** | **Tab Decyzja → DW** | **CLOSED** |
| **S6** | **Persist / store bridge** | **CLOSED** |
| **S7** | **TRE Hub-first** | **CLOSED** |
| **S8** | **HOLD REMOVE** | **CLOSED** · ZERO code |
| **S9** | **EPIC CLOSE (C0 docs)** | **CLOSED** · ZERO code |

MASTER: [`../architecture/TENDER-MODERNIZATION-01-MASTER.md`](../architecture/TENDER-MODERNIZATION-01-MASTER.md).  
CLOSEOUT: [`../architecture/TENDER-MODERNIZATION-01-S9-CLOSEOUT.md`](../architecture/TENDER-MODERNIZATION-01-S9-CLOSEOUT.md).  
DF: [`../architecture/TENDER-MODERNIZATION-01-DESIGN-FREEZE.md`](../architecture/TENDER-MODERNIZATION-01-DESIGN-FREEZE.md).

---

## NEXT OWNER GO

```text
UTRZYMANIE
→ next engineering: Owner GO → A08-P3 DEEP AUDIT
→ osobno: TM-01 residual C1–C6 / NEXT-EPIC C4–C5 (≠ A08 blockers)
→ tylko Owner GO → start = AUDIT
→ NIE invent S10 / reopen TM-01 REMOVE
→ NIE claim Phase 2E CLOSED (targeted LANDED @ 1a9c5484 · FULL OPEN)
```

---

## WIP

| Item | Stan |
|------|------|
| **`src/app/hooks/useTenderOfferRun.ts`** | **LOCAL WIP / M** · **NIE** część tipu · **nie** stage bez osobnego Owner GO |

---

## DO NOT

- invent S10 / auto reopen TM-01 REMOVE
- hard REMOVE DecisionView / TRE / Offer Run / Bid / OfferBoq
- third PLN / third engine / third store
- WM-DRUK-OST-03 · XFA · cache filled PDF
- `git add -A` · stage local WIP `useTenderOfferRun.ts`
- global ON `tendersTabForStaffEnabled` bez GO

---

## START PATH

```text
1. TEN plik
2. MASTER-AI-HANDOFF.md
3. 09_PRODUCTION_BASELINE.md + version.json
4. TENDER-MODERNIZATION-01-MASTER.md · S9-CLOSEOUT
5. AI_ENTRY + PAYROLL_SAFETY_GATE (przed IMPLEMENT)
```

Pełny SSOT: [`MASTER-AI-HANDOFF.md`](MASTER-AI-HANDOFF.md).
