# CATALOG-COVERAGE-01 — P0c ALIAS AUDIT (PREPARATION)

> **ID:** CATALOG-COVERAGE-01-P0c-ALIAS-AUDIT  
> **EPIC:** CATALOG-COVERAGE-01 · **Etap:** **P0c PREPARATION** (Alias Resolver)  
> **STATUS:** **AUDIT COMPLETE** · **DOCS ONLY**  
> **Data:** 2026-07-30  
> **Owner GO:** PREPARATION — **bez IMPLEMENT** · **bez commit** · **bez push**  
> **Wejście:** [`TENDER-VALIDATION-01`](TENDER-VALIDATION-01-REPORT.md) · `.tmp/catalog-coverage-01-classify.json` · `.tmp/catalog-coverage-01-p0c-alias-audit.json`  
> **Kontekst:** P0a Noise **CLOSED** · P0b Normalizer **CLOSED** (Quotes **76.4%=**) · tip [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md)  
> **DF epic:** [`CATALOG-COVERAGE-01-DESIGN-FREEZE.md`](CATALOG-COVERAGE-01-DESIGN-FREEZE.md) § 2.3 Alias Resolver

```text
════════════════════════════════════════════════════════
P0c PREPARATION = ALIAS AUDIT ONLY
Cel: ranking aliasów + ROI + ryzyka → wejście do DF P0c
Zakaz: IMPLEMENT Alias Resolver · commit · push
════════════════════════════════════════════════════════
```

---

## 0. Werdykt

| | |
|--|--|
| **Rekomendacja** | **READY FOR DESIGN FREEZE** |
| **PLAN UPDATE REQUIRED?** | **NIE** — szacunek P0c (**+1–3 pp** Quotes) zgodny z PLAN §2 rank 3 |
| **Warunek DF P0c** | Zamrozić **Wave 1 + Wave 2 (jasne)**; **Wave 2-BIZ** tylko po decyzjach Ownera; **HIGH → poza P0c** (P0d / Noise) |
| **Następny krok** | Owner GO **DESIGN FREEZE P0c** (pakiet reguł + target work IDs) → potem dopiero Owner GO **IMPLEMENT P0c** |

**Kluczowy wniosek (po P0b):** Normalizer nie podniósł Quotes. Lift coverage wymaga **Alias + istniejącego target work w Library** (DF: *alias ≠ tworzenie work*). Część TOP ROI to **LIBRARY_GAP** — nie da się „aliasem” naprawić bez seedu (**P0d**).

---

## 1. Baseline (FROZEN z TV-01 / classify)

| Metryka | Wartość |
|---------|--------:|
| Próba | **18** przetargów · **2228** linii |
| Quotes coverage | **76.4%** (1702/2228) |
| Unmapped | **526** |
| Noise (classify) | **36** |
| Actionable / eligible | **490** |
| Tag `ALIAS_GAP_CANDIDATE` | **55** |
| Cel EPIC (DF) | **88–92%** |

**Szacunek lift P0c (dedup / realizowalność):**

| Scenariusz | Est. linii | Est. pp Quotes | Komentarz |
|------------|----------:|---------------:|-----------|
| **Wave 1 (LOW, jasne)** | ~15 | **~+0.7** | Bezpieczny start |
| **Wave 1+2 (bez BIZ)** | ~50 | **~+2.2** | Target work musi istnieć |
| **+ Wave 2-BIZ (po decyzjach)** | +~26 | **do ~+3.0–3.4** | Po Owner mapowaniu 1:1 |
| **HIGH / usługi / formularz** | — | **0 w P0c** | P0d / Noise / OUT |

Zgodność z PLAN: **+1–3 pp** dla Alias pack — **TAK**. Reszta drogi do 88% = **P0d seed** (+ ewentualnie P1 INNE).

---

## 2. Metoda analizy

