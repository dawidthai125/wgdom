# CATALOG-COVERAGE-01 — P0e ARCHITECTURE REVIEW

> **ID:** CATALOG-COVERAGE-01-P0e-ARCHITECTURE-REVIEW  
> **EPIC:** CATALOG-COVERAGE-01 · **Slice:** **P0e — FULL Library Seed**  
> **Etap:** **ARCHITECTURE REVIEW** · **DOCS ONLY**  
> **Data:** 2026-07-31  
> **DF (zaakceptowany):** [`CATALOG-COVERAGE-01-P0e-DESIGN-FREEZE.md`](CATALOG-COVERAGE-01-P0e-DESIGN-FREEZE.md) · **BIZ-P0e-1 = Wariant A**  
> **PLAN:** [`CATALOG-COVERAGE-01-P0e-PLAN.md`](CATALOG-COVERAGE-01-P0e-PLAN.md) · **AUDIT:** [`CATALOG-COVERAGE-01-P0e-AUDIT.md`](CATALOG-COVERAGE-01-P0e-AUDIT.md)  
> **Kod referencyjny (AS-IS, bez zmian w P0e):** Pack · Guard · `alias-resolver.ts` · `tender-offer-boq-mapping.ts` · OPS P0d-A  
> **Zakaz:** IMPLEMENT · commit · push · edycja Guard/Pack/SMART/MS/Quotes engine

```text
════════════════════════════════════════════════════════
CATALOG-COVERAGE-01 P0e ARCHITECTURE REVIEW
Decyzja: READY FOR OWNER GO
Kontrole Owner 1–7: ALL PASS · FAIL = 0
CHANGES REQUIRED: NIE
════════════════════════════════════════════════════════
```

---

## 0. Metoda

| Element | Wartość |
|---------|---------|
| Zakres | DF P0e FROZEN vs kontrole Ownera AR **1–7** + kod AS-IS (P0d-A) |
| Charakter P0e | **FEATURE-DATA ONLY** — seed 3 works + Quotes REUSE; **0** zmian architektury pipeline |
| Kryterium PASS | DF spójny z kodem · zakres = 3 ID · BIZ A bez Pack · DATA FIRST · brak nowych konfliktów · Coverage osiągalne bez zmiany arch |
| Kryterium FAIL | Niejasność zakresu · wymóg zmiany Guard/Pack · konflikt SMART/MS/Quotes · Coverage wymaga nowej architektury |
| IMPLEMENT | **brak** w tej sesji |

---

## 0.1 Werdykt

| | |
|--|--|
| **STATUS** | **READY FOR OWNER GO** |
| **CHANGES REQUIRED?** | **NIE** |
| **FAIL** | **0** |
| **Następny krok** | Owner GO **IMPLEMENT P0e** (FEATURE-DATA 3 seeds + Quotes + OV) — **nie** auto-start |
| **IMPLEMENT / commit / push** | **ZAKAZ** do jawnego Owner GO IMPLEMENT |

**Jednozdaniowo:** P0e jest czystym odblokowaniem DATA FIRST trzech reserved ID; architektura Guard→Bind→Alias|Core pozostaje nienaruszona; BIZ A nie wymaga Pack; Coverage **~77.3%** osiągalne samym seedem.

---

## 1. Kontrole Ownera (PASS / FAIL)

### 1. Zgodność implementacyjna z DESIGN FREEZE

| Check | Dowód | Ocena |
|-------|-------|--------|
| Klasa FEATURE-DATA | DF §1 · §5.5 · D-P0e-10 | **OK** |
| Tor zapisu | REUSE OPS P0d-A / `commitMarketQuotesImport` — DF §3 · §5.2 | **OK** |
| Zero nowego matchera | DF §5.2 · pipeline §6 = AS-IS P0d-A | **OK** |
| Diff Guard/Pack zakazany | D-P0e-4/5 · AC-P0e-7 · G-D5 | **OK** |
| Karty seed 1:1 z reserved Pack | DF §3.1–§3.3 ≡ Pack `productId` | **OK** |
| Higiena H-1…H-5 | DF §7 — kontrakt danych, nie nowa warstwa arch | **OK** |
| Gate G1–G9 ALL-NIE | DF §1 · §5.5 | **OK** |

**Ścieżka IMPLEMENT (kontrakt AR):** OPS seed 3 works + Quotes → OV TV-01 → changelog tip — **bez** PR zmieniającego `negation-guard.ts` / `alias-pack-wave1.ts` / SMART / MS / Quotes engine.

**Werdykt: PASS**

---

### 2. Zakres wyłącznie: zaprawianie · folia · multiswitch

