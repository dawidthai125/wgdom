# IK-KNR-EXPERT
## OWNER REVIEW + DESIGN FREEZE

| Field | Value |
|-------|-------|
| **ID** | `IK-KNR-EXPERT-DESIGN-FREEZE` |
| **Status** | **OWNER REVIEW = ACCEPTED** · **DESIGN FREEZE = AMENDED** · **THIN ARCH RE-REVIEW = PASS** · **Slice A = CLOSED · PRODUCTION VERIFIED · GREEN @ `93eb41be`** · **FT-10 Variant B = OWNER GO · IMPLEMENT (secondary DSEC tableCode on ingest seam)** · **IMPLEMENT Slice A = DONE** · **IMPLEMENT Slice B+ = NOT AUTHORIZED UNTIL OWNER GO** |
| **Date** | 2026-08-18 · **FT-10 amend** 2026-08-22 |
| **Amend** | [`IK-KNR-EXPERT-DESIGN-FREEZE-AMEND.md`](./IK-KNR-EXPERT-DESIGN-FREEZE-AMEND.md) · **IC-KNR-HINT-AUTHORITY** + **IC-KNR-SRC-PATH** |
| **Mode** | DOCUMENTATION ONLY · **ZERO CODE** · **ZERO SETTINGS** · **ZERO KV** · **ZERO FLAG** · **ZERO RUNTIME** · **ZERO A08-P3** · **ZERO COMMIT** · **ZERO PUSH** · **ZERO DEPLOY** |
| **AUDIT** | [`IK-KNR-EXPERT-AUDIT.md`](./IK-KNR-EXPERT-AUDIT.md) · **COMPLETE** |
| **DESIGN** | [`IK-KNR-EXPERT-DESIGN.md`](./IK-KNR-EXPERT-DESIGN.md) · **COMPLETE** · **§ knrHint-in-A SUPERSEDED** przez tę amendę |
| **ARCH REVIEW** | [`IK-KNR-EXPERT-ARCH-REVIEW.md`](./IK-KNR-EXPERT-ARCH-REVIEW.md) · **BLOCKED** (pre-amend) · **nie** IMPLEMENT |
| **A1 SSOT** | [`INTELLIGENT-ESTIMATOR-CLASSIFICATION-GATE-DESIGN-FREEZE.md`](./INTELLIGENT-ESTIMATOR-CLASSIFICATION-GATE-DESIGN-FREEZE.md) · **UNCHANGED** |
| **Access** | [`IK-ROLE-ACTIVATION-DESIGN-FREEZE.md`](./IK-ROLE-ACTIVATION-DESIGN-FREEZE.md) · **DEPLOYED** · **ten epic nie rusza CZY** |
| **A08-P2** | [`IK-AUTONOMY-08-P2-RESEARCH-ON-MISS-DESIGN-FREEZE.md`](./IK-AUTONOMY-08-P2-RESEARCH-ON-MISS-DESIGN-FREEZE.md) · **CLOSED / UNCHANGED** |
| **Master** | [`INTELLIGENT-ESTIMATOR-MASTER-SSOT.md`](./INTELLIGENT-ESTIMATOR-MASTER-SSOT.md) |
| **Slice B** | [`IK-KNR-EXPERT-SLICE-B-PLAN.md`](./IK-KNR-EXPERT-SLICE-B-PLAN.md) · [`IK-KNR-EXPERT-SLICE-B-CONTRACT.md`](./IK-KNR-EXPERT-SLICE-B-CONTRACT.md) · [`IK-KNR-EXPERT-SLICE-B-DESIGN-FREEZE.md`](./IK-KNR-EXPERT-SLICE-B-DESIGN-FREEZE.md) · **READY FOR ARCH REVIEW** · **IMPLEMENT NOT AUTHORIZED** |

