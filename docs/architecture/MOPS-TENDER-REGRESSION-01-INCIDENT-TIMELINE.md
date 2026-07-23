# MOPS-TENDER-REGRESSION-01 — INCIDENT TIMELINE

> **Status:** **INCIDENT TIMELINE COMPLETE**  
> **Data:** 2026-07-23  
> **Class:** P0 · App trigger → platform exhaustion  
> **Powiązane:** [`SUPABASE-KV-522-01-PLATFORM-REMEDIATION-PLAN.md`](SUPABASE-KV-522-01-PLATFORM-REMEDIATION-PLAN.md) · [`EDGE-BATCH-SET-500-01-PLATFORM-RCA.md`](EDGE-BATCH-SET-500-01-PLATFORM-RCA.md)  
> **Implement / commit / push:** **ZAKAZ**

```text
══════════════════════════════════════
INCIDENT TIMELINE COMPLETE

Czy problem rozpoczął się od konkretnego przetargu MOPS?

ODPOWIEDŹ: TAK (jako TRIGGER)

  Otwarcie jednego detalu MOPS → pętla heavy-dossier + fat persist
  całego kw-tenders-pipeline → lawina batch-get/batch-set
  → wyczerpanie zasobów projektu Supabase
  → REST 522 / batch-* 500 / "exhausting multiple resources"

  MOPS nie ma osobnej „złośliwej” logiki w kodzie —
  jest typowym grubym przetargiem (BIP / dużo dokumentów),
  który odsłania istniejącą pętlę useEffect + debounce OFF.
══════════════════════════════════════
```

---

## 0. Werdykt (jednoznaczny)

| Pytanie | Odpowiedź |
|---------|-----------|
| Czy awaria **zaczęła się** od wejścia w konkretny przetarg MOPS? | **TAK — jako trigger** (zgodne z chronologią Ownera: rano OK → po MOPS cascade) |
| Czy MOPS ma unikalny bug w kodzie? | **NIE** — ten sam pipeline co inni; MOPS = filtr + portal BIP |
| Czy jeden rekord może wywołać lawinę zapisów? | **TAK** — potwierdzone w kodzie (pętla heavy + pełny `persistKey` pipeline) |
| Czy REST 522 to pierwotna przyczyna? | **NIE** — to **skutek** przeciążenia; pierwotny driver = lawina sync z UI |

---

## 1. Co ładuje się przy wejściu w detal przetargu

```text
Lista / Strategia → openTenderDetailV4 → TenderDetailPage
  → useTenderPipelineRuntime(enabled)
       ├─ useTenderDocumentsBootstrap   // notice HTML + discovery dokumentów
       ├─ useTenderDossierHeavyLazy     // kosztorys / ZIP / PDF bytes
       ├─ useTenderTrustAssessment
       └─ useTenderPricingAuto
```

### Dane typowo pobrane / zbudowane dla MOPS

| Dane | Źródło | Gdzie lądują |
|------|--------|--------------|
| HTML ogłoszenia (`noticeHtml`) | Edge `tenders-bzp-notice` | item + **pełny** cloud pipeline |
| Lista dokumentów BZP | `tenders-bzp-documents` | `bzpDocuments` |
| Discovery zewnętrzne (BIP MOPS) | `tenders-external-discover` | `externalDocDiscovery` |
| Bajty ZIP/PDF/plików | `tenders-bzp-document-bytes` / zip-* (concurrency 4) | parse in-memory |
| `tenderDossier` + `kosztorys.rows` | heavy parse | item + **pełne rows w cloud** |
| `swzAnalysis` / estimate | parse / pricing | item |

**MOPS w kodzie:** `priorityBuyerId: "mops"` · filtr strategiczny · portal BIP w słowniku — **bez** osobnej ścieżki detalu (`tenders-bzp.ts` ~337–357 · `tender-external-docs.ts`).

---

## 2. Rozmiary (pomiar vs model)

### 2.1 Pomiar live z prod

**ZABLOKOWANY** — REST nadal **522** (probe 2026-07-23). Nie da się odczytać aktualnego `kw-tenders-pipeline` z chmury.

Historyczny proxy (audyt batch-set, 2026-07-07):

| Metryka | Wartość |
|---------|---------|
| `kw-tenders-pipeline` w RS | **~1.82 MB** (~83% fat bundle) |

