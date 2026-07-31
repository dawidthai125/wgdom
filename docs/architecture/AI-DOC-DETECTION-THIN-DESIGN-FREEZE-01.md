# AI-DOC-DETECTION-THIN-DESIGN-FREEZE-01

> **ID:** AI-DOC-DETECTION-THIN-DESIGN-FREEZE-01  
> **STATUS:** **THIN DESIGN FREEZE · FROZEN** (Owner GO DF: **APPROVED**)  
> **MODE:** DOCUMENTATION ONLY · **NO IMPLEMENTATION** · NO CODE · NO COMMIT · NO PUSH  
> **Data:** 2026-07-31  
> **RCA:** [`AI-DOC-DETECTION-RCA-01.md`](AI-DOC-DETECTION-RCA-01.md)  
> **PLAN:** [`AI-DOC-DETECTION-PLAN-01.md`](AI-DOC-DETECTION-PLAN-01.md) (`READY FOR DESIGN FREEZE`)  
> **SSOT reuse:** AP2-S0 (`tender-data-ssot.ts`) · F2 (`cost-regression-f2.ts`) · role (`tender-document-role.ts`)  
> **Po Owner GO IMPLEMENT:** **jedyna** podstawa kodu tego slice

```text
════════════════════════════════════════════════════════
THIN DESIGN FREEZE — AI Document Detection

Model FROZEN:
  Doc.D1 Przedmiar  →  Doc.D3 Kosztorys ofertowy
  Doc.D2 Dokumenty wspierające (opcjonalne)

Slice: słownik aliasów · nazewnictwo · copy UX · mapowanie dossier
OUT: AI · Bid · OCR · algorytmy analizy · Confidence · Scope Gap · SMART

copyVersion = "doc-detection-ux-1"
aliasVersion = "doc-detection-alias-1"

Werdykt: READY FOR OWNER GO IMPLEMENT
════════════════════════════════════════════════════════
```

**Konwencja ID:**  
- **Doc.D1 / Doc.D2 / Doc.D3** = warstwy modelu dokumentów.  
- **D1, D2, D3…** = evidence decyzji projektowych (poniżej).

---

## 0. PAYROLL SAFETY GATE (zamrożony)

```text
G1–G9: ALL-NIE (FEATURE UI/copy/słownik nazw · brak Payroll / cloud-sync CORE)
Owner GO CORE: NIE
Owner GO DF: APPROVED
Owner GO IMPLEMENT: wymagany przed kodem
Klasa: FEATURE / TEUX (Przetargi — dokumenty)
```

---

## 1. Cel (jedno zdanie)

Użytkownik zawsze rozróżnia **brak przedmiaru / brak OCR / brak odczytu / brak kosztorysu ofertowego** — bez zmiany AI, Bid ani OCR.

---

## 2. Model dokumentów (FROZEN)

| ID | Nazwa | Definicja FROZEN | Evidence |
|----|-------|------------------|----------|
| **Doc.D1** | **Przedmiar** | Dokument bazowy ilości: pozycje · jm · ilości (± KNR). Synonimy §3. **Wymagany** do ścieżki wyceny ilościowej. | **D1** RCA H1 conflation · PLAN P1.1 · Owner GO DF |
| **Doc.D2** | **Dokumenty wspierające** | Dokumenty **pomocnicze** (nie zastępują Doc.D1): m.in. kosztorys inwestorski z cenami (referencja), SWZ/OPZ jako kontekst, inne załączniki niebędące przedmiarem. Brak Doc.D2 **nie blokuje** wyceny, gdy Doc.D1 OK (AP2-S0). | **D2** Owner brief (D2 = wspierające) · AP2-S0 · RCA §2.2 |
| **Doc.D3** | **Kosztorys ofertowy** | Wynik W&G: OfferBoq + Bid — **nie** plik uploadu zamawiającego. | **D3** PLAN relacja D1→oferta · RCA |

```text
Doc.D1 (Przedmiar)
    ↓  odczyt pozycji (istniejący parse — BEZ zmian algorytmu w tym slice)
dossier snapshot (pole techniczne może zostać `kosztorys`)
    ↓  AI-COST / Bid (BEZ zmian w tym slice)
Doc.D3 (Kosztorys ofertowy)

Doc.D2 ──opcjonalnie──► kontekst / ceny inwestora (INFO, nie wymóg)
```