```text
OWNER REVIEW               = ACCEPTED (OD-KNR-1…6 + OD-KNR-7 AMEND)
DESIGN FREEZE              = AMENDED (2026-08-18)
Architecture Review        = PRE-AMEND BLOCKED · THIN RE-REVIEW = PASS
IC-KNR-HINT-AUTHORITY      = RESOLVED (kontrakt vs SOURCE)
Slice A                    = CLOSED · PRODUCTION VERIFIED · GREEN @ 93eb41be (live 2.66.103)
Implementation Slice A     = DONE (OWNER GO wykonane · 2026-08-19)
Implementation Slice B+    = NOT AUTHORIZED until Owner GO (historyczny „NOT AUTHORIZED until GO” = pre-GO)
Authorized after Owner GO  = SLICE A ONLY — **CLOSED** (changelog narrative 2.66.97 · deploy 2.66.103)
Slice B                    = PLAN+CONTRACT+FREEZE READY · ARCH REVIEW NOT STARTED · IMPLEMENT NOT AUTHORIZED
Code / Settings / KV / UI  = ZERO (ten plik = dokumentacja freeze)
A08-P2                     = CLOSED / UNCHANGED
A08-P3                     = NOT STARTED
EPIC AUTONOMY-08           = NOT CLOSED (ten epic ≠ P3)
```

Jeżeli DESIGN i SOURCE się rozjeżdżają: **SOURCE wygrywa** dla stanu as-is. Ten plik zamraża **target** po Owner GO + amenda po Arch Blockerze.

**SOURCE check OD-KNR-1…5:** konfliktów **brak** (patrz §1).
**SOURCE check OD-KNR-7:** pre-amend DF **kolidował** z `mapOfferBoqLine` — amenda **usuwa** kolizję w kontrakcie (bez zmiany P5).

---

## 1. OWNER REVIEW RESULT

Owner przyjął decyzje. SOURCE (`classification-gate.ts`, `isIkEntryEnabled`, Dual EC, pusta `CatalogWork` vs KNR, drop `r.code`) **nie przeczy** OD-KNR-1…5.

| ID | Decyzja Owner | SOURCE | Werdykt |
|----|---------------|--------|---------|
| **OD-KNR-1** | Owner HIT **może** ustawić `catalogWorkId` **przed** A1 | A1 czyta `workId`; nie wymaga, by workId pochodził z opisu; seed map osobna | **ACCEPTED** · **NO CONFLICT** |
| **OD-KNR-2** | Brak Owner mapy = legalny HOLD (wewnętrzny) | A1: brak workId → UNKNOWN / NO_SAFE_CLASS; research UNKNOWN zabroniony | **ACCEPTED** · **NO CONFLICT** |
| **OD-KNR-3** | Sala **bez** nowej flagi | IK ACCESS = `isIkEntryEnabled()` (Role Activation adapter) | **ACCEPTED** · **NO CONFLICT** |
| **OD-KNR-4** | v1 **nie** prowadzi 154 osobnych rozmów | EC dziś = agregaty | **ACCEPTED** · **NO CONFLICT** |
| **OD-KNR-5** | Pierwszy IMPLEMENT **bez** seedu MOPS `1202-07 → robota` | katalog nie ma KNR keys | **ACCEPTED** · **NO CONFLICT** |

**OD-KNR-6 (doprecyzowanie DESIGN, nie sprzeczne z 1…5):**

Slice D v1 = **zamrożona tabela w kodzie** (wzorzec `WORK_RATE_IDENTITY_MAPPINGS`: exact + `ownerApproval`).
„Owner review / zatwierdzenie” = **Owner GO do dopisania wiersza w kodzie** (PR po Arch Review), **nie** nowy ekran review w v1, **nie** Decision Workspace, **nie** auto-map.

**OD-KNR-7 (AMEND 2026-08-18 — Owner GO po IC-KNR-HINT-AUTHORITY):**

Slice A = **wyłącznie evidencja**.
`catalogBasis` **nigdy** nie zasila `knrHint`.
Slice A **nie** ustawia `catalogWorkId`.
Ten epic **nie** używa `knrHint` jako kanału KNR (mapper isolation), dopóki P5 pozostaje UNCHANGED.

Nie oznaczono `CONFLICT → OWNER DECISION REQUIRED` przy OD-KNR-1…5. OD-KNR-7 **rozstrzyga** konflikt pre-amend DF vs SOURCE mapper.

---

## 2. DESIGN FREEZE RESULT

Zamrożony kontrakt target **po amendzie**:

```text
AthPreviewRow.code                         EXISTS (parser UNCHANGED)
  → TenderCostLine.code?  (additive raw)
  → TenderCatalogQuantityLine.catalogBasis?  (PRIMARY path — merge)
  → merge RawSourceLine.catalogBasis
  → DwellingCostSnapshotLine.catalogBasis
  → Master BOQ / OfferBoqLine.catalogBasis?  (mapper-ignored)
     knrHint     UNCHANGED vs baseline (NIE z catalogBasis)
     catalogWorkId UNCHANGED (compose: null; A nie pisze)
  → [Slice B] KNR Expert report z catalogBasis     ≠ classifier ≠ identity
  → [Slice D] applyOwnerKnrMapping TYLKO Owner HIT ≠ KNR Expert
  → catalogWorkId                                  INPUT A1
  → classifyEstimatorPricingPlane                  SSOT plane UNCHANGED
  → P5 / P6 / P7 / P8                              UNCHANGED
  → IkEntryHost
  → [Slice C] jedna Sala (presentation)            ≠ SSOT · nie przed A
```