### 2.2 Model rozmiaru przy open MOPS

| Obiekt | Lean LS | Cloud / `persistKey` | Pamięć przy open |
|--------|---------|----------------------|------------------|
| Cały `kw-tenders-pipeline` | strip `noticeHtml` + empty `kosztorys.rows` | **FULL** wszystkich items | FULL w React state |
| Pipeline session cache | — | — | FULL items (TTL 60s) |
| Analysis / artifact cache | — | — | default **OFF**; przy OFF = re-parse |
| Pojedynczy MOPS po heavy | w cold IDB pełny; LS lean | HTML + rows w **całym** JSON pipeline | Duży udział w stringify |

**Wniosek:** każdy autosave przy open zapisuje **nie tylko MOPS**, lecz **całą tablicę pipeline** (często ~MB).

---

## 3. Pętla przy wejściu (POTWIERDZONA W KODZIE)

### 3.1 ★ Root loop — `useTenderDossierHeavyLazy`

Plik: `src/app/hooks/useTenderDossierHeavyLazy.ts`

```text
useEffect(heavy):
  if !tenderDossierHeavyParseDone → start cost phase
  → onUpdate(partial dossier)     // nowy builtAt; często brak kosztorys.ok; brak parsedAt
  → React re-render
  → cleanup: cancelled=true; clear inflight
  → deps zmieniły się (builtAt / parserVersion / gateFingerprint)
  → effect startuje OD NOWA
  → enrichment z parsedAt często ANULOWANE
  → heavy NIGDY nie osiąga "done" gdy kosztorys.ok=false
```

Warunek „done” (`tender-dossier-pipeline.ts` 171–175):

- `parserVersion === CURRENT`
- **oraz** `kosztorys.ok` **lub** `scanSummary.parsedAt`

Faza cost ustawia `partial: true` → **`parsedAt` undefined** (linia 303).  
Przy nieudanym/częściowym kosztorysie MOPS (typowy brak ATH lub ciężki ZIP) → **nieskończona seria restartów**.

### 3.2 Persist = fat cloud round-trip (debounce OFF)

| Setting | Domyślnie |
|---------|-----------|
| `pipelinePerfDebouncePersist` | **`false`** (`app-settings.ts` 75–85) |

```text
updateItem(patch)
  → saveTendersPipeline(FULL items)     // gdy debounce OFF
  → persistKey("kw-tenders-pipeline", FULL)
  → pushKeysToCloudSafe
       → batch-get(pipeline)            // 1
       → merge
       → batch-set(FULL pipeline)       // 1 (+ retry do 4 przy 500)
```

**1 update UI = ≥2 HTTP KV** (get+set), payload ~cały pipeline.

### 3.3 Bootstrap (amplifikator, nie ∞)

Discovery key zależy m.in. od długości `noticeHtml` → do **2** restartów bootstrap / mount (`BOOTSTRAP_MOUNT_ATTEMPT_CAP`).  
Każdy → kolejne `onUpdate` → kolejne fat persist.

---

## 4. Ile requestów na jedno otwarcie MOPS?

| Faza | Szacunek (debounce OFF + heavy loop) |
|------|--------------------------------------|
| Bootstrap (notice/docs/external) | ~2–6× `onUpdate` → **~4–12** batch-get/set |
| Heavy restart × N (pętla) | **N × (1–2)** fat get+set + Edge document-bytes |
| Przy N ≈ 10–50 (zawieszona karta) | **dziesiątki–setki** requestów KV w krótkim czasie |
| + Edge ZIP/PDF bytes (concurrency 4) | dodatkowe obciążenie Functions + origin |
| Transient 500 retry | × do **4** na jeden `batch-set` |

To wystarczy, by Dashboard pokazał: **„Your project is currently exhausting multiple resources.”**

Dokładna liczba z HAR Ownera = najlepszy dowód ilościowy (DevTools Network filtr `batch-`).

---

## 5. Czy pipeline MOPS był „wyjątkowo duży / uszkodzony”?

