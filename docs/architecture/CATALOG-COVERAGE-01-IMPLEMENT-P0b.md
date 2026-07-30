# CATALOG-COVERAGE-01 — IMPLEMENT P0b (Normalizer)

> **ID:** CATALOG-COVERAGE-01-IMPLEMENT-P0b  
> **EPIC:** CATALOG-COVERAGE-01  
> **Etap:** **IMPLEMENT P0b** · Normalizer only  
> **Data:** 2026-07-30  
> **Wejście:** P0a **CLOSED** · PV **2.65.87** · Post-Release **READY TO PREPARE P0b** · Owner GO IMPLEMENT  
> **DF:** [`CATALOG-COVERAGE-01-DESIGN-FREEZE.md`](CATALOG-COVERAGE-01-DESIGN-FREEZE.md) §2.2  
> **Zakaz wykonany:** bez Alias · Coverage Score · Library seed · SMART/MS · commit / push

```text
════════════════════════════════════════════════════════
CATALOG-COVERAGE-01 IMPLEMENT P0b
WERDYKT: READY FOR RELEASE P0b
CHANGES REQUIRED: NIE
════════════════════════════════════════════════════════
```

---

## 1. Zakres wdrożony

| Element | Status |
|---------|--------|
| `src/lib/catalog-coverage/normalize-description.ts` | **DONE** — pure · idempotentny |
| Typy `CatalogCoverageNormalizeResult` | **DONE** |
| Wire w `mapOfferBoqLine` (po Noise, przed Core) | **DONE** — eligible only |
| `description` UI = oryginał ATH (SSOT) | **DONE** |
| Scoring Core / próg Mappera | **BEZ ZMIAN** |
| Alias / Coverage Score / Library / SMART / MS | **NIE** |

**Pipeline:** Noise → **Normalizer** → Product Mapper (Core REUSE).  
Noise (`isNoise`) → **koniec** (bez Normalizer / Mapper).

---

## 2. Co robi Normalizer (DF)

| Standaryzacja | Przykład |
|---------------|----------|
| Strip KNR / `d.x` / krotność / analiza indywidualna / mnożniki | `0354-11`, `d.1.7`, `Krotność = 4` |
| Średnice → `fiNN` | `ø40`, `DN25`, `śr. 32` |
| jm w tekście | `m²`→`m2`, `szt.`→`szt`, ATH `m d.` strip |
| Format | spacje, tag `[W]`/`[E]`, interpunkcja |
| Hints (ephemeral) | `knrHint` · `unitHint` · `diameterHint` dla Core |

**NIE:** zmiana znaczenia produktu · usuwanie nazwy materiału · zapis Library/Quotes · fork scoringu.

---

## 3. Przykłady normalizacji

| BEFORE | AFTER |
|--------|--------|
| `Wykucie z muru podokienników m d.1.7 0354-11 1.15*3` | `Wykucie z muru podokienników` (+ knrHint `0354-11`) |
| `[W] Montaż rur PP ø40 Krotność = 4 … analiza indywidualna` | `Montaż rur PP fi40` |
| `Zawór kulowy DN25 / śr. 32` | `Zawór kulowy fi25 / fi32` |
| Podwójne spacje / `,  ,` | collapsed whitespace |

---

## 4. Przypadki graniczne

| Case | Wynik |
|------|--------|
| `Kalkulacja własna` | Noise skip — **bez** Normalizer |
| Czysty opis bez ATH meta | `changed=false` lub tylko whitespace · map ≡ Core |
| KNR w opisie + montaż | KNR strip z hay · knrHint do Core (REUSE knrHit) |
| „Dostawa i montaż …” | eligible · Normalizer nie oznacza noise |
| Idempotencja `normalize(normalize(x))` | **equal** (80/80 sample OV) |
| Semantic keep (token ≥4 z oryginału) | **0 fail** / 493 |

---

## 5. Owner Verification — Coverage / TV-01

Źródło: `.tmp/catalog-coverage-01-p0b-ov.json` · harness `scripts/catalog-coverage-01-p0b-owner-verification.mjs`

| Metryka | Wartość |
|---------|--------:|
| TV-01 linie (live) | **2228** |
| Noise (P0a) | **33** |
| Eligible znormalizowane | **493** |
| Normalize `changed` | **171 (34.7%)** |
| knrHint wyodrębniony | **123** |
| unitHint / diameterHint | **77** / **4** |
| Coverage Quotes **przed** | **76.4%** |
| Coverage Quotes **po** (live remapa) | **76.4%** |
| Mapped live | **1702 (76.4%)** |
| Nowo zmapowane vs classify-unmapped | **0** |

**Interpretacja:** P0b poprawnie czyści formę ATH (DATA FIRST), ale **sam** nie podnosi Quotes coverage na TV-01 — bottleneck nadal **LIBRARY_GAP / score / alias** (P0c–P0d), zgodnie z AUDIT rankingiem. Brak regresji Quotes (76.4% =).

---

## 6. Wymagania (kontrola)

| # | Wymaganie | Wynik |
|---|-----------|--------|
| 1 | Idempotencja | **PASS** |
| 2 | Tylko eligible | **PASS** |
| 3 | Noise kończy pipeline | **PASS** |
| 4 | Semantyka materiału | **PASS** (0 semantic fail) |
| 5 | REUSE Product Mapper | **PASS** (Core bez zmian reguł) |
| 6 | SSOT / REUSE / ZERO DUP / FEATURE-DATA / DATA FIRST | **PASS** |

---

## 7. Build / Testy

| Check | Wynik |
|-------|--------|
| `npm run build` | **PASS** |
| `npx vite-node scripts/test-catalog-coverage-01-p0b.mjs` | **28 PASS / 0 FAIL** |
| `npx vite-node scripts/test-catalog-coverage-01-p0a.mjs` | **31 PASS** (regresja) |
| `npx vite-node scripts/catalog-coverage-01-p0b-owner-verification.mjs` | **OV GATES PASS** |
| `npx vite-node scripts/test-smart-pricing-01-p0.mjs` | **58 PASS** (regresja) |

---

## 8. Pliki (przed Owner commit)

| Plik | Stan |
|------|------|
| `src/lib/catalog-coverage/normalize-description.ts` | Nowy / untracked |
| `src/lib/catalog-coverage/types.ts` · `index.ts` | Modified |
| `src/lib/tender-offer-boq-mapping.ts` | Modified (thin wire) |
| `src/lib/tender-offer-boq.ts` | Modified (`normalizedDescription`) |
| `scripts/test-catalog-coverage-01-p0b.mjs` | Nowy |
| `scripts/catalog-coverage-01-p0b-owner-verification.mjs` | Nowy |
| `src/app/changelog-data.ts` · `CHANGELOG.md` | **2.65.88** |
| Ten raport | Nowy |

**Changelog UI:** **2.65.88**  
**Commit / push:** **NIE** (Owner)

---

## 9. WERDYKT

```text
════════════════════════════════════════════════════════
READY FOR RELEASE P0b

Warstwa Normalizer: zgodna z DF · testy PASS · OV PASS · brak regresji.
Quotes coverage TV-01: bez zmian 76.4% (oczekiwane bez P0c/P0d).
Lift coverage EPIC = kolejne slice'y (Alias · Library seed).

NEXT: Owner GO RELEASE P0b · potem P0c — nie auto-start.
════════════════════════════════════════════════════════
```

**CHANGES REQUIRED:** **NIE**
