# SCOPE-GAP-ENGINE-AUDIT-01

> **ID:** SCOPE-GAP-ENGINE-AUDIT-01  
> **MODE:** **AUDIT ONLY** · **READ ONLY** · bez IMPLEMENT / commit / push / EPIC / migracji  
> **Data:** 2026-07-31  
> **Tip:** [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md) · **2.65.91**  
> **Kontekst:** [`AI-COST-REAL-BID-AUDIT-01.md`](AI-COST-REAL-BID-AUDIT-01.md) · [`COMPANY-KNOWLEDGE-AUDIT-01.md`](COMPANY-KNOWLEDGE-AUDIT-01.md) · SMART P0 · AI-COST FREEZE  
> **Cel:** ocena niezależnego silnika ostrzeżeń „czego brakuje w przetargu?” — **bez** wpływu na wycenę

```text
════════════════════════════════════════════════════════
WERDYKT
Scope Gap Engine = ZGODNY z SSOT jako osobny moduł RO.
NIE jest AI-COST · NIE jest SMART · NIE jest History Engine.
Jedyna funkcja: ostrzeżenia o prawdopodobnych lukach zakresu.
Zakaz write: OfferBoq · Quotes · Bid · Library.
Miejsce w pipeline: PO AI-COST (+ Bid) i PO SMART Detect
  (czyta ich output, nic nie mutuje).
Potencjał biznesowy wysoki (kompletność oferty / ryzyko straty).
Główne ryzyko: false positive → mitygacja: confidence + typ inwestycji
  + „expected vs present” + opcjonalnie History peers.
════════════════════════════════════════════════════════
```

---

## 0. Granice produktów (żeby nie mieszać)

| Moduł | Pytanie, na które odpowiada | Write path? |
|-------|------------------------------|-------------|
| **AI-COST** | Ile kosztują pozycje **obecne** w przedmiarze? | Tak (OfferBoq / komponenty) |
| **SMART P0** | Które linie **nie mają useful Quotes** / są unmapped? | Nie (Detect RO) |
| **Bid** | Jaka oferta (Kp, marża, recommended)? | Tak (proposal) |
| **History Engine** *(AUDIT)* | Jak wyglądały **podobne realizacje** / benchmark PLN? | Nie (RO) |
| **Company Knowledge S5.1** | Jaką cenę jednostkową firma wcześniej **zatwierdziła**? | Tak (provider S4) |
| **Scope Gap Engine** *(ten AUDIT)* | **Czego prawdopodobnie brakuje** w zakresie? | **Nie** — tylko warnings |

```text
SMART ≠ Scope Gap
  SMART: „ta linia nie ma ceny Quotes”
  Scope Gap: „w tym typie robót zwykle jest wywóz — a w ATH go nie widać”

History ≠ Scope Gap
  History: „12 podobnych pustostanów, mediana oferty X”
  Scope Gap: „w peerach always=wywóz, a tu brak” (History = opcjonalne źródło)
```

---

## 1. Czy Scope Gap Engine jest zgodny z SSOT?

**TAK** — pod warunkami kontraktu:

| Zasada SSOT / FREEZE | Scope Gap |
|----------------------|-----------|
| Bid = jedyny generator oferty | **Nie liczy** oferty |
| AI-COST nie inventuje drugiego kosztorysu | **Nie dodaje** linii do OfferBoq |
| ZERO DUPLICATE LOGIC wyceny | Osobna domena = **luki zakresu**, nie ceny |
| Quotes / MS | **Nie Publish** / nie Detect Quotes |
| Soft-fail uniwersalność | Brak sygnału → **0 ostrzeżeń** (pipeline wyceny bez zmian) |

Zgodność wynika z tego, że Scope Gap jest **analityką ryzyka zakresu**, nie warstwą wyceny.

---

## 2. Czy powinien być osobnym modułem?

**TAK — obowiązkowo osobny.**

| Opcja | Werdykt |
|-------|---------|
| Włożyć w SMART | **NIE** — SMART DF = decyzje **cenowe** Quotes |
| Włożyć w AI-COST S7 validation | **NIE** — S7 = gotowość wyceny komponentów; mieszanie = drift FREEZE |
| Włożyć w History Engine | **NIE** — History = peers/benchmark; Scope Gap działa też **bez** historii |
| **Nowy `scope-gap` (lib + UI RO)** | **TAK** |

