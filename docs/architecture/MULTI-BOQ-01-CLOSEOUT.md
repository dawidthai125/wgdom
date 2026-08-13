# MULTI-BOQ-01 — CLOSEOUT

> **Epic ID:** MULTI-BOQ-01
> **Status:** **CLOSED** · **PRODUCTION VERIFIED · GREEN**
> **Data:** 2026-08-13
> **Feature / live tip:** `669d2872117f5724e756d19e9f4aedfea34cb48d` (`669d287` / `669d2872`)
> **UI:** **2.66.43**
> **Prior tip:** MULTI-DWELLING-01 `0f1a52f48f86d54c166e577dcfc04081b0156f3c`
> **PV:** [`MULTI-BOQ-01-PRODUCTION-VERIFY.md`](./MULTI-BOQ-01-PRODUCTION-VERIFY.md)
> **Tip SSOT:** [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md)
> **Continuity wyceny:** [`../AI/10_TENDER_PRICING_CONTINUITY.md`](../AI/10_TENDER_PRICING_CONTINUITY.md)
> **Depends:** [`MULTI-DWELLING-01-CLOSEOUT.md`](./MULTI-DWELLING-01-CLOSEOUT.md)

```text
════════════════════════════════════════════════════════
MULTI-BOQ-01 = CLOSED
PRODUCTION VERIFIED · GREEN
tip 2.66.43 / 669d2872
Owner map → dwelling resolve → compose → OfferBoq v5
→ attach → F5_D → PackageGate → SUM → Bid
legacy_single KEEP (resolveKosztorysSnapshotForPricing)
NO schema bump · NO second Bid · NO Cloud Sync
════════════════════════════════════════════════════════
```

---

## 1. Cel

Dwelling-scoped **multi-document BOQ compose** na paczce mieszkań (MULTI-DWELLING-01):

```text
Owner document mapping
→ resolveDwellingCostSnapshotForPricing(tenderId, dwellingId)
→ composeDwellingOfferBoq
→ OfferBoq v5
→ attachComposedBoqToDwelling
→ dwelling-scoped F5 (evaluateBidCutoverGate)
→ PackageGate (MULTI-DWELLING-01)
→ PackageDirect = SUM(DwellingDirect)
→ computeTenderBidProposal
```

**Bez** drugiego Bid engine · **bez** bumpa OfferBoq schema · **bez** Cloud Sync / DATA_KEYS · **bez** zmian F5/PackageGate semantics · **bez** Equipment/Transport contract redesign · **bez** Payroll.

**Legacy (UNCHANGED):**

```text
legacy_single
→ resolveKosztorysSnapshotForPricing(item)
→ existing legacy flow
```

---

## 2. Baseline przed implementacją

| | |
|--|--|
| Production UI | **2.66.43** |
| MULTI-DWELLING-01 | **CLOSED · GREEN** · `0f1a52f4` |
| GO-1 / MODEL-1B / OWNER-INPUT-01 / COST-MULTI | **CLOSED · GREEN** |
| Problem | Attach brał **tender-level** `resolveKosztorysSnapshotForPricing` → ten sam snapshot × N dwellings |

---

## 3. Capability (PIN)

| Warstwa | Rola |
|---------|------|
| DocumentSet | Owner `documentToDwelling` → docs per dwelling |
| Resolve | `resolveDwellingCostSnapshotForPricing` — mapped cost artifacts only |
| Compose | `composeDwellingOfferBoq` — deterministic merge |
| Provenance | `lineProvenance` side-map (nie OfferBoqLine required fields) |
| Line ID (multi) | `buildOfferBoqLineIdWithSource` |
| Attach | `attachComposedBoqToDwelling` (panel multi) |
| Package / F5 | REUSE MULTI-DWELLING PackageGate + `evaluateBidCutoverGate` |

UI: `MultiDwellingPackagePanel` — „Przypisz przedmiary mieszkania (MULTI-BOQ)”.

Lib: `src/lib/multi-boq/*`.

---

## 4. Identity SSOT

| Entity | Key |
|--------|-----|
| Tender | `tenderId` |
| Dwelling | `dwellingId` (Owner-confirmed) |
| Document | `documentId` (Owner map; filename = **document key fallback only**) |
| Line (multi) | `tenderId + dwellingId + sourceDocumentId + sourceLineKey + …` |
| Owner Input | `tenderId + dwellingId + domain + lineRef` |
| Transport mark | `tenderId + dwellingId + lineId` |

**NOT dwelling SSOT:** filename · description · LP · upload order · branch · lotKey · AI suggestion.

`documentId === dwellingId` → **REJECTED**.

Legacy lineId (`buildOfferBoqLineId` w `tender-offer-boq.ts`) — **bez zmian**.

---

## 5. Document mapping + resolve HARD

```text
∀ cost artifact w dwelling snapshot:
  documentId ∈ Owner map
  AND documentToDwelling[documentId] === dwellingId
```

| Przypadek | Wynik |
|-----------|--------|
| Brak mapped docs | empty / HOLD |
| Missing artifact | **HOLD** (`MISSING_ARTIFACT`) · **≠ 0 PLN** |
| Tender BEST_SINGLE as dwelling BOQ | **FORBIDDEN** |
| Helper/projekt (role filter) | EXCLUDE + warning |