KNR Expert = adapter + raport.
`applyOwnerKnrMapping` = jedyny writer `catalogWorkId` z KNR.
A1 = jedyny writer plane.
Sala = jedyna powierzchnia rozmowy IK na tab Przetarg; **nie** drugi mount Hub.
**`knrHint` ≠ kanał KNR w tym epic.**

---

## 2A. SLICE A — EVIDENCE ONLY (AMEND — FROZEN)

### 2A.1 Definicja

`catalogBasis` = **opcjonalna, additive evidencja** znalezionej podstawy katalogowej z dokumentu (`AthPreviewRow.code`).

| Jest | Nie jest |
|------|----------|
| Informacja źródłowa / audyt | Authority |
| Zachowanie istniejącego `code` | Nowy parser PDF |
| Wejście dla Slice B (odczyt) | Classifier / identity |
| Pole ignorowane przez `mapOfferBoqLine` | Kanał `knrHint` |

Shape (DESIGN §6.2 + FT-10 additive): `{ family, catalogId, tableCode, rawCode, display, normalizedKey, tableCodeSource?, tableCodeConfidence?, tableCodeResolutionHold? }` — PRIMARY split best-effort z **istniejącego** stringa `code`; niepełny split = `rawCode` wystarczy. Nie rozpoznawać PDF od nowa w Expert.

### 2A.1b FT-10 — SECONDARY TABLECODE (Variant B · OWNER GO 2026-08-22)

**Seam:** wyłącznie `resolveCatalogBasisFromSourceRow` / budowa CQ·rows (`tenders-bzp-brief`). **Nie** `runIkKnrExpert` (Expert pozostaje description-blind).

| Reguła | Kontrakt |
|--------|----------|
| TABLE_TOKEN | `^\d{3,4}-\d{2}$` (SSOT) |
| PRIMARY | `buildCatalogBasisFromRawCode(code\|rawCode)` · gdy `tableCode` poprawny → **PRIMARY wins** (`tableCodeSource=PRIMARY_CODE`) |
| SECONDARY | tylko gdy PRIMARY family ∈ {KNR,KNR-W,KNNR,NNRNKB} **i** PRIMARY bez poprawnego tableCode **albo** conflict-check |
| Kotwica DSEC | ostatnie `/\bd\.\d+(?:\.\d+)?\b/i` |
| Okno po DSEC | `^\s+(?:\d{1,4}\s+)?(\d{3,4}-\d{2})\b` |
| Single-token | w całym description dokładnie **jeden** distinct TABLE_TOKEN · musi = token z okna |
| 0 tokenów / brak DSEC / okno fail | secondary **nie** działa → HOLD `INCOMPLETE_TABLE_CODE` (jak dziś) |
| >1 distinct | `tableCodeResolutionHold=AMBIGUOUS_TABLECODE` · tableCode null · Expert HOLD |
| PRIMARY table ≠ secondary token | `tableCodeResolutionHold=TABLECODE_CONFLICT` · Expert HOLD (nie CANDIDATE) |
| Po akceptacji secondary | ustaw `tableCode` · przelicz `normalizedKey` · **nie** zmieniaj family/catalogId/rawCode/display · `tableCodeSource=SECONDARY_DSEC_HINT` · `tableCodeConfidence=constrained_hint` |

**Zakaz secondary:** identity · Alias Pack · LABOR/MATERIAL/COMPOUND · `catalogWorkId` · VERIFIED · OUR RATE · pricing · HTTP discovery · seed Owner Map.

**OQ-4:** zamknięte — `tableCode` z opisu **tylko** gdy DSEC-constrained (ten kontrakt).

### 2A.2 Przepływ SOURCE (obowiązkowy — IC-KNR-SRC-PATH)

Merge **preferuje** `catalogQuantities` gdy usable. Slice A **musi** nieść evidencję **obiema** ścieżkami:

