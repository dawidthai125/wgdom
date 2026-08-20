# IK — HISTORICAL EXECUTED ATH KNOWLEDGE · PLAN #01

| Field | Value |
|-------|-------|
| **ID** | `IK-HISTORICAL-EXECUTED-ATH-PLAN-01` |
| **Gate** | `OD-IK-HISTORICAL-EXECUTED-ATH-PLAN-01` |
| **Status** | **PLAN = COMPLETE / PASS WITH GAPS** |
| **Date** | 2026-08-20 |
| **Mode** | **PLAN ONLY** · **ZERO implementation** · **ZERO `src/**`** |
| **Audit** | [`IK-HISTORICAL-EXECUTED-ATH-AUDIT-01.md`](./IK-HISTORICAL-EXECUTED-ATH-AUDIT-01.md) **COMPLETE / PASS WITH GAPS** |
| **Master SSOT** | [`INTELLIGENT-ESTIMATOR-MASTER-SSOT.md`](./INTELLIGENT-ESTIMATOR-MASTER-SSOT.md) |

```text
AUDIT                  = COMPLETE / PASS WITH GAPS
PLAN                   = COMPLETE / PASS WITH GAPS
DESIGN FREEZE          = NOT STARTED
ARCH REVIEW            = NOT STARTED
IMPLEMENTATION         = NOT AUTHORIZED

VERIFY / APPROVE / REJECT = 0
catalog writes            = 0
evidence writes           = 0
KL-6 / write-router / legal-gate changes = 0
commit / push / deploy    = 0
```

---

## 1. EXECUTIVE SUMMARY

Plan definiuje warstwę **Historical Executed WGDOM Knowledge**: read-only sygnał z historycznych `.ath` z jobów `completed`, zadeklarowanych przez Ownera jako zaakceptowane realizacje.

| Zasada | Treść |
|--------|-------|
| **REUSE FIRST** | Rozszerzyć `runIkKnrExpert` + `buildIkKnrConversation` + Validation/P8 soft inputs |
| **Owner sygnału** | **KNR Expert** |
| **Konsumenci** | Labor · Material · Validation · P7 context · P8 risk · Chief/EC |
| **Authority** | History **nigdy** ≠ VERIFIED / APPROVE / OUR RATE / market price |
| **MISS** | `NO_HISTORY` ≠ error — normalny flow IK |
| **Conflict** | Fail-closed · **nie** majority vote |

