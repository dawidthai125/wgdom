# WORK-CATALOG-P3.3 — AUDIT

> **ID:** WORK-CATALOG-P3.3-AUDIT  
> **TRYB:** **AUDIT ONLY · DOCS ONLY**  
> **Data:** 2026-07-29  
> **STATUS:** **AUDIT COMPLETE**  
> **Baseline tip:** UI **2.65.78** · feature AI-COST-02-B **`9dc113e7`** · SSOT [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md)  
> **Punkt startowy:** AI-COST-02-B = **CLOSED · PV**  
> **Zakaz:** IMPLEMENT · PLAN · DESIGN FREEZE · commit · push  

```text
════════════════════════════════════════════════════════
Cel AUDIT: czy Work Catalog P3.3 (Market Pricing UX)
powinien być kolejnym EPIC WGDOM po 02-B CLOSED.
════════════════════════════════════════════════════════
```

---

## 0. Identyfikacja EPIC-u (rozróżnienie nazw)

| Nazwa w docs | Znaczenie | Status |
|--------------|-----------|--------|
| **P3.3A / P3.3B / P3.3D** (historyczne) | Benchmark robocizny read-only (2.56.3–5) | **CLOSED** — **nie** ten EPIC |
| **Work Catalog P3.3** (ROADMAP / NEXT) | **Market Pricing UX** — domknięcie UX Biblioteki Robót nad silnikiem P3.1–P3.2 | **BACKLOG** · DF D‑A…D‑D **niekompletny formalnie** |
| **NG-05 MPI** | Market Pricing Intelligence (szeroki program) | Design **COMPLETE** · IMPLEMENT **BLOCKED** (legal AD-01) — **nie** zastępować P3.3 |

**Ten AUDIT dotyczy wyłącznie:** **WORK-CATALOG-P3.3 = Market Pricing UX** (integracja UI + zaufanie + operacje na `marketQuotes` w Bibliotece Robót).

---

## 1. Problem biznesowy

**Problem:** Silnik rynkowy i persystencja importu **już istnieją** (P3.1 Market Average + adapters + CSV preview; P3.2 apply / rollback / commit), a COST-02-A / GAP-A **już czytają** `marketQuotes` — ale **kosztorysant / Owner nie ma domkniętego, wiarygodnego UX** w Bibliotece Robót, żeby:

1. widzieć i rozumieć cenę rynkową vs cenę firmy (status, źródła, confidence),  
2. zasilać / aktualizować `marketQuotes` w codziennej pracy (import → preview → commit z jasnym skutkiem),  
3. ufać pokryciu katalogu (które roboty mają rynek, które seed/legacy),  
4. świadomie stosować rynek do ceny firmy (tam gdzie DF na to pozwoli) **bez** scrapingu i **bez** NG-05.

**Skutek dziś:** ścieżka wyceny AI/Bid ma „gniazdo” na market, ale **jakość danych wejściowych** zależy od ręcznego / fragmentarycznego zasilenia katalogu → luka Bid vs Owner (~1,21M vs ~1,6M) **nie domyka się sama** explainem (02-B) ani samą flagą GAP-A.

**Sukces P3.3 ≠** Bid == 1,6M.  
**Sukces P3.3 =** Biblioteka Robót staje się **operacyjnym SSOT cen rynkowych** używanych przez wycenę.

---

## 2. Moduły konsumujące / dotknięte

| Moduł | Rola względem P3.3 | Wpływ |
|-------|-------------------|--------|
| **Work Catalog (Biblioteka Robót)** | **Primary** — UX + operacje na `marketQuotes` / porównanie / import | **WYSOKI** (IN) |
| **AI-COST / OfferBoq** | Konsument **read-only** (`createControlledMarketPriceProvider`, COST-02-A) | **ŚREDNI** (pośredni — lepsze quotes) |
| **Przetargi / Bid Proposal** | Konsument przez catalog/OfferBoq + opcjonalnie GAP-A market overlay | **ŚREDNI** (pośredni) |
| **Kosztorysy (OfferBoq panel)** | Już pokazuje benchmark gdy market hit; lepszy katalog → lepszy sygnał | **ŚREDNI** (pośredni) |
| **Roboty (Jobs)** | Brak bezpośredniej zależności | **BRAK** (OUT) |
| **Harmonogram** | Brak | **BRAK** (OUT) |
| **Payroll** | Brak — **zakaz** path | **BRAK** (OUT · Safety Gate) |
| **Raporty** | Ewentualny przyszły export coverage — poza Phase 1 | **NISKIE / OUT Phase 1** |
| **NG-05 MPI** | Osobny program (legal BLOCKED) — **nie** mieszać | **OUT** |

