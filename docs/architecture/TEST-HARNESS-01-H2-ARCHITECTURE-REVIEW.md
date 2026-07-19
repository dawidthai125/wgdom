# TEST-HARNESS-01 H2 — ARCHITECTURE REVIEW

> **Status:** ARCHITECTURE REVIEW · AUDIT ONLY  
> **Data:** 2026-07-19  
> **Wejście:** [`TEST-HARNESS-01-H2-RCA.md`](TEST-HARNESS-01-H2-RCA.md) · [`TEST-HARNESS-01-H2-PLAN.md`](TEST-HARNESS-01-H2-PLAN.md) · [`TEST-HARNESS-01-H2-DESIGN-FREEZE.md`](TEST-HARNESS-01-H2-DESIGN-FREEZE.md)  
> **Fundament:** H0 + H1 **RELEASED** · [`TEST-HARNESS-01-DESIGN-FREEZE.md`](TEST-HARNESS-01-DESIGN-FREEZE.md)  
> **Produkt photos (CLOSED):** [`JOBS-PHOTOS-DELETE-SYNC-01-DESIGN-FREEZE.md`](JOBS-PHOTOS-DELETE-SYNC-01-DESIGN-FREEZE.md)

---

## 1. Werdykt

| Pytanie | Odpowiedź |
|---------|-----------|
| Czy DF H2 jest spójny z H0/H1? | **TAK** — ten sam model izolacji + anti-wipe H1 na `kw-jobs` |
| Always-create + cleanup? | **APPROVE** — najbezpieczniejszy model na prod |
| Czy pokrywa Owner pipeline? | **TAK** — create→upload→sync→delete→propagation→cleanup |
| Protected Core? | **NIE** przy D-H2-13 / #H2-010 — Path A / test-infra only |
| Czy produkt photos wymaga zmian? | **NIE** — delete-sync już CLOSED; H2 = regresja E2E |
| Czy wolno IMPLEMENT? | **NIE** — **BLOCK** do Owner GO |
| Residual risk | late UI batch-set vs cleanup · upload flake · brak H0.x cross-run ledger · storage orphans |

```text
REVIEW:  APPROVE DESIGN
         BLOCK IMPLEMENT
```

---

## 2. Architektura docelowa

```text
CLI --scenario h2-jobs-photos --allow-prod
        │
        ▼
┌───────────────────┐
│ H0 runner + H2    │
│ mutate-guard      │
│ CleanupTracker    │
└─────────┬─────────┘
          │
    ┌─────┴──────┐
    ▼            ▼
 Edge KV      Playwright
 batch-get/set  Jobs UI
 kw-jobs*       upload/delete
    │            │
    └─────┬──────┘
          ▼
   finally → cleanup
   (kw-jobs filter + kw-jobs-deleted-ids)
```

**Zakaz:** forowanie logiki `mergePhotos` / `mergePair` · zmiany Edge · mutacje payroll · blob GC jako hard PASS.

---

## 3. Bezpieczeństwo danych produkcyjnych

| Kontrola | Mechanizm |
|----------|-----------|
| Izolacja ID | `psb-job-*` only · mutate-guard |
| Brak replace `kw-jobs` | #H2-001 read-merge-append |
| Cleanup wymuszony | PSB-001 `finally` · exit 4 |
| Job tombstone | `kw-jobs-deleted-ids` (#H2-003) |
| Photo tombstone | produktowy `deletedPhotoTombstones[]` (obserwacja) |
| Dry-run | zero writes |
| Credentials | env only |
| Anti-wipe | #H2-014 LS hydrate po seed |

---

## 4. Determinism

| Źródło niedeterminizmu | Polityka DF |
|------------------------|-------------|
| Auto-sync debounce ~2 s | wait ≥ 3 s przed propagation assert |
| Watermark / UI timing | fixture file; bounded timeout |
| Storage CDN latency | URL presence, nie byte-compare |
| Sync icon | soft; SSOT = `batch-get` |
| Blob orphan | WARNING (#H2-007) |
| Multi-device concurrent | poza MVP H2 (jedna sesja Playwright) |

---

## 5. Zgodność z systemem

| Komponent | Rola w H2 |
|-----------|-----------|
| `kw-jobs` | seed + upload/delete verify + cleanup filter |
| `kw-jobs-deleted-ids` | tombstone cleanup joba |
| `job.photos[]` | upload assert |
| `job.deletedPhotoTombstones[]` | delete propagation assert |
| `uploadPhoto` / JobsView gallery | UI upload (obserwacja) |
| `removePhotoWithTombstone` | UI delete (obserwacja) |
| `mergePhotos` (cloud-sync) | runtime prod — **bez zmian** |
| H0 `CleanupTracker` | PSB-001 |
| H1 anti-wipe | obowiązkowy wzorzec na `kw-jobs` |

---

## 6. Threat model (skrót)

| Threat | Sev | Kontrola |
|--------|-----|----------|
| Usunięcie / nadpisanie realnego joba | Critical | mutate-guard + psb-only + always-create |
| Przywrócenie joba po cleanup bez tombstone | High | #H2-003 |
| Fałszywy PASS przy resurrection | High | #H2-005 / #H2-006 / D-H2-10 |
| Wipe seed przez browser sync | High | #H2-014 |
| Leak credentials w report | High | env · gitignore out |
| Regresja merge photos przez „fix w Core” | Critical | #H2-010 — zakaz |
| Deadlock batch-set | Medium | N1 na prod; nie dual-writer |

---

## 7. Relacja do JOBS-PHOTOS-DELETE-SYNC-01

| | |
|--|--|
| Produkt | **CLOSED** — tombstone merge na prod |
| H2 | **Harness regresji** ścieżki write na sandbox job |
| Zakaz | Ponowne patchowanie `cloud-sync` / `job-photos.ts` „przy okazji H2” |
| Lib smoke | `test-jobs-photos-delete-sync-01.mjs` zostaje — **uzupełnia**, nie zastępuje H2 |

---

## 8. Open questions (nie blokują DF)

| # | Pytanie | Default DF |
|---|---------|------------|
| Q1 | Admin vs Worker upload? | Admin MVP |
| Q2 | Czy wymagać 2 urządzeń (multi-tab)? | NIE w H2 MVP |
| Q3 | Czy H4 Cloud najpierw? | NIE — Owner GO na H2 |
| Q4 | Persist Ledger H0.x? | NIE blokuje H2 |

---

## 9. Rekomendacje

| Priorytet | Akcja |
|-----------|--------|
| P0 | Owner GO → IMPLEMENT H2 only |
| P0 | Trzymać D-H2-13 / #H2-010 (zero Core) |
| P0 | Skopiować anti-wipe H1 1:1 na `kw-jobs` |
| P1 | Cleanup retry jak H1 (late UI push) |
| P2 | H0.x jeśli kill mid-run na prod Jobs stanie się częsty |
| P2 | H3 dopiero po zielonym H2 |

---

## 10. Podsumowanie dla Ownera

H2 na always-create `psb-job-*` + H0 Cleanup Guarantee + wzorzec anti-wipe H1 jest **architektonicznie poprawny** i bezpieczny względem prod. Nie zmienia produktu photos (już CLOSED) — dodaje **produkcyjny E2E sandbox** dla upload/sync/delete/propagation.

```text
APPROVE DESIGN
BLOCK IMPLEMENT
```

**NIE implementować. NIE commitować. NIE pushować.**  
Czekaj na Owner GO: `IMPLEMENT TEST-HARNESS-01 H2`.