| Hipoteza | Ocena |
|----------|--------|
| Osobny corrupt format tylko MOPS | **Brak dowodu w kodzie** |
| Duży pakiet dokumentów (BIP / ZIP / HTML) | **PRAWDOPODOBNE** — MOPS jako priority buyer często „gruby” |
| Uszkodzony = nieskończony heavy bez `kosztorys.ok`/`parsedAt` | **TAK mechanicznie** — nie musi być „corrupt JSON”; wystarczy partial fail |
| Historyczny pipeline ~1.8 MB | Wspólny współczynnik — MOPS **powiększa** ten blob przy każdym partial |

---

## 6. Czy jeden rekord może wywołać lawinę?

**TAK.**

```text
1 rekord MOPS
  → wiele onUpdate
  → każdy onUpdate serializuje CAŁY pipeline
  → każdy = batch-get + batch-set
  → pętla heavy mnoży to bez limitu użytkownika
```

Nie jest wymagany bug „tylko MOPS” — wystarczy **otwarcie grubego detalu** przy istniejącej pętli deps.

---

## 7. Chronologia zdarzeń (od wejścia do 522)

```text
T0   Rano — produkcja / sync OK (Owner)
T1   User otwiera konkretny przetarg MOPS (detal V4)
T2   Mount useTenderPipelineRuntime
T3   Bootstrap: Edge notice + documents [+ external BIP]
T4   onUpdate × k  →  batch-get + batch-set FULL pipeline × k
T5   Heavy cost phase: ZIP/PDF bytes (Edge), CPU parse
T6   Partial persist (builtAt↑, często kosztorys.ok=false, brak parsedAt)
T7   useEffect cleanup + restart heavy   ★ PĘTLA
T8   UI: ciągłe ładowanie / przeładowanie stanu / zawieszenie karty
T9   Narastająca fala batch-get/set + Edge bytes
T10  Supabase: exhausting multiple resources
T11  PostgREST origin nie nadąża → Cloudflare REST 522 (~20s)
T12  Edge batch-get/set → HTTP 500 (mapowanie błędów platformy)
T13  Cloud Sync DOWN · kolejne wejścia też padają (project exhausted)
```

**Związek z SUPABASE-KV-522-01:** 522 to **faza skutkowa**; trigger aplikacji = **T1–T9**.

---

## 8. Dowody kodowe (SSOT)

| # | Fakt | Lokalizacja |
|---|------|-------------|
| 1 | Heavy effect deps obejmują `builtAt` | `useTenderDossierHeavyLazy.ts` 266–277 |
| 2 | Partial `onUpdate` przed enrichment | ten sam · 197–200 |
| 3 | Cleanup anuluje inflight | 261–265 |
| 4 | Done wymaga ok/parsedAt | `tender-dossier-pipeline.ts` 171–175 |
| 5 | Cost bez `parsedAt` gdy partial | 303–304 |
| 6 | Debounce persist **OFF** | `app-settings.ts` 75–85 |
| 7 | `updateItem` → natychmiast `saveTendersPipeline` | `useTendersPipeline.ts` 267–272 |
| 8 | `persistKey` = get+set | `cloud-sync.ts` `pushKeysToCloudSafe` |
| 9 | MOPS = buyer, nie special detail | `tenders-bzp.ts` 337–357 |

---

## 9. Czego nie ustalono (luka evidence)

| Luka | Dlaczego |
|------|----------|
| Dokładne MB tego MOPS w momencie T1 | REST 522 — brak odczytu KV |
| Dokładna liczba HTTP w HAR | Brak capture Ownera w repo |
| requestId z pierwszej fali | Do uzupełnienia z DevTools / Edge Logs |

**Nie podważa** werdyktu triggera: mechanizm pętli jest **deterministyczny w kodzie**; chronologia Ownera (rano OK → po MOPS) jest z nim spójna.

---

## 10. Implikacje (bez implementacji)

| Dla platformy | Najpierw: remediacja 522 (SUPABASE-KV-522-01) |
| Dla aplikacji (osobne GO FIX) | Zerwać pętlę deps heavy (`builtAt` out of deps / nie cancel enrichment); włączyć debounce persist; nie `persistKey(FULL)` na każdy partial |
| Dla Ownera teraz | Nie otwierać tego detalu MOPS do czasu platform UP + fix pętli |

---

## 11. Następny krok

```text
INCIDENT TIMELINE COMPLETE

Czy problem rozpoczął się od konkretnego przetargu MOPS?
→ TAK (TRIGGER)

Czekam na: OWNER GO
(bez implementacji / commit / push)
```