---

## 3. Korzyści biznesowe

| Korzyść | Opis |
|---------|------|
| **Lepsze wejście do wyceny** | Więcej / świeższe `marketQuotes` → silniejszy controlled market w AI-COST i GAP-A (gdy ON) |
| **Zaufanie kosztorysanta** | Transparentność źródła/confidence zamiast „czarnej skrzynki” średniej |
| **Trwała baza firmy** | Katalog = asset wieloprzetargowy (nie one-off per tender) |
| **Separacja od legal/scraping** | Wartość bez odblokowania NG-05 (AD-01) |
| **Domknięcie inwestycji P3.1–P3.2** | Silnik bez UX = niepełny ROI |

---

## 4. REUSE FIRST — co już jest

| Warstwa | Artefakt | Status |
|---------|----------|--------|
| Lib P3.1 | `market-average-engine.ts`, adapters (wgdom/kb/sekocenbud/interbud), CSV preview, seed mapping | **SHIPPED** |
| Lib P3.2 | `apply-market-quotes.ts`, `rollback-market-quotes.ts`, `commit-market-quotes.ts` | **SHIPPED** |
| COST-02-A | `createControlledMarketPriceProvider` (odczyt `marketQuotes`) | **CLOSED** |
| GAP-A | Overlay catalog path z market (flaga OFF default) | **CLOSED** |
| UI partial P3.3 | `work-catalog-market-engine.ts` (**S1**), MarketComparison **S2/S3**, testy `test-work-catalog-market-*` | **Częściowo w kodzie** |
| Decyzje w kodzie | **D-A** (a2: nowy moduł obok legacy), **D-B** (b1: `activeRegion` → start region) | **Zapisane w komentarzu S1** — **brak formalnego DF pliku** |
| UI import | `WorkCatalogCsvImportPreviewPanel` | **Istnieje** — wymaga audytu kompletności vs P3.2 commit UX |
| Store / sync | `work-catalog-store` · `work-catalog-sync` · `catalog-write-router` | **REUSE** |

**Wniosek REUSE:** P3.3 **nie** buduje nowego silnika cen — **domyka UX i workflow** nad istniejącym stosem. Zakaz duplikacji progów porównania (SSOT P2.5 `buildMarketComparison`) już przestrzegany w S1.

---

## 5. Zależności od wcześniejszych EPIC-ów

| Zależność | Stan | Blokuje start AUDIT/DF? |
|-----------|------|-------------------------|
| Work Catalog P1 Foundation / P2 UI | CLOSED | Nie |
| **P3.1** Market Average | CLOSED | Nie — **wymagane** jako baza |
| **P3.2** Import Persistence | CLOSED | Nie — **wymagane** dla apply/commit |
| **COST-02-A** | CLOSED | Nie — konsument gotowy |
| **AI-COST-02-B** | CLOSED | Nie — komplementarne (explain ≠ dane) |
| **GAP-A** | CLOSED | Nie — opcjonalny konsument |
| **NG-05 MPI-0** | BLOCKED legal | **Nie** — P3.3 świadomie **omija** MPI |
| Formalne **D‑C / D‑D** + spójny DF | **PENDING** | **Tak dla IMPLEMENT** — nie dla tego AUDIT |

**Werdykt zależności:** P3.3 jest **gotowy do DF** pod względem prequel EPIC-ów; **nie** jest gotowy do IMPLEMENT bez domknięcia decyzji D‑C/D‑D (i potwierdzenia pozostałego zakresu S4+ vs już shipped S1–S3).

---

## 6. Ryzyka

