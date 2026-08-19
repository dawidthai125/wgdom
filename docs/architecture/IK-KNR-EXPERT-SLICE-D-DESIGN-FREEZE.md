# IK-KNR-EXPERT — SLICE D
## DESIGN FREEZE
## Owner-confirmed mapping (KNR → catalogWorkId)

| Field | Value |
|-------|-------|
| **ID** | `IK-KNR-EXPERT-SLICE-D-DESIGN-FREEZE` |
| **Status** | **CLOSED** · **PRODUCTION VERIFIED · GREEN** · **ARCH REVIEW = DONE** · **IMPLEMENTATION = DONE** · **COMMIT = DONE** · **PUSH = DONE** · **DEPLOY = DONE** · **PRODUCTION VERIFY = PASS WITH UNVERIFIED ITEMS** |
| **Date** | 2026-08-18 |
| **Production** | **2.66.101** · SHA **`16c3c9382dbe587a0877c70c2dab5b0b7d76d7ea`** (`16c3c938`) |
| **Mode** | **CLOSED** · runtime D na prod · pusta tabela v1 legalna · settings / KV / flagi **UNCHANGED** |
| **PLAN** | [`IK-KNR-EXPERT-SLICE-D-PLAN.md`](./IK-KNR-EXPERT-SLICE-D-PLAN.md) |
| **Parent** | [`IK-KNR-EXPERT-DESIGN-FREEZE.md`](./IK-KNR-EXPERT-DESIGN-FREEZE.md) · **OD-KNR-1** · **OD-KNR-6** · **OD-KNR-7** |
| **Slice B** | PRODUCTION VERIFIED · GREEN · `18f6c1a2` |
| **Slice C2** | PRODUCTION VERIFIED · GREEN · `039a68e1` · live **2.66.99** |
| **Slice C3** | PRODUCTION VERIFIED · GREEN · `4a801365` · live **2.66.100** |
| **Slice D** | **CLOSED** · PRODUCTION VERIFIED · GREEN · `16c3c938` · 2.66.101 |
| **Slice A** | **CLOSED · PRODUCTION VERIFIED · GREEN · `93eb41be`** · live **2.66.103** |
| **Access** | `isIkEntryEnabled()` · **zero nowych flag** |

```text
D = Owner HIT → applyOwnerKnrMapping → overlay catalogWorkId → istniejący P3.
D ≠ mapper · ≠ A1-call · ≠ P5 · ≠ C3 chrome · ≠ knrHint · ≠ UI confirm.

Copy rozmowy     = C2 (prod) SSOT — D NIE przepisuje ik-knr-conversation.ts
Chrome           = C3 (prod) SSOT — D NIE edytuje IkExpertRoomChrome
DESIGN D         = READY
ARCH REVIEW D    = DONE
IMPLEMENTATION   = DONE
COMMIT / PUSH / DEPLOY = DONE
PRODUCTION VERIFY = PASS WITH UNVERIFIED ITEMS
STATUS           = CLOSED · PRODUCTION VERIFIED · GREEN
```

Jeżeli IMPLEMENT woła `mapOfferBoqLine` / `classifyEstimatorPricingPlane` / Research / pisze `knrHint` / dyff Hub / Surface API / `labels.ts` / C3 chrome: **ARCH BLOCKER**.
Jeżeli IMPLEMENT auto-assign z samego CANDIDATE / HOLD / NONE / CONFLICT: **ARCH BLOCKER**.
Jeżeli IMPLEMENT seeduje prod `1202-07`: **ARCH BLOCKER**.

---

## 1. SOURCE LOCK (2026-08-18, po C3 prod)

