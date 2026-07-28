# TRE-01 — Architecture Review (pierwszy etap)

> **ID:** TRE-01-ARCHITECTURE-REVIEW  
> **EPIC:** TENDER RECOMMENDATION ENGINE (TRE-01)  
> **STATUS:** **ARCHITECTURE REVIEW** · **IMPLEMENT BLOCKED** (czekaj na Owner GO + Design Freeze)  
> **Data:** 2026-07-28  
> **Język:** polski  
> **Tryb:** ARCHITECTURE FIRST — **bez** implementacji · zmian kodu · commit · push  
> **Nadrzędne:** [`WGDOM-TENDER-PRODUCT-SSOT.md`](WGDOM-TENDER-PRODUCT-SSOT.md) · [`WGDOM-TENDER-ARCHITECTURE-BLUEPRINT.md`](WGDOM-TENDER-ARCHITECTURE-BLUEPRINT.md)  
> **Foundation:** [`WGDOM-FOUNDATION-LIB-PHASE-0-SSOT.md`](WGDOM-FOUNDATION-LIB-PHASE-0-SSOT.md)  
> **Wycena:** [`WGDOM-AI-COST-01-SSOT.md`](WGDOM-AI-COST-01-SSOT.md) · Freeze  
> **Tip:** [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md)

```text
════════════════════════════════════════════════════════
TRE-01 ≠ rewrite Przetargów.
TRE-01 = Offer Run + Foundation spine + Outcome-first UI
         wokół ISTNIEJĄCYCH silników (REUSE FIRST).
Zakaz: przepisywanie AI-COST · Bid · parserów · discovery ·
       dossier · trust · sync · Edge.
FND-06 = poza zakresem (BLOCKED).
════════════════════════════════════════════════════════
```

---

## 0. Cel EPIC (skrót)

Zbudować **Tender Recommendation Engine** jako produkt outcome-first:

```text
Lista → 1 klik → Offer Run → auto analiza/wycena
  → rekomendowana cena oferty → pełny kosztorys (na żądanie)
```

Pierwszy etap ma dać **widoczną wartość** i **nie naruszyć stabilności produkcji**.

---

## 1. Od którego elementu rozpocząć przebudowę?

### Werdykt

**Rozpocząć od Offer Run + Recommendation Result (cienka fasada), nie od wymiany silników i nie od kasowania całego V4.**

| Kandydat startu | Werdykt | Powód |
|-----------------|---------|--------|
| Przepisanie AI-COST / Bid / parserów | **ODRZUT** | Łamie REUSE FIRST + Freeze |
| Pełny nowy Orchestrator zastępujący NG-02 runtime | **ZA DUŻY** na pierwszy krok | Ryzyko Sync Storm / regresji pipeline |
| Sam ekran ceny bez Offer Run / Foundation | **NIEWYSTARCZAJĄCY** | Omija Blueprint (brak kręgosłupa) |
| **Offer Run (fasada) + wynik rekomendacji z Bid + Foundation spine + Outcome UI MVP** | **START** | Wartość produktu + reuse + Foundation + odwracalność |

### Uzasadnienie

1. **Product SSOT** wymaga szybszej ścieżki do **rekomendowanej ceny** — pierwszy krok musi to pokazać.  
2. **Blueprint** wymaga **Offer Run** i **Foundation** jako kręgosłupa — bez tego budujemy kolejny panel.  
3. **REUSE** — istniejący łańcuch (documents → dossier → AI-COST → Bid) już potrafi wygenerować cenę; brakuje **opakowania przebiegu** i **domyślnego ekranu wyniku**.  
4. Stabilność — fasada **obok** NG-02 runtime (mapowanie stanów), bez zmiany Edge/sync/parserów.

**Punkt wejścia architektoniczny:** warstwa **Orchestrator Offer Run (thin)** + **Recommendation Result View-Model** (cena z Bid) + **Outcome UI MVP** + **Foundation FND-01…05 na przebiegu**.

---

## 2. Który fragment zastąpić jako pierwszy?

### Zastąpić (produktowo) — pierwszy