1. Wejście: `unmappedRows` z classify (eligible = `noise == null`).  
2. **45 rodzin aliasów** (regex na fold PL) — DF pack + frekwencja powtórzeń z TV-01.  
3. Policzono: wystąpienia · warianty · przetargi · overlap z `ALIAS_GAP_CANDIDATE`.  
4. **Realizowalność:** LOW 85% · MED 55% · HIGH 25% (alias bez Library = 0).  
5. **ROI** = `estRealizableLines × waga ryzyka` (LOW×3 / MED×2 / HIGH×1).  
6. Artefakt liczbowy: `.tmp/catalog-coverage-01-p0c-alias-audit.json` (skrypt `.tmp/catalog-coverage-01-p0c-alias-audit.mjs`).

**REUSE docelowy (DF):** ścieżka CM-01 specialty (`CM01_ALIAS_RULES` w `tender-offer-boq-mapping.ts`) — rozszerzenie packa, **nie** drugi matcher.

---

## 3. Ranking TOP aliasów (ROI)

Wystąpienia = linie eligible TV-01 matching rodzinę (możliwy overlap między rodzinami, np. bruzdy ⊃ zaprawianie).

| # | ID rodziny | Produkt referencyjny | n | Warianty | Est. linii | Est. pp | Ryzyko | BIZ? |
|--:|------------|----------------------|--:|---------:|-----------:|--------:|--------|------|
| 1 | `bruzdy_instalacyjne` | Bruzdy instalacyjne / kuwanie | 23 | 13 | 13 | 0.6 | MED | **TAK** |
| 2 | `zaprawianie_bruzd` | Zaprawianie / zamurowanie bruzd | 8 | — | 7 | 0.3 | **LOW** | NIE |
| 3 | `przebijanie_otworow` | Przebijanie otworów pod rury | 17 | — | 9 | 0.4 | MED | NIE* |
| 4 | `mocowanie_aparatow` | Mocowanie aparatury / osprzętu | 16 | 7 | 9 | 0.4 | MED | NIE* |
| 5 | `oczyszczenie_podloza` | Oczyszczenie / zmywanie podłoża | 13 | 9 | 7 | 0.3 | MED | NIE* |
| 6 | `rury_winidur` | Rury Winidur / PCV | 12 | 9 | 7 | 0.3 | MED | **TAK** |
| 7 | `gzyms_elewacja` | Gzyms / obróbka gzymsu | 10 | 10 | 6 | 0.3 | MED | **TAK** |
| 8 | `zawor_odpowietrzajacy` | Zawór odpowietrzający | 4 | 1 | 3 | 0.1 | **LOW** | NIE |
| 9 | `zabezpieczenie_folia` | Zabezpieczenie okien folią | 4 | — | 3 | 0.1 | **LOW** | NIE |
| 10 | `plyta_gk` | Płyta GK / zabudowa | 8 | 4 | 4 | 0.2 | MED | NIE* |
| 11 | `wykwity_zacieki` | Usunięcie wykwitów / zacieków | 8 | — | 4 | 0.2 | MED | NIE* |
| 12 | `stop_ptakow` | Stop ptaków (elewacja) | 2 | 1 | 2 | 0.1 | **LOW** | NIE |
| 13 | `kostka_brukowa` | Kostka / nawierzchnia | 3 | 3 | 2 | 0.1 | MED | NIE |
| 14 | `multiswitch_antenowy` | Multiswitch / RTV-SAT | 1 | 1 | 1 | ~0 | **LOW** | NIE |
| 15 | `piece_demontaz` | Demontaż pieców / trzonów | 1 | 1 | 1 | ~0 | **LOW** | NIE |

\* „NIE*” = brak twardej niejednoznaczności nazwy, ale **wymaga weryfikacji target work ID w Library** przed IMPLEMENT (inaczej lift = 0).

### 3.1 Poza rankingiem Alias (wysoka frekwencja, OUT P0c)