```text
AthPreviewRow.code                         (już w parserze)
        │
        ├─ athPreviewToSnapshot.rows
        │     TenderCostLine.code?           additive raw (optional)
        │     TenderCostLine.catalogBasis?   optional, derived z code
        │
        └─ buildCatalogQuantitiesFromPreview / FromRows
              TenderCatalogQuantityLine.catalogBasis?   ★ PRIMARY
              (+ optional code raw jeśli to samo pole)
                    │
                    ▼
              merge.ts extractRawLines
                    │  if hasUsableCatalogQuantities → qty lines
                    │  else → rows
                    ▼
              RawSourceLine.catalogBasis
                    ▼
              DwellingCostSnapshotLine.catalogBasis
                    ▼
              compose: skopiować catalogBasis na linię Master BOQ
                       (OfferBoqLine.catalogBasis? i/lub provenance)
                    ✗  NIE: knrHint = catalogBasis.*
                    ✗  NIE: catalogWorkId = …
                    ✗  NIE: mapOfferBoqLine(…)
                    ✗  NIE: classifyEstimatorPricingPlane zmiana
                    ✗  NIE: start P5/P6 / Owner apply / KNR Expert / Sala
```

`TenderCostLine.code` **sam** nie wystarczy dla MOPS — qty path jest SSOT ilości.

### 2A.3 Zakaz Slice A (HARD)

Slice A **NIE** może:

- ustawiać `catalogWorkId` (zostaje `null` z compose, jak dziś)
- ustawiać / nadpisywać `knrHint` z `catalogBasis` (**usuwa się** pre-amend `compose.knrHint = …`)
- wołać `mapOfferBoqLine` jako authority (ani „żeby wypełnić hint”)
- wpływać na A1 / `classification-gate.ts`
- zmieniać klasyfikacji LABOR/MATERIAL/COMPOUND/UNKNOWN
- uruchamiać P5/P6/P7/P8
- tworzyć Owner mappingu / seedu MOPS
- uruchamiać KNR Expert
- montować / udawać Sali Ekspertów
- zmieniać: Research, A08-P2, A08-P3, settings, IK access, `ExpertConversationSurface`, Hub conversation

`knrHint` po Slice A = **identyczny z baseline** (nadal tylko `extractKatalogHintFromDescription` / istniejący compose). Puste / null tam, gdzie dziś puste.

### 2A.4 Backward compatibility

Pola **optional**. Legacy snapshot bez `catalogBasis` → brak throw (T-SRC-3). Istniejące 6 wymaganych pól `TenderCostLine` bez zmian. Zachowanie przetargów bez A1/P5 regresji (T-SRC-4).

---

## 3. DECISION MATRIX

| Temat | Frozen |
|-------|--------|
| Slice A | **Tylko evidencja** `catalogBasis` · **nie** knrHint · **nie** catalogWorkId |
| `catalogBasis` | Optional · additive · bez authority · bez klasyfikacji · bez identity |
| `TenderCostLine.code` | Additive kopia surowa; nie authority; **niewystarczająca** bez qty path |
| `knrHint` | **NIE** z `catalogBasis` w tym epic · baseline compose UNCHANGED · **nie** kanał authority |
| KNR Expert (B) | Adapter / analizator / raport / evidence candidate·HOLD · czyta **`catalogBasis`**, nie `knrHint` |
| KNR Expert NIE | Classifier, identity engine, SSOT `catalogWorkId`, A1, resolver z nazwy, sterownik P5–P8, writer `knrHint` |
| `exact_knr` | CANDIDATE only · **nigdy** authority · **nie** ustawia `catalogWorkId` |
| Alias Pack / opis → identity | **FORBIDDEN** w torze KNR |
| FT-10 secondary tableCode | **ALLOWED** tylko ingest `resolveCatalogBasisFromSourceRow` · DSEC+single-token · **nie** Expert · **nie** identity |
| `catalogWorkId` | **Tylko** `applyOwnerKnrMapping` przy Owner HIT (Slice D). Slice A: **null / unchanged** |
| A1 | **UNCHANGED** · nie akceptuje „samego KNR” jako identity · plik **nie ruszany** |
| Pusta mapa | Legalne: 0 RESOLVED · A1 UNKNOWN · UI laik „do sprawdzenia” |
| Mapowanie bez `tableCode` (sam `KNR 4-01`) | **FORBIDDEN** (za szerokie) |
| Nowa flaga `ikKnr*` / `ikExpertRoom*` | **FORBIDDEN** |
| Sala mount | Slice **C** · `IkEntryHost` · **nie** przed A · **nie** udawać evidencji |
| Hub `ExpertConversationSurface` (D) | **NIE** drugi Sala IK · **nie ruszać** w tym epic |
| v1 wiadomości | Agregaty · max 3 przykłady pozycji „do sprawdzenia” |
| P5/P6 / Research / A08-P2 | **UNCHANGED** · A08-P3 **NOT STARTED** |
| classification-gate.ts | **UNCHANGED** |
| IK access / settings | **UNCHANGED** (`isIkEntryEnabled`) |
| AdminSettingsModal | **NIE** poza Role Activation (już DEPLOYED) |
| Humor | Subtelny, w komentarzach Głównego IK · nie w faktach KNR |
| ETA | „orientacyjny” · nie gwarancja · nie countdown do zera gdy silnik stoi |
| Sync KNR | Jeden komunikat completed · **zakaz** fake progress 0…154 |
| Slice order | **A → B → C → D** · nie jeden wielki commit |
| Seed MOPS | **NIE** w pierwszym IMPLEMENT |