| Fragment obecny | Zamiana w TRE-01 (etap 1) |
|-----------------|---------------------------|
| **Domyślne lądowanie po kliknięciu = Workflow Hub / prowadzenie krokami** | **Domyślne lądowanie = Ekran wyniku rekomendacji** (gdy run zakończony lub w toku ze statusem) |
| **Brak jednostki „przebieg oferty”** | **Offer Run** (1 run na otwarcie/wybór) |
| **Brak Foundation w torze Przetargi** | **Spine FND-01…05** na Offer Run (niewidoczny UI) |

### Nie zastępować w etapie 1

| Fragment | Powód |
|----------|--------|
| AI-COST S1–S7 | REUSE / Freeze |
| Bid Proposal | SSOT ceny |
| Discovery / dossier / trust / sync / Edge | REUSE / stabilność |
| Cała Strategia / Mapa / Ustawienia | Satelity — poza torze 1-kliku |
| Pełne usunięcie Hub / 5 tabów | Zostają jako **recovery / ekspert** (feature-flag lub wejście drugorzędne) |
| Autonomous theater | Nie rozbudowywać; nie przepisywać w etapie 1 |

### Zasada przejścia

Hub **nie jest kasowany w dniu 1**.  
Jest **odsunięty z pozycji default** na rzecz Outcome.  
To spełnia Product SSOT bez big-bang delete.

---

## 3. Zgodność z Product SSOT

| Wymóg Product SSOT | Jak TRE-01 etap 1 go spełnia |
|--------------------|------------------------------|
| Obietnica: 1 klik → rekomendowana cena | Outcome UI jako default po wyborze; cena z Bid |
| Jedna prawda ceny | Tylko Bid / Recommendation Result — zero drugiego kalkulatora |
| Kosztorys na żądanie | CTA „Pokaż pełny kosztorys” → istniejący widok/snapshot (reuse), bez nowej wyceny |
| AI nie wysyła oferty | Bez e-składania |
| Fail-loud | Status: gotowe / wymaga przeglądu / brak danych — z trust/validation + FND-03 |
| Foundation niewidoczna | Brak UI eventów/audytu |
| Kryterium §11 | Etap 1 **bezpośrednio** skraca czas do zobaczenia ceny |
| Nie mieszać Strategii w tor | Strategia nietknięta jako default |
| Boundary CORE | Zero zmian Payroll / cloud-sync merge semantics w etapie 1 |

**Test bramkowy etapu 1:**  
*Czy po wyborze przetargu Owner szybciej widzi kompletną (lub jawnie niekompletną) rekomendację ceny?* → **TAK** (to warunek GO na DF).

---

## 4. Zgodność z Architecture Blueprint

| Element Blueprint | Etap 1 |
|-------------------|--------|
| Outcome UI | **MVP** (cena + status + CTA kosztorys) |
| Offer Run | **Thin** — jednostka przebiegu, nie pełny rewrite orchestracji |
| Orchestrator | **Mapuje** istniejący runtime/pipeline → fazy Run; nie dubluje parse |
| Silniki domenowe | **REUSE** wywołań / wyników |
| Foundation | **Wpinana** w Run (01–05) |
| Infra sync/Edge | **Bez zmian kontraktu** |
| Satelity | Poza scope |

**Świadome ograniczenie etapu 1:** pełna ekstrakcja „wymagań → wpływ na marżę” może pozostać **częściowa** (reuse obecnych sygnałów Bid/risk). Domknięcie wymagań jako osobny slice TRE — nie blokuje Outcome MVP, o ile status jakości jest uczciwy.

---

## 5. Zgodność z Foundation Phase 0

| Pakiet | Użycie w TRE-01 etap 1 | UI |
|--------|------------------------|-----|
| **FND-01** | `runId` przy starcie Offer Run; wiązanie z id postępowania BZP (zewnętrzne ID bez podmiany) | Ukryte |
| **FND-02** | Digest kluczowych artefaktów gdy dostępne: zestaw docs / snapshot / wynik Bid (minimalny zestaw pinów) | Ukryte |
| **FND-03** | Błędy krytyczne Run → status „brak danych” / fail-loud | Tylko status PL, nie FoundationError raw |
| **FND-04** | Audit: `run.created`, `recommendation.issued` (gdy cena dostępna) | Ukryte |
| **FND-05** | Eventy faz: `run.started`, `documents.*` (mapowanie), `offer.recommended` / `run.failed` | Ukryte — **zakaz feedu** |
| **FND-06** | **OUT** | — |