| Product ID | Alias rule | DF | Pack AS-IS |
|------------|------------|-----|------------|
| `cc-p0c-w1-zaprawianie-bruzd` | `zaprawianie_bruzd` | §3.1 APPROVED | `productId` zgodny |
| `cc-p0c-w1-zabezpieczenie-folia` | `zabezpieczenie_folia` | §3.2 APPROVED | `productId` zgodny |
| `cc-p0c-w1-multiswitch-antenowy` | `multiswitch_antenowy` | §3.3 APPROVED | `productId` zgodny |

| Check | Ocena |
|-------|--------|
| Liczba FULL seeds = **3** | **PASS** |
| SAFE (zawór/stop) OUT re-seed | **PASS** (DF §12) |
| Wariant B / Wave 2 / top grupy OUT | **PASS** (D-P0e-1/3 · AC-P0e-9) |
| Zakaz seed spoza §3 | **PASS** (DF §3.4) |

**Werdykt: PASS**

---

### 3. BIZ-P0e-1 (1 Product ID folia) a Alias Pack

| Pytanie | Odpowiedź arch |
|---------|----------------|
| Czy 1 ID pokrywa Pack? | **TAK** — reguła `zabezpieczenie_folia` → dokładnie `cc-p0c-w1-zabezpieczenie-folia` |
| Czy Pack musi się zmienić dla Wariantu A? | **NIE** — D-P0e-2/4 · sonda: **9** hitów Pack już obejmuje okna/drzwi/stolarkę/podłogi |
| Czy Wariant B wymagałby Pack? | **TAK** — OUT P0e (DF §2) |
| Konflikt z „Alias Precision bez zmian”? | **BRAK** przy A |

**Dowód Pack (AS-IS):**

```text
aliasRuleId: zabezpieczenie_folia
productId:   cc-p0c-w1-zabezpieczenie-folia
test:        zabezpieczenie okien fol | oklejanie fol | zabezpieczenie … foli
```

Jedna reguła · jeden Product ID · first match — zgodne z BIZ A bez edycji Pack.

**Werdykt: PASS** — BIZ A **nie** wymaga zmian Alias Pack.

---

### 4. DATA FIRST

| Warstwa | Zachowanie AS-IS | P0e efekt |
|---------|------------------|-----------|
| `resolveCatalogCoverageAlias` | `resolvedProductId` tylko gdy work aktywny w Library; inaczej `missingWork` | Seed → bind odblokowany |
| Mapper | Alias bind gdy `decideCatalogCoverageBindProductId` ≠ null | REUSE |
| Przed P0e | 3 FULL ID: match tekstowy możliwy, bind **no-op** | Stan oczekiwany |
| Po P0e | work + Quotes ⇒ Alias override Core (P0c DF) | Zamierzony |

**Kod SSOT:** `alias-resolver.ts` — komentarz / logika DATA FIRST (`resolvedProductId = work ? hit.productId : null`).

P0e **nie** zmienia Resolver — tylko zasila Library.  
**Werdykt: PASS**

---

### 5. Konflikty z Guard · Alias Precision · SMART · MARKET-SYNC · Quotes Engine

| Obszar | Wymaganie DF | Konflikt arch? | Ocena |
|--------|--------------|----------------|--------|
| **Negation Guard** | 0 zmian · REUSE na zaprawianie (Alias\|Core) | **NIE** — seed ujawnia Guard (już w P0d-A); TN-CORE-Z1 REUSE | **PASS** |
| **Alias Precision** | 0 zmian Pack | **NIE** — BIZ A + Precision P0d-A wystarczają | **PASS** |
| **SMART** | 0 zmian · nie start P1 | **NIE** — brak wire P0e→SMART | **PASS** |
| **MARKET-SYNC** | 0 zmian · nie start P2 | **NIE** — Quotes append ≠ MS Accept/Publish rewrite | **PASS** |
| **Quotes Engine** | REUSE append only · bez rewrite | **NIE** — ten sam tor co SAFE P0d-A | **PASS** |

**Bind path (AS-IS, bez zmian P0e):**

```text
Alias resolve → decideCatalogCoverageBindProductId (Guard)
Core candidates → filtr Guard → decideCatalogCoverageBindProductId
```

(`tender-offer-boq-mapping.ts` — REUSE)

**Werdykt: PASS** — brak nowych konfliktów architektonicznych.

---

### 6. False positive / duplikaty mapowań