---

## 4. ARCHITECTURAL BOUNDARIES

### 4.1 KNR Expert — FROZEN (Slice B, nie A)

**Jest:** adapter, analizator KNR, generator `IkKnrExpertReport`, dostawca evidence (rozpoznana podstawa / candidate / brak pewności). Wejście: `catalogBasis`. Wyjście: raport. **Nie** zapisuje `knrHint`. **Nie** zapisuje `catalogWorkId`.

**Nie jest:** drugim A1, drugim identity engine, źródłem prawdy `catalogWorkId`, resolverem z nazwy, orchestratorem P5–P8, parserem PDF (REUSE `pdf-przedmiar-heuristic`).

### 4.2 Apply vs Expert — FROZEN

```text
KNR Expert  →  proposedWorkId tylko gdy Owner table HIT
               NIE zapisuje catalogWorkId
               NIE zapisuje knrHint

applyOwnerKnrMapping  →  jedyny zapis catalogWorkId z toru KNR
                         pure · exact · ownerApproval
                         czyta catalogBasis + tabelę Owner
                         NIE czyta knrHint jako authority
```

Jedyna legalna ścieżka identity z KNR:

```text
Owner HIT → applyOwnerKnrMapping → catalogWorkId → A1
```

Pusta mapa KNR = **legalny HOLD** (A1 pozostaje UNKNOWN). Brak mapowania **nie** uprawnia do zgadywania.

To realizuje OD-KNR-1 **bez** czynienia eksperta ani `knrHint` authority.

### 4.3 A1 — FROZEN UNCHANGED

`classifyEstimatorPricingPlane`: Owner seed by **workId** → else `mat.*` → else UNKNOWN.
Never invent from `namePl`. Never classify from KNR string.
Research UNKNOWN/COMPOUND = HOLD (istniejący zakaz).
**Nie zmieniać** `classification-gate.ts`.

### 4.3b knrHint isolation — FROZEN (AMEND)

SOURCE: `mapOfferBoqLine(knrHint)` **może** ustawić `catalogWorkId` na kopii mapped → P5 identity → A1.

Dlatego:

```text
catalogBasis  ≠  knrHint
Slice A       ≠  compose.knrHint = catalogBasis
Ten epic      ≠  auto-feed knrHint z KNR
```

`knrHint` zostaje kanałem **opisowym** (baseline). KNR idzie **wyłącznie** `catalogBasis`. P5 **nie** dostaje nowego sygnału KNR bez zmiany P5 (której **nie** robimy).

### 4.4 Zakazane (HARD)

- nowy classifier / identity / research / Work Catalog / parser PDF
- auto Owner mapping / seed z opisu / seed MOPS w slice A–C
- UI steruje P5/P6/P7/P8
- nowa flaga dostępu IK
- zmiana logiki `classification-gate.ts`
- zmiana P5 / P6 / Research predicates / A08-P2
- start A08-P3
- zmiana settings / IK access
- zmiana `ExpertConversationSurface` / Hub conversation w Slice A
- nowe checkboxy `AdminSettingsModal`
- druga Sala na Hub
- `exact_knr` → `catalogWorkId`
- `catalogBasis` → `knrHint` → mapper
- LLM jako verified fact (AD-IK-M05)

### 4.5 Integracja