**Zasady:**

- Brak ekspozycji Foundation w UI.  
- Brak FND-06.  
- Integracja Foundation z Przetargami w TRE-01 jest **uzasadniona Product SSOT + Blueprint** (wiarygodność autopilota) — nadal wymaga **Design Freeze** allowlisty plików przed kodem.  
- Persist eventów/audytu: preferować **minimalny** lokalny kontrakt Run; **nie** mieszać z Payroll keys; unikać fat write do `kw-tenders-pipeline` bez DF (ryzyko Sync Storm).

---

## 6. Elementy REUSE (bez przepisywania)

| Silnik / obszar | Jak użyć w etapie 1 |
|-----------------|---------------------|
| **Lista / otwarcie przetargu** | Punkt startu 1-kliku |
| **NG-02 / pipeline runtime** (documents → heavy → pricing) | Źródło postępu i artefaktów; Offer Run **obserwuje / spina**, nie reimplementuje |
| **Discovery + document resolver** | Auto dokumenty |
| **Dossier / kosztorys snapshot** | Wejście AI-COST / kosztorys drill-down |
| **AI-COST S1–S7 + adapter** | Koszt bezpośredni → Bid |
| **Bid Proposal** | **Jedyna** rekomendowana cena PLN |
| **Trust / validation** | Status jakości wyniku |
| **Istniejący panel/kosztorys** | „Pokaż pełny kosztorys” (reuse powierzchni, nie nowy parser) |
| **Edge BZP / sync tenders** | Bez zmian semantyki |

---

## 7. Elementy do zastąpienia (etap 1 — wąsko)

| Zastąpić | Nie zastępować jeszcze |
|----------|-------------------------|
| Default post-click UX (Hub-first) → Outcome-first | Cały V4 chrome |
| Brak Offer Run → Offer Run thin | Pełny nowy pipeline |
| Brak Foundation w torze → spine Run | Migracja wszystkich ID domenowych na FND-01 |
| Rozproszona „cena w Ceny/AI/Decyzja” jako cel → jedna Recommendation Result | Usunięcie tabów Ceny/Decyzja z aplikacji |

---

## 8. Minimalny pierwszy krok implementacyjny (wartość + stabilność)

### Nazwa slice (planowana)

**TRE-01 / Slice A — Offer Run Spine + Outcome MVP**

### Zakres IN (produktowo)

1. **Offer Run** przy wyborze przetargu (`runId` FND-01).  
2. **Mapowanie** istniejących sygnałów pipeline → status Run + eventy FND-05 (minimalny zestaw).  
3. **Recommendation Result** = odczyt rekomendowanej ceny z **Bid Proposal** (gdy dostępna) + status jakości.  
4. **Digest** FND-02 dla dostępnych artefaktów wyniku (minimum: pin rekomendacji gdy jest cena).  
5. **Audit** FND-04: utworzenie run + wydanie rekomendacji.  
6. **Outcome UI MVP:** cena · status · „Pokaż pełny kosztorys”.  
7. Hub / dotychczasowy detal: **dostępne jako recovery**, nie default (gdy Run ma wynik lub trwa).

### Zakres OUT (twarde)

- Przepisanie AI-COST / Bid / parserów / discovery / dossier / trust / Edge / cloud-sync merge  
- FND-06  
- Usunięcie Strategii / Map / całego V4  
- E-składanie oferty  
- Nowy kalkulator marży  
- Widoczny UI Foundation / feed eventów  
- Mixed commit z Payroll / CORE sync  

### Wartość dla Ownera

Po 1 kliku **widać rekomendowaną cenę oferty** (lub uczciwy status braku) — zgodne z Product SSOT §1 i §11.

### Stabilność produkcji

| Mechanizm | Opis |
|-----------|------|
| REUSE runtime | Brak nowej ciężkiej ścieżki parse |
| Feature flag / równoległy default | Możliwy rollback UX do Hub-first bez revertu silników |
| Zero Edge/sync contract change | Brak klasy Sync Storm z nowego write-path (DF musi to potwierdzić) |
| Fail-loud | Brak ceny ≠ wymyślona liczba |
| Thin allowlist | Osobny Design Freeze przed kodem |