**Audit baseline (Real Tender #01):** 88 pozycji · exact≈21 · FULL_RMS≈3 · READY-16∩≈3 · family-only≈48 · no-history≈19 · top: `KNR 2-02 1505-01`.

---

## 2. GOAL

1. Dać IK zdolność odpowiedzi: *„czy robiliśmy już podobną / tę samą pozycję?”*  
2. Wyrazić to w **Expert Conversation** faktami (nie LLM).  
3. Zasilić Labor / Material / Validation / P8 **soft signals**.  
4. Zachować rozdział **Historical (B)** vs **Normative Catalog (A)** vs **Research (C)** vs **Pricing (D)**.  
5. Nie złamać KL-6, Accept paths, legal-gate, PDF Candidate boundary.

---

## 3. NON-GOALS

| # | Non-goal |
|---|----------|
| 1 | Drugi `kw-knr-catalog` / drugi ATH parser / drugi orchestrator / drugi chat |
| 2 | Auto VERIFY / APPROVE / batch / `autoOwnerVerify` |
| 3 | PDF → PENDING_VERIFY |
| 4 | History price → OUR RATE / Price Memory write |
| 5 | Family-only traktowane jako exact |
| 6 | Majority resolve konfliktów RMS/chapter |
| 7 | Level A EXECUTE / IMPL |
| 8 | Zmiana legal-gate scrape_* dla normative KNR |
| 9 | Runtime LLM |
| 10 | Migracja 16 PENDING → VERIFIED „przy okazji” History |

---

## 4. ARCHITECTURAL BOUNDARY

```text
┌─────────────────────────────────────────────────────────────┐
│ 1. NORMATIVE KNR KNOWLEDGE                                  │
│    identityKeyV2 · FULL RMS · PENDING → KL-6 → VERIFIED     │
│    Authority: Owner only (KL-6)                             │
├─────────────────────────────────────────────────────────────┤
│ 2. HISTORICAL EXECUTED WGDOM KNOWLEDGE  ★ TEN PLAN          │
│    completed job · .ath · occurrence · RMS agreement        │
│    Authority: NEVER · Evidence / confidence only            │
├─────────────────────────────────────────────────────────────┤
│ 3. EXTERNAL RESEARCH / SCRAPING                             │
│    Labor/Material research paths · discovery ≠ catalog      │
│    Legal-gate KNR normative: unchanged (deny scrape_*)      │
├─────────────────────────────────────────────────────────────┤
│ 4. CURRENT PRICING / OUR RATE                               │
│    Work Catalog Accept · Price Memory Accept · F5 Bid       │
│    History observedCost ≠ current price                     │
└─────────────────────────────────────────────────────────────┘
```

**Cross-link dozwolony (opcjonalny, read-only):**  
`HistoricalMatch.identityKeyV2` może *wskazywać* na istniejący PENDING/VERIFIED — **bez** mutacji Catalog.

---

## 5. HISTORICAL KNOWLEDGE MODEL

Kontrakty **koncepcyjne** (DESIGN FREEZE później zamrozi nazwy pól).  
Preferencja: typy w module `intelligent-estimator` / cienki `historical-executed-*` **obok** `knr-knowledge`, **nie** wewnątrz Catalog store.

### 5.1 `HistoricalJob`

| | |
|--|--|
| **Purpose** | Realizacja WGDOM jako jednostka occurrence |
| **Identity** | `jobId` |
| **Provenance** | `kw-jobs` · `jobStatus` (plan: prefer `completed`) |
| **Pola** | `jobId`, `address`, `flatNumber?`, `status`, `completedAt?` |
| **NIE** | ceny oferty · „cityAccepted=true” bez Owner metadata (GAP → OD) |

### 5.2 `HistoricalSource`

| | |
|--|--|
| **Purpose** | Jeden plik `.ath` na jobie |
| **Identity** | `storagePath` lub `fileId` + `contentSha256` |
| **Pola** | `jobId`, `filename`, `storagePath`, `uploadedAt`, `uploadedBy?`, `programVersion?` (4.32/4.49) |
| **NIE** | traktować nazwę `*ofertowy*` jako dowód acceptance (tylko label) |

### 5.3 `HistoricalKnrOccurrence`

| | |
|--|--|
| **Purpose** | Jedna pozycja KNR w jednym źródle |
| **Identity** | `(sourceId, lp|rowRef, displayCode)` lub content-derived |
| **Pola** | `displayCode`, `family`, `catalogId`, `tableCode`, `description`, `unit`, `quantity?`, `identityKeyV2?`, `edition?`, `chapter?`, `publisher?`, `contentHash?`, `rmsClass` |
| **NIE** | `proposedWorkId` · Catalog write intent |

### 5.4 `HistoricalRmsSnapshot`

| | |
|--|--|
| **Purpose** | Snapshot R/M/S z occurrence (read-only) |
| **Pola** | `r[]`, `m[]`, `s[]` (code/qty/unit/desc), `contentHash`, `complete: boolean` |
| **NIE** | `unitPrice`, `sellPrice`, `ourRate`, `marketQuote` jako authority |

### 5.5 `HistoricalMatch`

| | |
|--|--|
| **Purpose** | Wynik lookupu dla **jednej linii bieżącego Master BOQ** |
| **Pola** | `lineId`, `matchLevel` (hierarchia §6), `matchKind`, `confidence`, `occurrenceCount`, `distinctJobCount`, `distinctSourceCount`, `fullRmsCount`, `exactMatchCount`, `rmsAgreement`, `conflict?`, `hits[]` (refs), `provenance` |
| **NIE** | `autoEligible`, `verifyRecommended` jako authority claim |

### 5.6 `HistoricalEvidence`

| | |
|--|--|
| **Purpose** | Pakiet evidence do EC / Validation (sourceRef artifact) |
| **Pola** | `match`, `jobRefs[]`, `sourceRefs[]`, `sampleDescriptions[]`, `notesPl?` (FACT only) |
| **NIE** | interpretacja „norma mówi że…” |

### 5.7 `HistoricalConflict`

| | |
|--|--|
| **Purpose** | Fail-closed przy sprzecznych historycznych wariantach |
| **Pola** | `displayCode`, `kind` (`IDENTITY_SPLIT` \| `RMS_HASH` \| `CHAPTER_FOLD` \| `DESCRIPTION_DOMAIN` \| `MATERIAL_VARIANT`), `variants[]`, `reasonCodes[]` |
| **NIE** | `resolvedByMajority`, `pickedVariant` bez Human |

---

## 6. MATCH HIERARCHY

User-proposed L0–L5 jest **zgodna** z audytem; doprecyzowanie względem istniejącego `catalogBasis` + `identityKeyV2`:

| Level | Id | Warunek | Confidence max | EC label |
|------:|----|---------|----------------|----------|
| 0 | `NO_HISTORY` | brak hitów | — | „Nie znaleziono historycznego odpowiednika.” |
| 1 | `FAMILY_ONLY` | ten sam family+catalogId, **brak** table | LOW | „Tylko podobna rodzina KNR.” |
| 2 | `CODE_MATCH` | family+catalogId+tableCode | MED | „Ten sam kod KNR w N realizacjach.” |
| 3 | `CODE_DESC_UNIT` | L2 + unit match + opis podobny (token/normalize; **nie** LLM w MVP) | MED–HIGH | „Kod + jednostka + zbliżony opis.” |
| 4 | `EXACT_IDENTITY` | wspólny `identityKeyV2` (obie strony) | HIGH | „Dokładna tożsamość katalogowa.” |
| 5 | `EXACT_IDENTITY_FULL_RMS` | L4 + FULL RMS snapshot + consistent hash wśród hitów | HIGH | „Tożsamość + pełne zgodne R/M/S.” |

**Nadpisania fail-closed:**

- Jakikolwiek `HistoricalConflict` na displayCode → wynik linii = **`CONFLICT`** (nie L2–L5).  
- `FAMILY_ONLY` **nigdy** nie eskaluje do EXACT.  
- PDF-only linie bez table → max L1 (lub L0).

**Mapowanie na output KNR Expert (`HISTORICAL_MATCH`):**

| Enum | Level |
|------|-------|
| `NONE` | L0 |
| `FAMILY_ONLY` | L1 |
| `PARTIAL` | L2 lub L3 bez FULL |
| `EXACT` | L4 |
| `EXACT_FULL_RMS` | L5 |
| `CONFLICT` | conflict override |

---

## 7. CONFLICT MODEL

### 7.1 Reguły

```text
IF same displayCode AND (
  ≥2 distinct identityKeyV2
  OR ≥2 distinct contentHash for FULL RMS
  OR chapter fold implies different domain
  OR material brand/SKU substitution across hits for same code
) THEN HISTORICAL_CONFLICT
  → NIE majority
  → NIE first-match
  → NIE „najnowszy ATH”
  → HUMAN / Validation Soft|Hard
```

### 7.2 Analogia corpus (Quality Audit)

| Przykład | Typ konfliktu | Lekcja |
|----------|---------------|--------|
| `KNR 2-15 0115-02` | chapter: INSTALACJA SANITARNA vs **BIAŁY MONTAŻ** | ten sam display ≠ ta sama semantyka |
| `KNR 2-02 0803-01` | chapter: ROBOTY REMONTOWE vs **ŚCIANY** | fold chapter = IDENTITY_SPLIT |
| `KNR 4-01 0716-02` | same identity · różne contentHash (4.49 vs 4.32) | RMS_HASH conflict |
| `KNR 2-05 1003-06` | Quality: bucket **C** READY (FULL+PARTIAL mix, 1 hash) | **nie** ten sam problem co chapter-fold; MIX partial ≠ auto CONFLICT, ale L5 wymaga FULL agreement |

Owner wspomniał „1003-06 ściany vs biały montaż” — w Quality AUDIT taki **chapter split** udokumentowany jest dla **`0115-02` / `0803-01` / `0311-03`**, nie jako split 1003-06. PLAN traktuje **wzorzec chapter-fold** jako kanoniczny conflict case; 1003-06 pozostaje przykładem **FULL+PARTIAL mix** (osobna reguła: nie claim L5 bez FULL).

### 7.3 Routing konfliktu

| Konsument | Zachowanie |
|-----------|------------|
| KNR Expert | `HISTORICAL_MATCH=CONFLICT` + provenance variants |
| Validation | finding Soft/Hard `HISTORICAL_CONFLICT` |
| P8 | ↑ risk / needs_review |
| Labor/Material | **nie** konsumować RMS z konfliktu jako hint |
| KL-6 / Catalog | **zero** auto |

---

## 8. FREQUENCY MODEL

| Metryka | Definicja |
|---------|-----------|
| `occurrenceCount` | liczba occurrence rows (hitów) |
| `distinctJobCount` | unikalne `jobId` |
| `distinctSourceCount` | unikalne ATH files |
| `fullRmsCount` | occurrence z `rmsClass=FULL_RMS` |
| `exactMatchCount` | hity na level ≥ L4 |

```text
FREQUENCY ≠ AUTHORITY
FREQUENCY ≠ AUTO_ELIGIBLE
FREQUENCY ≠ VERIFY / APPROVE
FREQUENCY → confidence ↑ (bounded) + EC fact „N realizacji”
```

Level A OPEN-BI-2 (frequency→impact): **nie zamykać w tym PLAN** — osobna Owner decision.

---

## 9. R/M/S SEMANTICS

| Warstwa | Znaczenie | Dozwolone użycie |
|---------|-----------|------------------|
| **A** Historyczny R/M/S | Zużycie / norma z ATH wykonania | evidence · consistency · Labor/Material **hint** |
| **B** Aktualny koszt pozycji | F5 / Bid | tylko pricing engines |
| **C** OUR RATE | Work Catalog Accept | tylko Labor Accept path |
| **D** Market / SELL | Price Memory / research | tylko Material path |

**Zakazy:**

- historyczny M unit cost → current market  
- historyczny R → OUR RATE  
- L5 match → auto-fill F5 rates  
- leakage test: H-HIST-11 / H-HIST-12  

---

## 10. KNR EXPERT SEAM

### 10.1 Ownership

```text
KNR Expert = OWNER Historical KNR Evidence signal
Wywołanie lookup: wewnątrz / tuż po runIkKnrExpert
  (po Master BOQ ready — jak dziś completeness)
```

**Nie** wywołuje: Document Expert, Chief, Labor (unik circular: History → Labor one-way).

### 10.2 Output (rozszerzenie raportu — conceptual)

```text
IkKnrExpertLineResult +=
  historical?: {
    match: NONE | FAMILY_ONLY | PARTIAL | EXACT | EXACT_FULL_RMS | CONFLICT
    level: 0..5
    confidence: LOW | MED | HIGH
    occurrenceCount
    distinctJobCount
    fullRmsCount
    rmsAgreement: CONSISTENT | MIXED | CONFLICT | UNKNOWN | N_A
    evidence: HistoricalEvidence
    conflict?: HistoricalConflict
  }
```

Istniejący `lineStatus` (NONE/HOLD/CANDIDATE/…) **pozostaje** (bieżący przedmiar).  
Historical jest **osobnym** polem — nie nadpisuje `CANDIDATE` catalogBasis.

### 10.3 Lookup input

1. `catalogBasis` z Master BOQ (primary)  
2. Opcjonalnie PDF Candidate hints (table token) — **nie** jako authority  
3. Projection index z completed jobs’ ATH (REUSE parseAthKnrNormExport)

### 10.4 Circular dependency

```text
Document → BOQ → KNR(+History) → Class → Labor/Material
History NIE czyta Labor/Material outputs
Labor/Material mogą czytać historical? (soft) — tylko po KNR report
```

---

## 11. LABOR EXPERT SEAM

| Input | Effect |
|-------|--------|
| L4/L5 + CONSISTENT RMS | soft: „work seen historically” · research priority |
| CONFLICT / FAMILY_ONLY | ignore RMS for rates |
| `observedCost` / ATH labor money | **FORBIDDEN** as OUR RATE |

Labor zachowuje Accept / research-on-miss / Work Catalog authority.

---

## 12. MATERIAL EXPERT SEAM

| Historical signal | Use |
|-------------------|-----|
| M lines / qty patterns | soft coverage hint |
| brand / SKU / product tokens in desc | **material semantic signal** → flag substitution risk |
| frequency of same material set | confidence only |

| Forbidden |
|-----------|
| ATH M price → Price Memory write |
| Historical brand → auto accept substitution |
| L5 → skip Material research |

Substitution / brand mismatch → **HUMAN** (align Level A E11 spirit).

---

## 13. VALIDATION SEAM

| Signal | Validation |
|--------|------------|
| EXACT / EXACT_FULL_RMS | Soft info (not error) |
| CONFLICT | Soft/Hard finding · ↑ human |
| NO_HISTORY | **not an error** |
| DESC mismatch at L2 | Soft „opis różni się” |
| Material substitution flags | Soft/Hard |

REUSE: `analyzeValidationFromDossier` / P8 validation channel — **extend findings**, nie nowy validation engine.

---

## 14. P7 / P8 SEAM

| Stage | Role |
|-------|------|
| **P7** | Context only: badge/flag „historical work known”; **zero** price substitution |
| **P8** | Risk: CONFLICT → needs_review; strong L5 → lower *uncertainty* not auto GO |
| Bid / Accept | History **never** auto-accepts bid |

---

## 15. CHIEF SEAM

Chief konsumuje EC facts / P8 / optional `ChiefSessionOutput` dossier fields.

| Correct | Incorrect |
|---------|-----------|
| „WGDOM ma 3 historyczne realizacje tej pozycji ze zgodnym R/M/S.” | „KNR potwierdza, że należy użyć dokładnie tych wartości.” |
| „Brak historii — standardowa ścieżka.” | „Nieznany KNR = błąd systemu.” |

Chief **nie** mutuje Catalog / Accept.

---

## 16. EXPERT CONVERSATION SEAM

**REUSE only:** `buildIkKnrConversation` · `buildIkEntryConversationViewModel` · `ExpertConversationSurface` · `sourceRef.kind ∈ evidence|candidate|hold|boq_ready`.

### 16.1 FACT / INTERPRETATION / RECOMMENDATION

| Warstwa | Przykład | Kto |
|---------|----------|-----|
| **FACT** | „Znalazłem 3 wcześniejsze realizacje WGDOM z tym samym KNR.” | KNR step `messagePl` / `detailPl` |
| **FACT** | „We wszystkich 3 R/M/S były zgodne.” | detail + artifact counts |
| **FACT** | „Opis obecnej pozycji różni się od historycznych.” | detail |
| **INTERPRETATION** | „Traktuję to jako silny sygnał doświadczenia, nie jako normę.” | wrap step (opcjonalnie) |
| **RECOMMENDATION** | „Do potwierdzenia przez Ownera / Validation.” | wrap / Chief — **nie** VERIFY |

### 16.2 Wiadomości docelowe (mapowanie)

| Match | Message (PL) |
|-------|----------------|
| EXACT / EXACT_FULL_RMS + multi job | „Znalazłem N wcześniejszych realizacji WGDOM z tym samym KNR.” |
| CONSISTENT FULL | „W N realizacjach R/M/S były zgodne.” |
| L2/L3 desc delta | „Mam historyczny odpowiednik, ale opis obecnej pozycji jest inny.” |
| FAMILY_ONLY | „Znalazłem tylko podobną rodzinę KNR.” |
| NONE | „Nie znaleziono historycznego odpowiednika.” |
| CONFLICT | „Historyczne dane są sprzeczne — wymagana weryfikacja.” |

Max steps discipline (istniejące C2: lead + report + wrap) — **agregaty**, nie 88 tur.

---

## 17. PDF CANDIDATE SEAM

```text
PDF row → KnrMatchCandidate (istniejący)
       → optional hint → Historical lookup (table token / display hint)
       → KNR Expert historical field

PDF Candidate ≠ Historical VERIFIED
PDF Candidate ≠ PENDING_VERIFY
PDF Candidate ≠ Catalog write
```

**Ten PLAN nie zmienia** `knr-pdf-match-candidate` boundary (Shadow #02 zostaje).

---

## 18. AI LEVEL A SEAM

| | |
|--|--|
| History as E-signal | **TAK** — evidence/confidence (wspiera świadomość multi-source / conflict) |
| History alone → AUTO_ELIGIBLE | **NIE** |
| CONFLICT / substitution / UNKNOWN | **HUMAN** |
| AUTO_ELIGIBLE ≠ VERIFIED | bez zmian |
| KL-6 sole mutation | bez zmian |
| Level A IMPL | **NOT AUTHORIZED** |

---

## 19. REAL TENDER #01 TEST PLAN

**Target:** `2026/BZP 00391783` · MOPS · 88 PDF rows · localhost.

| Scenario | Oczekiwane (po przyszłej impl) |
|----------|--------------------------------|
| EXACT_HISTORY | m.in. `KNR 2-02 1505-01` (multi-job) |
| PARTIAL_HISTORY | exact code · PARTIAL/NO_RMS |
| FAMILY_ONLY | `KNR 4-01` / `KNR 4-02` bez table |
| NO_HISTORY | ~19 rows · **nie** error |
| CONFLICT | synthetic lub corpus chapter-fold codes jeśli wystąpią na BOQ |

**Shadow now (PLAN):** użyć baseline audytu; **nie** uruchamiać VERIFY.

---

## 20. TEST MATRIX

| ID | Case | Assert |
|----|------|--------|
| H-HIST-01 | Exact identity | L4 · provenance · no write |
| H-HIST-02 | Exact + FULL RMS | L5 · CONSISTENT |
| H-HIST-03 | Partial match | PARTIAL · not EXACT |
| H-HIST-04 | Family only | FAMILY_ONLY · LOW · not EXACT |
| H-HIST-05 | No history | NONE · not error |
| H-HIST-06 | Conflict | CONFLICT · no majority pick |
| H-HIST-07 | Multiple jobs | distinctJobCount ≥ 2 |
| H-HIST-08 | Different RMS | CONFLICT or MIXED ≠ L5 |
| H-HIST-09 | Different description | FACT desc delta · not auto reject history |
| H-HIST-10 | Material substitution | HUMAN flag · Material Expert |
| H-HIST-11 | No historical price leakage | no rate fields from ATH in P7 |
| H-HIST-12 | No OUR RATE leakage | Labor report rates unchanged by history alone |
| H-HIST-13 | No auto VERIFY | KL-6 not called |
| H-HIST-14 | No auto APPROVE | Accept not called |
| H-HIST-15 | No catalog write | store unchanged |
| H-HIST-16 | Expert Conversation | expected PL facts |
| H-HIST-17 | Chief | no normative overclaim |
| H-HIST-18 | PDF Candidate integration | hints only · identityKeyV2 null path OK |

---

## 21. REUSE MAP

| Component | Reuse |
|-----------|-------|
| `IkEntryHost` | orchestration order |
| `runIkDocumentExpert` / Master BOQ | input lines |
| `runIkKnrExpert` | **extend** report |
| `buildIkKnrConversation` | **extend** messages |
| `buildIkEntryConversationViewModel` | wire historical facts |
| `ExpertConversationSurface` | UI unchanged contract |
| `parseAthKnrNormExport` | ATH parse |
| Harvest pattern / jobFiles `kosztorys` | source discovery |
| `resolveHostKnrKnowledgeLookupOnly` | normative only (parallel, not merge) |
| Corpus conflict denylist patterns | inspire HistoricalConflict kinds |
| Validation / P8 / Labor / Material / P7 | soft consumers |
| `knr-pdf-match-candidate` | optional hint input |

---

## 22. NEW SURFACE MAP

| Surface | New? | Notes |
|---------|------|-------|
| Types `Historical*` | **NEW** (thin contracts) | not Catalog entries |
| `lookupHistoricalExecutedAth(line)` | **NEW** pure function | read-only |
| Optional projection cache | **NEW only if perf requires** | not `kw-knr-catalog`; Owner GO |
| KNR Expert field `historical` | **EXTEND** | |
| Conversation strings | **EXTEND** | |
| Validation finding codes | **EXTEND** | |
| Second Catalog / parser / chat / orchestrator | **FORBIDDEN** | |

---

## 23. AUTHORITY BOUNDARIES

```text
Historical Match     → recommendation / evidence only
KL-6                 → sole Catalog mutation
Owner Accept (Labor/Material) → sole rate persist
P8 displayDecision   ≠ Owner Accept
Level A AUTO_ELIGIBLE ≠ VERIFIED
PDF Candidate        ≠ PENDING / VERIFIED
FREQUENCY            ≠ AUTHORITY
FAMILY_ONLY          ≠ EXACT
```

**Unchanged:** `KNR_VERIFY_MVP_SINGLE_ONLY` · write-router · `persistVerifiedKnrCatalogEntry` · `autoOwnerVerify=false`.

---

## 24. LEGAL / SCRAPING BOUNDARY

| Layer | Plan stance |
|-------|-------------|
| Historical ATH (own jobs) | Allowed evidence source |
| Normative KNR + scrape_* | **Unchanged deny** for catalog persist |
| Labor/Material research scrape | Existing capability; discovery ≠ KNR authority |
| Owner scrape consent | **POLICY GAP** — osobne GO; nie w tym PLAN |

---

## 25. GAPS

### HARD

| ID | Gap |
|----|-----|
| HG-1 | Brak runtime Historical lookup |
| HG-2 | Brak zamrożonego kontraktu typów (DF) |
| HG-3 | Brak pola `cityAccepted` / invoice — Owner claim vs filename `ofertowy` |
| HG-4 | Ryzyko UI: FAMILY_ONLY sprzedane jako exact |
| HG-5 | Chapter-fold conflicts muszą być first-class |

### SOFT

| ID | Gap |
|----|-----|
| SG-1 | Semantic similarity poza token desc (post-MVP) |
| SG-2 | Projection KV vs on-the-fly parse (perf) |
| SG-3 | Wire Validation finding taxonomy |
| SG-4 | PDF Candidate → History hint UX |

### UNKNOWN

| ID | Unknown |
|----|---------|
| UK-1 | Czy wszystkie 9 ATH mają formalną akceptację miasta poza deklaracją Ownera? |
| UK-2 | OPEN-BI-2 frequency→business impact |
| UK-3 | Czy 1003-06 kiedykolwiek ma chapter-fold w szerszym corpus poza obecnymi 9? |

---

## 26. ROLLOUT / MIGRATION STRATEGY

```text
Phase 0  PLAN (ten dokument) · STOP
Phase 1  DESIGN FREEZE — typy · match levels · EC copy · non-goals
Phase 2  ARCH REVIEW — seams IkEntryHost · no Catalog coupling
Phase 3  IMPL (tylko po Owner GO):
         3a lookup pure + unit tests H-HIST-*
         3b KNR Expert field + conversation
         3c Validation/P8 soft
         3d optional Labor/Material soft
Phase 4  Shadow Real Tender #01 regress
Phase 5  STOP — no auto VERIFY of READY-16
```

**Migration:** zero migracji Catalog. History projection budowana z istniejących job files.

---

## 27. NEXT GATE

```text
NEXT = DESIGN FREEZE
ID   = IK-HISTORICAL-EXECUTED-ATH-DESIGN-FREEZE-01

Wymaga: Owner GO na DESIGN FREEZE
Nie startować ARCH / IMPL bez kolejnych GO
```

---

## 28. OWNER DECISIONS REQUIRED

| # | Decision | Options (plan) | Default recommendation |
|---|----------|----------------|------------------------|
| **OD-H1** | Provenance acceptance | A) `completed` job wystarczy · B) wymaga jawnego `cityAccepted` metadata | **A for MVP** · B later |
| **OD-H2** | Storage | A) on-the-fly parse · B) projection KV | **A until perf proves B** |
| **OD-H3** | FAMILY_ONLY w EC | A) show · B) hide | **A** z jasnym LOW wording |
| **OD-H4** | Labor/Material soft in MVP | A) KNR+EC+Validation only · B) +Labor/Material | **A** (mniejszy blast radius) |
| **OD-H5** | Link do READY-16 / VERIFIED | A) optional read-only pointer · B) none in MVP | **A** display-only |
| **OD-H6** | Scrape vs normative | leave legal-gate | **no change** |
| **OD-H7** | GO DESIGN FREEZE? | GO / HOLD | **czekamy na Owner** |

---

## FINAL GATE

```text
════════════════════════════════════════════════════
AUDIT           = COMPLETE / PASS WITH GAPS
PLAN            = COMPLETE / PASS WITH GAPS

DESIGN FREEZE   = NOT STARTED
ARCH REVIEW     = NOT STARTED
IMPLEMENTATION  = NOT AUTHORIZED

Historical Executed Knowledge = evidence / confidence
≠ normative KNR · ≠ VERIFY · ≠ APPROVE · ≠ current price

ZERO CODE CHANGE
ZERO VERIFY / APPROVE / REJECT
ZERO CATALOG WRITE
ZERO COMMIT / PUSH / DEPLOY
STOP.
════════════════════════════════════════════════════
```