**Jedyny orchestrator silnika:** `IkEntryHost.tsx`
**Jedyny właściciel prezentacji IK:** VM z hosta (`buildIkEntryConversationViewModel` + `IkExpertRoomViewModel`)
Kolejność target: Document → **(Slice A snapshot basis)** → KNR Expert → apply → A1 → P5 → P6 → P7 → P8.
Sala **C** czyta fakty **po** A; nie udaje evidencji.

**Slice A nie rusza:** `classification-gate.ts`, P5, P6, Research, A08-P2, A08-P3, settings, IK access, `ExpertConversationSurface`, Hub conversation.

---

## 5. UX CONTRACT

**Główny ekspert:** Inteligentny Kosztorysant · **w pełni stworzony przez Dawida Thai Thanh** (istniejący credit).
Pozostali = zespół (etykiety nad istniejącymi silnikami; Przedmiary = ten sam Document Expert).

**Powierzchnia:** wysuwana z góry nad tab Przetarg; komunikator; premium; „spotkanie na szczycie”; lekki inteligentny humor; **bez** kiczowatego AI theater.

**Stany UI ↔ silnik (prawda):**

| UI | Warunek |
|----|---------|
| Wjazd | IK ACCESS ∧ host mounted |
| Zwijanie | lokalny React · nie KV |
| Kto pracuje | report pending **albo** async status ANALYZING |
| Zakończony | report completed/ready |
| Do sprawdzenia | holdCount > 0 / A1 bez workId — **słowa HOLD brak na UI** |
| Błąd | ingest/expert blocked z `reasons` przetłumaczonymi |
| Mobile | zwinięty default · max ~50vh · 44px · nie zasłania action bar |

**Zakaz fałszywej animacji:** brak „Ekspert analizuje…” gdy silnik nic nie robi. Sync = jeden fakt. Async = prawdziwy `{done,total}`.
**Pacing** istniejącego Surface (≤ 4 s) **nie** jest czasem analizy.

**Jedna Sala IK.** Hub/D Surface = inny produkt · poza zakresem.

**Sala = Slice C.** Nie wolno udawać Sali / komunikatów „sprawdziłem podstawy w danych”, dopóki Slice A nie jest na tej samej linii kodu **i** B nie wyprodukował prawdziwego raportu. Copy o luce (R1) = jedyny legalny komunikat przed A.

---

## 6. LANGUAGE CONTRACT

**UI = laik.** Internal enumy zostają w kodzie/`sourceRef.artifact`.

### 6.1 Zakazane w `messagePl` / widocznej Sali

`identity` · `catalogWorkId` · `catalogBasis` · `OUR RATE` / `our rate` · `bucket` · `plane` · `classifier` · `COMPOUND` · `UNKNOWN` · `SSOT` · `candidate` · `HOLD` · `HIT` · `MISS` · `Research` · `mat.inv.*` · `readyForExperts` · `A1` · `P5`–`P8` · `exact_knr` · `NO_SAFE_CLASS`

### 6.2 Słownik (frozen examples — DF copy może skrócić, nie cofać sensu)

| Internal | UI |
|----------|-----|
| brak workId / UNKNOWN | „Nie udało się jednoznacznie rozpoznać tej pozycji.” / „Nie mamy jeszcze pewności, której pozycji z naszego katalogu dotyczy ten zapis.” |
| KNR CANDIDATE (`exact_knr`) | „Ekspert znalazł oznaczenie katalogowe i sprawdza, czego dokładnie dotyczy. Za mało, żeby przypisać.” |
| Owner RESOLVED | „Pozycja powiązana z naszym katalogiem robót.” |
| mapa pusta / HOLD | „Rozpoznałem oznaczenie katalogowe, ale nie mam pewnego odpowiednika. Nie zgaduję — zostawiam do sprawdzenia.” |
| COMPOUND (jeśli A1 kiedyś) | „Ta pozycja obejmuje więcej niż jeden rodzaj prac. Nie mieszamy wyceny.” |
| TRUE MISS + research leci | „Nie znaleźliśmy jeszcze pewnej ceny — sprawdzamy dostępne źródła.” |
| TRUE MISS + research **nie** leci | **NIE** mówić o źródłach. „Nie znaleziono pewnej ceny w katalogu.” |
| LABOR lookup | „Sprawdzam stawki robocizny w naszym katalogu.” |
| MATERIAL lookup | „Sprawdzam ceny materiałów.” |

