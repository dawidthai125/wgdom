# CATALOG-COVERAGE-01 — IMPLEMENT P0a (Noise Filter)

> **ID:** CATALOG-COVERAGE-01-IMPLEMENT-P0a  
> **EPIC:** CATALOG-COVERAGE-01  
> **Etap:** **IMPLEMENT P0a** · Noise Filter only  
> **Data:** 2026-07-30  
> **AR:** [`CATALOG-COVERAGE-01-ARCHITECTURE-REVIEW.md`](CATALOG-COVERAGE-01-ARCHITECTURE-REVIEW.md) · **READY FOR OWNER GO**  
> **DF:** [`CATALOG-COVERAGE-01-DESIGN-FREEZE.md`](CATALOG-COVERAGE-01-DESIGN-FREEZE.md)  
> **Zakaz wykonany:** bez Normalizer / Alias / Coverage Score / seed Library / SMART / MS · **bez commit / push**

```text
════════════════════════════════════════════════════════
CATALOG-COVERAGE-01 IMPLEMENT P0a
WERDYKT: READY FOR RELEASE P0a
CHANGES REQUIRED: NIE
════════════════════════════════════════════════════════
```

---

## 1. Zakres wdrożony

| Element | Status |
|---------|--------|
| `src/lib/catalog-coverage/noise-filter.ts` | **DONE** — pure classify + skip |
| `src/lib/catalog-coverage/types.ts` · `index.ts` | **DONE** |
| Thin wire w `mapOfferBoqLine` (pre-map → Core) | **DONE** — scorowanie Core **bez zmian reguł** |
| Tag `isNoise` / `noiseKind` na `OfferBoqLine` | **DONE** · ephemeral |
| Testy jednostkowe + integracyjne | **DONE** |
| Owner Verification vs TV-01 | **DONE** |
| Normalizer / Alias / Coverage Score / Library seed | **NIE** (poza zakresem) |

**Kinds P0 (DF):** `kalkulacja_wlasna` · `transport` (wąski) · `lp_artifact` · `smieci_krotkie`  
**Guard:** KNR + „Dostawa i montaż / montaż / instalacja…” → **nie** noise.

---

## 2. Owner Verification — metryki (TV-01)

Źródło: `.tmp/tender-validation-01-results.json` + `.tmp/catalog-coverage-01-classify.json` · harness `scripts/catalog-coverage-01-p0a-owner-verification.mjs` → `.tmp/catalog-coverage-01-p0a-ov.json`

| Metryka | Wartość |
|---------|--------:|
| Linie TV-01 | **2228** |
| Quotes hit (controlled_market) | **1702** |
| Unmapped skanowane | **526** |
| **Odfiltrowane (noise)** | **33** |
| Eligible unmapped po filtrze | **493** |
| Coverage **przed** (all lines) | **76.4%** |
| Coverage **po** (all lines) | **76.4%** (hits Quotes **bez zmian**) |
| Coverage **po** (eligible = all − noise) | **77.5%** (**+1.1 pp**) |

### Po kind

| Kind | Count |
|------|------:|
| `kalkulacja_wlasna` | **31** |
| `lp_artifact` | **2** |
| `transport` | **0** |
| `smieci_krotkie` | **0** |

**Uwaga transport:** w AUDIT classify 5× „transport” to były **false positive** (`Dostawa i montaż …`). P0a **nie** filtruje ich (OV: `dostawaMontazFalseNoise = 0`). Czysty transport w tej próbie unmapped = 0.

### Przykłady odrzuconych

| Kind | lp | Opis |
|------|-----|------|
| `lp_artifact` | 10 | `.4 2` |
| `lp_artifact` | 13 | `.5 1` |
| `kalkulacja_wlasna` | 69 | `Kalkulacja własna` |
| `kalkulacja_wlasna` | 95 | `Kalkulacja własna` |
| `kalkulacja_wlasna` | 97 | `Kalkulacja własna` |
| `kalkulacja_wlasna` | 127 | `Kalkulacja własna` |

---

## 3. Wpływ na TENDER-VALIDATION-01

| Aspekt | Wpływ P0a |
|--------|-----------|
| Quotes hit / coverage all-lines | **Bez zmian** (76.4%) — noise i tak bez Quotes |
| SMART Detect `unmapped` count | Te same linie bez `catalogWorkId`, ale z tagiem `isNoise` (P1ux copy — osobno) |
| Actionable gap | **526 → 493** (−33 noise) |
| Cel EPIC 88–92% | P0a = **fundament** (+ eligible clarity); lift Quotes wymaga P0b–P0d |

---

## 4. Wymagania (kontrola)

| # | Wymaganie | Wynik |
|---|-----------|--------|
| 1 | Idempotentny | **PASS** (double classify / apply / prepare) |
| 2 | Nie usuwa materiałowych | **PASS** (montaż / dostawa+montaż / zawór / malowanie) |
| 3 | Tylko niemateriałowe DF | **PASS** |
| 4 | Nie zmienia semantyki opisu | **PASS** |
| 5 | Nie zapisuje danych | **PASS** (brak cloud / Quotes write) |
| 6 | Nie zmienia Product Library | **PASS** |
| 7 | SSOT / REUSE / ZERO DUP / FEATURE-DATA / DATA FIRST | **PASS** |

---

## 5. Build / Testy

| Check | Wynik |
|-------|--------|
| `npm run build` | **PASS** |
| `npx vite-node scripts/test-catalog-coverage-01-p0a.mjs` | **31 PASS / 0 FAIL** |
| `npx vite-node scripts/catalog-coverage-01-p0a-owner-verification.mjs` | **OV GATES PASS** |
| `npx vite-node scripts/test-smart-pricing-01-p0.mjs` | **58 PASS** (regresja) |
| `npx vite-node scripts/test-cost-s2-offer-boq-mapping.mjs` | **PASS** (regresja) |

---

## 6. Pliki (implementacja)

| Plik | Stan git (przed Owner commit) |
|------|-------------------------------|
| `src/lib/catalog-coverage/**` | **Untracked** |
| `scripts/test-catalog-coverage-01-p0a.mjs` | **Untracked** |
| `scripts/catalog-coverage-01-p0a-owner-verification.mjs` | **Untracked** |
| `src/lib/tender-offer-boq-mapping.ts` | Modified |
| `src/lib/tender-offer-boq.ts` | Modified |
| `src/app/changelog-data.ts` | Modified · UI **2.65.87** |
| `CHANGELOG.md` | Modified |
| Ten raport | Nowy |

**Changelog UI:** **2.65.87** — Catalog Coverage P0a — Noise Filter  
**HEAD / origin/main:** `9b6bc19d` (bez commit P0a)

---

## 7. WERDYKT

```text
════════════════════════════════════════════════════════
READY FOR RELEASE P0a

Technicznie: build PASS · testy PASS · OV PASS · zakres P0a domknięty.
Commit / push: ZABLOKOWANE — czekają na jawne Owner GO.
Po commit+push: VERIFY FAST version.json → oczekiwane 2.65.87

NEXT (po release P0a): Owner GO IMPLEMENT P0b (Normalizer) — nie auto-start.
════════════════════════════════════════════════════════
```

**CHANGES REQUIRED:** **NIE**
