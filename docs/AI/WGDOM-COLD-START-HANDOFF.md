# WGDOM COLD START HANDOFF

> **★★ NAJWAŻNIEJSZY plik dla nowego ChatGPT / Cursor bez historii**  
> **STATUS:** **ACTIVE** · DOCUMENTATION ONLY  
> **Data:** 2026-08-09  
> **Tip numeryczny SSOT:** [`09_PRODUCTION_BASELINE.md`](09_PRODUCTION_BASELINE.md) · live `https://www.wgdom.fun/version.json`  
> **Tender pricing (F0–F6 + C-MODE-1a):** [`10_TENDER_PRICING_CONTINUITY.md`](10_TENDER_PRICING_CONTINUITY.md) — tip **zawsze z 09** (nie hardcoduj tutaj)  
> **Data:** 2026-08-09 · *(tabela CURRENT BASELINE poniżej może być historyczna — **tip = 09**)*

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
| **Commit** | **`ae426ad6`** (Inteligentny Kosztorysant UX) · prior P0 **`1902daa7`** · prior Q12 **`4ba06032`** · prior S9 docs **`df6c104a`** · feature hist. **`617f0cb5`** |
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
| **Tip feature** | **INTELIGENTNY-KOSZTORYSANT-UX CLOSED** · **`ae426ad6`** · prior P0 Dual-Enablement **`1902daa7`** · prior Enablement/Q12 **`4ba06032`** · TM-01 EPIC CLOSED |

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
→ residual C1–C6 / new epic
→ tylko Owner GO
→ start = AUDIT
→ NIE invent S10 / reopen TM-01 REMOVE
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