### 6.3 Ton Głównego IK (przykłady — nie lock 1:1)

- „Panowie, mamy dwa przedmiary. Dzielimy je na lokale i lecimy osobno. Nie mieszamy jabłek z gruszkami.”
- „Najpierw pewność, potem cena. Nie zgadujemy.”
- „Jeżeli nie mamy pewności — nie będziemy udawać, że mamy. To kosztorys, nie ruletka.”

Fakty KNR: **bez** żartów kosztem dokładności.

---

## 7. ROLLOUT CONTRACT

**Zakaz** jednego wielkiego commita. Kolejność **twarda**:

| Slice | Zawartość | Definition of Done (target) |
|-------|-----------|-----------------------------|
| **A** | `AthPreviewRow.code` → **qty + rows** → merge → dwelling → Master BOQ `catalogBasis`. **Bez** `compose.knrHint`. **Bez** `catalogWorkId`. | Evidencja nie ginie; knrHint/catalogWorkId/A1 = baseline; T-SRC-1…**4** |
| **B** | KNR Expert raport z `catalogBasis` · eventy prawdy · **bez** apply · **bez** zapisu `knrHint` | counts recognized/hold; 0 auto `catalogWorkId`; test T-KNR |
| **C** | Sala na `IkEntryHost` · laik · agregaty · ETA orientacyjna | 0 fake „analizuje”; 0 flood 154; 0 druga Sala Hub; test T-ROOM · **nie przed A** |
| **D** | tabela Owner (może być **pusta**) + `applyOwnerKnrMapping` | 0 wierszy = 0 workId; 1 wiersz testowy **nie-MOPS** w harness; **nie** seed 1202-07 prod |

C nie startuje komunikatów „sprawdziłem podstawy w danych”, dopóki A nie jest na tej samej linii kodu (inaczej BLOCKED copy z DESIGN: prawda o luce).

**REMOVED from Slice A DoD:** `compose knrHint z basis`.

---

## 8. TEST CONTRACT

Obowiązkowe przed claimem slice (IMPLEMENT, nie teraz):

| ID | Wymóg |
|----|--------|
| T-SRC-1 | PDF/`AthPreviewRow.code` → snapshot `catalogBasis` **na `catalogQuantities` (primary) i `rows` (fallback)** |
| T-SRC-2 | `catalogBasis` na linii Master BOQ / dwelling po compose |
| T-SRC-3 | legacy snapshot bez pola → brak throw |
| **T-SRC-4** | Wejście z prawidłowym KNR w `AthPreviewRow.code`. Po Slice A: `catalogBasis` obecne; `catalogWorkId` unchanged/`null`; `knrHint` unchanged (nie zasilony z basis); wynik A1 **identyczny** vs baseline; **brak** automatycznej tożsamości (P5 mapped workId z KNR = baseline) |
| T-KNR-1 | ekspert czyta `catalogBasis`; nie woła A1; nie pisze `knrHint` |
| T-KNR-2 | `exact_knr` ⇒ lineStatus CANDIDATE · `catalogWorkId` null |
| T-KNR-3 | pusta mapa ⇒ 0 apply · A1 UNKNOWN |
| T-OWN-1 | Owner HIT + unit OK ⇒ `catalogWorkId` ustawione **przed** A1 |
| T-OWN-2 | AMBIGUOUS / brak approval ⇒ null workId |
| T-NO-ALIAS | sam opis wykwity ⇒ brak apply w torze KNR |
| T-A1 | istniejące testy `classification-gate` **bez zmian zachowania** |
| T-P5P6P7P8 | research predicates / host seq IC-SEQ **UNCHANGED** (companion, nie rewrite) |
| T-ROOM-1 | `messagePl` nie zawiera tokenów §6.1 |
| T-ROOM-2 | liczba wiadomości KNR ≪ liczby linii (agregat; cap przykładów ≤ 3) |
| T-ROOM-3 | sync ekspert ⇒ 0 fake progress ticks |
| T-ROOM-4 | `TenderWorkflowHubPanel` **nie** montuje Sali IK |
| T-FLAG | zero nowych kluczy AppSettings w tym epic |
| T-MOPS-SEED | prod/map table **nie** zawiera `1202-07` w pierwszym IMPLEMENT |

Slice A **sam** = T-SRC-1…**4** (+ T-A1 / T-P5P6P7P8 companion). **Nie** T-KNR / T-OWN / T-ROOM.

---

## 9. OPEN QUESTIONS

