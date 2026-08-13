# OWNER-INPUT-01 — CLOSEOUT

> **Epic ID:** OWNER-INPUT-01
> **Status:** **CLOSED** · **PRODUCTION VERIFIED · GREEN**
> **Zakres zamknięty:** thin tender-scoped Owner Rate Input (**localStorage-only**)
> **Data:** 2026-08-13
> **Baseline (docs HEAD pre-feature):** `d598b4ef` (TRANSPORT-01 close)
> **Feature / live tip:** `3642de23bd1fdd3849ac5ea7be613c0c7bf8c940` (`3642de2` / `3642de23`)
> **UI:** **2.66.43** (bez bump changelog w tym epiku)
> **PV:** [`OWNER-INPUT-01-PRODUCTION-VERIFY.md`](./OWNER-INPUT-01-PRODUCTION-VERIFY.md)
> **Tip SSOT:** [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md)
> **Continuity wyceny:** [`../AI/10_TENDER_PRICING_CONTINUITY.md`](../AI/10_TENDER_PRICING_CONTINUITY.md)

```text
════════════════════════════════════════════════════════
OWNER-INPUT-01 = CLOSED
PRODUCTION VERIFIED · GREEN
OWNER_INPUT ≠ REAL_SOURCE
localStorage ONLY · Cloud Sync OFF
NO UI / provider / F5 wire in this epic
════════════════════════════════════════════════════════
```

---

## 1. Co jest CLOSED

| Item | Status |
|------|--------|
| OWNER-INPUT-01 (01A+01B) | **CLOSED** |
| Design Freeze D-OI-01…26 | **ACCEPTED / LOCKED** |
| Production | **VERIFIED · GREEN** |
| Store `kw-owner-rate-input-v1` | **YES** · `{ version:1, events:[] }` append-only |
| Events | `question_opened` · `answer_submitted` · `question_cancelled` |
| `sourceClass = owner_input` · `scope = tender_only` | **YES** |
| Tender isolation (`tenderId` REQUIRED) | **YES** |
| Noise gate `NOISE_TRANSPORT` | **YES** |
| Utyl gate `UTYLIZACJA_ONLY` | **YES** |
| Submit = explicit approval | **YES** |
| Revision append-only + `supersedesAnswerId` | **YES** |
| Cloud Sync / DATA_KEYS / CloudLoader / Edge / Supabase | **NOT wired** |
| Equipment/Transport providers · F5 · UI call-site | **NOT in this epic** |
| EQUIPMENT-01 / TRANSPORT-01 MODEL-1A / C-MODE / F0–F6 | **LOCKED · unchanged** |
| Payroll | **GREEN** · B4 **13/13** · battery **16/16 scripts** · `PayrollView.tsx` **nie** w release |

---

## 2. Co NIE jest CLOSED

```text
Owner Input ≠ REAL SOURCE
Owner Input ≠ Price Memory / OUR RATE / company knowledge
Equipment REAL SOURCE / Legal provider = FOLLOW-UP
Transport MODEL-1B = NOT STARTED
EquipmentPriceProvider / TransportPriceProvider ← OWNER_INPUT = FOLLOW-UP
F5 / GAP clear on RESOLVED Owner Input = FOLLOW-UP
UI (Decision Workspace / Hub) = FOLLOW-UP (OWNER-INPUT-02+)
Cloud Sync for kw-owner-rate-input-v1 = FORBIDDEN until osobny Owner GO
```

**Nie** oznaczaj Bid pricing Equipment/Transport ani REAL SOURCE jako CLOSED przez ten epic.

---

## 3. Feature commit (dokładnie 7 plików)

| Plik | Rola |
|------|------|
| `src/lib/owner-rate-input/types.ts` | model / envelope |
| `src/lib/owner-rate-input/store.ts` | localStorage append-only |
| `src/lib/owner-rate-input/api.ts` | create / answer / cancel / lookup |
| `src/lib/owner-rate-input/prompt.ts` | deterministic `buildPromptPl` |
| `src/lib/owner-rate-input/gates.ts` | noise + utylizacja |
| `src/lib/owner-rate-input/index.ts` | barrel |
| `scripts/test-owner-rate-input-01.mjs` | harness |

**Feature SHA:** `3642de23bd1fdd3849ac5ea7be613c0c7bf8c940`

**Exclude:** `PayrollView.tsx` · Payroll WIP · cloud-sync · Edge · F5/shadow/cutover · equipment-contract · transport-contract · OfferBoq · App · DW/Hub UI.

---

## 4. Final contract (PIN)

| Reguła | Stan |
|--------|------|
| LS key | `kw-owner-rate-input-v1` |
| `sourceClass` | `owner_input` |
| `scope` | `tender_only` |
| currency | `PLN` |
| tenderId | REQUIRED on create/answer/lookup/list |
| No key/name-only lookup | **LOCKED** |
| No cross-tender reuse | **LOCKED** |
| Equipment key optional | **YES** |
| Transport kind optional | **YES** |
| `TRANSPORT_GAP` / MODEL-1B / `OfferBoqLineKind.Transport` | **ABSENT** |
| Forbidden fallbacks (85/45/PI31/ATH/catalog/companyPrice/Expert/heuristics/REAL SOURCE) | **NOT used** |
| Unanswered → `getCurrentAnswer = null` (≠ 0 PLN) | **YES** |

---

## 5. Regression (release / PV gate)

| Suite | Wynik |
|-------|--------|
| OWNER-INPUT-01 | **115 PASS / 0 FAIL** |
| EQUIPMENT-01 | 36 PASS |
| TRANSPORT-01 | 75 PASS |
| F0…F6 | 46 / 36 / 62 / 41 / 36 / 37 / 21 |
| C-MODE contract / fallback | 44 / 34 |
| Payroll B4 | **13/13 PASS** |
| Payroll battery (16 scripts) | **16/16 PASS** |

> **Note:** historyczna etykieta „Payroll 16/16” = **16 skryptów harnessów**, nie 16 assertów B4. B4 tip = **13 PASS**.

---

## 6. Residual / follow-up (tylko Owner GO)

1. **OWNER-INPUT-02** — UX DW/Hub (Submit card) — **NIE** auto
2. **OWNER-INPUT-03/04** — Equipment/Transport provider ← OWNER_INPUT → RESOLVED — **NIE** auto
3. **OWNER-INPUT-05** — F5 GAP clear when RESOLVED — **NIE** auto
4. Equipment REAL SOURCE / Legal · Transport MODEL-1B — **NIE** auto

---

## 7. Locked domains (nie reopen)

F0–F6 · C-MODE-1a · EQUIPMENT-01 · TRANSPORT-01 MODEL-1A · Cloud Sync · Payroll · WM-RYSUNKI — **bez** zmian w tym close.
