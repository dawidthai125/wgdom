# CONFIDENCE-ENGINE-AUDIT-01

> **ID:** CONFIDENCE-ENGINE-AUDIT-01  
> **MODE:** **AUDIT ONLY** · **READ ONLY** · bez IMPLEMENT / commit / push / EPIC / migracji  
> **Data:** 2026-07-31  
> **Tip:** [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md) · **2.65.91**  
> **Kontekst:** REAL-BID · History · Scope Gap AUDIT · SMART P0 · AI-COST S7 `qualityScore`  
> **Cel:** ocena modułu **wiarygodności końcowej analizy** — **nie** wyceny

```text
════════════════════════════════════════════════════════
WERDYKT
Confidence Engine = ZGODNY z SSOT jako osobny aggregator RO.
NIE wycenia · NIE mutuje Bid/OfferBoq/Quotes.
Jedyna funkcja: wskaźnik pewności + wyjaśnienie przyczyn.
Miejsce: NA KOŃCU łańcucha analitycznego
  (po AI-COST/Bid · SMART · opc. Scope Gap · opc. History).
UWAGA: AI-COST S7 ma już qualityScore — Confidence Engine
  go REUSE jako jeden sygnał, ale NIE zastępuje / nie
  merguje się w S7 (inna domena: zaufanie do CAŁEJ analizy).
Potencjał bezpieczeństwa decyzji: WYSOKI.
════════════════════════════════════════════════════════
```

---

## 0. Granice produktów

| Moduł | Pytanie | Write? |
|-------|---------|--------|
| **AI-COST** | Ile kosztują obecne pozycje? | Tak |
| **SMART** | Które linie bez useful Quotes? | Nie (Detect) |
| **Scope Gap** *(AUDIT)* | Czego brakuje w zakresie? | Nie |
| **History** *(AUDIT)* | Jak wyglądały podobne realizacje? | Nie |
| **S7 Validation** *(wewnątrz AI-COST)* | Czy OfferBoq jest gotowy do Bid? | Nie (issues RO) |
| **Confidence Engine** *(ten AUDIT)* | **Na ile mogę ufać tej analizie jako całości?** | **Nie** |

```text
S7 qualityScore ≠ Confidence Engine
  S7:      „kompletność wyceny komponentów OfferBoq”
  Confidence: „czy cały pakiet (ceny + mapowanie + dokumenty
               + zakres + historia) jest wiarygodny do decyzji”
```

---

## 1. Czy moduł jest zgodny z SSOT?

**TAK.**

| Zasada | Confidence Engine |
|--------|-------------------|
| Bid = jedyny generator oferty | **Nie liczy** oferty; może **czytać** `proposal.ok` / warnings |
| AI-COST kontrakt S1–S7 | **Nie zmienia** OfferBoq; REUSE metryk S7 |
| ZERO DUPLICATE kalkulatora | Brak drugiego Bid / Pricing |
| Quotes / Library | Tylko odczyt coverage |
| Soft-fail | Brak opcjonalnych warstw (History/Scope) → waga 0, reszta działa |

---

## 2. Czy powinien być osobnym modułem RO?

**TAK — osobny moduł RO.**

| Opcja | Werdykt |
|-------|---------|
| Rozszerzyć tylko S7 | **NIE** — S7 jest zamrożony w AI-COST; dodawanie Scope/History/SMART psuje FREEZE |
| Włożyć w SMART | **NIE** — SMART = Quotes decision |
| Włożyć w Scope Gap / History | **NIE** — te odpowiadają na inne pytania |
| **Nowy `confidence-engine` (aggregator)** | **TAK** |

REUSE read-only z tipu (bez merge logiki wyceny):

- `evaluateOfferBoqValidation` → `qualityScore`, completeness, issues  
- mapping stats / Quotes % (jak TV-01)  
- `detectMissingPrices` summary  
- dokumentacja (AP2 completeness / dossier)  
- (przyszłe) ScopeGapReport, HistoryBenchmarkViewModel  

---

## 3. Miejsce w pipeline