| Fakt | SOURCE |
|------|--------|
| Structural Master BOQ `catalogWorkId` | `compose.ts` **zawsze `null`** — **brak** identity z KNR |
| Compose | **poza D** |
| `mapOfferBoqLine` / `exact_knr` | kopia mapped z `knrHint` — **osobny** mechanizm · **nie** authority D |
| `knrHint` | **nie** authority KNR (OD-KNR-7) · D **nie** pisze |
| `catalogBasis` | evidencja · **nie** CatalogWork identity |
| `runIkKnrExpert` | read-only · `CANDIDATE ≠ identity` · `proposedWorkId: null` · `resolved: 0` · `catalogWorkIdWritten: 0` |
| `applyOwnerKnrMapping` | **nie istnieje** |
| Tabela KNR→workId | **nie istnieje** |
| A1 | `classifyEstimatorPricingPlane` konsumuje `workId` · P3 czyta `line.catalogWorkId` |
| P5 | `mapOfferBoqLine` na kopii · **UNCHANGED** |
| C3 | host + chrome + jedna IK Surface · Hub unchanged |
| Owner labor table | `WORK_RATE_IDENTITY_MAPPINGS` + `ownerApproval` — analogia, **nie** KNR |
| Inspektor / per-tender confirm | **brak** |

---

## 2. ARCHITECTURE FREEZE

```text
IkEntryHost
  Document Expert                         UNCHANGED
  runIkKnrExpert                          UNCHANGED (B)
  applyOwnerKnrMapping(report, copies)    ★ D — dopiero IMPLEMENT
    → overlay catalogWorkId na KOPII linii
  runIkMasterBoqClassification            ★ istniejący P3 — D NIE woła A1
  buildIkEntryConversationViewModel
  IkExpertRoomChrome                      ★ C3 UNCHANGED
    └── ExpertConversationSurface         ★ UNCHANGED
TenderWorkflowHubPanel                    ★ UNCHANGED
mapOfferBoqLine / P5                      ★ UNCHANGED
classification-gate / owner-classification-map  ★ UNCHANGED
```

**Jeden tor KNR.** D dodaje **authority apply**, nie drugi pipeline, nie drugi bus, nie drugi Surface.

Builder / C2 **nie** wołają `applyOwnerKnrMapping`. Host (po GO IMPLEMENT) nakłada overlay **przed** P3. Chrome **nie** czyta i **nie** pisze `catalogWorkId`.

---

## 3. AUTHORITY FREEZE

**Jedyna authority v1:**

```text
Owner GO
  + aktywny wiersz tabeli w kodzie
  + ownerApproval: true
```

**Nie** są authority: IK, B CANDIDATE, C2/C3, Inspektor, runtime klik, A1, mapper, alias pack, heurystyka opisu.

**D MOŻE CZYTAĆ:** `IkKnrExpertReport`, `catalogBasis`, `CatalogWork` (walidacja celu).

**D MOŻE PISAĆ:** wyłącznie `catalogWorkId` na **kopii/overlay** linii · wyłącznie po legalnym HIT · **przed** P3.

**D NIE MOŻE:** pisać `knrHint`; mutować shared `ref.line` (OQ-D-1 default = kopia); wołać mapper / A1 / Research; zasilać P5; ruszać Hub / Surface / labels / C2 copy / C3 chrome; dodawać settings / KV / flagi.

---

## 4. D v1 SHAPE FREEZE

| | Zamrożone |
|--|-----------|
| Forma | **tabela w kodzie** (wzorzec `WORK_RATE_IDENTITY_MAPPINGS`: exact + `ownerApproval`) |
| Pusta tabela | **legalny stan produkcyjny** · 0 wierszy = 0 apply |
| UI | **brak** nowego ekranu · **brak** Decision Workspace |
| Flaga / KV / settings | **brak** |
| Persistence | re-apply z tabeli co run · **nie** nowy KV |
| Seed `1202-07` | **ZAKAZ** w pierwszym IMPLEMENT |

Klucz wiersza: **exact `normalizedKey`** (z `catalogBasis` / B), nie opis, nie `knrHint`.

---

## 5. LEGAL HIT FREEZE

HIT **tylko** gdy **wszystkie**:

1. linia B = `CANDIDATE` (nie HOLD / NONE / CONFLICT / BLOCKED)
2. exact match `normalizedKey` wiersza
3. wiersz `active === true`
4. wiersz `ownerApproval === true`
5. target `workId` **istnieje** w CatalogWork
6. unit OK (T-OWN-1)
7. jeden wiersz na key (AMBIGUOUS / duplikat → **0 mutation**, T-D-18)

Inaczej: **reject · 0 mutation**.