| ID | Ryzyko | Mitigacja |
|----|--------|-----------|
| R1 | **Scope creep → NG-05 / scraping / feedi zewnętrzne** | OUT twarde; tylko kontrolowane CSV / istniejące adapters |
| R2 | **Duplikacja logiki market** (UI liczy średnią osobno) | UI tylko Public API Engine (wzorzec S1–S3) |
| R3 | **Write path katalogu / cloud sync kolizja** | REUSE `commit-market-quotes` + router; **bez** `cloud-sync.ts` Payroll |
| R4 | **Zmiana cen firmy „przy okazji” psuje Bid** | Apply market → company price tylko opt-in + preview; flaga / rollback snapshot |
| R5 | **Niejasny residual scope** (S1–S3 już w repo, ROADMAP mówi „DF pending”) | DF musi wypisać **tylko brakujące** slice (np. S4+ coverage / apply-to-company / mobile polish) |
| R6 | **Kolizja nazwy z P3.3A–D** | Dokumentacja: ID = `WORK-CATALOG-P3.3` · etykieta „Market Pricing UX” |
| R7 | **Stabilization Window** | Thin FEATURE; Gate ALL-NIE; Owner GO |
| R8 | **Oczekiwanie Bid=1,6M po samym UX** | Komunikat sukcesu = coverage/zaufanie katalogu, nie kwota oferty |

---

## 7. Czy istnieją ważniejsze EPIC-i?

| Kandydat | vs P3.3 | Werdykt AUDIT |
|----------|---------|---------------|
| **GAP-B** (costModel / stack) | Szybszy wpływ na **kwotę** Bid, ale wymaga modelu Ownera + DF; wyższy blast vs freeze | **Alternatywa „pieniądz teraz”** — nie automatycznie wyższa |
| **AI-COST-02 I3** Competitiveness RO | Cienki UX wyceny; **nie** zasila katalogu | Komplementarny — **nie** zastępuje P3.3 |
| **TP200B** fidelity | Może podnieść Aggregate przez kompletność pozycji; **wysokie** ryzyko parserów | Ważny, ale **nie** NEXT bez wąskiego DF |
| **HEAVY-PERSIST-01** | Ops / cross-device | P2 — chyba że Owner widzi powtarzalne LS≠KV |
| **NG-05 MPI-0** | Wysoki wpływ, **BLOCKED** legal | **Nie startowalny** |
| **Payroll / HARDENING CORE** | Krytyczne gdy incydent | **NONE** nowych prac wyceny; nie mieszać |
| **BODY-S5 / GDS-02** | UI chrome | Niższy wpływ biznesowy oferty |

**Wniosek:** Nie ma **jasno ważniejszego i startowalnego** EPIC-u wyceny niż P3.3 **dla toru „dane katalogu”**. Jeśli Owner priorytetuje **domknięcie kwoty oferty w jednym releasie**, wyższy priorytet ma **GAP-B AUDIT** (osobna decyzja) — nie TP200B/NG-05.

---

## 8. Ocena wielokryterialna

Skala: **1 = niski** · **5 = wysoki** (dla kosztu/ryzyka/złożoności: 5 = drogo/ryzykownie/trudno).

| Kryterium | Ocena | Komentarz |
|-----------|-------|-----------|
| **Wartość biznesowa** | **4** | Asset wieloprzetargowy + ROI P3.1/P3.2 |
| **Wpływ na użytkowników** | **4** | Bezpośredni UX Biblioteki; pośredni kosztorysant oferty |
| **Wpływ na AI-COST** | **3–4** | Pośredni (jakość `marketQuotes`); nie zmienia S1–S7 |
| **Wpływ na Work Catalog** | **5** | To jest „home” EPIC katalogu |
| **Koszt implementacji** | **3** | M–L, ale duży REUSE; residual po S1–S3 mniejszy niż greenfield |
| **Ryzyko** | **3** | Średnie (persist katalogu); niskie vs Payroll/parsery |
| **Złożoność** | **3** | UX + decyzje D‑C/D‑D; silnik już jest |

---

## 9. Rekomendacja priorytetu

| Poziom | Werdykt |
|--------|---------|
| **P0** | **NIE** — brak blockerów produkcji / payroll / data-loss |
| **P1** | **TAK** — rekomendowany priorytet portfolio po 02-B |
| **P2** | Nie — zbyt nisko względem ROI katalogu |
| **P3** | Nie |

**Priorytet AUDIT: P1**

---

## 10. Proponowany zakres (gdy NEXT) — **nie PLAN / nie DF**

### IN (propozycja Phase 1)