**Nie blokują DF** (rozstrzygnięte rekomendacją; thin re-review potwierdza):

| ID | Pytanie | Frozen default |
|----|---------|----------------|
| OQ-1 | Nowy `sourceRef.kind = knr` vs reuse `evidence`/`candidate`/`hold` | **Reuse** kinds; artifact niesie `normalizedKey` |
| OQ-2 | Nazwa pliku UI: extend `ExpertConversationSurface` vs `ExpertRoomSurface` | **Extend Surface** jeśli się da bez Dual mount · **nie w Slice A** |
| OQ-3 | Czy test Owner HIT używa fikcyjnego workId w harness, nie prod map | **TAK** |
| OQ-4 | Parser `code` ucina `KNR 0-12II` → `KNR` | Poza slice A–C; nie nowy parser; evidence `rawCode` + `tableCode` z opisu gdy pewny |
| **OQ-AR-1** | Gdzie `catalogBasis` na Master BOQ bez karmienia mappera? | **Dwelling line + optional `OfferBoqLine.catalogBasis` (mapper-ignored) i/lub provenance.** Mapper czyta tylko `knrHint`. |
| **OQ-AR-2** | Czy `knrHint` ma być mapper input z KNR w tym epic? | **NIE.** OD-KNR-7. |

**Brak** `CONFLICT → OWNER DECISION REQUIRED` na OD-KNR-1…7.

---

## 10. RISKS (frozen awareness)

| ID | Ryzyko | Kontrakt |
|----|--------|----------|
| R1 | Sala przed slice A | Copy prawdy o luce · nie „sprawdziłem KNR” |
| R2 | `exact_knr` authority creep | T-KNR-2 · **plus** OD-KNR-7 (brak knrHint z KNR) |
| R3 | Dual Sala | T-ROOM-4 |
| R4 | Owner HIT poza seedem A1 → UNKNOWN | UI laik · **nie** patch A1 |
| R5 | ETA jako gwarancja | prefix „orientacyjny” |
| R6 | 154 bąble | OD-KNR-4 |
| R7 | A08-P3 przy okazji | zakaz |
| R8 | `git add -A` | jawny add |
| **R9** | `catalogBasis` → `knrHint` creep (IC-KNR-HINT-AUTHORITY) | Slice A DoD + T-SRC-4 · B nie pisze `knrHint` |
| **R10** | Tylko `TenderCostLine.code` bez qty path | IC-KNR-SRC-PATH · T-SRC-1 primary = `catalogQuantities` |

---

## 11. EXACT NEXT STEP

```text
THIN ARCH RE-REVIEW = PASS
  dokument: docs/architecture/IK-KNR-EXPERT-ARCH-RE-REVIEW.md
Następny: Owner GO IMPLEMENT → SLICE A ONLY
Agent NIE implementuje bez Owner GO
```

**NIE** A08-P3. **NIE** Slice B/C/D.

---

## Checklist thin Arch Re-Review

- [x] OD-KNR-7: Slice A evidence-only · knrHint isolated
- [x] IC-KNR-SRC-PATH: qty + rows + merge w DoD A
- [x] `compose.knrHint = catalogBasis` **REMOVED** z A
- [x] T-SRC-4 w kontrakcie testów
- [x] Recenzent: SOURCE `mapOfferBoqLine` nie dostaje nowego `knrHint` z A (DoD)
- [x] Recenzent: A1 / P5 / P6 / flags UNCHANGED
- [x] Recenzent: Sala = C, nie A

---

# STOP BLOCK

| | |
|--|--|
| **OWNER REVIEW** | ACCEPTED (OD-KNR-1…7) |
| **DESIGN FREEZE** | **AMENDED** · **BLOCKER RESOLVED IN DESIGN** |
| **ARCH REVIEW** | PRE-AMEND BLOCKED · **THIN RE-REVIEW = PASS** |
| **IMPLEMENTATION** | **NOT AUTHORIZED** |
| **NEXT IMPLEMENTATION SLICE** | **A ONLY** (po PASS re-review + Owner GO) |
| **A08-P2** | CLOSED / UNCHANGED |
| **A08-P3** | NOT STARTED |
| **RUNTIME** | UNCHANGED |
| **SETTINGS** | UNCHANGED |
| **PRODUCTION** | UNCHANGED |
| **COMMIT** | NOT DONE |
| **PUSH** | NOT DONE |
| **DEPLOY** | NOT DONE |
