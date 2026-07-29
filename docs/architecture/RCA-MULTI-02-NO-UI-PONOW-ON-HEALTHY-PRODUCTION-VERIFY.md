# RCA-MULTI-02 Force Heavy Rescan — PRODUCTION VERIFY

> **Fixture:** `08dee335-f338-1f30-ebd1-65000155122a`  
> **Expected tip:** **2.65.76** · commit **`1e18374f`**  
> **Data:** 2026-07-29

## VERIFY FAST (version.json)

| Check | Result |
|-------|--------|
| `version.json` (jedno odczytanie) | `"version":"2.65.75"` · `"commit":"46fa589"` |
| Tip oczekiwany | **2.65.76** / `1e18374f` |
| PRODUCTION STATUS | **DEPLOY PROPAGATING** |

## Fixture checklist (manual / Playwright)

| ID | Expect | Result |
|----|--------|--------|
| P1 | version tip 2.65.76 | **BLOCKED** — tip jeszcze nie na CDN |
| P2 | Kosztorys AS-IS: CTA `data-force-heavy-rescan=1` | **PENDING** po tipie |
| P3 | Confirm → Heavy → arts≥2 · AGGREGATE | **PENDING** po tipie |
| P4 | Odśwież: CTA znika · ONE Pensjonat | **PENDING** po tipie |

## Notatki

- RELEASE GO = push `1e18374f` PASS + build/test PASS.
- PRODUCTION VERIFIED = nie — czeka na tip `2.65.76` w `version.json`.
- Kod path: unit/integration **36 PASS** (bez live Heavy na fixture).
