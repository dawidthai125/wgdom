# SESSION HANDOFF — 2026-08-13 · Wrocław Tender Continuity

> **STATUS:** **SESSION CLOSED** · documentation SSOT for new ChatGPT / Cursor
> **Data:** 2026-08-13
> **Tryb:** UTRZYMANIE · **STABILIZATION WINDOW ACTIVE**
> **Hasło:** **„kontynuuj WGDOM”** / **„KONTYNUUJ WGDOM”** → najpierw ten plik + tip **09**, nie zgaduj stanu
> **Tip SSOT (wersje):** [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md)
> **Continuity wyceny:** [`../AI/10_TENDER_PRICING_CONTINUITY.md`](../AI/10_TENDER_PRICING_CONTINUITY.md)
> **Workflow GO:** [`../WORKFLOW-OWNER-GO.md`](../WORKFLOW-OWNER-GO.md) · Workflow Przetargi [`../WORKFLOW-ARCHITECTURE-v2.63.md`](../WORKFLOW-ARCHITECTURE-v2.63.md)

```text
════════════════════════════════════════════════════════
SESSION 2026-08-13 CLOSED
Production RUNTIME = 2.66.43 / dec73351 (NOT docs SHA)
Docs tip after this closeout = new commit on main
CLOSED: MULTI-DWELLING-01 · MULTI-BOQ-01 · INGEST-01 · NORMA-KALK P0
OPEN: D02 LP22 · REAL SOURCE · F5 · PackageGate · Final Bid (real tender)
NEXT = Wrocław REAL TENDER AUDIT ONLY (WM → ZZK → MOPS → uczelnie)
Połczyn = fixture ONLY · NOT operational target
════════════════════════════════════════════════════════
```

---

## A. Project identity

| | |
|--|--|
| App | **W&G DOM** — React/Vite · monolit UI `src/app/App.tsx` |
| Prod | https://www.wgdom.fun · Supabase Edge `make-server-0afb8820` |
| Repo | https://github.com/dawidthai125/wgdom · branch `main` |
| Biznesowy cel (aktualny) | Automatyczne / półautomatyczne przygotowanie **wiarygodnej wyceny** realnych przetargów remontowych we Wrocławiu |
| Stabilization | **ACTIVE** — bez auto-start nowych EPIC bez Owner GO |

**Nie** czytaj `App.tsx` od zera. Mapa: `AGENTS.md` → cold-start → **09** → ten handoff.

---

## B. Production baseline (RUNTIME)

| Pole | Wartość |
|------|---------|
| URL | https://www.wgdom.fun |
| UI / `version.json` | **2.66.43** |
| **Production feature SHA** | **`dec73351edc0a9814ac92b745a10c6f35aaa2b9e`** |
| Short / version.json | **`dec73351`** / **`dec7335`** |
| Feature deploy | **5892250601** · **success** |
| Feature commit msg | `fix(tenders): preserve norma kalk basis and incomplete knr rows` |

**WAŻNE:** `578568d8` (i kolejne docs-only tipy) = **dokumentacja po release**, **nie** production runtime SHA. Runtime pozostaje **`2.66.43` / `dec73351`**, dopóki `version.json` nie wskaże innego feature commit.

---

## C. Latest commits (łańcuch)

| SHA | Rola |
|-----|------|
| **`dec73351…`** | **Feature P0** NORMA-KALK · **PRODUCTION RUNTIME** |
| **`578568d8…`** | Docs: close MULTI-BOQ-NORMA-KALK P0 |
| *(ten closeout)* | Docs: full session handoff 2026-08-13 |

Prior feature: INGEST-01 **`d1b2e7ca`** · MULTI-BOQ-01 **`669d2872`** · MULTI-DWELLING-01 **`0f1a52f4`**.

---

## D. Closed epics (GREEN)

| Epic | Status | Pin / SSOT |
|------|--------|------------|
| **MULTI-DWELLING-01** | CLOSED · PV GREEN | hist. `0f1a52f4` · [`MULTI-DWELLING-01-CLOSEOUT.md`](./MULTI-DWELLING-01-CLOSEOUT.md) |
| **MULTI-BOQ-01** | CLOSED · PV GREEN | hist. `669d2872` · [`MULTI-BOQ-01-CLOSEOUT.md`](./MULTI-BOQ-01-CLOSEOUT.md) |
| **INGEST-01** | CLOSED · PV GREEN | hist. `d1b2e7ca` · [`INGEST-01-CLOSEOUT.md`](./INGEST-01-CLOSEOUT.md) |
| **MULTI-BOQ-NORMA-KALK P0** | CLOSED · PV GREEN | **`dec73351`** · [`MULTI-BOQ-NORMA-KALK-P0-CLOSEOUT.md`](./MULTI-BOQ-NORMA-KALK-P0-CLOSEOUT.md) · [`PV`](./MULTI-BOQ-NORMA-KALK-P0-PRODUCTION-VERIFY.md) |

