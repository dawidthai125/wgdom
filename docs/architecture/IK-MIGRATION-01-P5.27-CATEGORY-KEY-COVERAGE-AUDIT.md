# IK-MIGRATION-01 — P5.27 CATEGORY KEY COVERAGE AUDIT

> **Date:** 2026-08-15  
> **Status:** **P5.27 CATEGORY KEY AUDIT = COMPLETE**  
> **Mode:** AUDIT / DESIGN ONLY  
> **HTTP = 0 · Research = 0 · Accept = 0 · Writes = 0 · Create = 0 · Bind = 0 · Code = 0 · Commit = 0 · Push = 0**  
> **Evidence:** P5.26-G triage · P5.26-FIX allowlist · `planWorkRateCategoryRoute` (read-only)  
> **Outputs:** `.tmp/p527-category-key-audit.json` · `.tmp/p527-category-key-audit-FULL.md` · `.tmp/p527-category-key-family-groups.md`

---

## Owner summary

**97 CATEGORY_KEY_MISSING**

| | |
|--|--:|
| → semantic families | **67** |
| → reusable existing mappings (KIND **B**) | **20** groups |
| → genuine missing / unknown (KIND **A**) | **59** groups |
| → unit problems (flag / KIND **D**) | **7** |
| → domain / semantic route issues (KIND **E** + flags) | **27** *(głównie PACKAGE+unknown; 1 mis-route `podtynk`)* |
| → out of research (KIND **G**) | **17** |
| → alias-only (KIND **C**) | **0** |
| → source-specific F | **0** *(sccot/extradom PASS2 allowlist puste — wchłonięte w A/B)* |
| → unresolved low-confidence | **0** |

**97 ≠ brak ceny.** **97 ≠ SOURCE_NO_MATCH.**

Oznacza: brak wyznaczonego / allowlisted `categoryKey` w ścieżce research (lub brak family regex).

---

## Allowlist SSOT (obecny stan — bez zmian)

| Source | PASS2 categoryKeys |
|--------|-------------------|
| `kb_pl` | `grooves`, `plaster` |
| `cennikremontow_pl` | `painting`, `electrical`, `plumbing` |
| `sccot` | *(empty)* |
| `extradom` | *(empty)* |

**Type keys bez żadnego URL allowlist:** `masonry_plaster` · `flooring` · `repairs` · `sealing_protection`  
(`demolition` → prefs `repairs` → też brak URL)

---

## Klasy A–G (grupy)

| Kind | Label | Groups | Znaczenie |
|------|-------|-------:|-----------|
| **A** | Genuine missing family/key | **59** | `FAMILY_UNKNOWN` (48) · `demolition→repairs` bez URL (10) · `flooring` (1) |
| **B** | Mapper miss → **REUSE** existing | **20** | Po P5.26-FIX `PASS2_READY` na KB/CR |
| **C** | Alias / normalization | **0** | — |
| **D** | Unit | *(w flagach)* | `pomiar` · `msc` — bez auto `unit A=unit B` |
| **E** | Domain / semantic mis-route | **1** (+flagi) | `podtynk*` łapie `/tynk/` → plaster **przed** demontaż |
| **F** | Source-specific route | **0** | — |
| **G** | Poza researchem | **17** | transport gruzu (6) · pomiary (4) · correct reject wapno/olej (7) |

### A — rozbicie family NOW

| `resolvedFamilyNow` | Groups |
|---------------------|-------:|
| `unknown` | 48 |
| `demolition` | 10 |
| `flooring` | 1 |

### B — reuse keys

| Expected key | Source | Groups |
|--------------|--------|-------:|
| `plaster` | kb_pl | 11 |
| `plumbing` | cennikremontow_pl | 8 |
| `electrical` | cennikremontow_pl | 1 |

---

## TOP 20 rodzin (wg affected lines)