CANDIDATE **bez** wiersza Owner = **0 mutation** (T-D-2).
`proposedWorkId` B zostaje `null`. D **nie** zgaduje CatalogWork.

---

## 6. WRITE / OVERLAY FREEZE

```text
WRITE = catalogWorkId ONLY
WHERE = kopia / overlay linii (NIE shared compose object)
WHEN  = po legalnym HIT, przed P3 classification
WHO   = applyOwnerKnrMapping
```

**Zakaz mutate** `ref.line` ze shared Master BOQ (IC-B-READONLY). OQ-D-1 rekomendacja freeze = **kopia**.

`knrHint` **UNCHANGED**. Compose **UNCHANGED**.

---

## 7. A1 / P5 FREEZE

| | |
|--|--|
| A1 | konsument `workId` · D **nie** woła `classifyEstimatorPricingPlane` |
| P3 | istniejący `runIkMasterBoqClassification` · D tylko dostarcza overlay |
| A1 seed | `owner-classification-map.ts` **UNCHANGED** |
| HIT poza seedem | UNKNOWN akceptowalne (parent R4) · **nie** patch A1 |
| P5 | **UNCHANGED** · D **nie** woła `mapOfferBoqLine` (OQ-D-2) |

---

## 8. LANGUAGE / C3 ISOLATION

D **nie** zmienia copy C2, chrome C3, `labels.ts`, Surface API, Hub.

Zakaz w D UI (jeśli kiedykolwiek komunikat apply — **nie w v1 bez osobnego OD**): identity dump, mapper, A1, Research, `catalogBasis`, `knrHint` jako etykieta.

v1 **nie** ma UI confirm (OQ-D-3).

---

## 9. FILE FREEZE

**Nowe (dopiero po Owner GO IMPLEMENT):**

- `src/lib/intelligent-estimator/ik-knr-owner-mapping.ts`
- `scripts/test-ik-knr-expert-slice-d.mjs`

**Rozszerzenia:**

- `src/app/intelligent-estimator/IkEntryHost.tsx` — minimalny overlay przed VM/P3 · **nie** chrome
- `src/lib/intelligent-estimator/index.ts` — tylko jeśli potrzebny export
- changelog **nowa wersja wyłącznie D** (nie 2.66.100)

**REUSE bez edycji:** C2 `ik-knr-conversation.ts` · C3 chrome · Surface · Hub · Brand · B `ik-knr-expert.ts` · A1 gate · mapper · P5–P8

**Zakaz:**
`IkExpertRoomChrome.tsx` · `ik-knr-conversation.ts` · `TenderWorkflowHubPanel.tsx` · Surface API · `labels.ts` · `tender-offer-boq-mapping.ts` · `classification-gate.ts` · `owner-classification-map.ts` · `compose.ts` / Slice A WIP · parser · settings / flags / KV · Research · Accept OUR RATE · P5–P8 expert files

---

## 10. TEST CONTRACT

Harness (dopiero IMPLEMENT): `scripts/test-ik-knr-expert-slice-d.mjs`

| ID | Oczekiwanie |
|----|-------------|
| T-D-1 | brak wiersza Owner → 0 mutation |
| T-D-2 | CANDIDATE bez HIT → 0 mutation |
| T-D-3 | HOLD → 0 mutation |
| T-D-4 | NONE → 0 mutation |
| T-D-5 | HIT + legal target + unit OK → `catalogWorkId` **tylko** właściwa linia |
| T-D-6 | inactive / nonexistent workId → reject + 0 mutation |
| T-D-7 | unrelated lines unchanged |
| T-D-8 | `catalogWorkId` tylko z D (nie z B/C3/mapper) |
| T-D-9 | `knrHint` unchanged |
| T-D-10 | `mapOfferBoqLine` **not called** |
| T-D-11 | D **nie** woła `classifyEstimatorPricingPlane` |
| T-D-12 | Research = 0 |
| T-D-13 | Hub = 0 diff |
| T-D-14 | C2 = 533/0 |
| T-D-15 | C3 = 108/0 |
| T-D-16 | B / A / A1 / CATALOG-BID-01 / P0 regression |
| T-D-17 | production empty table + **0** seed `1202-07` |
| T-D-18 | duplicate / AMBIGUOUS key → 0 mutation |
| T-OWN-1 | Owner HIT + unit OK ⇒ mapping allowed |
| T-OWN-2 | brak `ownerApproval` ⇒ null workId / 0 mutation |