| ID / fenomen | n | Dlaczego OUT |
|--------------|--:|--------------|
| `rozbiorka_ogolna` | 45 | Zbyt szerokie — **P0d** seed wielu worków |
| `gruntowanie_podloza` | 32 | Szerokie „przygotowanie” — Library / P0d |
| `pomiary_elektryczne_proba` | 28 | Usługa/pomiar (RCD, kominiarz) — nie materiał |
| `podokienniki` | 17 | 3 role: wykucie / obsadzenie / blacha — BIZ+P0d |
| `izolacja_uszczelnienie` | 11 | SKU / orientacja — P0d |
| `formularz_krs_url` | 9 | Artefakt formularza — **rozszerzenie Noise** (nie Alias) |
| `docieplenie_lekka_mokra` / `styropian` | 3+2 | Zestaw ETICS — nie jeden alias |

---

## 4. Grupowanie aliasów wg produktu referencyjnego

### 4.1 HYDRAULIKA / C.O. (DF pack)

| Alias / wariant (przykłady) | n (rodzina) | Target referencyjny |
|-----------------------------|------------:|---------------------|
| Zawór odpowietrzający o śr. 6 mm | 4 | Zawór odpowietrzający |
| Rury winidurowe … w gotowych bruzdach | 12 | Rury Winidur/PCV *(BIZ: vs ogólne PCV)* |
| Zaprawianie bruzd / o szer. do 100 mm | 8 | Zaprawianie bruzd |
| Bruzdy / kucie bruzd (szersze) | 23 | Bruzdy *(BIZ: hydr. vs elektr.)* |
| Przebijanie otworów … śr. rury do 25 mm | 17 | Przebicia pod instalację |
| Zawory pod mywalką… 15 mm *(powtórzenia)* | ~3 | Zawór odcinający *(osobna reguła MED)* |

### 4.2 ELEKTRYKA / TELETECH (DF pack)

| Alias / wariant | n | Target |
|-----------------|--:|--------|
| Mocowanie aparatów … do 2.5 kg / kołki | 16 | Mocowanie aparatury |
| Przygotowanie podłoża pod aparaty / ślepe otwory | (w mocowanie / podłoże) | Ślepe otwory / pod kołki |
| Multiswitch / antena | 1 | Instalacja RTV-SAT |

### 4.3 ELEWACJE

| Alias / wariant | n | Target |
|-----------------|--:|--------|
| Gzyms (różne obróbki) | 10 | Gzyms *(BIZ: blacha vs tynk)* |
| Stop ptaków | 2 | Stop ptaków |
| Styropian / lekka-mokra | niska | **P0d**, nie P0c |

### 4.4 PRZYGOTOWANIE / GK / INNE (jasne vs seed)

| Alias / wariant | n | Target / decyzja |
|-----------------|--:|------------------|
| Oczyszczenie i zmycie podłoża | 13 | Oczyszczenie podłoża *(weryfikacja WC)* |
| Płyty GK — obudowa belek/słupów | 8 | Zabudowa GK |
| Skasowanie wykwitów (zacieków) | 7–8 | Usunięcie wykwitów |
| Zabezpieczenie okien folią | 3–4 | Zabezpieczenie folią |

---

## 5. Wpływ na Coverage (Quotes)

```text
Baseline Quotes          76.4%
Po P0a/P0b (prod)        76.4%  (bez zmian Quotes — potwierdzone)
Po P0c Wave1 alone     ~77.1%  (+0.7 pp)   — jeśli target work + Quotes istnieją
Po P0c Wave1+2         ~78.6%  (+2.2 pp)   — realistyczny pakiet P0c
Po P0c + BIZ resolved  ~79.5%  (+~3 pp)    — górna półka Alias (PLAN)
Cel EPIC 88–92%        → pozostałe ~9–13 pp = P0d (+ P1 INNE)
```

**Hard gate DF (już zamrożony):** alias **nie** zapisuje Library / Quotes. Jeśli work nie istnieje → linia zostaje unmapped → **0 pp**.