Also CLOSED (upstream wyceny): F0–F6 · C-MODE-1a · EQUIPMENT/TRANSPORT contracts · OWNER-INPUT / GO-1 / MODEL-1B — **nie** oznaczają real-tender Bid GREEN.

---

## E. Recent audit / RCA / DF (NORMA-KALK)

| Etap | Wynik |
|------|--------|
| LIVE WM Multi-BOQ | CONFLICT_HOLD na kalk. własna vs KNR (false) |
| CONFLICT AUDIT | Parser emitował standalone kalk; merge poprawny |
| RCA | APPROVED — parser-first + provenance |
| PLAN / DF-01…DF-15 | APPROVED — fold kalk · no synthetic LP |
| IMPLEMENT | kalk fold + pricingBasis |
| Owner Verify | **FAIL** — silent loss LP32 |
| RCA DF-16 | Reject qty token ≠ reject parent |
| DF-16-A…H | APPROVED |
| IMPLEMENT DF-16 | quantity `""` · parent keep |
| Owner Verify | **PASS** |
| COMMIT+PUSH feature | `dec73351` |
| PRODUCTION VERIFY | **PASS** · deploy `5892250601` |
| CLOSE DOCS P0 | `578568d8` |
| SESSION CLOSE (ten plik) | docs tip + Wrocław NEXT correction |

---

## F. INGEST architecture (UPSTREAM ONLY)

```text
Owner/fixture pin (owner_requested / fixture_pin)
→ TenderPipelineItem
→ document registry (documentId + contentHash)
→ archive / children (archiveId · parentArchiveId · archive_inner)
→ lossless retain (Owner: NO silent top-N)
→ parse queue
→ artifacts (documentId)
→ Multi-BOQ pool
```

| Rule | Value |
|------|--------|
| LS | `kw-tender-ingest-v1` only |
| Cloud / DATA_KEYS | **NIE** |
| OCDS direct lookup | **NIE** (optional / not implemented) |
| Auto external | `EXTERNAL_DOC_PARSE_MAX = 6` KEEP |
| Owner path | **bez** silent `.slice(0,6)` |
| Security | path traversal · ZIP bomb · corrupt · limits · contentHash |
| Dwellings | **INGEST NIE tworzy** dwellings — kończy przed confirmDwelling / expectedDwellingCount / documentToDwelling |

Połczyn = **fixture architektoniczny** INGEST (LOCAL 54/54) · **NIE** operational target.

---

## G. Multi-Dwelling architecture

```text
Tender → Package → N Dwelling → N OfferBoq → N F5_D → PackageGate → SUM → Bid
```

- Owner mapping HARD: `sourceDocumentIds` + `documentToDwelling`
- `expectedDwellingCount` · `confirmDwelling`
- **Forbidden:** filename / ZIP name / AI as dwelling identity
- LS `kw-multi-dwelling-package-v1` · ZERO Cloud Sync

---

## H. Multi-BOQ architecture

```text
document-level artifact pool (prefer documentId · fallback filename)
→ resolveDwellingCostSnapshotForPricing
→ composeDwellingOfferBoq (OfferBoq v5 + lineProvenance side-map)
→ attachComposedBoqToDwelling
→ F5_D → PackageGate → SUM → Bid
```

- Dwelling-scoped · **nie** BEST_SINGLE as dwelling BOQ
- `legacy_single` KEEP
- COST-MULTI = **branch ≠ dwelling**

### Merge contract (LOCKED)

| Case | Result |
|------|--------|
| same LP + same branch + different contentHash | **CONFLICT_HOLD** |
| identical contentHash | **KEEP ONE** |
| different branch | **KEEP BOTH** |

**Nie zmieniać** `merge.ts` / `line-id.ts` / `eligibility.ts` bez osobnego DF + Owner GO.

---

## I. Norma PRO parser / kalk semantics (P0)