| Ryzyko | Stan po Precision + Guard | Ocena AR |
|--------|---------------------------|----------|
| *bez zaprawiania bruzd* → zaprawianie ID | Guard + Pack positive · OV P0d-A **0**/10 · negLines **10** chronione | **NIE nowy FP** — kontrakt REUSE |
| RTV/SAT → multiswitch | Pack = tylko `multiswitch` · aliasFalseHits **0** | **NIE nowy FP** |
| Remap zamurowanie → zaprawianie (+5) | Świadomy · D-P0e-8 AKCEPT | **Nie FP** — poprawa precyzji |
| Remap stolarka/podłogi → folia (+5) | Świadomy · BIZ A · D-P0e-8 | **Nie FP** — zamierzony override Alias |
| Core bare `folia` / `bruzd` | Mitigacja **H-2** (frazy) · **H-1** (bez legacyCategory) — lekcja SAFE | **Ryzyko danych**, nie luka arch — Gate H/OV |
| Duplikat Product ID w Library | Reserved ID nowe · SAFE już inne ID | **BRAK kolizji ID** |
| Multi-hit Alias | First match Pack FROZEN | **BRAK** nowego rankingu |

**Duplikaty mapowań:** Alias override Core jest **istniejącym** kontraktem P0c (nie nowym w P0e). Remapy §AUDIT są **zaakceptowane** w DF — nie wymagają drugiej reguły Pack ani bind-if-unmapped.

**Werdykt: PASS** — brak nowych FP wynikających z architektury; ryzyko Core = higiena FEATURE-DATA + OV.

---

### 7. Prognoza Coverage ~77.3% bez zmian architektury

| Składnik | Wartość | Źródło |
|----------|--------:|--------|
| Baseline | **76.7%** (1709/2228) | OV P0d-A / sonda P0e |
| Lift unmapped FULL | **+13** | zapraw +8 · folia +4 · multi +1 |
| Po seed + Quotes | **~77.3%** (1722/2228) | +0.6 pp |
| Remap 10 linii | **0** Δ% Quotes | już cytowane |

| Check | Ocena |
|-------|--------|
| Lift wynika z DATA FIRST + Quotes REUSE | **PASS** |
| Wymagana zmiana pipeline / Fuzzy / Wave 2? | **NIE** |
| Wymagana zmiana Guard/Pack? | **NIE** |
| Target DF ≥ 77.2% / prognoza ~77.3% spójne | **PASS** |
| Cel EPIC 88–92% jako wymóg P0e? | **OUT** — nie blokuje AR |

**Werdykt: PASS** — Coverage osiągalne **bez** zmian architektury.

---

## 2. Macierz zgodności DF ↔ kod AS-IS

| Decyzja DF | Plik / mechanizm | Zgodność |
|------------|------------------|----------|
| D-P0e-1 (3 ID) | Pack Wave 1 reserved | **PASS** |
| D-P0e-2 (BIZ A) | 1× `zabezpieczenie_folia` | **PASS** |
| D-P0e-4/5 (0 Pack/Guard) | brak diff w zakresie P0e | **PASS** |
| D-P0e-6 (SMART/MS/Quotes engine) | brak wire | **PASS** |
| D-P0e-7 (Quotes REUSE) | OPS P0d-A wzorzec | **PASS** |
| DATA FIRST | `alias-resolver.ts` | **PASS** |
| Guard Alias\|Core | `negation-guard` + mapping | **PASS** |
| ZERO DUP negacji | Pack REUSE Guard helpers | **PASS** (P0d-A) |

---

## 3. Ryzyka rezydualne (nie FAIL AR)

| Ryzyko | Poziom | Obsługa |
|--------|--------|---------|
| Core FP przy złych keywords seed | MED | H-1…H-5 · Gate DATA · OV przed RELEASE |
| Semantyka jednego ID folia | LOW/MED BIZ | Zaakceptowane Ownerem (Wariant A) |
| Mikro-lift vs oczekiwania EPIC | LOW plan | DF D-P0e-9 jawny OUT 88–92% |

Żadne z powyższych **nie** wymaga CHANGES REQUIRED w DF/architekturze przed IMPLEMENT.

---

## 4. Status końcowy

```text
════════════════════════════════════════════════════════
STATUS: READY FOR OWNER GO
════════════════════════════════════════════════════════
```

| | |
|--|--|
| **READY FOR OWNER GO** | **TAK** |
| **CHANGES REQUIRED** | **NIE** |
| **Kontrole 1–7** | **7/7 PASS** |
| **IMPLEMENT** | **ZAKAZ** do jawnego Owner GO |
| **Commit / push** | **NIE wykonano** |

**Rekomendacja Ownerowi:** wydać **Owner GO IMPLEMENT P0e** (FEATURE-DATA: 3 seeds + Quotes REUSE + higiena H-* + OV AC-P0e-* + tip).  
**Nie** zmieniać Negation Guard · Alias Pack · SMART · MARKET-SYNC · Quotes engine.

---

## 5. Zakazy (sesja ARCHITECTURE REVIEW)

- IMPLEMENT Library / Quotes  
- commit · push  
- Zmiana DF bez nowego Owner GO  
- Auto-start IMPLEMENT