**Decyzja vs PLAN:** PLAN używał „D2 = kosztorys inwestorski” jako osobnej warstwy cenowej. **Owner DF zamraża Doc.D2 = Dokumenty wspierające** (szersze). Kosztorys inwestorski ∈ **Doc.D2** (podtyp wspierający), nie Doc.D1.  
Evidence: **D4** Owner GO brief §1.

---

## 3. Mapowanie synonimów → Doc.* (FROZEN)

| Synonim / format | Doc.* | Reguła aliasu (filename / fold) | Evidence |
|------------------|-------|----------------------------------|----------|
| **BOQ** | **Doc.D1** | `\bboq\b` w nazwie (PDF/XLS/XLSX) | **D5** RCA luka · PLAN P1.2 |
| **Bill of Quantities** | **Doc.D1** | `bill of quantities` / `bill_of_quantities` | **D5** |
| **Przedmiar** / Przedmiar robót / Przedmiar inwestorski | **Doc.D1** | istniejące + zachować | **D6** tip już ma |
| **Obmiar** | **Doc.D1** | istniejące | **D6** |
| **Kosztorys ślepy** | **Doc.D1** | `ślepy` / `slepy` + kontekst koszt/przedm **lub** `kosztorys.?ślep` | **D7** RCA luka |
| **ATH** / NOR / XML | **Doc.D1** (baza odczytu) | istniejące ext; UI: jeśli `FOUND_WITH_VALUE` → chip wspierający ceny ∈ **Doc.D2** (label), snapshot nadal zasilany jak dziś | **D8** P2-E.5 · bez zmiany parsera |
| Formularz ofertowy | **nie Doc.D1** | istniejący exclude | **D9** tip |
| OfferBoq / Bid | **Doc.D3** | tylko copy wyniku | **D3** |

**aliasVersion = `doc-detection-alias-1`** — wyłącznie rozszerzenie listy tokenów w warstwie **nazwy pliku** (discovery / F2 candidate / role hint).  
**Zakaz:** zmiana wag `scoreCostDocumentContent`, heurystyk pozycji PDF, parsera ATH.

Evidence: **D10** PLAN §3.1 + zakaz AI.

---

## 4. Komunikaty UX — 4 przyczyny (FROZEN)

`copyVersion = "doc-detection-ux-1"`

| Przyczyna | ID copy | `phaseLabelPl` FROZEN | Kiedy |
|-----------|---------|----------------------|--------|
| **Brak przedmiaru** | `UX_A` | **Brak przedmiaru w dokumentach** | Brak kandydata Doc.D1 |
| **Brak OCR** | `UX_B` | **Przedmiar PDF bez tekstu (wymaga OCR)** | CASE 3 / brak warstwy tekstowej |
| **Brak odczytu** | `UX_C` | **Przedmiar wykryty — brak odczytu pozycji** · warianty: „Trwa odczyt przedmiaru…” / „Nie udało się odczytać przedmiaru” / ZIP: „Nie znaleziono przedmiaru w archiwum…” | Kandydat jest · parse pending/fail/empty |
| **Brak kosztorysu ofertowego** | `UX_D` | **Brak kosztorysu ofertowego** | Doc.D1 OK (`kosztorys.ok` / pozycje), brak gotowej wyceny Doc.D3 |

**Zakaz copy (FROZEN):** w UX_A–C używać gołego „kosztorys” bez „inwestorski” / „ofertowy”.  
**INFO Doc.D2:** zachować sens AP2-S0 — „Zamawiający nie udostępnił kosztorysu inwestorskiego” tylko jako **info wspierające**, nie jako UX_A.

Evidence: **D11** PLAN P2 · RCA §4 · Owner brief §3.

### 4.1 Hinty (kierunek FROZEN — pełne stringi w IMPLEMENT = te label + 1 zdanie)

