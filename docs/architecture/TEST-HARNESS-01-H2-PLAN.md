# TEST-HARNESS-01 H2 — PLAN

> **Status:** PLAN ONLY · **NIE implementować** bez Owner GO  
> **Data:** 2026-07-19  
> **RCA:** [`TEST-HARNESS-01-H2-RCA.md`](TEST-HARNESS-01-H2-RCA.md)  
> **Design Freeze:** [`TEST-HARNESS-01-H2-DESIGN-FREEZE.md`](TEST-HARNESS-01-H2-DESIGN-FREEZE.md)

---

## 1. Cel

Scenariusz **`h2-jobs-photos`** w Production Sandbox Harness:

```text
Create psb-job
  → Upload N photos (fixture assets)
  → Photo sync (persist verify)
  → Delete M photos (tombstone path)
  → Verify delete propagation (no resurrection)
  → Cleanup (PASS i FAIL)
```

Wyłącznie mechanizmy H0 + wzorce H1: `psb-*` · allowlist · mutate-guard · **PSB-001 Cleanup Guarantee** · anti-wipe (login → settle → seed → LS hydrate).

---

## 2. Zakres

### 2.1 IN

| Element | Opis |
|---------|------|
| `scenarios/h2-jobs-photos.mjs` | Orchestracja kroków |
| `job-helpers.mjs` (nowy) | `buildSandboxJob` · merge-append `kw-jobs` · cleanup + `kw-jobs-deleted-ids` |
| Fixture image(s) | mały JPEG/PNG w `fixtures/` (deterministyczny; bez EXIF PII) |
| Seed | Always-create: `batch-get kw-jobs` → append job `psb-job-*` → `batch-set` **tylko** po `assertWritable` |
| UI drive | Playwright: login → settle → hydrate LS → Roboty → open `psb-*` → upload → delete |
| Asserty | DF AC (FAIL vs WARNING) · tombstone parity w `batch-get` |
| Propagation | wait ≥ sync debounce (~2–5 s) + re-fetch KV · opcjonalnie soft F5 |
| Cleanup | usuń job z `kw-jobs` **oraz** append `kw-jobs-deleted-ids` · tracker H0 |
| Manifest | suite `prod-sandbox-h2` · `PROD-SANDBOX-H2` · **nie** w gate B/C |
| Auth | env credentials only |

### 2.2 OUT

| Temat | Powód |
|-------|--------|
| Zmiany `cloud-sync` / `job-photos.ts` / Edge / App | Protected Core / produkt CLOSED |
| Mutacja realnych jobów / allowlist-only bez create | Owner: always-create |
| Blob storage delete | backlog produktu |
| `inspectorPhotos` / reports / materials / jobAttachments | poza H2 |
| Payroll / H3 | osobny slice |
| H0.x Persist Ledger | osobny GO |
| Hard-fail na watermark/slow upload timing | flake → WARNING gdzie DF pozwala |

---

## 3. Fazy IMPLEMENT (po GO)

```text
H2.0  Wiring: runner rejestruje h2-jobs-photos + --allow-prod gate
H2.1  job-helpers: seed merge-append + cleanup + tombstone jobs-deleted-ids (dry-run)
H2.2  Playwright: upload N fixture photos + sync assert (batch-get URLs)
H2.3  Delete M + propagation wait + tombstone parity assert
H2.4  Full AC + report + manifest + docs closeout
```

**Rekomendacja:** jeden bundle = tylko H2 (#CORE-013 / #PSB-010). Nie łączyć z H3/H0.x.

---

## 4. Przepływ (target)

```text
preflight H0 modules
  → require --allow-prod
  → dry-run? → plan steps, zero batch-set / UI write
  → Playwright login + settle (~5s)
  → makePsbId("job") + session.registerCreated
  → mutateGuard.assertWritable
  → cleanup.track(job, cleaner)
  → seed kw-jobs (merge-append)
  → hydrate localStorage kw-jobs from cloud   ← anti-wipe H1 pattern
  → navigate Roboty / open psb-job
  → upload N photos (setInputFiles / gallery)
  → wait sync · batch-get: N photos present
  → delete M photos (UI → removePhotoWithTombstone path)
  → wait ≥ debounce · batch-get: M tombstones · M ids absent from photos[]
  → (optional) soft reload · re-assert no resurrection
  → finally → cleanup job + kw-jobs-deleted-ids
  → report scenarioStatus + cleanupStatus
```

---

## 5. Mapowanie na produkt (read-only)

| Krok harness | Mechanizm prod (bez zmian kodu) |
|--------------|----------------------------------|
| Upload | `uploadPhoto` → storage-upload → `photos[]` |
| Sync | `kw-jobs` batch-set / auto-sync |
| Delete | `removePhotoWithTombstone` → `deletedPhotoTombstones[]` |
| Propagation | `mergePhotos(..., tombstones)` w `cloud-sync` (już CLOSED) |
| Job cleanup | filter `kw-jobs` + `kw-jobs-deleted-ids` |

Lib regression (już istnieje, **nie** zastępuje H2): `scripts/test-jobs-photos-delete-sync-01.mjs`.

---

## 6. Test / release (po IMPLEMENT)

| Gate | Komenda |
|------|---------|
| Dry-run | `npm run test:prod-sandbox -- --scenario h2-jobs-photos --dry-run` |
| Live | `… --scenario h2-jobs-photos --allow-prod` |
| Manifest | `npm run test:infra -- --suite prod-sandbox-h2` (manual) |
| Regression | `h0-preflight` + `h1-tender --allow-prod` (Owner) |
| Build | `npm run build` (sanity; tooling-only) |

---

## 7. Ryzyka

| Ryzyko | Mitygacja DF |
|--------|----------------|
| Wipe seed po login | H1 order: settle → seed → LS hydrate |
| Resurrection po delete | wait + batch-get tombstone parity (#H2-005) |
| Late UI batch-set vs cleanup | cleanup retry (jak H1) |
| Watermark / camera UI flake | fixture file input; bounded timeout |
| Storage orphan | WARNING / not FAIL (#H2-007) |
| Touch real job | mutate-guard + always `psb-job-*` |

---

## 8. Deliverables IMPLEMENT

| Artefakt | |
|----------|--|
| Kod | `h2-jobs-photos.mjs` · `job-helpers.mjs` · fixture(s) · runner/manifest/README |
| Docs | IMPLEMENTATION-REPORT · BUILD-TEST-RELEASE · FINAL VERIFICATION (po Owner) |
| Zakaz | CHANGELOG / UI version bump · Protected Core |

---

## 9. Status

**PLAN COMPLETE** · **BLOCK IMPLEMENT** do Owner GO.

**NIE implementować. NIE commitować. NIE pushować** w tej sesji AUDIT.