---

## 6. Compose / merge (DF-MB)

| Case | Polityka |
|------|----------|
| Różne dokumenty / linie | **UNION** |
| Same LP + różne branże | **KEEP BOTH** |
| Identical `contentHash` | **KEEP ONE** + provenance sources[] |
| Same LP + same branch + różna treść | **CONFLICT HOLD** |
| Missing artifact | **HOLD** |

**Zakaz:** silent drop · silent double count · missing → 0 PLN.

---

## 7. Provenance + schema

Side-map `lineProvenance[lineId]`:

- `sourceDocumentId` / `sourceDocumentIds`
- `sourceArtifactId` / `sourceArtifactIds`
- `sourceLineKey`
- `branchHint`
- `contentHash`

**OfferBoq:** `OFFER_BOQ_SCHEMA_VERSION = 5` · **NO bump** · **NO** required fields on `OfferBoqLine`.

---

## 8. Package / F5 / COST-MULTI

- **F5:** `evaluateBidCutoverGate` — bez drugiego silnika.
- **PackageGate:** outer gate z MULTI-DWELLING-01 (mapping + BOQ + F5_D + count).
- **Aggregation:** `SUM(DwellingDirect)` → `computeTenderBidProposal`.
- **COST-MULTI:** branch layer (orthogonal) · **nie** dwelling identity · działa **wewnątrz** dwelling.

---

## 9. Equipment / Transport

| | |
|--|--|
| Equipment OI | `tenderId + dwellingId + domain + lineRef` |
| Transport | `tenderId + dwellingId + lineId` |
| Contract | **UNCHANGED** (GO-1 / MODEL-1B) |
| UNRESOLVED / INVALID | **≠ 0 PLN** |

---

## 10. Backward compatibility

| | |
|--|--|
| `legacy_single` | **bez zmian** |
| Legacy resolver | `resolveKosztorysSnapshotForPricing(item)` |
| Legacy lineId | `buildOfferBoqLineId` unchanged |
| OI / Transport bez `dwellingId` | → `DEFAULT_DWELLING_ID` |
| OfferBoq schema | **v5** |

---

## 11. Safety boundaries

```text
NO Cloud persistence v1
NO DATA_KEYS / cloud-sync
NO Supabase / Edge
NO Payroll changes
NO F5 / PackageGate semantic redesign
NO new Bid engine
NO OfferBoq schema redesign
NO BEST_SINGLE tender snap as dwelling BOQ
NO invent 0 PLN on HOLD/GAP
```

---

## 12. Release hygiene

| | |
|--|--|
| Feature commit | **`669d2872117f5724e756d19e9f4aedfea34cb48d`** |
| Message | `feat(tenders): add dwelling-scoped multi-boq costing` |
| Range | `57b70041` → `669d2872` |
| Files | **14** (10 multi-boq + harness + 3 MOD) |
| `PayrollView.tsx` | **0 lines** · lokalny WIP **OUT** |
| Harness | `scripts/test-multi-boq-01.mjs` · **50/0** |

---

## 13. Regression (PIN @ MULTI-BOQ PV)

| Suite | Result |
|-------|--------|
| MULTI-BOQ-01 | **50/0** |
| MULTI-DWELLING-01 | **72/0** |
| OWNER-INPUT-01 | **115/0** |
| GO-1 | **62/0** |
| MODEL-1B | **64/0** |
| Transport-01 | **75/0** |
| Equipment-01 | **36/0** |
| C-MODE | **44/0 + 34/0** |
| COST-MULTI | **ALL PASS** |
| Payroll B4 | **13/0** |
| F0–F6 (indywidualnie) | **NOT RUN** w MULTI-BOQ PV |
| Payroll battery | **NOT RUN** w MULTI-BOQ PV |

> Nie zawyżać F0–F6 / battery jako PASS w tym tipie.

---

## 14. Key files

| Path | Rola |
|------|------|
| `src/lib/multi-boq/*` | resolve · compose · merge · attach · line-id · provenance |
| `src/app/MultiDwellingPackagePanel.tsx` | multi attach wire |
| `src/lib/multi-dwelling/{types,store}.ts` | costSnapshot / lineProvenance · rebind invalidate |
| `scripts/test-multi-boq-01.mjs` | harness T1–T23 |

---

## 15. Residual / NEXT

| | |
|--|--|
| **LIVE REAL TENDER TEST** | **NEXT** · **NIE wykonany** · prior real tender = **BLOCKED** na ingest/workspace |
| Slice B ingest / EXTERNAL cap | **OUT** tego close · tylko Owner GO |
| REAL SOURCE / LEGAL | **NOT IMPLEMENTED / UNKNOWN** · **nie** część MULTI-BOQ |
| Cloud Sync multi / OI | **FORBIDDEN** bez Owner GO → AUDIT |

**ACTIVE EPIC IMPLEMENT:** **NONE** po zamknięciu treści.

---

## 16. Verdict

**MULTI-BOQ-01 = CLOSED**
**PRODUCTION VERIFIED · GREEN**
**tip 2.66.43 / `669d2872`**