| # | Lines | Groups | KIND | Expected key | Family NOW | ROI | FAMILY |
|--:|------:|-------:|------|--------------|------------|-----|--------|
| 1 | 14 | 6 | **G** | — | unknown | HIGH | wywiezienie gruzu (m3) |
| 2 | 12 | 5 | **B** | plumbing | plumbing | HIGH | demontaż (m) |
| 3 | 12 | 3 | **B** | plumbing | plumbing | HIGH | wymiana podejścia (msc) |
| 4 | 8 | 4 | **G** | — | unknown | HIGH | pomiary |
| 5 | 7 | 4 | **B** | plaster | plaster | HIGH | tynkowanie PACKAGE (m) * |
| 6 | 6 | 4 | **B** | plaster | plaster | HIGH | tynkowanie LABOR (m2) |
| 7 | 6 | 3 | **A** | — | unknown | MED | podłączenie przewodów kabelkowych |
| 8 | 5 | 3 | **A** | repairs | demolition | MED | demontaż (szt) |
| 9 | 5 | 2 | **B** | plaster | masonry | MED | zamurowanie (szt) |
| 10 | 5 | 2 | **G** | — | unknown | MED | malowanie wapienne (szt) |
| 11 | 4 | 1 | **B** | plumbing | plumbing | MED | demontaż podejścia gazomierz |
| 12 | 4 | 1 | **A** | — | unknown | MED | obsadzenie drzwiczek PCV |
| 13 | 4 | 1 | **A** | — | unknown | MED | wymiana ustępu (kpl) |
| 14 | 4 | 1 | **G** | — | unknown | MED | malowanie wapienne (m3) |
| 15 | 4 | 1 | **B** | plumbing | plumbing | MED | rurociągi PP |
| 16 | 3 | 2 | **A** | repairs | demolition | MED | wykucie (szt) |
| 17 | 3 | 2 | **A** | — | unknown | MED | izolacja otuliny |
| 18 | 3 | 1 | **A** | — | unknown | LOW | montaż brodzików |
| 19 | 3 | 1 | **A** | — | unknown | LOW | montaż kabiny prysznicowej |
| 20 | 2 | 2 | **G** | — | unknown | MED | malowanie wapienne (m2) |

\* Queue `familyKey` „tynkowanie” bywa **zgrubny** — w patternzie pojawia się też opis przewodu YDYp; przed FIX weryfikować opis per grupa (`.tmp/p527-category-key-family-groups.md`).

Pełna lista 67: `.tmp/p527-category-key-family-groups.md`.

---

## P0 / P1 vs CATEGORY_KEY_MISSING

Z P5.26-G (w zbiorze CKM):

| Priority | Groups in CKM |
|----------|--------------:|
| **P0** | **64** |
| **P1** | **26** |
| **P4** | **7** (correct reject overlay) |

**Wniosek:** praktycznie cały P0/P1 residual research wynika z **CATEGORY_KEY_MISSING** (nie z SOURCE_NO_MATCH).  
Naprawa coverage/reuse **przed** kolejnym researchem — zgodnie z G.

---

## 20 × PARSER_EMPTY (tylko grupowanie)

Nie naprawiamy. Nie HTTP.

| Assessment | Znaczenie |
|------------|-----------|
| **POSSIBLE_PARSER_GAP_OR_IDENTITY** | Miał `categoryKey` (PASS2) + HTTP path — 0 offers (jak pilot G087/G090) |
| **EXPECTED_EMPTY** | Brak jasnego key w evidence |

Dominujące klucze w PE: `plumbing`, `plaster`, `painting`.  
Źródła: `cennikremontow_pl`, `kb_pl`.  
→ Po coverage FIX nadal oczekuj **PARSER_EMPTY** (identity/page scope), nie „cena istnieje”.

Szczegóły: `.tmp/p527-category-key-audit-FULL.md` § PARSER_EMPTY.

---

## 11 × SOURCE_UNHEALTHY

| Source | Count | Errors | Potrzebne dla P0/P1 labor? |
|--------|------:|--------|----------------------------|
| castorama | 11 | `upstream_503`, `SOURCE_UNHEALTHY` | **NIE** (MATERIAL shop) |
| obi | 11 | `upstream_404` | **NIE** |
| leroy | 11 | `SOURCE_UNHEALTHY` | **NIE** |