---

## 11. RISKS (frozen)

| ID | Ryzyko | Kontrakt |
|----|--------|----------|
| R-D-1 | auto-assignment z CANDIDATE | T-D-2 |
| R-D-2 | mapper `exact_knr` jako D | T-D-10 |
| R-D-3 | CANDIDATE ≠ identity | B `proposedWorkId` zostaje null |
| R-D-4 | Owner bypass | tylko tabela + `ownerApproval` |
| R-D-5 | A1 premature | T-D-11 · D nie woła A1 |
| R-D-6 | P3 vs P5 rozjazd | P5 UNCHANGED · OQ-D-2 |
| R-D-7 | `knrHint` / `catalogWorkId` creep | T-D-8 / T-D-9 |
| R-D-8 | mutate shared `ref.line` | kopia · OQ-D-1 |
| R-D-9 | Slice A nie na prod | 0 HIT live legalne · OQ-D-4 |
| R-D-10 | drugi bus / Surface / Hub | C3 chrome FORBIDDEN · T-D-13 |
| R-D-11 | flaga / KV | zakaz v1 |
| R-D-12 | A08-P3 przy okazji | zakaz |
| R-D-13 | seed `1202-07` | T-D-17 |

---

## 12. OPEN QUESTIONS — frozen defaults

**Nie rozstrzygać domysłem poza defaultem.**

| ID | Pytanie | Frozen default v1 |
|----|---------|-------------------|
| **OQ-D-1** | overlay jako kopia vs shared `ref.line` | **kopia** |
| **OQ-D-2** | czy D ma kiedyś zasilać P5 zamiast mappera | **P5 UNCHANGED** · wymaga osobnego Owner GO |
| **OQ-D-3** | per-tender confirmation UI | **NIE w v1** (OD-KNR-6) |
| **OQ-D-4** | IMPLEMENT D przed Slice A na prod | live `withBasis=0` → **0 HIT legalnie** · harness może użyć fixture |
| **OQ-D-5** | czy HIT workId musi być w A1 seed | parent R4: **UNKNOWN akceptowalne** · **nie** patch A1 |

Brak `CONFLICT → OWNER DECISION REQUIRED` poza osobnym GO na OQ-D-2 / OQ-D-3.

---

## 13. NON-BLOCKERS (nie eskalować)

1. Dual header C3.
2. Nested max-h C3.
3. Slice A off-prod (OQ-D-4).
4. Pre-existing P3 vs P5 identity rozjazd.
5. Tree-shaken aktor `Knr` w prod bundle (C3 presentation labels zostają).

**BLOCKERS DESIGN: 0**

---

# UNVERIFIED (NOT PASS · NOT FAIL)

1. Live UI: **CANDIDATE + empty Owner table** — niezweryfikowane; testowany przetarg: `withBasis=0` / `masterReady=0` / KNR **BLOCKED**.
2. shared `ref.line` immutability via DOM — nieobserwowalne w DOM; potwierdzone source review + harness D.
3. **P3 UNKNOWN live UI** — niezweryfikowane; Master BOQ HOLD, P3 nie wystartował.

---

# STOP BLOCK

| | |
|--|--|
| **DESIGN D** | **READY** |
| **ARCH REVIEW D** | **DONE** |
| **IMPLEMENTATION** | **DONE** |
| **COMMIT / PUSH / DEPLOY** | **DONE** · `16c3c938` · 2.66.101 |
| **PRODUCTION VERIFY** | **PASS WITH UNVERIFIED ITEMS** |
| **STATUS** | **CLOSED · PRODUCTION VERIFIED · GREEN** |
| **RUNTIME / SETTINGS / KV / FLAGS** | **UNCHANGED** (poza D overlay na prod) |
| **SLICE E** | **NOT STARTED** · IMPLEMENTATION OF E = **NOT AUTHORIZED** |
| **NEXT** | **OWNER REVIEW OF NEXT SLICE / PLAN-DESIGN** |