| Rule | Behavior |
|------|----------|
| `kalk. własna` | **pricing basis** → fold into parent KNR · `pricingBasis = kalk_wlasna` |
| DF-16-A | `0103-02` → `02` / `0419-04` → `04` **≠** quantity |
| DF-16-B | reject token **≠** drop parent |
| DF-16-D/H | unresolved qty → `quantity = ""` (string) · incomplete REAL COST retained |
| DF-16-E/F | no invent qty · no synthetic LP |
| DF-11 | **NO SILENT LOSS** real KNR |

Evidence (WM D01): LP32 `quantity=""` · LP56 `20.00 mb` + kalk · LP92 `2.00` ≠ `04` · LP53 one row.

---

## J. Real WM reference case

| Pole | Wartość |
|------|---------|
| Buyer | **Wrocławskie Mieszkania Sp. z o.o.** |
| Ref | **WM/TP/239/2026/G** |
| OCDS | `ocds-148610-191b0d4e-b413-42a0-ae9c-32c9425d998b` |
| BZP | **2026/BZP 00377489** |
| Model | **paczka 4 lokali** |

| Dwelling | Address |
|----------|---------|
| D01 | Reja 8/27 |
| D02 | Sępa-Szarzyńskiego 80/1 |
| D03 | Siemieńskiego 11/5 |
| D04 | Wyszyńskiego 121/9 |

| Stage | Evidence |
|-------|----------|
| Ingest (session) | top-level 6 · retained 16 · rejected 0 · pending 0 · orphan 0 |
| COST parse | 4/4 |
| D01 / D03 / D04 | **ready** · 0 false kalk conflicts |
| D02 | **conflict ONLY LP22** |
| False kalk CONFLICT_HOLD | **removed** |
| LP32 silent loss | **removed** |

**= najważniejszy REAL WROCŁAW reference case.**

---

## K. Residual OPEN — D02 LP22

- Real **CONFLICT_HOLD** · **OUT OF P0** · **nie** rozwiązany
- **Zakaz** bez nowego AUDIT→RCA→PLAN→DF→Owner GO: KEEP ONE first/last · drop · sum · ignore

---

## L. F5 / REAL SOURCE / PackageGate / Bid

| Layer | Status |
|-------|--------|
| REAL SOURCE | **NOT VERIFIED / unavailable** w dotychczasowym probe |
| Labour / Material / Equipment / Transport → F5 | **nie** real-tender GREEN end-to-end |
| F5 | **NOT VERIFIED GREEN** (real Wrocław) |
| PackageGate | **NOT VERIFIED GREEN** (real tender) |
| Final Bid | **NOT AVAILABLE / NOT VERIFIED** |

**FORBIDDEN:** brak danych / GAP / HOLD / UNKNOWN → **0 PLN**.

P0 zamyka **parser / Multi-BOQ Norma semantics**, **nie** cały produkt wyceny.

---

## M. Hard locks

Bez osobnego Owner GO + DF:

- `src/lib/multi-boq/merge.ts` · `line-id.ts` · `eligibility.ts`
- `OFFER_BOQ_SCHEMA_VERSION = 5` (no bump)
- F5 / PackageGate / second Bid engine
- Multi-Dwelling core
- Cloud / DATA_KEYS / Payroll / `PayrollView.tsx`
- invent PLN · synthetic LP · silent real-row loss

---

## N. Tender operating procedure

```text
1 Discovery → 2 Tender identity → 3 Ingest → 4 Document inventory
→ 5 Dwelling discovery → 6 Owner mapping → 7 Parse → 8 Artifact verify
→ 9 Multi-BOQ → 10 Cost sources → 11 Owner Input → 12 F5
→ 13 PackageGate → 14 Bid → 15 Accuracy audit
```

Zawsze raportuj: silent drops · duplicates · wrong mapping · missing artifacts · HOLD · GAP · unknowns · **invented pricing = 0**.
Filename = **HINT only**.

### Klasyfikacja testów

| Class | Meaning |
|-------|---------|
| A | LIVE PASS |
| B | LIVE PARTIAL |
| C | LIVE BLOCKED |
| D | DESIGN / PARSER GAP |

Zawsze: **FIRST BLOCKER** · **ROOT CAUSE** · **NEXT ACTION**.

---

## O. Wrocław target zamawiający (OPERATIONAL)

| Priorytet | Zamawiający |
|-----------|-------------|
| 1 | **Wrocławskie Mieszkania (WM)** |
| 2 | **ZZK Wrocław** |
| 3 | **MOPS Wrocław** |
| 4 | Uczelnie / uniwersytety (opcjonalnie) |

**Połczyn-Zdrój = NOT TARGET** (historyczny fixture INGEST).