Te same ~11 grup MATERIAL — sklepy. **Nie retry.** Nie blokują labor PASS2 KB/CR.

---

## ROI — jednym mappingiem wiele grup

### HIGH ROI (REUSE — bez nowego URL)

| Key | Source | Groups | Lines | Families | Dlaczego safe |
|-----|--------|-------:|------:|---------:|---------------|
| **plumbing** | cennikremontow_pl | **8** | **29** | 4 | Już w Owner allowlist PASS2 |
| **plaster** | kb_pl | **11** | **20** | 4 | Już w allowlist (+ masonry fallback) |

### HIGH ROI (nowy allowlist — tylko Owner GO)

| Key | Groups | Lines | Families | Risk |
|-----|-------:|------:|---------:|------|
| **repairs** | 10 | 14 | 8 | MED/HIGH — wymaga Owner-curated URL; `demolition` prefs |

### LOW ROI

| Key | Groups | Lines | Note |
|-----|-------:|------:|------|
| electrical | 1 | 2 | REUSE already |
| flooring | 1 | 2 | Genuine missing URL |

**Nie** proponować osobnego mappingu 1:1 bez uzasadnienia domenowego.

---

## Potencjalne bugi (TYLKO dokumentacja — ZERO FIX)

1. **`podtynk*` → family `plaster`** — regex `/tynk/` przed demontaż/plumbing (1 grupa, KIND **E**).  
2. **Queue `familyKey` zgrubny** — etykieta „tynkowanie” vs opis YDYp w tej samej rodzinie.  
3. **48 × FAMILY_UNKNOWN** — brak regex dla: izolacje, sanitarne kpl, kable (część), transport, pomiary, meble/PCV…  
4. **`sccot` / `extradom`** — PASS2 allowlist puste → zawsze CKM przy samym tych źródłach.  
5. B01 residual nadal w evidence G jako CKM mimo że **B** NOW = REUSE po FIX (B01 nie re-run).

---

## P5.27-FIX CANDIDATES (CREATE = 0 · IMPLEMENT = 0)

| # | Type | CATEGORY KEY | SOURCE | Groups | Lines | WHY SAFE | RISK | PRIORITY |
|--:|------|--------------|--------|-------:|------:|----------|------|----------|
| 1 | REUSE | `plumbing` | cennikremontow_pl | 8 | 29 | Existing allowlist | LOW (dalej PE możliwe) | **HIGH** |
| 2 | REUSE | `plaster` | kb_pl | 11 | 20 | Existing allowlist | LOW | **HIGH** |
| 3 | NEW allowlist | `repairs` | Owner URL TBD | 10 | 14 | Tylko po Owner-curated URL | MED/HIGH | **HIGH** |
| 4 | REUSE | `electrical` | cennikremontow_pl | 1 | 2 | Existing | LOW | LOW |
| 5 | NEW allowlist | `flooring` | Owner URL TBD | 1 | 2 | Owner URL | MED | LOW |

**Dodatkowo (nie mapping):**  
- **G-keep:** wywiezienie gruzu · pomiary · correct reject wapno/olej — **bez** categoryKey.  
- **Family-order review (E):** `podtynk` — dokumentowane; **nie implementować** bez Owner GO.

Pełne pola kandydatów: `.tmp/p527-category-key-audit.json` → `fixCandidates`.

---

## Safety

| Nie ruszono | |
|-------------|--|
| Internal-First matcher | ✓ |
| PACKAGE safety gate | ✓ |
| Owner prices / CatalogWork / commercialPricing / F5 / KV | ✓ |
| Kod / commit / push | ✓ |
| HTTP / research / Accept | ✓ |

---

## Decision

**P5.27 CATEGORY KEY AUDIT = COMPLETE**

Czekaj na **Owner review**.  
**Nie** implementuj mappingu. **Nie** uruchamiaj researchu. **Nie** przechodź automatycznie do P5.28.

**ABSOLUTE STOP.**