---

## 6. Rekomendowana kolejność wdrażania

### Wave 1 — DESIGN FREEZE / IMPLEMENT first (LOW)

1. `zaprawianie_bruzd`  
2. `zawor_odpowietrzajacy`  
3. `zabezpieczenie_folia`  
4. `stop_ptakow`  
5. (opc.) `multiswitch_antenowy`, `piece_demontaz` — niski wolumen, niski koszt

**Acceptance Wave 1:** OV na próbie TV-01 · Quotes ≥ baseline · false-map sample 0 na regułach LOW.

### Wave 2 — po weryfikacji target work w WC (MED, bez BIZ)

1. `przebijanie_otworow`  
2. `mocowanie_aparatow`  
3. `oczyszczenie_podloza`  
4. `plyta_gk`  
5. `wykwity_zacieki`  
6. `kostka_brukowa`

Jeśli brak work → **kolejka P0d**, nie forsować aliasu „w próżnię”.

### Wave 2-BIZ — tylko po decyzji Ownera

| ID | Pytanie biznesowe | Opcje (szkic) |
|----|-------------------|---------------|
| `bruzdy_instalacyjne` | Jedna robota „bruzdy” czy osobno hydr./elektr./ogólne? | A) jeden work · B) 2–3 worki + reguły kontekstowe · C) tylko `zaprawianie_bruzd` w P0c |
| `rury_winidur` | Winidur = alias do PCV kanalizacja / osobny SKU? | A) map → rury PCV · B) osobny work Winidur + Quotes · C) P0d |
| `gzyms_elewacja` | Gzyms = obróbka blacharska / tynk / izolacja? | A) jeden „gzyms” · B) rozdział po słowach kluczowych · C) P0d |

### Wave DEFER — poza P0c

- `rozbiorka_ogolna`, `gruntowanie_podloza`, `podokienniki`, `izolacja_uszczelnienie`, ETICS/styropian → **P0d**  
- `pomiary_elektryczne_proba` → work usługowy lub OUT Detect  
- `formularz_krs_url` → kandydat **Noise P0a+** (osobny mini-slice, nie Alias)

---

## 7. Ocena ryzyka (per alias / fala)

| Fala / ID | Ryzyko false-map | Ryzyko 0-lift (brak WC) | Ryzyko scope | Mitygacja |
|-----------|------------------|------------------------|--------------|-----------|
| Wave 1 LOW | **Niskie** | Średnie | Niskie | OV · target ID w DF |
| Wave 2 MED | Średnie | **Wysokie** | Średnie | Weryfikacja WC przed merge reguł |
| Wave 2-BIZ | **Wysokie** bez decyzji | Wysokie | Średnie | Tabela decyzji Owner |
| HIGH / usługi | Bardzo wysokie | — | Wysokie | **Zakaz w P0c** |
| CM-01 overlap (stolarka) | Średnie | Niskie | Niskie | Nie dublować reguł drzwi/okna |

**Zasady ryzyka (DF P0c):**

- Alias = **równoważność frazy → istniejący work** (lineRe + workRe + boost), jak CM-01.  
- **Nie** obniżać globalnego progu score.  
- **Nie** fuzzy ON.  
- **Nie** tworzyć work z Alias Resolver.

---

## 8. Decyzje biznesowe wymagane przed pełnym packiem

| # | Temat | Blokuje | Rekomendacja audytu |
|---|-------|---------|---------------------|
| D1 | Bruzdy: jeden vs wiele targetów | Wave 2-BIZ + część hydr. | W P0c tylko **`zaprawianie_bruzd`**; szersze bruzdy po D1 |
| D2 | Winidur → PCV czy osobny produkt | `rury_winidur` | Preferuj map do istniejącego PCV **jeśli** Quotes/work jest; inaczej P0d |
| D3 | Gzyms — typ wykończenia | `gzyms_elewacja` | Bez reguły do D3; elewacja zostaje w P0d jeśli brak work |
| D4 | Czy pomiary RCD / opinie idą do WC? | 28 linii | **Nie Alias** — decyzja Noise vs work usługowy (osobny GO) |
| D5 | URL/KRS w kosztorysie | 9 linii | Rozszerzenie Noise (nie P0c) |