Preferowane roboty: **pustostany / remont lokali** — pojedynczy lokal **lub** paczka wielu lokali.

---

## P. Single vs multi dwelling model

```text
Tender
  → parts (opcjonalnie)
  → dwellings (Owner-confirmed)
  → documents
  → cost artifacts
  → dwelling-scoped BOQ
  → costing → F5 → PackageGate → Bid
```

Źródło prawdy dwelling: **BZP / dokumentacja / Owner mapping** — **nie** filename.

---

## Q. Forbidden

- AUDIT/RCA/PLAN/DF traktować jak IMPLEMENT
- Hotfix podczas AUDIT
- Invent PLN / quantity / synthetic LP
- Filename = dwelling
- Połczyn jako cel biznesowy
- Claim F5/PackageGate/Bid GREEN bez real Wrocław evidence
- Touch hard locks / PayrollView w feature commit
- Omijać Owner GO

---

## R. Exact next step

```text
OWNER GO → Wrocław REAL TENDER AUDIT ONLY
  targets: WM → ZZK → MOPS → (uczelnie)
  prefer: pustostany / single OR multi-dwelling package
  reference: WM/TP/239/2026/G already exercised for ingest+parse+norma
  then: RCA → PLAN → DF → ARCH → OWNER GO → IMPLEMENT
  NIE implementować przed GO
```

Opcjonalny residual (osobny scope): **D02 LP22** AUDIT — tylko Owner GO.

---

## S. New ChatGPT startup

1. [`PROJECT-HANDOFF-CURRENT.md`](../PROJECT-HANDOFF-CURRENT.md)
2. [`AGENT-CONTINUITY-GUIDE.md`](../AGENT-CONTINUITY-GUIDE.md)
3. [`CURRENT-TASK.md`](../../CURRENT-TASK.md)
4. [`AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md)
5. [`AI/10_TENDER_PRICING_CONTINUITY.md`](../AI/10_TENDER_PRICING_CONTINUITY.md)
6. **Ten plik** (SESSION-HANDOFF)
7. Dopiero potem nowe zadanie

Hasło **„KONTYNUUJ WGDOM”** = odczytaj SSOT, nie zgaduj.

---

## T. New Cursor startup

1. `AGENTS.md` START HERE → cold-start → **09** (tip)
2. Ten SESSION-HANDOFF · CURRENT-TASK · PROJECT-HANDOFF-CURRENT · AGENT-CONTINUITY
3. [`WORKFLOW-OWNER-GO.md`](../WORKFLOW-OWNER-GO.md)
4. Ostatnie closeouty NORMA-KALK / INGEST / MULTI-BOQ
5. **Nie** czytaj `App.tsx` od zera

Przed każdym kodem:

```text
AUDIT → RCA → PLAN → DESIGN FREEZE → ARCH REVIEW → OWNER GO → IMPLEMENT
```

`PayrollView.tsx` / `useTenderOfferRun.ts` = pre-existing WIP · **nie** stage bez GO.

---

## Obowiązujący workflow (skrót)

```text
AUDIT ≠ IMPLEMENT · RCA ≠ IMPLEMENT · PLAN ≠ IMPLEMENT · DF ≠ IMPLEMENT
Implement dopiero po explicit OWNER GO
Każdy etap = własny verdict
```

---

## Seams (nie mieszać)

| Module | Responsibility |
|--------|----------------|
| INGEST | pipeline · registry · archives · documentId · contentHash · parse artifacts |
| MULTI-DWELLING | expectedDwellingCount · confirmDwelling · documentToDwelling |
| MULTI-BOQ | artifact pool · resolve · compose · attach |
| F5 | Position Cost |
| PackageGate | package allow / hold |
| Bid | final proposal |

---

## Links (closeouty)

- [`MULTI-BOQ-NORMA-KALK-P0-CLOSEOUT.md`](./MULTI-BOQ-NORMA-KALK-P0-CLOSEOUT.md) · [`MULTI-BOQ-NORMA-KALK-P0-PRODUCTION-VERIFY.md`](./MULTI-BOQ-NORMA-KALK-P0-PRODUCTION-VERIFY.md)
- [`INGEST-01-CLOSEOUT.md`](./INGEST-01-CLOSEOUT.md) · [`MULTI-BOQ-01-CLOSEOUT.md`](./MULTI-BOQ-01-CLOSEOUT.md) · [`MULTI-DWELLING-01-CLOSEOUT.md`](./MULTI-DWELLING-01-CLOSEOUT.md)
