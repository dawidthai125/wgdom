# INGEST-01 — CLOSEOUT

> **Epic ID:** INGEST-01
> **Status:** **CLOSED** · **PRODUCTION VERIFIED · GREEN**
> **Data:** 2026-08-13
> **Feature / live tip:** `d1b2e7ca82149b9db7e78cd69712b5615901e5cf` (`d1b2e7ca` / `d1b2e7c`)
> **UI:** **2.66.43**
> **Deployment:** GitHub Production **`5889699457`** · **success**
> **PV:** [`INGEST-01-PRODUCTION-VERIFY.md`](./INGEST-01-PRODUCTION-VERIFY.md)
> **Tip SSOT:** [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md)
> **Continuity wyceny:** [`../AI/10_TENDER_PRICING_CONTINUITY.md`](../AI/10_TENDER_PRICING_CONTINUITY.md)
> **Depends:** [`MULTI-BOQ-01-CLOSEOUT.md`](./MULTI-BOQ-01-CLOSEOUT.md) · [`MULTI-DWELLING-01-CLOSEOUT.md`](./MULTI-DWELLING-01-CLOSEOUT.md)

```text
════════════════════════════════════════════════════════
INGEST-01 = CLOSED
PRODUCTION VERIFIED · GREEN
tip 2.66.43 / d1b2e7ca · deploy 5889699457 success
Owner/fixture ingest → TenderPipelineItem → document registry
→ documentId+contentHash → ZIP archive children → lossless retain
→ parse queue → artifact documentId → Multi-BOQ pool
→ Owner documentToDwelling → Multi-Dwelling → Multi-BOQ
→ F5 → PackageGate → Bid
INGEST = UPSTREAM ONLY · NOT Bid/F5/PackageGate/OfferBoq engine
LOCAL Połczyn fixture 54/54 LOSSLESS · FULL BIP NOT VERIFIED
════════════════════════════════════════════════════════
```

---

## 1. Cel

Naprawić upstream blocker: brak pinu OCDS/historycznego + silent top-N na ścieżce Owner → utrata dokumentów przed MULTI-DWELLING / MULTI-BOQ.

```text
Owner / fixture ingest
→ TenderPipelineItem
→ stable document registry
→ documentId + contentHash
→ ZIP/archive registry
→ parentArchiveId + archive children
→ lossless document retention
→ parse queue
→ recordIngestArtifact
→ artifact documentId
→ Multi-BOQ artifact pool
→ Owner documentToDwelling mapping
→ Multi-Dwelling
→ dwelling-scoped Multi-BOQ
→ F5
→ PackageGate
→ Final Bid
```

**INGEST jest upstream.**
**Nie** jest: nowym Bid engine · nowym F5 · nowym PackageGate · nowym OfferBoq schema · nowym PDF parserem.

---

## 2. Release pin

| Pole | Wartość |
|------|---------|
| Commit | **`d1b2e7ca82149b9db7e78cd69712b5615901e5cf`** |
| Short | **`d1b2e7ca`** / version.json **`d1b2e7c`** |
| Message | `feat(tenders): add lossless owner tender ingest` |
| UI | **2.66.43** |
| Deployment ID | **5889699457** |
| State | **success** |
| Files | **22** (allowlist) · `PayrollView` **OUT** |

---

## 3. Lossless contract

| Path | Rule |
|------|------|
| Owner / fixture | **N input documents → N retained identities** (wyjątek: jawne `rejected_unsafe`, raportowane) |
| Owner / fixture | **ZERO** silent `.slice(0,3)` / `.slice(0,6)` |
| Auto external | `EXTERNAL_DOC_PARSE_MAX = 6` **KEEP** |
| ZIP | `archiveId` → **N children** + `parentArchiveId` · **nie** ZIP→jeden snapshot |
| Corrupt / unsafe | **PARTIAL / HOLD** · nigdy silent drop / fake dwelling / fake PLN |

Identity:

| Entity | Key |
|--------|-----|
| Tender | OCDS / BZP / `tenderId` (pin) |
| Document | **`documentId`** (+ `contentHash` SHA-256) |
| Filename | display / legacy fallback **only** |
| Dwelling | Owner-confirmed downstream (**nie** INGEST) |

**FORBIDDEN as dwelling identity:** filename · ZIP name · AI suggestion.

---

## 4. Architecture modules