REUSE (import read-only), nie merge odpowiedzialności:

- `tender-work-scope-inference` (grupy robót)
- słowniki `wgdom-construction-dictionary` / phrase-rules (słowa kluczowe wywozu, przygotowań…)
- OfferBoq lines / kinds (co **jest**)
- SWZ/brief/dossier (co **wymagane** tekstowo)
- History Engine peers (opcjonalnie: support % „always”)

---

## 3. Czy powinien być warstwą Read Only?

**TAK — wyłącznie RO w v1 (i rekomendowane jako stała granica produktu).**

| Zakazane | Dozwolone |
|----------|-----------|
| Zmiana OfferBoq / lines | Lista `ScopeGapWarning[]` |
| Zmiana Quotes / Bid | UI banner / checklist ostrzeżeń |
| Auto-insert pozycji | Link „pokaż w przedmiarze” (highlight RO) |
| Wpływ na `recommendedBidPln` | Severity + confidence + rationale |

Nawet przyszłe „Dodaj pozycję” = **osobny EPIC + DF** (write path) — poza tym AUDIT.

---

## 4. Czy powinien działać po AI-COST i SMART?

**TAK — po obu (oraz po Bid adapter, jeśli potrzebuje kontekstu liczb — ale bez ich zmiany).**

```text
Documents / SWZ / OPZ / Przedmiar
        ↓
AI-COST (S1–S7) + Bid SSOT
        ↓
SMART Detect (Quotes / unmapped)
        ↓
[ Scope Gap Engine — RO ]     ← TU
        ↓
(opc.) History Engine — RO    ← może zasilać Scope Gap jako źródło peers
        ↓
UI: ostrzeżenia zakresu (obok, nie zamiast, SMART banner)
```

**Dlaczego po AI-COST/SMART:**

1. Potrzebuje **znormalizowanego** obrazu „co jest w przedmiarze” (OfferBoq lines, kinds, mapped works) — lepsze niż surowy ATH alone.  
2. SMART już odfiltrował szum cenowy — Scope Gap nie powinien powielać „brak Quotes”.  
3. Kolejność nie wpływa na wycenę (RO), ale poprawia jakość sygnału i UX (osobne bannery).

**Może czytać równolegle SWZ/OPZ** niezależnie od kolejności cen — wejście dokumentów nie musi czekać na Bid; **emisja UI** rekomendowana po zbudowaniu OfferBoq.

---

## 5. Wejścia i wyjścia

### 5.1 Wejścia (priorytet źródeł)

| Pri | Źródło | Rola w Scope Gap | Uwagi |
|-----|--------|------------------|-------|
| **P0** | **Przedmiar / OfferBoq lines** | Co **jest obecne** (evidence present) | SSOT obecności robót |
| **P0** | **Taksonomia oczekiwań** (reguły per typ inwestycji) | Co **powinno być** (expected) | Deterministyczny pack v1 |
| **P1** | **SWZ / OPZ / brief** | Wymagania jawne („pomiary”, „organizacja ruchu”) | Gdy tekst dostępny w dossier |
| **P1** | **Typ inwestora / typ robót** | Wybór szablonu oczekiwań (pustostan WM ≠ GDDKiA) | `priorityBuyer`, tytuł, scope groups |
| **P2** | **History Engine peers** | Empiryczne „always / frequent” | Opcjonalne; bez peers → reguły same |
| **P2** | **Library / catalogWorkId** | Normalizacja nazw robót | Tylko do match present, nie ceny |
| **P3** | **SMART missing** | **Negatywny filtr** — nie raportuj jako scope gap tego, co jest tylko unmapped price | Anti-duplikacja |
| **P3** | **AI-COST kinds** | Sygnał branży (Demolition → oczekuj wywozu) | Read-only |
| **OUT** | **Company Knowledge S5.1** | **Nie** jako źródło luk | CK = ceny UI, nie zakres |
| **OUT** | **Bid / Quotes mutate** | — | Zakaz |

### 5.2 Wyjścia (kontrakt RO)