| ID | Kierunek hint |
|----|----------------|
| UX_A | Dołącz przedmiar, BOQ, obmiar, ATH lub XLSX z pozycjami. |
| UX_B | Brak warstwy tekstowej — dołącz ATH/XLSX lub PDF z tekstem. OCR w aplikacji niedostępne. |
| UX_C | Uruchom / ponów analizę dokumentów. |
| UX_D | Uruchom / dokończ wycenę oferty — przedmiar jest dostępny. |

---

## 5. Zakres zmian (IN)

| # | Element | Evidence |
|---|---------|----------|
| 1 | Słownik aliasów filename (`doc-detection-alias-1`): BOQ, Bill of Quantities, ślepy | **D5–D7, D10** |
| 2 | Nazewnictwo UI: Doc.D1/D2/D3 etykiety; role display według statusu cen | **D1–D4, D8** |
| 3 | Komunikaty F2 / process / empty states → macierz UX_A–D | **D11** |
| 4 | Mapowanie `dossier`: pole techniczne `tenderDossier.kosztorys` **bez rename KV**; warstwa prezentacji mapuje → Doc.D1 (baza) / chip Doc.D2 gdy inwestorski z ceną / Doc.D3 = wynik wyceny poza dossier | **D12** PLAN rename-risk |
| 5 | Testy stringów copy + alias filename (pozytyw/negatyw) | **D13** |
| 6 | Changelog UX | — |

### 5.1 Allowlist plików (propozycja IMPL)

| Plik | Rola |
|------|------|
| `src/lib/tender-cost-discovery.ts` | **THIN** — aliasy w `isPdfPrzedmiarCostFilename` / classify (tylko regex nazw) |
| `src/lib/cost-regression-f2.ts` | **THIN** — copy F2 + `PDF_PRZEDMIAR_NAME_RE` aliasy |
| `src/lib/tender-document-role.ts` | **THIN** — etykiety / opc. tokeny roli przedmiar |
| `src/lib/tender-data-ssot.ts` | **THIN** — tylko stałe copy display (bez zmiany `ResolvedCostStatus` semantyki liczb) |
| `src/lib/tender-kosztorys-process-phase.ts` | **THIN** — label/hint e6/e10 copy (bez zmiany derive faz) |
| UI empty states (np. `TenderKosztorysWorkspace`, offer-run wire F2) | **THIN** — stringi |
| `scripts/test-doc-detection-ux-alias.mjs` (nazwa do IMPL) | **NOWY** |
| `changelog-data.ts` + `CHANGELOG.md` | Wpis |

Evidence allowlist: **D14**.

---

## 6. Poza zakresem (OUT — FROZEN)

| Moduł / temat | Status | Evidence |
|---------------|--------|----------|
| **AI** (OfferBoq pricing, content score weights, PDF position heuristics) | **NIETKNIĘTE** | **D10** |
| **Bid** / Time-Load Guard | **NIETKNIĘTE** | Owner brief |
| **OCR** (silnik) | **NIETKNIĘTE** — tylko copy UX_B | **D11** |
| Algorytmy analizy / parse ATH pozycji | **NIETKNIĘTE** | **D10** |
| **Confidence** | **NIETKNIĘTE** | Owner brief |
| **Scope Gap** | **NIETKNIĘTE** | Owner brief |
| **SMART** | **NIETKNIĘTE** | Owner brief |
| Rename klucza KV / `dossier.kosztorys` w sync | **ZAKAZ** | **D12** |
| Payroll / cloud-sync CORE | **ZAKAZ** | Gate §0 |

---

## 7. Mapowanie `dossier` (FROZEN)

| Warstwa | Zachowanie |
|---------|------------|
| Storage / typ | `item.tenderDossier.kosztorys` **zostaje** (kompatybilność) |
| Prezentacja gdy snapshot OK + bez cen | UI: **Przedmiar (Doc.D1)** — nie „Kosztorys” goły |
| Prezentacja gdy `FOUND_WITH_VALUE` | UI: **Przedmiar + kosztorys inwestorski (Doc.D2 wspierający)** |
| Brak snapshot | UX_A / UX_C według discovery — nie UX_D |
| Doc.D3 | Tylko z Bid/OfferBoq outcome — **nie** zapisywany jako „brak w dossier” mylone z Doc.D1 |

