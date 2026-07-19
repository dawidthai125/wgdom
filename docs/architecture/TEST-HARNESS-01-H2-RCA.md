# TEST-HARNESS-01 H2 — RCA

> **Program:** TEST-HARNESS-01 · Slice **H2** · Jobs Production Sandbox  
> **Status:** AUDIT ONLY · **NIE implementować** bez Owner GO  
> **Data:** 2026-07-19  
> **Fundament:** H0 **RELEASED** · H1 **RELEASED** · [`TEST-HARNESS-01-DESIGN-FREEZE.md`](TEST-HARNESS-01-DESIGN-FREEZE.md)  
> **PLAN / DF / Review:** [`TEST-HARNESS-01-H2-PLAN.md`](TEST-HARNESS-01-H2-PLAN.md) · [`TEST-HARNESS-01-H2-DESIGN-FREEZE.md`](TEST-HARNESS-01-H2-DESIGN-FREEZE.md) · [`TEST-HARNESS-01-H2-ARCHITECTURE-REVIEW.md`](TEST-HARNESS-01-H2-ARCHITECTURE-REVIEW.md)  
> **Produkt (CLOSED, reuse assertów):** [`JOBS-PHOTOS-DELETE-SYNC-01-DESIGN-FREEZE.md`](JOBS-PHOTOS-DELETE-SYNC-01-DESIGN-FREEZE.md)

---

## 1. Objaw

Brak formalnego, bezpiecznego scenariusza produkcyjnego dla ścieżki Roboty:

```text
Create psb-job
  → Upload assets (photos)
  → Photo sync
  → Delete photo
  → Verify delete propagation
  → Cleanup
```

| Stan | Fakt |
|------|------|
| H0 | Foundation (`psb-*`, allowlist, mutate-guard, **PSB-001**) — **RELEASED** |
| H1 | Tender sandbox — **RELEASED** · wzorzec anti-wipe + hybrid KV+Playwright |
| H2 | `h2-jobs-photos` = **NOT IMPLEMENTED** (runner nie rejestruje) |
| Ad-hoc | `.tmp/jobs-photos-*-prod-smoke.mjs` — bez H0 guardrailów / Cleanup Guarantee |
| Lib smoke | `scripts/test-jobs-photos-delete-sync-01.mjs` — **unit/merge only**, nie prod E2E |

Stability sweep otwierał Roboty (shell), ale **nie** gwarantował write-path photos delete-propagation z PSB-001.

---

## 2. Root cause

| ID | Przyczyna |
|----|-----------|
| **RC-1** | H0/H1 pokrywają fundament + tender; brak scenariusza Jobs w harness |
| **RC-2** | Photos żyją w `kw-jobs` (`job.photos[]` + `deletedPhotoTombstones[]`) — mutacja bez mutate-guard = ryzyko realnych jobów |
| **RC-3** | Browser sync po login może **wyczyścić** świeży seed KV (lekcja H1) — bez hydrate LS `kw-jobs` seed ginie |
| **RC-4** | Delete bez weryfikacji `batch-get` + wait ≥ debounce sync (~2 s) nie łapie resurrection (historyczny bug JOBS-PHOTOS-DELETE-SYNC-01) |
| **RC-5** | Cleanup joba bez `kw-jobs-deleted-ids` → merge może przywrócić `psb-job-*` |
| **RC-6** | Storage blob orphan po delete photo — poza scope produktu (DF photos); harness musi **nie** wymagać blob delete do PASS |

---

## 3. Decyzja Ownera (wejście DF)

| Pytanie | Odpowiedź |
|---------|-----------|
| Zakres pipeline | create → upload → sync → delete → verify propagation → cleanup |
| Reuse | **Wyłącznie** H0 + wzorce H1 (`psb-*`, allowlist, mutate-guard, PSB-001) |
| Izolacja joba | **Always create** `psb-job-*` + pełny cleanup (jak H1 tender) |
| Lokalizacja docs | `docs/architecture/TEST-HARNESS-01-H2-*.md` |
| Produkt Core | **Zero** zmian — photos delete-sync już **CLOSED** na prod |

---

## 4. Co H2 **nie** rozwiązuje

- Ponowne otwieranie JOBS-PHOTOS-DELETE-SYNC-01 (produkt CLOSED)  
- Storage blob delete / housekeeping  
- `inspectorPhotos` / `workerReports` / materials / generic attachments  
- Payroll / PWRB / Edge / Protected Core  
- H0.x Persist Ledger (cross-process orphan) — nadal osobny backlog  
- H3–H5  

---

## 5. Werdykt RCA

| | |
|--|--|
| Problem | Brak H2 scenario na fundamencie H0 + wzorcach H1 |
| Klasa | Test-infra / ops safety · regresja photos delete-propagation |
| Priorytet | **P1** (write-path Jobs po H1) |
| Kierunek | Playwright + KV seed/cleanup **tylko** `psb-job-*` · reuse H0/H1 · zero Core |
| Status | **AUDIT COMPLETE** → PLAN / DESIGN FREEZE |

**NIE implementować** bez Owner GO `IMPLEMENT TEST-HARNESS-01 H2`.