```text
ScopeGapReport {
  computedAt
  tenderContext: { investmentType, investorFamily, confidence }
  warnings: ScopeGapWarning[]
}

ScopeGapWarning {
  id                  // np. scope_gap:waste_disposal
  code                // WASTE_DISPOSAL | MEASUREMENTS | TRAFFIC_ORG | …
  labelPl             // „Możliwy brak wywozu gruzu.”
  severity            // info | warn | high
  confidence          // 0–1
  rationalePl         // dlaczego oczekiwane + czemu uznane za brak
  evidencePresent[]   // co znaleziono / nie znaleziono (lp, snippety)
  sources[]           // rule | swz | history_peers
  relatedLp[]         // opcjonalnie linie „bliskie” (np. rozbiórki bez wywozu)
}
```

**Nigdy w output:** nowe `OfferBoqLine`, kwoty PLN, `catalogWorkId` do auto-bind.

---

## 6. Wykrywanie klas robót (wykonalność bez wyceny)

| Klasa | Wykrywalność v1 | Sygnał „present” | Sygnał „expected” |
|-------|-----------------|------------------|-------------------|
| Roboty przygotowawcze | Wysoka | keywords / scope | Szablon pustostan/remont |
| Zabezpieczenia | Wysoka | folia, osłony, bariery | Remonty wnętrz |
| Transport | Średnia | transport, dostawa | Przy dużym material |
| Wywóz odpadów / gruz | **Wysoka** | wywóz, kontener, utylizacja | Gdy Demolition / rozbiórki |
| BHP | Średnia | BHP, zabezpieczenie robót | Często w SWZ, rzadko w ATH |
| Odbiory | Średnia | odbiór, protokół | SWZ/OPZ |
| Pomiary | Wysoka | pomiar, RCD, instalacje | Elektryka / instalacje w scope |
| Próby | Wysoka | próba, sprawdzenie działania | Instalacje |
| Rusztowania | Wysoka | rusztowanie | Elewacje / wysokościowe |
| Organizacja robót / ruchu | Średnia–niska | organizacja ruchu, zajęcie pasa | GDDKiA / drogi / elewacje uliczne |
| Dokumentacja powykonawcza | Średnia | powykonawcza, as-built | Częściej SWZ niż ATH |
| Roboty towarzyszące | Niska–średnia | zależne od typu | History peers pomagają |

**Mechanizm v1 (rekomendowany):**  
`expectedSet(investmentType) − presentSet(przedmiar∪SWZ_hits)` → warnings, nie odwrotnie.

---

## 7. Korzyści biznesowe

1. **Kompletność oferty** — kosztorysant widzi typowe luki zanim złoży ofertę.  
2. **Ochrona marży** — brak wywozu/pomiarów = częsty „darmowy” koszt w terenie.  
3. **Uniwersalność** — działa dla WM i GDDKiA przez **różne szablony oczekiwań**, nie przez wymóg historii.  
4. **Rozdzielenie od SMART** — operator nie myli „brak ceny” z „brak roboty”.  
5. **Przygotowanie pod History** — gdy peers istnieją, ostrzeżenia stają się empiryczne (wyższa pewność).

---

## 8. Ryzyka i mitygacje

| Ryzyko | Poziom | Mitygacja |
|--------|--------|-----------|
| **False positive** („brak wywozu” gdy jest w innej paczce / ryczałt) | Wysoki | Confidence; szukaj synonimów; badge „możliwy”; nie `high` bez 2 źródeł |
| **False negative** (brak w ATH i w regułach) | Średni | Rozszerzanie packów per typ; History always-list |
| **Duplikacja ze SMART** | Średni | Scope Gap **nie** emituje `unmapped` / `no_quote`; osobny copy UI |
| **Duplikacja z AI-COST S7** | Niski–średni | S7 = ceny komponentów; Scope Gap = brak **klasy robót**; brak wspólnych kodów |
| **Konflikt z Bid** | Niski przy RO | Zero write; nie zmieniaj `costPrice` „bo brak wywozu” |
| **Szum UI** | Wysoki | Cap N ostrzeżeń; group by code; filtr severity |
| **Szablon WM na GDDKiA** | Wysoki | **Wymagany** `investmentType` gate — inny expected pack |
| **Traktowanie ostrzeżenia jako wyceny** | Produktowe | Copy: „To nie wycena — sprawdź zakres” |

---

## 9. Odpowiedzi formalne (1–8)