### Definition of Done (etap 1 — planowany, nie wykonany)

```text
□ Architecture Review ACK Ownera (ten dokument)
□ Design Freeze Slice A (allowlist + IN/OUT + testy)
□ Owner GO IMPLEMENT
□ Outcome MVP pokazuje cenę z Bid albo status braku
□ Foundation spine na Run (01–05) bez UI Foundation
□ Zero zmian AI-COST/Bid/parser/Edge/sync semantics
□ Gate B / smoke tenders wg DF
□ Rollback UX możliwy
```

---

## 9. Ryzyka

| ID | Ryzyko | Severity | Mitygacja (architektoniczna) |
|----|--------|----------|------------------------------|
| R1 | Scope creep → „przy okazji” rewrite pipeline | **HIGH** | Twardy OUT + DF allowlist |
| R2 | Fat persist Run w `kw-tenders-pipeline` → Sync Storm | **HIGH** | DF: minimalny storage Run; unikaj fat key churn |
| R3 | Druga „cena” w UI (Ceny vs Outcome) | **HIGH** | Jedna Recommendation Result; Bid only |
| R4 | Foundation w UI / debug feed | **MED** | Zakaz Product SSOT §9 |
| R5 | Naruszenie AI-COST Freeze (marża w AI) | **HIGH** | Tylko Bid liczy ofertę |
| R6 | Usunięcie Hub bez recovery → użytkownicy zaawansowani tracą narzędzia | **MED** | Hub = recovery, nie delete |
| R7 | Mixed FEATURE+CORE | **HIGH** | #CORE-013; zero cloud-sync w Slice A jeśli nie konieczne |
| R8 | STABILIZATION WINDOW / brak Owner GO | **PROC** | IMPLEMENT tylko po GO |
| R9 | Fałszywe „gotowe” przy niepełnym ATH | **MED** | Trust/validation → status przeglądu |
| R10 | Mapowanie eventów ≠ rzeczywiste fazy (kłamstwo audytu) | **MED** | Eventy tylko ze sprawdzonych sygnałów runtime |

---

## 10. Odpowiedzi zbiorcze (brief)

| # | Pytanie | Odpowiedź |
|---|---------|-----------|
| 1 | Od czego zacząć? | **Offer Run (thin) + Recommendation Result + Foundation spine + Outcome UI MVP** |
| 2 | Co zastąpić pierwsze? | **Default Hub-first → Outcome-first** (Hub zostaje recovery) |
| 3 | Zgodność Product SSOT? | Cena po 1 kliku · jedna prawda Bid · kosztorys na żądanie · Foundation ukryta · §11 PASS |
| 4 | REUSE bez przepisywania? | Runtime/docs/dossier/AI-COST/Bid/trust/Edge — Offer Run **spina i pokazuje** |
| 5 | Minimalny krok wartościowy i bezpieczny? | **Slice A** jak w §8 — widoczna cena, zero rewrite silników, rollback UX |

---

## 11. Rekomendacja dla Ownera

| Decyzja | Skutek |
|---------|--------|
| **ACK Architecture Review** | Odblokowuje Design Freeze TRE-01 Slice A |
| **Design Freeze + Owner GO** | Dopiero wtedy IMPLEMENT |
| **HOLD** | Brak kodu; SSOT/Blueprint pozostają |

**Werdykt review:**  
Pierwszy etap TRE-01 jest **architektonicznie gotowy do DF**, **niegotowy do kodu** bez Freeze + GO.  
Kierunek: **REUSE silników · nowy przebieg Offer Run · Outcome-first · Foundation jako kręgosłup**.

---

## 12. Status

| Pole | Wartość |
|------|---------|
| **IMPLEMENT** | **BLOCKED** |
| **Commit / push** | **NIE** |
| **Następny dokument** | `TRE-01-SLICE-A-DESIGN-FREEZE.md` (tylko po ACK Ownera) |

---

**Koniec TRE-01-ARCHITECTURE-REVIEW.**  
Oczekiwanie na decyzję Ownera dotyczącą rozpoczęcia implementacji (po DF).
