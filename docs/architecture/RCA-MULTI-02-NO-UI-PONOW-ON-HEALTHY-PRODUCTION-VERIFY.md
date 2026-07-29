# RCA-MULTI-02 Force Heavy Rescan — PRODUCTION VERIFY

> **Fixture:** `08dee335-f338-1f30-ebd1-65000155122a`  
> **Expected tip:** **2.65.76**  
> **Data:** 2026-07-29

## VERIFY FAST (version.json)

| Check | Result |
|-------|--------|
| `version.json` | _wypełnić po push_ |
| Tip commit | _wypełnić po push_ |
| PRODUCTION STATUS | PENDING |

## Fixture checklist (manual / Playwright)

| ID | Expect | Result |
|----|--------|--------|
| P1 | version tip 2.65.76 | PENDING |
| P2 | Kosztorys AS-IS: CTA `data-force-heavy-rescan=1` widoczne (gdy brak sources/artifacts) | PENDING |
| P3 | Confirm → Heavy → arts≥2 · Bid mode AGGREGATE lub Bid ≫ 292k | PENDING |
| P4 | Odśwież: CTA znika · ONE Pensjonat w `kosztorys.sourceFilename` | PENDING |

## Notatki

PV live wymaga zalogowanego admina + czas Heavy (ZIP). Kod path zweryfikowany unit/integration (36 PASS).