```text
Documents → Przedmiar
    ↓
AI-COST (+ Bid SSOT)
    ↓
SMART Detect
    ↓
[ Scope Gap RO ]     opcjonalnie
    ↓
[ History RO ]       opcjonalnie
    ↓
★ CONFIDENCE ENGINE (RO) ★   ← TU: ostatni krok analityczny
    ↓
UI: wskaźnik + przyczyny (obok oferty, nie zamiast)
```

**Dlaczego na końcu:** potrzebuje kompletnego zestawu sygnałów; sam nic nie wnosi do wyceny, więc nie blokuje wcześniejszych kroków.

**Kolejność vs Bid:** Confidence **czyta** wynik Bid (ok, warnings, anomalia direct≪costPrice), ale **nie** przelicza Bid.

---

## 4. Dane i wagi czynników

Skala wyniku rekomendowana: **0–100** + etykieta `low | medium | high` + lista `drivers[]` (dodatnie/ujemne).

### 4.1 Macierz wag (propozycja AUDIT — do DF)

| Czynnik | Waga v1 | Kierunek | Uwagi tip |
|---------|--------:|----------|-----------|
| **Quote coverage** (`controlled_market` / linie) | **22%** | ↑ lepsze | Silny sygnał „cena z bazy”; TV-01 ~78% |
| **Mapping %** / (1 − unmapped rate) | **18%** | ↑ | Często = Quote coverage dziś; trzymaj osobno na wypadek `no_quote` |
| **S7 `qualityScore` / completeness** | **15%** | ↑ | REUSE AI-COST; nie duplikuj wzoru wewnętrznie |
| **Średnia pewność komponentów / mappingConfidence** | **10%** | ↑ | high/medium/low → score |
| **SMART missing rate** (+ rozróżnienie unmapped vs no_quote) | **8%** | ↓ missing | Anti-overlap z Quote coverage — użyj jako **penalty**, nie double-count |
| **Jakość dokumentów wejściowych** (SWZ/OPZ/przedmiar present, parse ok) | **8%** | ↑ | AP2 completeness / dossier |
| **Scope Gap warnings** (count × severity) | **8%** | ↓ | 0 jeśli moduł niedostępny |
| **History Engine** (peerCount, similarity, delta Bid vs mediana) | **6%** | ↑ peers + niska delta; ↓ brak peers **neutral** (nie karać uniwersalności) | |
| **Alias / matchMethod quality** (alias vs weak catalog_map / Jaccard) | **3%** | ↑ dobre alias; ↓ podejrzane mapowania | |
| **Bid health** (proposal.ok, warnings, anomalia cost/direct) | **2%** | ↓ przy outlier (np. 4.9×) | Tylko flaga ryzyka, nie „poprawa” Bid |

**Suma = 100%.**  
Opcjonalne warstwy (Scope/History): przy braku danych **renormalizuj** wagi pozostałych albo trzymaj wagę, ale score czynnika = **neutral 50** (nie 0) — żeby nie karać GDDKiA bez historii.

### 4.2 Czynniki z briefu — ocena

| Czynnik z zapytania | W Confidence? | Waga względna |
|---------------------|---------------|---------------|
| Coverage | TAK (Quote + mapping) | Wysoka |
| Mapping % | TAK | Wysoka |
| Liczba unmapped | TAK (penalty) | Wysoka |
| Quote coverage | TAK | Najwyższa |
| Liczba AI matches / kinds | Częściowo (przez S7 + confidence) | Średnia |
| Jakość Alias | TAK (cienka) | Niska–średnia |
| History Engine | TAK (opcjonalnie, neutral gdy brak) | Średnia |
| Scope Gap warnings | TAK (opcjonalnie) | Średnia |
| SMART warnings | TAK (penalty / reason mix) | Średnia |
| Jakość dokumentów | TAK | Średnia |

**„AI matches”:** w tipie nie ma osobnego licznika LLM-match; używać **mapped + matchMethod + lineKind known** zamiast mylącej nazwy „AI”.

---

## 5. Jak prezentować Confidence użytkownikowi?

### 5.1 Primarny UI