| # | Pytanie | Odpowiedź |
|---|---------|-----------|
| **1** | Zgodny z SSOT? | **TAK** (RO, poza ścieżką wyceny) |
| **2** | Osobny moduł? | **TAK** |
| **3** | Read Only? | **TAK** (v1 i rekomendacja stała) |
| **4** | Po AI-COST i SMART? | **TAK** (emisja po OfferBoq+Detect; dokumenty może czytać wcześniej) |
| **5** | We/Wy? | We: przedmiar+szablon+SWZ+(opc.) History; Wy: `ScopeGapWarning[]` |
| **6** | Korzyści? | Kompletność oferty, ryzyko kosztów ukrytych, jasny UX vs SMART |
| **7** | Ryzyka? | FP/FN, szum UI, zły szablon typu inwestycji |
| **8** | Zwiększy kompletność bez łamania architektury? | **TAK** — ostrzeżenia dla człowieka; wycena tip bez zmian |

---

## 10. Rekomendowana architektura i miejsce w pipeline

```text
┌──────────────────────────────────────────────────────────┐
│  PIPELINE WYCENY (FROZEN)                                  │
│  SWZ/OPZ/ATH → AI-COST → Bid → SMART Detect                │
└──────────────────────────────────────────────────────────┘
         │ read-only                         │ read-only
         ▼                                   ▼
┌─────────────────────┐            ┌─────────────────────┐
│ Scope Gap Engine    │◄── opc. ──│ History Engine (RO)  │
│ (NEW · RO only)     │  peers    │ (osobny AUDIT)       │
│                     │            └─────────────────────┘
│ expected − present  │
│ → ScopeGapWarning[] │
└─────────┬───────────┘
          ▼
   UI: „Możliwe braki zakresu” (nie zmienia oferty)
```

### Kontrakt produktu (do przyszłego DF — nie IMPLEMENT teraz)

1. Zero mutacji OfferBoq / Quotes / Bid / Library.  
2. Zero wpływu na `recommendedBidPln`.  
3. Ostrzeżenia zawsze sformułowane jako **„Możliwy brak …”** + confidence.  
4. Osobny banner od SMART („brak Quotes”).  
5. Szablon oczekiwań zależny od **typu inwestycji**; brak typu → tylko sygnały z SWZ (niski FP).  
6. History peers = wzmocnienie, nie wymóg.

### Co REUSE z tipu (bez merge)

| Artefakt tip | Użycie |
|--------------|--------|
| `WORK_SCOPE_GROUPS` / `scoreWorkScopeTexts` | Present groups |
| Słowniki wywozu / przygotowań (`wgdom-construction-dictionary`, phrase-rules) | Match present |
| OfferBoq `lineKind` (Demolition, Measurement…) | Expected triggers |
| Dossier SWZ / brief | Wymagania tekstowe |
| SMART `byReason` | Filtr anti-duplikacji cenowej |

### Czego **nie** budować w Scope Gap

- Drugiego SMART Detect  
- Auto-uzupełniania ATH  
- Feedu do CK cenowego  
- Zmiany Coverage / Alias Pack „żeby zniknęło ostrzeżenie”

---

## 11. Relacja do innych AUDIT / backlog

| Dokument / kandydat | Relacja |
|---------------------|---------|
| REAL-BID-AUDIT-01 | Potwierdził lukę „nawiewniki/wywóz poza ATH” — Scope Gap adresuje **ostrzeżenie**, nie auto-fix |
| COMPANY-KNOWLEDGE-AUDIT-01 | History może **zasilać** empiryczne always-list; Scope Gap działa też bez tego |
| SMART P1 | Nadal Quotes/Evidence — **orthogonal** |
| CM-04 / Coverage | Mapowanie cen — **orthogonal** |

```text
UTRZYMANIE — Scope Gap NIE wystartowany.
Po Owner GO: AUDIT danych szablonów (WM pustostan vs elewacja vs drogi)
  → PLAN → DF „SCOPE-GAP-ENGINE-01” · RO only.
Nie auto-start z History / SMART P1.
```

---

## 12. Jakość audytu

- Brak IMPLEMENT · brak mutacji.  
- Opiera się o FREEZE AI-COST, SMART DF/P0, audyty REAL-BID i History.  
- W tipie **brak** gotowego Scope Gap — są tylko słowniki/keywords i Work Scope (REUSE).  
- Nie zmierzono FP/FN na korpusie — wymaga przyszłego AUDIT danych po GO.

**AUDIT COMPLETE · SCOPE-GAP-ENGINE-AUDIT-01 · 2026-07-31**