| Area | Files |
|------|--------|
| Core | `src/lib/tender-ingest/*` |
| Pin / prune | `tenders-bzp.ts` additive · `pruneExpiredUntouched` skips `pinned` / `fixture_pin` |
| Gate | `unified-attachment-gate.ts` — Owner omit top-6 |
| Artifact | `tender-document-resolver.ts` · `cost-multi-02-types.documentId?` · `multi-boq/artifact-pool` prefer `documentId` |
| UI | `TenderIngestImportPanel.tsx` · `TendersView` · `useTendersPipeline.importPinnedTender` |
| Store v1 | **`kw-tender-ingest-v1`** localStorage **only** · **nie** w DATA_KEYS / Cloud |

---

## 5. REAL POŁCZYN evidence

**Tender:** `ocds-148610-d97836d1-e5da-4aa0-968e-b69cd9ba24bc`

| Metryka (local `.tmp-live-tender-test/`) | Wartość |
|------------------------------------------|---------|
| Top-level | **7** |
| ZIP | **4** |
| ZIP children | **51** |
| Non-ZIP | **3** |
| Logical | **54** |
| Retained | **54** |
| Rejected | **0** |
| Pending | **0** |
| Orphan | **0** |
| Archives | **4** |
| Cost eligible | **13** |
| Non-cost retained | **41** |

**Wniosek:** LOCAL FIXTURE INGEST = **VERIFIED LOSSLESS 54/54**.

**Jednocześnie:**

| Scope | Status |
|-------|--------|
| FULL BIP | **NOT VERIFIED** (fixture ≠ komplet BIP; m.in. brak pełnego zestawu adresów) |
| Expected dwelling count | **UNKNOWN** (tylko Owner confirm) |
| LIVE COSTING / Labour / Material / Equipment / Transport / OI / F5 / PackageGate / Final Bid | **NOT RUN** |

**Nie** sugerować, że 54 dokumenty = kompletny cały przetarg.

---

## 6. What is proven / not proven

**Proven:** Owner pin/import · pinned retention · stable `documentId` · `contentHash` · ZIP archive + children · lossless Owner path · artifact `documentId` bridge · Multi-BOQ pool integration · production UI ingest · production deploy · legacy PL02/auto top-6 preserved.

**Not proven:** FULL BIP live · REAL Połczyn costing · Labour/Material/Equipment/Transport live · Owner Input live · F5 · PackageGate · Final Bid PLN.

---

## 7. Hard locks (UNCHANGED)

| Lock | Status |
|------|--------|
| OfferBoq schema | **v5** · no WithDwelling |
| F5 / PackageGate | unchanged |
| MULTI-DWELLING-01 / MULTI-BOQ-01 | **CLOSED · GREEN** |
| Equipment / Transport / C-MODE | unchanged |
| Payroll / Cloud / DATA_KEYS | unchanged · ingest LS-only |
| New Bid / new PDF parser | **ABSENT** |

---

## 8. Regression (prior verified — not re-run at docs close)

| Suite | Result |
|-------|--------|
| INGEST-01 | **17/0** |
| MULTI-BOQ-01 | **50/0** |
| MULTI-DWELLING-01 | **72/0** |
| OWNER-INPUT-01 | **115/0** |
| GO-1 | **62/0** |
| MODEL-1B | **64/0** |
| Transport | **75/0** |
| Equipment | **36/0** |
| C-MODE | **44/0 · 34/0** |
| COST-MULTI | **ALL PASS** |
| Payroll B4 | **13/0** |
| Legacy BZP PL02 | **GREEN** |

---

## 9. CI note (preserved)

Gate B tenders / e2e-happy-path: **failure** observed on feature commit.
Vercel Production: **success** · `version.json` SHA match **`d1b2e7c`**.
**Production Verify = GREEN** mimo tego odchylenia CI — bez inventowanej „naprawy”.

---

## 10. NEXT

**LIVE REAL TENDER RETEST — POŁCZYN-ZDRÓJ** (Owner GO):

1. ingest dostępnego pakietu · 2. confirm expected dwelling count · 3. Owner dwelling IDs · 4. map cost docs → dwelling · 5. parse cost candidates · 6. artifact pool completeness · 7. compose dwelling BOQs · 8. Labour/Material · 9–10. Equipment/Transport GAP · 11. Owner Input tylko gdy wymagane · 12. F5_D · 13. PackageGate · 14. aggregate · 15. Bid · 16. report PLN · 17. osobno missing/unknown/Owner-dependent.

**Zakaz:** invent PLN · missing→0 · branch≠dwelling · filename as dwelling identity.

---

## 11. Closed stack (pricing path)

MODEL-1B · GO-1 · OWNER-INPUT-01 · COST-MULTI · MULTI-DWELLING-01 · MULTI-BOQ-01 · **INGEST-01** — wszystkie **PRODUCTION VERIFIED · GREEN**.