| Element | Rekomendacja |
|---------|--------------|
| **Badge** | `Pewność analizy: Wysoka / Średnia / Niska` + liczba 0–100 |
| **Kolor** | green ≥75 · amber 50–74 · red &lt;50 (zgodne z istniejącymi badge AI-COST) |
| **Expand** | „Dlaczego?” → top 3–5 **drivers** (np. „Quotes 67% (−)”, „0 ostrzeżeń Scope (+)”, „Bid: duży narzut czasowy (−)”) |
| **Miejsce** | Nagłówek Kosztorys / Oferta — **obok**, nie zamiast Bid PLN |
| **Copy** | „To ocena wiarygodności analizy, **nie** rekomendacja ceny.” |

### 5.2 Czego unikać

- Ukrywania `recommendedBidPln` gdy low confidence (wystarczy ostrzeżenie).  
- Jednego score bez wyjaśnienia.  
- Mylenia z SMART „brak Quotes” (osobny banner).  
- Automatycznego blokowania submit oferty (v1 = informacyjne; twardszy gate = osobny DF).

### 5.3 Przykład komunikatu

```text
Pewność analizy: 61 / 100 (średnia)
• Quotes: 67% linii (−14)
• Unmapped: 38 pozycji (−)
• Scope: możliwy brak wywozu (−)
• Dokumenty: SWZ+przedmiar OK (+)
• Historia: brak podobnych (neutral)
```

---

## 6. Korzyści biznesowe

1. **Bezpieczeństwo decyzji** — kosztorysant wie, kiedy **nie ufać** ładnej liczbie Bid.  
2. **Jedna warstwa zaufania** zamiast ręcznego składania SMART + coverage + ostrzeżeń.  
3. **Onboarding** — mniej doświadczenia potrzeba, by zauważyć ryzykowne przetargi.  
4. **Priorytetyzacja pracy** — najpierw popraw mapowanie / dokumenty przy low score.  
5. **Spójność z REAL-BID** — anomalia Bid i niski Quotes (elewacje 67%) stają się widoczne w jednym miejscu.

---

## 7. Ryzyka

| Ryzyko | Poziom | Mitygacja |
|--------|--------|-----------|
| **False sense of safety** (wysoki score, zła oferta) | Wysoki | Copy + drivers; History delta nie ukryta |
| **Double-counting** Quotes ∩ SMART ∩ mapping | Wysoki | Jedna oś „price coverage”; SMART tylko reason split |
| **Kara za brak History** (niszczy uniwersalność) | Wysoki | Neutral przy 0 peers |
| **Konflikt z S7** (dwa score’y) | Średni | UI: „Gotowość wyceny AI-COST” vs „Pewność analizy”; Confidence cytuje S7 |
| **Nadmierna złożoność wag** | Średni | Start: 5–6 czynników; reszta w DF v2 |
| **Traktowanie score jako wyceny** | Produktowe | Zakaz wpływu na Bid w kodzie + copy |
| **Niestabilność score day-to-day** | Średni | Snapshot `computedAt` + wersja wzoru w report |

---

## 8. Czy zwiększy bezpieczeństwo decyzji kosztorysanta?

**TAK — istotnie**, jeśli:

- jest **wyjaśnialny** (drivers),  
- **nie zastępuje** przeglądu przedmiaru,  
- **nie karze** braku historii,  
- jest widoczny **przy** Bid, nie w osobnym labiryncie menu.

Bez Confidence kosztorysant musi sam złożyć: 78% Quotes + SMART unmapped + ostrzeżenia Bid + (przyszłe) Scope Gap. Z Confidence dostaje **jawny sygnał ryzyka analitycznego**.

Szacunek wpływu (jakościowy): **+1 stopień bezpieczeństwa procesu** (z „asysta wyceny” → „asysta wyceny + semafor zaufania”), bez zmiany SSOT liczb.

---

## 9. Odpowiedzi formalne (1–8)

