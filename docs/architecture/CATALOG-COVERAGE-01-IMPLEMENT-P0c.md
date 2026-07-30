# CATALOG-COVERAGE-01 — IMPLEMENT P0c (Alias Resolver Wave 1)

> **ID:** CATALOG-COVERAGE-01-IMPLEMENT-P0c  
> **EPIC:** CATALOG-COVERAGE-01  
> **Etap:** **IMPLEMENT P0c** · Alias Resolver — **Wave 1 ONLY**  
> **Data:** 2026-07-30  
> **DF:** [`CATALOG-COVERAGE-01-P0c-DESIGN-FREEZE.md`](CATALOG-COVERAGE-01-P0c-DESIGN-FREEZE.md) · **FROZEN**  
> **AR:** [`CATALOG-COVERAGE-01-P0c-ARCHITECTURE-REVIEW.md`](CATALOG-COVERAGE-01-P0c-ARCHITECTURE-REVIEW.md) · **READY FOR OWNER GO**  
> **UI version (changelog):** **2.65.89**  
> **Zakaz wykonany:** bez commit / push · bez Wave 2 / BIZ / HIGH / P0d seed · bez SMART/MS rewrite

```text
════════════════════════════════════════════════════════
CATALOG-COVERAGE-01 IMPLEMENT P0c
WERDYKT: READY FOR RELEASE P0c
CHANGES REQUIRED: NIE
════════════════════════════════════════════════════════
```

---

## 1. Zakres wdrożony

| Element | Status |
|---------|--------|
| `src/lib/catalog-coverage/alias-pack-wave1.ts` | **DONE** — 6 reguł SSOT · 1:1 Product ID |
| `src/lib/catalog-coverage/alias-resolver.ts` | **DONE** — pure · first match · DATA FIRST |
| Wire w `mapOfferBoqLine` | **DONE** — po Normalizer · przed Core · override przy bind |
| `matchMethod` / `matchedBy` = `alias` | **DONE** |
| Tag `aliasRuleId` ephemeral | **DONE** |
| AR binding `piece_demontaz` | **DONE** — (demontaż\|rozebranie) **AND** (piec\|trzon) |
| Testy + OV TV-01 | **DONE** |
| Wave 2 / BIZ / Library seed | **NIE** (poza zakresem) |

**Pipeline:** Noise → Normalizer → **Alias** → Product Mapper (Core REUSE).

---

## 2. Alias Pack Wave 1 — bind Library

| # | aliasRuleId | Product ID | Work w Library? |
|--:|-------------|------------|-----------------|
| 1 | `zaprawianie_bruzd` | `cc-p0c-w1-zaprawianie-bruzd` | **NIE** → no-op |
| 2 | `zawor_odpowietrzajacy` | `cc-p0c-w1-zawor-odpowietrzajacy` | **NIE** → no-op |
| 3 | `zabezpieczenie_folia` | `cc-p0c-w1-zabezpieczenie-folia` | **NIE** → no-op |
| 4 | `stop_ptakow` | `cc-p0c-w1-stop-ptakow` | **NIE** → no-op |
| 5 | `multiswitch_antenowy` | `cc-p0c-w1-multiswitch-antenowy` | **NIE** → no-op |
| 6 | `piece_demontaz` | `legacy-rozbiorki-m2` | **TAK** — „Rozbiórki (m2)” (keyword pieców/trzonów) |

**DATA FIRST:** 5 reserved ID czeka na seed **P0d** (bez zapisu Library w P0c).  
**Bez false-map:** nie powiązano odpowietrznika z ogólnym `legacy-instalacje_co-*`.

---

## 3. Owner Verification — metryki (TV-01)

Źródło: `.tmp/catalog-coverage-01-p0c-ov.json` · harness `scripts/catalog-coverage-01-p0c-owner-verification.mjs`

| Metryka | Wartość |
|---------|--------:|
| Linie TV-01 | **2228** |
| Quotes hit **przed** | **1702** (76.4%) |
| Quotes hit **po** | **1703** |
| Coverage **po** (zaokr.) | **76.4%** (Δ **0.0 pp** zaokr.; **+1** linia Quotes) |
| `mappedWithAlias` | **1** |
| Multi-hit linii | **0** |
| Deterministic fail | **0** |
| Text-hit Pack (brak work) | 23+4+9+2+2 (reguły 1–5) — **no-op** |

### Przykład nowo zmapowany (alias)

| tender | lp | opis | aliasRuleId | catalogWorkId |
|--------|-----|------|-------------|---------------|
| `08ded02d…` | 1 | Rozebranie pieców i trzonów kuchennych oblicowanych kaflami | `piece_demontaz` | `legacy-rozbiorki-m2` |

---

## 4. Testy

| Suite | Wynik |
|-------|--------|
| `scripts/test-catalog-coverage-01-p0c.mjs` | **54 PASS** (determinizm · first match · multi-hit · piece AR · eligible · DATA FIRST · wire) |
| `scripts/test-catalog-coverage-01-p0a.mjs` | **31 PASS** (regresja) |
| `scripts/test-catalog-coverage-01-p0b.mjs` | **28 PASS** (regresja) |
| OV P0c | **PASS** · gates OK |
| `npm run build` | **PASS** |

---

## 5. Wymagania (kontrola)

| # | Wymaganie | Wynik |
|---|-----------|--------|
| 1 | Deterministyczny | **PASS** |
| 2 | 1 reguła → 1 Product ID | **PASS** |
| 3 | Brak multi-hit | **PASS** (OV 0) |
| 4 | First match #1–#6 | **PASS** |
| 5 | Eligible only | **PASS** |
| 6 | Po Normalizer · przed Mapper | **PASS** |
| 7 | Brak zmian Library | **PASS** |
| 8 | Brak zmian Quotes write | **PASS** |
| 9 | Brak SMART rewrite | **PASS** |
| 10 | Brak MS rewrite | **PASS** |
| 11 | Jeden call site | **PASS** (`mapOfferBoqLine`) |
| 12 | SSOT / REUSE / ZERO DUP / FEATURE-DATA / DATA FIRST | **PASS** |

---

## 6. Wpływ na coverage / NEXT

| Aspekt | Ocena |
|--------|--------|
| Lift Quotes P0c na TV-01 | **+1 linia** (~0 pp zaokr.) — bottleneck = **brak work** dla 5/6 reguł |
| Cel EPIC 88–92% | Nadal wymaga **P0d seed** (reserved `cc-p0c-w1-*` + Quotes) |
| Regresja | **Brak** (76.4% ≥ baseline) |

**NEXT (nie auto-start):** Owner GO **RELEASE P0c** (commit/push) → potem P0d PREPARATION/seed pod reserved ID.

---

## 7. Pliki

| Plik | Rola |
|------|------|
| `alias-pack-wave1.ts` | Pack SSOT Wave 1 |
| `alias-resolver.ts` | Resolver pure |
| `tender-offer-boq-mapping.ts` | Wire Alias |
| `tender-offer-boq.ts` | `alias` matchMethod · `aliasRuleId` |
| `changelog-data.ts` / `CHANGELOG.md` | **2.65.89** |
| `scripts/test-catalog-coverage-01-p0c.mjs` | Testy |
| `scripts/catalog-coverage-01-p0c-owner-verification.mjs` | OV |

---

## 8. WERDYKT

```text
════════════════════════════════════════════════════════
CATALOG-COVERAGE-01 IMPLEMENT P0c
Status: READY FOR RELEASE P0c
CHANGES REQUIRED: NIE
Commit/push: NIE (czekaj na Owner GO RELEASE)
════════════════════════════════════════════════════════
```