**Wave 1+2 bez D1–D3 jest wystarczający do DF i pierwszego IMPLEMENT P0c.**

---

## 9. Zgodność z PLAN / DF (czy update?)

| Element PLAN/DF | Status po audycie |
|-----------------|-------------------|
| Alias +1–3 pp | **Potwierdzone** (~0.7 → ~2.2 → ~3 pp) |
| Pack: hydr. / elew. / teletech / bruzdy / winidur / odpowietrzniki | **Potwierdzone** frekwencją |
| Alias ≠ Library write | **Bez zmian** |
| REUSE CM-01 path | **Bez zmian** |
| Cel 88–92% samym P0c | **Niemożliwe** — już w PLAN (seed P0d) |

→ **PLAN UPDATE REQUIRED = NIE.**  
→ **READY FOR DESIGN FREEZE** (slice P0c: zakres Wave 1+2, BIZ jako hold, HIGH out).

---

## 10. Acceptance szkic pod DF P0c (nie IMPLEMENT)

| ID | Kryterium |
|----|-----------|
| AC-P0c-1 | Reguły tylko z listy DF Wave 1 (+ Wave 2 po check WC) |
| AC-P0c-2 | Każda reguła ma **udokumentowany target work** (id/nazwa) istniejący w `kw-wgdom-work-catalog` |
| AC-P0c-3 | TV-01 Quotes: baseline **76.4%** ≤ wynik ≤ baseline+~3.5 pp; **brak regresji** mapped+missing Quotes |
| AC-P0c-4 | False-map OV sample: 0 na Wave 1; Wave 2 ≤ uzgodniony próg |
| AC-P0c-5 | Zero zapisów Library/Quotes · zero fuzzy · zero drugi matcher |
| AC-P0c-6 | Feature flag / uplift path zgodny z CM-01 (bez zmiany CORE gdy flag OFF) — do ustalenia w DF |

---

## 11. Artefakty

| Plik | Rola |
|------|------|
| Ten dokument | **SSOT P0c PREPARATION** |
| `.tmp/catalog-coverage-01-p0c-alias-audit.json` | Ranking liczbowy |
| `.tmp/catalog-coverage-01-p0c-alias-audit.mjs` | Skrypt RO |
| `.tmp/catalog-coverage-01-classify.json` | Unmapped classify |
| [`CATALOG-COVERAGE-01-DESIGN-FREEZE.md`](CATALOG-COVERAGE-01-DESIGN-FREEZE.md) §2.3 | Alias FROZEN (epic) |
| [`CATALOG-COVERAGE-01-PLAN.md`](CATALOG-COVERAGE-01-PLAN.md) | ROI Alias +1–3 pp |

---

## 12. NEXT / zakazy

```text
NEXT: Owner GO → DESIGN FREEZE P0c (pakiet reguł + target IDs)
      potem Owner GO → IMPLEMENT P0c
NIE: auto-start IMPLEMENT · commit · push · P0d · SMART · MS
NIE: alias dla HIGH / pomiarów / KRS
```

---

## 13. Podpis rekomendacji

```text
════════════════════════════════════════════════════════
CATALOG-COVERAGE-01 P0c ALIAS AUDIT
Werdykt: READY FOR DESIGN FREEZE
PLAN UPDATE REQUIRED: NIE
Est. lift P0c: +0.7 (W1) … +2.2 (W1+W2) … ~+3 pp (+BIZ)
Epic 88–92%: nadal wymaga P0d
════════════════════════════════════════════════════════
```