| # | Pytanie | Odpowiedź |
|---|---------|-----------|
| **1** | Zgodny z SSOT? | **TAK** |
| **2** | Osobny moduł RO? | **TAK** |
| **3** | Miejsce w pipeline? | **Na końcu** łańcucha analitycznego (po SMART + opc. Scope/History) |
| **4** | Jakie dane? | Quotes/mapping, S7, SMART, dokumenty, opc. Scope/History, Bid health, alias quality |
| **5** | Prezentacja? | Badge 0–100 + etykieta + top drivers; copy „nie jest ceną” |
| **6** | Korzyści? | Semafor zaufania, priorytety pracy, mniej błędów ufania Bid |
| **7** | Ryzyka? | Double-count, false safety, kara za brak History, dwa score’y vs S7 |
| **8** | Bezpieczeństwo decyzji? | **TAK** (przy wyjaśnialności i RO) |

---

## 10. Rekomendowana architektura (SSOT-safe)

```text
┌─────────────────────────────────────────────────────────────┐
│  WYCENA (FROZEN)                                              │
│  AI-COST → Bid SSOT → (S7 qualityScore wewnętrznie)           │
└─────────────────────────────────────────────────────────────┘
         │ RO                         │ RO
         ▼                            ▼
   SMART Detect                 Scope Gap / History (opc.)
         │                            │
         └──────────┬─────────────────┘
                    ▼
         ┌──────────────────────────┐
         │  CONFIDENCE ENGINE (NEW) │
         │  pure function:          │
         │  inputs → ConfidenceReport│
         │  NO writes               │
         └────────────┬─────────────┘
                      ▼
              UI: Pewność analizy
```

### Kontrakt wyjścia (do przyszłego DF)

```text
ConfidenceReport {
  score0to100: number
  band: "low" | "medium" | "high"
  computedAt: string
  formulaVersion: string
  drivers: Array<{
    id: string
    labelPl: string
    impact: number        // signed contribution
    evidencePl?: string
  }>
  inputsUsed: {
    quoteCoveragePct?: number
    mappedPct?: number
    smartMissingPct?: number
    s7QualityScore?: number
    scopeGapWarningCount?: number
    historyPeerCount?: number
    docCompleteness?: string
    bidOk?: boolean
  }
  disclaimerPl: "Ocena wiarygodności analizy — nie zmienia wyceny ani oferty."
}
```

### Zakazy

1. Mutacja Bid / OfferBoq / Quotes / Library.  
2. Używanie Confidence do auto-korekty `recommendedBidPln`.  
3. Wymaganie History/Scope do działania.  
4. Ukrywanie score bez drivers.  
5. Przebudowa wzoru S7 „przy okazji” — tylko **odczyt** wyniku S7.

### Relacja do S7

| | S7 | Confidence Engine |
|--|----|--------------------|
| Owner | AI-COST FREEZE | Osobny moduł (przyszły DF) |
| Scope | OfferBoq readiness | Cała analiza przetargu |
| UI | Panel gotowości AI-COST | Semafor globalny |
| REUSE | — | **Tak** — `qualityScore` jako input |

---

## 11. NEXT (bez startu EPIC)

```text
UTRZYMANIE — Confidence Engine NIE wystartowany.
Zależności opcjonalne (Scope Gap / History) NIE blokują:
  MVP może użyć Quotes + mapping + S7 + SMART + docs.
Po Owner GO: PLAN → DF „CONFIDENCE-ENGINE-01” · pure RO · formulaVersioned.
Kolejność produktowa (sugerowana, nie GO):
  1) Scope Gap RO  2) Confidence MVP  3) History (wzbogaca score)
  — lub Confidence MVP natychmiast na sygnałach tip.
```

---

## 12. Jakość audytu

- Brak IMPLEMENT.  
- Uwzględniono istniejący S7 `qualityScore` (unikanie duplikacji odpowiedzialności).  
- Wagi = propozycja AUDIT, nie zamrożone — wymagają DF + kalibracji na case’ach REAL-BID.  
- Nie uruchamiano nowego probe — oparto o tip + poprzednie AUDIT.

**AUDIT COMPLETE · CONFIDENCE-ENGINE-AUDIT-01 · 2026-07-31**
