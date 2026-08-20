# IK — HISTORICAL EXECUTED ATH KNOWLEDGE · FULL AUDIT #01

| Field | Value |
|-------|-------|
| **ID** | `IK-HISTORICAL-EXECUTED-ATH-AUDIT-01` |
| **Gate** | `OD-IK-HISTORICAL-EXECUTED-ATH-AUDIT-01` |
| **Status** | **AUDIT = COMPLETE / PASS WITH GAPS** |
| **Date** | 2026-08-20 |
| **Mode** | **AUDIT ONLY · READ-ONLY** |
| **Master SSOT** | [`INTELLIGENT-ESTIMATOR-MASTER-SSOT.md`](./INTELLIGENT-ESTIMATOR-MASTER-SSOT.md) |
| **Corpus prior** | [`IK-KNR-CORPUS-HARVEST-REPORT.md`](./IK-KNR-CORPUS-HARVEST-REPORT.md) · [`IK-KNR-CORPUS-QUALITY-AUDIT.md`](./IK-KNR-CORPUS-QUALITY-AUDIT.md) · [`IK-KNR-CORPUS-LIVE-EXECUTION-REPORT.md`](./IK-KNR-CORPUS-LIVE-EXECUTION-REPORT.md) |
| **Real tender** | [`IK-AI-OWNER-REAL-TENDER-SHADOW-TEST-01.md`](./IK-AI-OWNER-REAL-TENDER-SHADOW-TEST-01.md) · [`…-02.md`](./IK-AI-OWNER-REAL-TENDER-SHADOW-TEST-02.md) |
| **Level A** | Policy / DF / PRE-IMPL — **IMPL NOT AUTHORIZED** |

```text
AUDIT                  = COMPLETE / PASS WITH GAPS
PLAN                   = NOT STARTED
DESIGN FREEZE          = NOT STARTED
ARCH REVIEW            = NOT STARTED
IMPLEMENTATION         = NOT AUTHORIZED

src changes            = 0
settings               = 0
VERIFY / APPROVE / REJECT = 0
catalog writes         = 0
commit / push / deploy = 0
```

---

## 1. EXECUTIVE SUMMARY

Historyczne pliki `.ath` w `kw-jobs` (9 plików · 9 jobów `completed`) stanowią **realny corpus kosztorysów WGDOM** powiązanych z zakończonymi realizacjami. Owner deklaruje, że są to kosztorysy wykonawcze / powykonawcze zaakceptowane przez zamawiających / miasto.

**Werdykt audytu:**

| Stwierdzenie | Wynik |
|--------------|-------|
| Czy corpus może stać się **Historical Executed WGDOM Knowledge**? | **TAK** (jako sygnał evidence / confidence — nie jako norma) |
| Czy da się to zrobić przez **REUSE** istniejącego IK? | **TAK** |
| Czy dziś KNR Expert już korzysta z historycznych ATH przy analizie przetargu? | **NIE** |
| Czy trzeba budować drugi Catalog / orchestrator / chat? | **NIE — zakaz** |
| Czy Real Tender #01 pokazuje wartość? | **TAK** (częściowy overlap; większość pozycji = NEW / FAMILY-ONLY) |

**Twardy rozdział (wiążący):**

```text
A) NORMATIVE KNR KNOWLEDGE
   = identityKeyV2 · FULL R/M/S · KL-5/KL-6 · PENDING → Owner VERIFY → VERIFIED Catalog

B) HISTORICAL EXECUTED WGDOM KNOWLEDGE
   = jobId · address · completed job · source .ath · occurrence · RMS consistency
   = „robiliśmy już taką pracę” · confidence signal · evidence for experts

B ≠ A
B ↛ auto VERIFIED
B ↛ auto APPROVE
B ↛ auto current price / OUR RATE
```

**Shadow Real Tender #01 (`2026/BZP 00391783`, 88 pozycji PDF):**

