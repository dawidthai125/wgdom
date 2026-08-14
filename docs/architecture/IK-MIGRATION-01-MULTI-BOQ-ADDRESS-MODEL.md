# IK-MIGRATION-01 — MULTI-BOQ / ADDRESS MODEL

> **ID:** `IK-MIGRATION-01-MULTI-BOQ-ADDRESS-MODEL`  
> **STATUS:** P0 FROZEN  
> **Parent:** [`IK-MIGRATION-01-DESIGN-FREEZE.md`](./IK-MIGRATION-01-DESIGN-FREEZE.md)  
> **REUSE SSOT:** [`MULTI-DWELLING-01-CLOSEOUT.md`](./MULTI-DWELLING-01-CLOSEOUT.md) · [`MULTI-BOQ-01-CLOSEOUT.md`](./MULTI-BOQ-01-CLOSEOUT.md) · [`INGEST-01-CLOSEOUT.md`](./INGEST-01-CLOSEOUT.md)  
> **Data:** 2026-08-15

```text
NIE buduj drugiego modelu mieszkań / drugiego Bid.
REUSE package + compose + PackageGate + SUM.
IK orkiestruje i pilnuje lineage + SUM w EC.
```

---

## 1. Wymagane kształty (MUST SUPPORT)

1. 1 przetarg → 1 przedmiar  
2. 1 przetarg → wiele przedmiarów  
3. 1 przedmiar → wiele branż  
4. wiele przedmiarów → wiele branż  
5. 1 przetarg → wiele mieszkań / adresów  
6. 1 przedmiar → wiele mieszkań (Owner map / split — **nie invent**)  
7. wiele przedmiarów → wiele mieszkań  

Przykład ZZK pustostany:

```text
TENDER
├── Mieszkanie A  (dwellingId)
│   ├── budowlane
│   ├── elektryczne
│   └── sanitarne
├── Mieszkanie B
└── Mieszkanie C
```

**FORBIDDEN:** spłaszczenie do jednej listy **bez** lineage.

---

## 2. Identity SSOT (już w kodzie)

| Entity | Key | Path |
|--------|-----|------|
| Tender | `tenderId` | pipeline item |
| Dwelling / adres | `dwellingId` Owner-confirmed | `multi-dwelling/types.ts` |
| Document | `documentId` + `contentHash` | ingest registry |
| Owner map | `documentToDwelling[documentId]=dwellingId` | `multi-dwelling/store.ts` |
| Line (legacy) | `buildOfferBoqLineId` | `tender-offer-boq.ts` |
| Line (multi) | `buildOfferBoqLineIdWithSource` | `multi-boq/line-id.ts` |
| Provenance | `lineProvenance[lineId]` | `DwellingLineProvenance` |

`documentId === dwellingId` → **REJECTED** (MULTI-BOQ DF).  
Filename / LP / kolejność uploadu **≠** dwelling SSOT.

---

## 3. Lineage minimum per pozycja

Freeze: każda linia kosztorysowa IK musi dać się odtworzyć z:

| Pole | Źródło istniejące |
|------|-------------------|
| `tenderId` | snapshot / OfferBoq |
| `sourceDocument` | `sourceDocumentId` (+ filename z registry) |
| `sourcePage` / sheet | jeśli parser daje; else `null` + nie udawać |
| `sourcePositionNumber` | `lp` / `sourceLineKey` / `indexInSourceDoc` |
| `description` | linia |
| `quantity` / `unit` | linia |
| `object/address` | `dwellingId` |
| `branch` | `branchHint` (`BranchCode` \| `unknown`) |
| `identity` | `catalogWorkId` + matchMethod (F5) |
| `classification` | Gate (P3+) |
| `status` | READY / GAP / HOLD |

ATH unit prices na snapshot **nie** są Bid SSOT (C-MODE-1a).

---

## 4. Master / Normalized BOQ

```text
legacy_single:
  resolveKosztorysSnapshotForPricing(item)
  → buildOfferBoqFromSnapshot
  → F5 → Bid
  KEEP UNCHANGED

mode=multi (Owner opt-in):
  documentToDwelling HARD
  → resolveDwellingCostSnapshotForPricing
  → composeDwellingOfferBoq
  → OfferBoq v5 + lineProvenance side-map
  → attachComposedBoqToDwelling
  → F5_D per dwelling
  → PackageGate
  → PackageDirect = SUM(DwellingDirect)
  → computeTenderBidProposal
```

Libs: `src/lib/multi-dwelling/*`, `src/lib/multi-boq/*`, UI `MultiDwellingPackagePanel`.  
LS: `kw-multi-dwelling-package-v1` (local, nie Cloud).  
COST-MULTI (`cost-multi-*`) = **warstwa branży / branch**, **≠** dwelling — nie mylić.

IK nie tworzy `OfferBoq v6`. Compose + side-map = Master BOQ.

---

## 5. SUM contract (LOCKED)

```text
TOTAL_TENDER = SUM(DwellingDirect)     // PackageGate pass
DwellingDirect = SUM(position costs in dwelling OfferBoq)  // F5_D
Jeżeli branże w modelu dwelling:
  SUM(branch) = DwellingDirect
```

Mismatch (np. 79400 vs 78950) = **NO-GO** Gate B.  
Determinizm: ten sam snapshot + catalog revision → ten sam TOTAL.

`aggregatePackageDirect` — `src/lib/multi-dwelling/orchestration.ts`.

---

## 6. Owner vs IK

| Kto | Co |
|-----|-----|
| Document Expert (IK) | znajduje N przedmiarów, proponuje branżę/adres **jako hint** |
| Owner | `documentToDwelling`, `expectedDwellingCount`, mode=multi |
| IK | **nie** zgaduje mieszkania z nazwy pliku jako SSOT |

Bez mapy przy wielu lokalach: status **unassigned HOLD** na lineage adresu — nie silent flatten.

---

## 7. Pricing path

Labor/Material/F5 działają **per linia** w OfferBoq dwelling (lub legacy_single).  
TOTAL z PackageGate, nie z osobnego „IK totaler”.

---

## 8. STOP

Nowy „AddressModule” = FORBIDDEN. Braki lineage (page/sheet) = PARTIAL w EC, nie nowy parser w P1.