Evidence: **D12**, **D15** (RCA pole `kosztorys`).

---

## 8. Fail-safe

| Warunek | Zachowanie |
|---------|------------|
| Alias nie matchuje | Zachowanie tip as-is |
| Nieznany stan | Preferuj UX_C nad UX_A jeśli był jakikolwiek kandydat |
| CASE 3 | Zawsze UX_B, nigdy UX_A |
| Doc.D1 OK, wycena pusta | UX_D, nigdy „Brak przedmiaru” |

Evidence: **D16**.

---

## 9. Wymagane testy (gate przed GO COMMIT)

| ID | Test | Pass |
|----|------|------|
| T1 | `BOQ.pdf` / `Bill_of_Quantities.xlsx` → kandydat Doc.D1 | alias |
| T2 | `Kosztorys_slepy.pdf` → kandydat Doc.D1 | alias |
| T3 | F2 no_candidate → dokładnie UX_A label | copy |
| T4 | Fixture CASE 3 → UX_B | copy |
| T5 | candidate_ready → UX_C (nie goły „kosztorys”) | copy |
| T6 | Doc.D1 ok + brak bid ready → UX_D ścieżka copy (jeśli wire w slice) | copy |
| T7 | Negatyw: `offer_form` / formularz — nadal nie Doc.D1 | regresja |
| T8 | Confidence / Scope / SMART / Bid unit — bez zmian zachowania | regresja smoke |
| T9 | `npm run build` | PASS |

---

## 10. Macierz evidence (indeks)

| ID | Decyzja | Źródło |
|----|---------|--------|
| **D1** | Doc.D1 = Przedmiar jako baza | RCA · PLAN · Owner |
| **D2** | Doc.D2 = Dokumenty wspierające | Owner brief (nad PLAN „inwestorski-only”) |
| **D3** | Doc.D3 = Kosztorys ofertowy | PLAN · Owner |
| **D4** | Owner nadpisuje model 3-warstwowy | Owner GO DF |
| **D5** | Alias BOQ / Bill of Quantities → Doc.D1 | RCA luka |
| **D6** | Przedmiar / Obmiar już IN tip | tip code |
| **D7** | Alias kosztorys ślepy → Doc.D1 | RCA luka |
| **D8** | ATH → odczyt Doc.D1; ceny UI ∈ Doc.D2 | P2-E.5 · AP2-S0 |
| **D9** | Formularz OUT z Doc.D1 | tip exclude |
| **D10** | Aliasy thin; AI scoring OUT | PLAN zakaz |
| **D11** | Cztery przyczyny UX_A–D | PLAN P2 · Owner |
| **D12** | Brak rename KV `dossier.kosztorys` | PLAN ryzyko |
| **D13** | Testy copy+alias obowiązkowe | DF quality |
| **D14** | Allowlist plików | thin slice |
| **D15** | Conflacja nazwy pola vs UI | RCA |
| **D16** | Fail-safe CASE 3 / UX_D | PLAN |

**Brak triggera re-open** przy obecnym Owner GO + RCA/PLAN.

---

## 11. Ścieżka po DF

```text
THIN DF FROZEN + Owner GO DF APPROVED
    ↓
Owner GO IMPLEMENT  ← wymagany jawny
    ↓
Kod wg allowlist §5.1 + T1–T9
    ↓
Owner Verification → GO COMMIT / PUSH
```

**Bez auto-start IMPLEMENT w tej sesji docs.**

---

## 12. Werdykt

```text
READY FOR OWNER GO IMPLEMENT

FROZEN:
  Doc.D1 Przedmiar · Doc.D2 Wspierające · Doc.D3 Kosztorys ofertowy
  Aliasy: BOQ · Bill of Quantities · ślepy (+ tip przedmiar/obmiar/ATH)
  UX: brak przedmiaru | brak OCR | brak odczytu | brak kosztorysu ofertowego
  OUT: AI · Bid · OCR · Confidence · Scope Gap · SMART

NO CODE · NO COMMIT · NO PUSH
```

**DOCUMENTATION ONLY · 2026-07-31**