| Sygnał (read-only join vs harvest) | Pozycje (≈) |
|------------------------------------|------------:|
| Exact family+table w historycznym ATH | **21** (w tym **3** z FULL_RMS; **1** klucz w READY-16) |
| Unikalne exact keys | **7** |
| Family-only (słaby sygnał) | **48** |
| No history / NEW | **19** |

PDF Candidate bridge (#02) pozostaje **osobnym** decision-support — nie jest History Signal i nie jest Catalog.

---

## 2. CURRENT IK TREE

Rzeczywisty runtime (nie diagram marketingowy):

```text
TenderDetailPage / TenderPrzetargWorkspace
  ├─ Chief session stack (opcjonalnie)
  │    useChiefOrchestratorSession → runChiefOrchestrator → ChiefSessionOutput
  └─ IkEntryHost
        │
        ├─ runIkNg02IngestBridge          → dossier / PDF / ATH preview · itemPatch
        ├─ runIkDocumentExpert            → Master BOQ · przedmiary · readyForExperts
        ├─ runIkKnrExpert                 → catalogBasis completeness (bieżący przetarg)
        ├─ applyOwnerKnrMapping           → Slice D (presentation assist)
        ├─ resolveHostKnrKnowledgeLookupOnly → KL-3 HOST (Catalog lookup-only)
        ├─ runIkMasterBoqClassification
        ├─ runIkMasterBoqIdentityCoverage
        ├─ runIkMasterBoqLaborExpert      (± research flag)
        ├─ runIkMasterBoqMaterialExpert   (± research flag)
        ├─ runIkCompositeBothHold
        ├─ runIkP7PositionCostBid         → F5 / Bid / SUM
        ├─ runIkP8RiskDecision            → Validation · Chief · DW
        │
        └─ buildIkEntryConversationViewModel
              ├─ buildIkKnrConversation
              └─ ExpertConversationSurface (+ IkExpertRoomChrome)
```

**Kolejność:** Document/BOQ → KNR (sync) → Classification → Labor∥Material (async) → Composite → P7 → P8 → Conversation agreguje fakty.

**Poza drzewem Host (osobne ścieżki):**

| Ścieżka | Rola dziś |
|---------|-----------|
| `knr-corpus-ingest-orchestrator` | 9 ATH → 16 READY → **PENDING_VERIFY** (normative queue) |
| `knr-verify-orchestrator` (KL-6) | Owner VERIFY → Catalog VERIFIED |
| `knr-pdf-match-candidate` | PDF → Candidate decision-support (Shadow #02) |
| Labor/Material research | Work Catalog / Price Memory — nie KNR norms |

---

## 3. CURRENT EXPERT MAP

| Expert | Entry | Write authority | EC | Uwaga vs Historical |
|--------|-------|-----------------|----|---------------------|
| Document | `runIkDocumentExpert` | nie Catalog | tak | buduje Master BOQ z bieżących docs |
| **KNR** | `runIkKnrExpert` | **0** writes | tak | **tylko** completeness `catalogBasis` bieżącego BOQ |
| Classification | `runIkMasterBoqClassification` | nie | facts | routing LABOR/MATERIAL |
| Labor | `runIkMasterBoqLaborExpert` | Accept poza P8 lock | tak | OUR RATE / research-on-miss |
| Material | `runIkMasterBoqMaterialExpert` | j.w. | tak | Price Memory / SELL |
| Composite | `runIkCompositeBothHold` | nie | tak | BOTH_HOLD |
| P7 | `runIkP7PositionCostBid` | nie invent | tak | F5 Position Cost · Bid |
| Validation | `analyzeValidationFromDossier` via P8 | nie Accept | via P8 | Hard/Soft findings |
| P8 | `runIkP8RiskDecision` | autoAccept=false | tak | Risk · DW · GO/HOLD/NO-GO |
| Chief | `runChiefOrchestrator` / session | ≠ Owner Accept | steps | orchestration |
| KL-3 HOST | `resolveHostKnrKnowledgeLookupOnly` | lookup-only | side-channel | Catalog LOCAL_HIT/MISS |
| KL-6 | `executeKnrOwnerVerify*` | **sole Catalog mutation** | nie | Owner only |

---

## 4. CURRENT KNR ARCHITECTURE

```text
CURRENT TENDER BOQ
  → catalogBasis (family ± tableCode)
  → runIkKnrExpert: NONE | HOLD | CANDIDATE | CONFLICT
  → buildIkKnrConversation (laik PL)
  → (parallel) KL-3 HOST lookup Catalog by identity — usually MISS if VERIFIED=0

SEPARATE — CORPUS NORM PATH
  jobs/.../kosztorys-*.ath
  → parseAthKnrNormExport
  → READY 16 → PENDING_VERIFY
  → KL-6 Owner → VERIFIED (dziś: VERIFIED by corpus = 0)

SEPARATE — PDF CANDIDATE
  PDF row → KnrMatchCandidate → HUMAN (identityKeyV2=null)
```

**Luka produktowa:** brak warstwy **Historical Executed Signal** między „oznaczenia w bieżącym przedmiarze” a „robiliśmy to na zakończonych jobach”.

---

## 5. HISTORICAL ATH INVENTORY

Źródła (read-only): `.tmp/knr-corpus-harvest-sweep.json` · docs CORPUS-1/2 · LIVE report.

| Metryka | Wartość |
|---------|---------|
| Pliki `.ath` | **9** |
| Job status | **9× `completed`** |
| Program | NORMA **4.32** (7/9) · **4.49** (2/9: Chińska, Parkowa) |
| Storage | `jobs/{jobId}/kosztorys-*.ath` · bucket `make-0afb8820-photos` |
| POZYCJA (INI) | **397** |
| KNR-ish records | **322** |
| FULL R/M/S instances | **86** |
| PARTIAL R/M/S | **143** |
| NO_RMS | **160** |
| Unique identityKeyV2 (FULL) | **34** |
| Unique display FULL | **30** |
| READY → PENDING | **16** |
| CONFLICT (norm hash) | **19** (Quality: 18 OWNER REVIEW) |
| Exact duplicate groups | **12** · **35** instances |
| KNR in ≥3 files | **16** |
| Catalog VERIFIED (harvest) | **0** |

### 5.1 Lista realizacji

| # | Adres | jobId (prefix) | Plik | Status |
|---|-------|----------------|------|--------|
| 1 | Koreańska 1 / 132 | `0ea61293-…` | `…ofertowy.ath` | completed |
| 2 | Koreańska 1 / 422 | `2b5d5b77-…` | `…ofertowy.ath` | completed |
| 3 | Chińska 3b / 2 | `a9ac1bd9-…` | `…ofertowy.ath` | completed |
| 4 | Parkowa 25b / 5 | `14699b1f-…` | `…ofertowy.ATH` | completed |
| 5 | Obornicka 61 / 8 | `dc35eef8-…` | `…ofertowy.ath` | completed |
| 6 | Sępa Sarzyńskiego 61 / 4 | `161b006e-…` | `…ofertowy.ath` | completed |
| 7 | Gorlicka 26 / 6 | `405f0884-…` | `…ofertowy.ath` | completed |
| 8 | Gorlicka 26 / 9 | `7eda9bcf-…` | `…ofertowy.ath` | completed |
| 9 | Krzywoustego 268 / 2 | `016e6d9b-…` | `…ofertowy.ath` | completed |

### 5.2 Provenance nuance (GAP dokumentacyjny)

| Fakt | Znaczenie |
|------|-----------|
| Owner: wykonane + zaakceptowane przez miasto | **Business claim** — silna intencja produktu |
| Nazwy plików: `*-ofertowy.ath` | Etykieta **ofertowa** NORMA — nie dowód „acceptance certificate” w KV |
| `jobStatus=completed` | Silny sygnał operacyjny WGDOM |
| Brak osobnego pola `cityAcceptedAt` / `invoiceId` w harvest | **GAP** — warto zaplanować metadata (bez nowego Catalog) |

Audyt **nie kwestionuje** deklaracji Ownera; wymaga jawnego tagu provenance przy przyszłym modelu sygnału.

---

## 6. DATA AVAILABLE FROM ATH

Z harvest `records[]` (pola obecne):

| Pole | Dostępne? | Uwaga |
|------|-----------|-------|
| `sourceJobId` / address | TAK | join do Roboty |
| `filename` / `storagePath` / `contentSha256` | TAK | provenance pliku |
| `displayCode` / `family` | TAK | |
| `identityKeyV2` | TAK (gdy FULL) | |
| `description` / `unit` | TAK | |
| `publisher` / `edition` / `chapter` | TAK | |
| `rmsClass` FULL/PARTIAL/NO | TAK | |
| `normsSummary` / R/M/S | TAK przy FULL | |
| `contentHash` | TAK przy FULL | konflikt = wiele hash |
| `observedCost` | TAK (operational) | **≠** OUR RATE / aktualna wycena |
| Quantity per pozycja | w ATH/parserze | nie jest dziś indeksem History Signal |
| Frequency (fileCount) | wyliczalne | `topRepeatedKnr` |
| City acceptance / invoice | **NIE w modelu** | GAP |

---

## 7. EXACT MATCH CAPABILITY

**Dziś w runtime IK:** brak.  
**W danych (offline join):** TAK przy kluczu:

```text
primaryLookupKey ≈ normalize(family + catalogId + tableCode)
  np. "KNR 2-02 1505-01"
secondary: identityKeyV2 (gdy obie strony mają FULL)
```

Real Tender #01: **7 unikalnych exact keys** na przecięciu PDF (family w `code` + table token w opisie) × historyczny ATH.

Najsilniejszy przykład: **`KNR 2-02 1505-01`** — 9 jobów · FULL+PARTIAL · **w READY-16**.

---

## 8. PARTIAL MATCH CAPABILITY

| Rodzaj | Istnieje dziś? | Ocena |
|--------|----------------|-------|
| Family-only (`KNR 4-01` bez table) | dane TAK · runtime NIE | **słaby** — nie sprzedawać jako „robiliśmy to” |
| Table token only | dane TAK · runtime NIE | bardzo słaby / FP risk |
| Unit match | dane TAK | secondary |
| Opis overlap (string) | dane TAK · brak silnika | PLAN later · fail-closed |
| PDF Candidate score | Shadow #02 | **nie** History Signal |

---

## 9. SEMANTIC MATCH CAPABILITY

**Brak** w repo (zero embedding / LLM / similarity engine w ścieżce KNR).

Docelowo (tylko design, nie implementacja):

```text
„podobna robota, inny KNR” → HISTORICAL_SIMILAR ≤ soft evidence
  NIGDY ≠ normative identity
  NIGDY ≠ auto VERIFY
```

---

## 10. CONFLICT MODEL

Już istnieje w warstwie **normatywnej** corpus:

- 19 konfliktów contentHash / identity split (Quality AUDIT)
- denylist CONFLICT przy ingest READY
- KNR Expert `CONFLICT` (różne odczyty basis — bieżący BOQ)

Dla **Historical Executed** proponowany model (AUDIT only):

| Stan | Reguła |
|------|--------|
| Ten sam display · jeden hash · wiele jobów | `HISTORICAL_MULTI` → ↑ confidence |
| Ten sam display · wiele hash / RMS | `HISTORICAL_CONFLICT` → HUMAN · **nie** majority auto-accept |
| Family hit bez table | `HISTORICAL_FAMILY` → niski confidence · HUMAN |
| Brak | `HISTORICAL_MISS` / `NEW_KNR` → normalny flow |

---

## 11. FREQUENCY MODEL

Już wyliczalne z harvest (`fileCount`, `knrIn3PlusFiles=16`):

```text
frequency = distinct sourceJobId | distinct ATH file
  (nie: liczba wierszy w jednym pliku jako authority)
```

**Zasada Level A (OPEN-BI-2 kontekst):** frequency **≠** authority. Frequency może podnosić **confidence** / uzasadniać narrację EC — **nie** KL-6 APPROVE.

---

## 12. HISTORICAL EVIDENCE MODEL (propozycja kontraktu — bez impl)

**Bez drugiego Catalog.** Preferowany REUSE:

```text
HistoricalExecutedAthHit (read-only projection)
  lookupKey
  signal: EXACT | STRONG | FAMILY | SIMILAR | CONFLICT | MISS
  occurrenceCount
  distinctJobIds[]
  addresses[]
  rmsAgreement: CONSISTENT | MIXED | CONFLICT | UNKNOWN
  contentHashSet[]
  identityKeyV2?          // optional link TO normative — not auto VERIFIED
  sourceRefs[]            // storagePath · filename · jobId
  confidence: LOW | MED | HIGH
  authority: NEVER
  pricingDerived: NEVER
```

**Przechowywanie metadata (kolejność preferencji REUSE):**

1. **Projection read-only** z istniejących `jobFiles[]` + parse (jak harvest) — zero nowego KV na start PLAN.  
2. Opcjonalnie później: lekki index KV **tylko** jeśli performance wymaga — **nie** `kw-knr-catalog`.  
3. Normative VERIFIED pozostaje wyłącznie KL-6.

**Lookup keys:**

| Priorytet | Key |
|-----------|-----|
| 1 | `family + catalogId + tableCode` |
| 2 | `identityKeyV2` (gdy obie strony FULL) |
| 3 | `unit` + normalized description token (secondary) |
| 4 | semantic (przyszłość · soft) |

---

## 13. PROPOSED ORCHESTRATION SEAM

```text
Document Expert → Master BOQ
  → KNR Expert (istniejący completeness)
  → ★ Historical ATH lookup (NOWY SEAM — cienki, read-only)
  → Historical Evidence fact → EC + optional inputs to Labor/Material/Validation
  → Classification → Labor ∥ Material → Composite → P7 → Validation → P8 → Chief
```

**Nie** nowy orchestrator. **Nie** nowy chat. Wpięcie: rozszerzenie faktów `IkKnrExpertReport` / adapter conversation + opcjonalne pola read-only dla P8/Validation.

---

## 14. KNR EXPERT ROLE

**Tak — KNR Expert powinien być właścicielem narracji History Signal** w Expert Conversation (oznaczenia / odpowiedniki katalogowe / „robiliśmy”).

Dziś mówi tylko o completeness basis.  
Docelowe komunikaty (REUSE `buildIkKnrConversation`):

- „Znalazłem N wcześniejszych realizacji WGDOM z tym samym KNR.”
- „W N realizacjach R/M/S były zgodne.”
- „Mam historyczny odpowiednik, ale opis różni się od przedmiaru.”
- „Podobna robota pod innym KNR — tylko podobieństwo, nie norma.”
- „Brak historycznego odpowiednika.”
- „Historyczne realizacje niespójne — wymagana weryfikacja.”

`sourceRef.kind` już dopuszcza `evidence | candidate | hold | boq_ready` — wystarczy artifact z liczbami (bez nowego busa).

---

## 15. LABOR EXPERT ROLE

Historical ATH **może** sygnalizować: „ta praca pojawiała się w zakończonych robotach” → wyższy priorytet research / hint Work Catalog.

**Nie wolno:** kopiować historycznej stawki jako OUR RATE; omijać Accept; traktować ATH price jako aktualną wycenę.

---

## 16. MATERIAL EXPERT ROLE

Analogicznie: sygnał pokrycia materiałowego w przeszłych kosztorysach = soft evidence.

**Nie wolno:** material substitution auto; ATH observedCost → Price Memory write; omijać Accept.

---

## 17. VALIDATION ROLE

Naturalny konsument `HISTORICAL_CONFLICT` / description mismatch / multi-hash.

Validation już jest w P8 (`analyzeValidationFromDossier`) — History Signal powinien być **finding Soft/Hard**, nie auto-decision.

---

## 18. P7 / P8 ROLE

| Warstwa | Rola History Signal |
|---------|---------------------|
| P7 | **nie** podstawiać cen z ATH; opcjonalnie flag „historical work known” w UI detail |
| P8 | confidence / risk downgrade przy CONFLICT; **nie** flip GO przez sam hit |
| DW / Owner decision | wyświetlenie evidence refs |

---

## 19. CHIEF / EXPERT CONVERSATION ROLE

Chief już orkiestruje Case/Task/dossier. History facts powinny wejść przez istniejący EC VM (`buildIkEntryConversationViewModel`), nie LLM.

Kolejność narracji (osiągalna bez rebuild):

```text
Chief: przeanalizujmy pozycje
Document: N pozycji z dokumentów
KNR: M exact history / K miss / C conflict
Labor / Material: pokrycie OUR RATE / Price Memory
Validation: konflikty / braki
Chief: wynik / HOLD / HUMAN
```

---

## 20. REAL TENDER #01 SHADOW RESULT

| Pole | Wartość |
|------|---------|
| BZP | `2026/BZP 00391783` |
| Zamawiający | MOPS Wrocław |
| Źródło kosztowe | **3× PDF przedmiar · 0× ATH** |
| Pozycje | **88** |
| Metoda | read-only join `.tmp/shadow-test-01-*` × `.tmp/knr-corpus-harvest-sweep.json` |
| VERIFY/APPROVE | **0** |

### 20.1 Wynik sygnału (przybliżony, fail-closed)

| Bucket | ~n | Interpretacja |
|--------|---:|---------------|
| Exact key w ATH (FULL_RMS) | **3** | silny historical evidence (głównie `KNR 2-02 1505-01` × lokale) |
| Exact key (PARTIAL/NO_RMS) | **18** | „robiliśmy kod” · słabsze RMS |
| Multi-job wśród exact | **21** | frequency ↑ |
| READY-16 ∩ tender exact | **3** | most do normative PENDING (nadal ≠ VERIFIED) |
| Family-only | **48** | **nie** exact — tylko kontekst katalogu |
| No history | **19** | **NEW_KNR / NO_HISTORY** — normalny flow |

### 20.2 Unikalne exact keys na przetargu

| Key | jobs | FULL | PARTIAL/NO | READY-16 |
|-----|-----:|-----:|-----------:|:--------:|
| `KNR 2-02 1505-01` | 9 | 3 | 6 | **TAK** |
| `NNRNKB 202 1134-02` | 9 | 0 | — | nie |
| `NNRNKB 202 1134-01` | 8 | 0 | — | nie |
| `KNNR 5 1305-01` | 8 | 0 | — | nie |
| `KNR 4-01 1204-02` | 6 | 0 | 6 | nie |
| `KNR 13-21 0402-03` | 6 | 0 | 6 | nie |
| `KNNR 5 1305-02` | 5 | 0 | — | nie |

**Wniosek:** History Signal **ma wartość biznesową** na realnym przetargu, ale **nie pokrywa większości** 88 pozycji — system **musi** dobrze obsługiwać MISS.

---

## 21. PDF CANDIDATE RELATION

```text
PDF Candidate (#02: 24 CANDIDATE / 58 HUMAN / 6 REJECT)
  ≠ Historical Executed Signal
  ≠ Catalog / PENDING / VERIFIED
  może później być WEJŚCIEM do KNR Expert (hints)
  NIE rozwijać teraz jako główny kierunek tego EPIC
```

Relacja docelowa (AUDIT):

```text
PDF Candidate ──hints──▶ KNR Expert
Historical ATH Signal ──evidence──▶ KNR Expert / Validation / EC
         ╲
          ╲──optional link──▶ normative PENDING (tylko Owner path)
```

---

## 22. AI LEVEL A RELATION

Level A = recommendation · E1–E11 AND · AUTO_ELIGIBLE ≠ VERIFIED · KL-6 sole mutation · **IMPL NOT AUTHORIZED**.

| Pytanie | Odpowiedź audytu |
|---------|------------------|
| Czy Historical może być sygnałem E*? | **TAK** jako **evidence / confidence** (np. wspiera E4/E7 świadomość multi-source; frequency ≠ E pass) |
| Czy Historical → AUTO_ELIGIBLE? | **NIE** samo z siebie |
| Czy Historical → APPROVE? | **NIGDY** |
| Critical List | conflict / material sub / UNKNOWN → HUMAN (bez zmian) |
| OPEN-BI-2 (frequency→impact) | pozostaje osobna decyzja Ownera |

---

## 23. LEGAL / SCRAPING BOUNDARY

| Warstwa | Stan |
|---------|------|
| **A Historical WGDOM ATH** | Własne pliki job · `wgdom_internal` / user import — **już używalne** jako evidence |
| **B Normative KNR Catalog** | Legal gate: deny `scrape_*` · licensed export · KL-5/6 — **bez zmian** |
| **C External research / scrape** | Labor/Material mają własne ścieżki; Owner consent **nie** auto-zmienia KNR legal-gate |

**Co wolno już teraz (koncepcyjnie):** czytać własne ATH z completed jobs.  
**Co wymaga policy GO:** jakiekolwiek otwarcie scrape dla **normative** KNR persist.  
**GAP:** osobna Owner decision doc — poza tym audytem.

---

## 24. REUSE MAP

| Potrzeba | REUSE |
|----------|-------|
| Parse ATH | `parseAthKnrNormExport` / KL-5 |
| Job file discovery | harvest pattern `jobFiles kind=kosztorys *.ath` |
| KNR Expert + EC | `ik-knr-expert` · `ik-knr-conversation` · `ik-entry-conversation` |
| Catalog normative | KL-3 HOST · KL-6 (osobno) |
| Validation / P8 / Chief | istniejące |
| Labor / Material | istniejące Accept / research |
| PDF hints | `knr-pdf-match-candidate` (nie główny EPIC) |
| Corpus READY list | `knr-corpus-ready-selection` (norm path only) |

---

## 25. DUPLICATION RISKS

| Risk | Mitigation |
|------|------------|
| Drugi `kw-knr-catalog` „historyczny” | **ZAKAZ** — projection / tagged evidence |
| Drugi parser ATH | **ZAKAZ** |
| Drugi Expert Conversation | **ZAKAZ** |
| Family-only = exact | fail-closed labeling |
| ATH price → OUR RATE | hard lock |
| PDF Candidate = History | rozdziel typy |
| Corpus PENDING = Executed Knowledge | rozdziel A vs B |
| Majority vote przy konflikcie RMS | **ZAKAZ** auto-resolve |

---

## 26. GAPS

| ID | Gap | Severity |
|----|-----|----------|
| G1 | Brak runtime Historical lookup w `IkEntryHost` / KNR Expert | **HARD** |
| G2 | Brak kontraktu `HistoricalExecutedAthHit` | HARD (design) |
| G3 | Brak `cityAccepted` / invoice metadata | MED |
| G4 | Filename `ofertowy` vs Owner „zaakceptowane” | MED (docs/provenance) |
| G5 | VERIFIED Catalog = 0 — normative LOCAL_HIT słaby | MED (osobny Owner VERIFY) |
| G6 | Semantic similarity = 0 | SOFT / future |
| G7 | Family-only FP jeśli źle skomunikowane w UI | HARD product |
| G8 | PDF bez RMS vs ATH FULL — asymetria evidence | strukturalny OK |
| G9 | Scrape consent vs KNR legal-gate | POLICY |
| G10 | History Signal nie w Validation findings | SOFT |

---

## 27. RECOMMENDED NEXT GATE

```text
NEXT = PLAN ONLY
ID   = IK-HISTORICAL-EXECUTED-ATH-PLAN-01
     (po Owner GO na PLAN)

Zakres PLAN:
  1. Kontrakt HistoricalExecutedAthHit (read-only)
  2. Lookup key + conflict/frequency/confidence
  3. Seam: KNR Expert report + buildIkKnrConversation
  4. Opcjonalne feed Validation Soft finding
  5. Explicit NON-GOALS: no Catalog write, no auto VERIFY, no price copy
  6. Relacja do READY-16 / KL-6 (link opcjonalny, nie merge identity)

NIE startować DESIGN FREEZE / ARCH / IMPL bez kolejnych GO.
NIE rozwijać PDF Candidate jako głównego toru tego EPIC.
```

---

## 28. TEST PLAN

### 28.1 Localhost (po przyszłej impl — dziś tylko checklist shadow)

1. `npm run dev` → `http://127.0.0.1:5173/`
2. Otwórz `2026/BZP 00391783`
3. IkEntryHost: Document lines ≈ 88
4. KNR Conversation: dziś **bez** history counts (baseline)
5. **Nie** KL-6 VERIFY/APPROVE

### 28.2 Audytowe (wykonane w tym AUDIT — ZERO writes)

| Test | Wynik |
|------|-------|
| Inventory 9 ATH | PASS |
| Join tender×harvest exact keys | PASS (7 keys / ~21 rows) |
| NEW/MISS path exists conceptually | PASS |
| No Catalog mutation during audit | PASS |
| Level A IMPL untouched | PASS |

### 28.3 Future harness (PLAN)

- H-HIST-EXACT / MULTI / CONFLICT / MISS / FAMILY  
- Assert `authority: never` · `pricingDerived: never`  
- Regression: KL-0/KL-5 · PDF Candidate · corpus CONFLICT denylist  

---

## FINAL VERDICT (A–G)

| # | Pytanie | Odpowiedź |
|---|---------|-----------|
| **A** | Czy historyczne zaakceptowane ATH mogą stać się Historical Executed WGDOM Knowledge? | **TAK** — jako evidence/confidence, z jawnym provenance (completed job + Owner claim; uzupełnić acceptance metadata) |
| **B** | Czy przez REUSE istniejącego IK? | **TAK** |
| **C** | Czy KNR Expert powinien być właścicielem sygnału? | **TAK** (narracja + report); Validation/Labor/Material = konsumenci |
| **D** | Czy widoczne w Expert Conversation? | **TAK** — przez istniejący `buildIkKnrConversation` |
| **E** | Czy zasilać Labor / Material / Validation? | **TAK** — soft signals / findings; **NIE** auto rates |
| **F** | Czy Real Tender #01 pokazuje wartość? | **TAK** (częściowy overlap + jasny MISS majority) |
| **G** | Najbezpieczniejszy następny gate? | **PLAN** `IK-HISTORICAL-EXECUTED-ATH-PLAN-01` · Owner GO · zero IMPL |

```text
════════════════════════════════════════════════════
AUDIT           = COMPLETE / PASS WITH GAPS
PLAN            = NOT STARTED
DESIGN FREEZE   = NOT STARTED
ARCH REVIEW     = NOT STARTED
IMPLEMENTATION  = NOT AUTHORIZED

Historical ATH  ≠  VERIFIED KNR
Historical ATH  ≠  automatic APPROVE
Historical ATH  ≠  automatic current price
Historical ATH  =  REUSE / EVIDENCE / CONFIDENCE SIGNAL

ZERO CODE CHANGE (poza tym dokumentem audytu).
════════════════════════════════════════════════════
```