- Domknięcie **Market Pricing UX** w Bibliotece Robót nad P3.1–P3.2  
- Formalizacja / potwierdzenie decyzji **D‑A…D‑D** w DF (D‑A/D‑B już w kodzie S1 — do ratyfikacji)  
- Residual po S1–S3: workflow import→preview→commit widoczny i bezpieczny; coverage / freshness market; mobile-first (min 44px, czytelne źródła)  
- Opt-in „zastosuj rynek → cena firmy” **tylko** jeśli D‑C/D‑D to zamrozi  
- Testy RO/UX + regresja P3.1/P3.2 commit/rollback  

### OUT

- NG-05 MPI / scraping / nowe feedy legal-sensitive  
- Parsery ZIP/ATH · Discovery rewrite  
- Bid calculator / przebudowa S1–S7 / AI-COST-01 thaw  
- GAP-B costModel · hardcode 1,6M  
- Payroll · `cloud-sync.ts` CORE · Storage CORE rewrite  
- Harmonogram · Jobs · Raporty export (Phase 1)  
- I3 Competitiveness (osobny thin slice AI-COST)  

### REUSE

- `computeMarketAverageForWork` · adapters · CSV preview  
- `apply` / `rollback` / `commit` market quotes  
- `buildMarketComparison` (progi) · `createControlledMarketPriceProvider`  
- `WorkCatalogMarketComparison` + `work-catalog-market-engine` (S1–S3)  
- `catalog-write-router` · istniejący sync katalogu  

### Acceptance Criteria (kierunkowe)

1. Kosztorysant widzi dla roboty: cenę firmy, cenę rynku, status, źródła, confidence — **z Engine API** (bez lokalnej średniej w UI).  
2. Import CSV → preview → commit aktualizuje `marketQuotes` z możliwością rollback lokalnego (REUSE P3.2).  
3. Flaga/opt-in nie zmienia Bid path bez świadomej akcji; default bezpieczny.  
4. Mobile: porównanie i CTA ≥ 44px; brak regresji listy Biblioteki.  
5. Payroll Safety Gate **ALL-NIE** · zero zmian Payroll.  
6. Regresja: testy P3.1/P3.2 + S1–S3 zielone.  

### Risk (skrót)

R1 scope→MPI · R3 persist · R4 cena firmy · R5 niejasny residual — patrz §6.

### Rollback

- Feature flag UI (jeśli DF wprowadzi) OFF → parity tip  
- Snapshot marketQuotes (P3.2) przy commit  
- Bez migracji destrukcyjnej schematu catalog v4  

---

## 11. Zgodność z zasadami

| Zasada | Ocena |
|--------|-------|
| **SSOT FIRST** | **PASS** — ceny rynkowe w `marketQuotes` / Work Catalog store; tip w `09`; bez drugiego kalkulatora |
| **REUSE FIRST** | **PASS** — silnik + commit + controlled market już są |
| **ZERO DUPLICATE LOGIC** | **PASS warunkowy** — DF musi zakazać lokalnych średnich/progów w UI |
| **MOBILE FIRST** | **PASS warunkowy** — IN: touch targets / czytelność porównania |
| **Payroll Safety Gate** | **PASS** — FEATURE · G1–G9 oczekiwane **ALL-NIE** (ew. G2 tylko klucz flagi FEATURE) |

---

## 12. Werdykt końcowy

```text
════════════════════════════════════════════════════════
WORK-CATALOG-P3.3 AUDIT COMPLETE

RECOMMENDED AS NEXT EPIC

Priorytet: P1
Uzasadnienie biznesowe (skrót):
  Po 02-B (explain/queue) brakuje operacyjnego zasilania
  i zaufania do cen rynkowych w Bibliotece Robót.
  Silnik P3.1–P3.2 + konsumenci AI-COST już stoją —
  P3.3 domyka ROI danych bez odblokowania NG-05
  i bez ruszania Payroll / parserów / Bid core.

Warunek startu IMPLEMENT: Owner GO + DESIGN FREEZE
  (ratyfikacja D-A…D-D + allowlista residual S4+).
════════════════════════════════════════════════════════
```

### Alternatywa Ownera (jeśli nie P3.3)

Jeśli cel sesji = **jak najszybciej zbliżyć Bid do ~1,6M**, wybrać **GAP-B AUDIT** (nie re-open GAP-A) zamiast P3.3 — wtedy P3.3 zostaje **P1 równoległy backlog**, nie NEXT.

---

**AUDIT STATUS:** **COMPLETE**  
**IMPLEMENT / PLAN / DF / commit / push:** **NIE WYKONANO** (zgodnie z briefem)
