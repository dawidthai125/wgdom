# NG-06-TEUX — TEUX-7d Copy integrity · Bundle Closeout

> **Status:** **TEUX-7d CLOSED** · **RELEASE GO** · **DEPLOY PROPAGATING** (verify pending)  
> **Prod (target):** UI **2.63.63** · commit **`129f22d`** · https://www.wgdom.fun  
> **Data closeout:** 2026-07-07 · **push:** 2026-07-07  
> **Owner GO:** APPROVED (IMPLEMENT + RELEASE)  
> **Audyt:** [`NG-06-TEUX-TEUX7D-AUDIT-REPORT.md`](./NG-06-TEUX-TEUX7D-AUDIT-REPORT.md)

```text
PUSH:     PASS (129f22d implement → origin/main)
PROD:     DEPLOY PROPAGATING (version.json 2.63.62 @ 0546f79 przy pierwszym verify)
RELEASE:  GO (build PASS + gate B 12/12)
TOKEN FREEZE: ACTIVE (import-only)
GAP G-03: CLOSED (lista/workflow copy)
```

---

## 1. Podsumowanie bundla

| Pole | Wartość |
|------|---------|
| **Cel** | Copy integrity lista/workflow — bez user-facing „AI”; FAQ parity; CTA opis na mobile |
| **Deliverable** | GuideView FAQ · rename `listInsight*` API · CTA mobile · `LIB-TENDER-COPY-TEUX7D` |
| **Complexity** | **S** — 8 plików, 1 commit implement (`129f22d`) |
| **Rollback** | `git revert 129f22d` |
| **TOKEN FREEZE** | **ACTIVE** — `tender-ux-tokens.ts` bez edycji |

---

## 2. Acceptance Criteria (DF § TEUX-7d)

| AC | Status |
|----|--------|
| FAQ — „Podpowiedzi listy (rekomendacje)” zamiast „Komunikaty AI” | **PASS** |
| Banner lista — teksty bez słowa „AI” | **PASS** (regresja) |
| Rename `buildTendersListInsight` / `TendersListInsight` — bez zmiany logiki | **PASS** |
| CTA `view.description` widoczny na mobile (bez `max-[390px]:hidden`) | **PASS** |
| `tender-ux-tokens.ts` — NO EDIT | **PASS** |
| `LIB-TENDER-COPY-TEUX7D` | **PASS** 27/27 |
| Gate B tenders | **PASS** 12/12 |
| CHANGELOG **2.63.63** | **PASS** |
| Prod verify `version.json` | **PENDING** (DEPLOY PROPAGATING) |

---

## 3. Gapy zamknięte

| Gap | Opis | Status |
|-----|------|--------|
| **G-03** | FAQ „AI” + nazewnictwo dev `aiInsight*` + CTA opis ukryty mobile | **CLOSED** (część Strategia/hosted → TEUX-7e/7f) |

**Defer:** Strategia „Wnioski AI” · Pulpit CC · legacy tab „Intelligence” → **TEUX-7e** / **TEUX-7f**

---

## 4. Boundary (#CORE-013 / #CORE-014)

| Check | Werdykt |
|-------|---------|
| #CORE-013 — jeden cel, jeden commit implement | **PASS** |
| #CORE-014 — FEATURE allowlista | **PASS** |
| Payroll / sync / CloudLoader / Edge / App.tsx CORE | **NO DIFF** |
| `tenders/strategy/**` | **NO DIFF** |
| `buildTendersListInsight` logika | **NO DIFF** |
| `resolveOwnerNextAction` | **NO DIFF** |

---

## 5. Pliki bundla (`129f22d`)

| Plik | Rola |
|------|------|
| `src/app/GuideView.tsx` | FAQ Podpowiedzi listy |
| `src/lib/tenders-list-ux.ts` | Rename `TendersListInsight` / `buildTendersListInsight` |
| `src/app/TendersView.tsx` | `listInsight*` + `data-teux7d-list-insight` |
| `src/app/TenderWorkflowPrimaryAction.tsx` | CTA opis mobile parity |
| `src/app/changelog-data.ts` + `CHANGELOG.md` | **2.63.63** |
| `scripts/test-tender-copy-teux7d.mjs` | Gate `LIB-TENDER-COPY-TEUX7D` |
| `test-infra/test-manifest.json` | Suite + gate B |

---

## 6. Następny slice

**TEUX-7e** — Strategia + Pulpit copy (nie startować bez Owner GO).
