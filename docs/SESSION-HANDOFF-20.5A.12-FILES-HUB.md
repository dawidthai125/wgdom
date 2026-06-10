# Sprint 20.5A.12 — Files Hub Consolidation (handoff dla AI)

> **Hasło:** „kontynuuj WGDOM” → [`CURRENT-TASK.md`](../CURRENT-TASK.md) · [`AGENTS.md`](../AGENTS.md) · [`PROJECT-HANDOFF.md`](PROJECT-HANDOFF.md)

---

## Stan prod (2026-06-09)

| Pole | Wartość |
|------|---------|
| **Wersja UI** | **v2.50.58** |
| **Commit feature** | **`211364b`** — `feat(files): Files Hub consolidation with unified file counters (20.5A.12)` |
| **Commit docs** | **`3d1cc33`** — handoff + prod smoke markers |
| **Deploy** | **`4999362359`** — **SUCCESS** |
| **Production** | https://www.wgdom.fun · https://www.wgdom.online |
| **Poprzedni release** | 2.50.57 · `c983b9c` (20.5B.6A.4 Worker Mobile UX) |
| **CI Mobile** | run `27252163593` — **SUCCESS** |

**Status sprintu:** **CLOSED / RELEASED**

**Raport release:** [`RELEASE-REPORT-20.5A.12.md`](RELEASE-REPORT-20.5A.12.md)

---

## Problem biznesowy (audyt 20.5A.12)

Przed sprintem zakładka **Roboty → Pliki** pokazywała głównie `jobFiles[]` (zlecenie, kosztorys, plan). **Dokumentacja ekipy** (`workerReports[]`) i **załączniki ogólne** (`jobAttachments[]`) były rozproszone — admin musiał przeskakiwać między tabami / sekcjami. Liczniki „Pliki (N)” były niespójne między Roboty, Media, nawigacją i `JobAllFilesView`.

**Werdykt audytu:** GO — warstwa prezentacji UI-only, **bez migracji danych**.

---

## Decyzja architektoniczna

| Aspekt | Decyzja |
|--------|---------|
| Model danych | **Bez zmian** — `jobFiles[]`, `workerReports[]`, `jobAttachments[]`, `documents{}` |
| Sync / KV / Edge | **Bez zmian** — nie dotykać `cloud-sync.ts`, `mergeJobsById` |
| SSOT liczników | **`countFilesHubItems(job)`** w `files-hub-index.ts` |
| Checklista odbiorowa | Sekcja **informacyjna** (X/9) — **nie** wliczana do licznika |
| Zdjęcia | Tab **Zdjęcia** osobno — **nie** wliczane do hub count |
| ZIP / email | Bez zmian — Dokumenty ZIP / Załączniki ZIP / Galeria osobno |
| PDF dokumentacji | **Stub** `worker-report-pdf.ts` — sprint **20.5A.12C** |

---

## Files Hub — struktura UI

```text
Pliki (Roboty → tab Pliki)
│
├─ Dokumenty kontraktowe          jobFiles[]
│     Zlecenie · Kosztorys · Plan techniczny
│     (upload/delete admin — bez zmian vs 20.5A.8/9)
│
├─ Dokumentacja robót               workerReports[]
│     Wpisy wirtualne „Dokumentacja robót #N”
│     CTA „Przejdź do dokumentacji” → tab Dokumentacja
│
├─ Załączniki ogólne                jobAttachments[]
│     Pełna sekcja admin (embedded JobGenericAttachmentsSection)
│     Media → read-only lista + link „Otwórz robotę”
│
└─ Checklista odbiorowa             documents{} (checkboxy)
      Tylko podsumowanie X/9 + „Przejdź do dokumentów”
```

**Komponent UI:** `src/app/JobFilesHub.tsx`  
**Tryby:** `mode="full"` (Roboty, upload) · `mode="readonly"` (Media)

---

## SSOT liczników — `files-hub-index.ts`

```typescript
countFilesHubItems(job) =
  jobFiles[] (aktywne, bez tombstone)
  + workerReports[].length
  + jobAttachments[] (aktywne, bez tombstone)

// NIE wlicza: photos[], documents{}, checklista
```

| Funkcja | Rola |
|---------|------|
| `countFilesHubItems(job)` | Licznik per robota — **SSOT** |
| `countAllFilesHubItems(jobs)` | Suma globalna (Media nagłówek, JobAllFilesView) |
| `jobHasFilesHubContent(job)` | Filtr „roboty z plikami” |
| `summarizeFilesHub(job)` | `{ contract, reports, attachments, total }` |
| `collectFilesHubContractItems` | Delegacja → `collectJobFileCatalog` |
| `collectFilesHubReportItems` | Wpisy wirtualne z `workerReports[]` |
| `collectFilesHubAttachmentItems` | Delegacja → `collectActiveJobAttachments` |
| `getFilesHubChecklistSummary` | `{ checked, total }` z `documents{}` |

---

## Mapa liczników (po 12B + 12B.1-min)

| Miejsce w UI | Funkcja / źródło |
|--------------|------------------|
| Roboty → tab **Pliki (N)** | `countFilesHubItems(selectedJob)` |
| Roboty → **JobListCard** badge | hub count |
| Media → tab **Pliki (N)** | `countAllFilesHubItems(jobs)` |
| Media → **JobFilesBrowser** per job | `countFilesHubItems(job)` |
| Admin nav badge **Media** | images + hub (admin-nav.ts) |
| **JobAllFilesView** nagłówek „Pliki (N)” | `countAllFilesHubItems(jobs)` — **12B.1-min** |
| **JobAllFilesView** kafle / expand | **12B.1-full (v2.50.62)** — `groupHubContentByJob()`, 3 warstwy hub |

### Status serii 20.5A.12

**COMPLETE** — 12A + 12B + 12B.1-min + **12B.1-full** + 12C (PDF).

---

## Kluczowe pliki

| Plik | Rola |
|------|------|
| `src/lib/files-hub-index.ts` | Agregacja + liczniki SSOT |
| `src/app/JobFilesHub.tsx` | UI 4 sekcji hub |
| `src/app/JobsView.tsx` | Integracja hub w tab Pliki |
| `src/app/JobFilesBrowser.tsx` | Media — read-only hub |
| `src/app/MediaView.tsx` | Liczniki tab Pliki |
| `src/app/JobAllFilesView.tsx` | 12B.1-min — nagłówek hub |
| `src/app/JobGenericAttachmentsSection.tsx` | Prop `embedded` dla hub |
| `src/lib/job-files-index.ts` | `countJobFiles` → delegacja hub |
| `src/lib/job-files-browser.ts` | `countBrowserFiles` → delegacja hub |
| `src/app/admin/admin-nav.ts` | Badge Media = images + hub |
| `src/lib/worker-report-pdf.ts` | Stub PDF (12C) — `throw` bez pdfMake |

**Powiązane (nie zmieniane w 12, czytaj przy regresji):**

- `src/lib/media-separation.ts` — obrazy vs dokumenty
- `src/lib/job-attachments.ts` + `job-attachments-pack.ts` — załączniki ogólne
- `src/lib/job-documents.ts` — typy kontraktowe, checklista
- [`SESSION-HANDOFF-20.5A.10-GENERIC-ATTACHMENTS.md`](SESSION-HANDOFF-20.5A.10-GENERIC-ATTACHMENTS.md) — trzy warstwy plików

---

## Przebieg sesji (AUDIT → IMPLEMENT → RELEASE)

| Etap | Opis | Werdykt |
|------|------|---------|
| **AUDIT 20.5A.12** | READ ONLY — luka UX: brak workerReports w Pliki | **GO** |
| **IMPLEMENT 12A** | `JobFilesHub.tsx` + integracja JobsView | Done |
| **IMPLEMENT 12B** | Ujednolicone liczniki SSOT | Done |
| **AUDIT counters** | JobAllFilesView nagłówek ≠ przycisk Pliki | **CONDITIONAL** |
| **PATCH 12B.1-min** | Tylko `JobAllFilesView` nagłówek → hub | Done |
| **RELEASE 2.50.58** | commit `211364b`, deploy `4999362359` | **GO** |
| **Version Awareness** | Pierwszy realny test 20.5B.7 na prod (manual) | Do potwierdzenia w przeglądarce |

---

## Smoke testy

### Lokalne (pre-release)

```bash
npm run build
npx vite-node scripts/smoke-test-files-hub-20.5a12.mjs
npx vite-node scripts/smoke-test-media-separation-20.5a8.mjs
npx vite-node scripts/smoke-test-technical-drawing-20.5a9.mjs
npx vite-node scripts/smoke-test-generic-attachments-20.5a10.mjs
npx vite-node scripts/smoke-test-job-documentation-labels-20.5b6a.mjs
npx vite-node scripts/smoke-test-jobs-2.0-midb.mjs
npx vite-node scripts/smoke-test-app-version-check-20.5b7.mjs
```

### Prod

```bash
node scripts/smoke-prod-bundle-2.50.58.mjs
```

**Markery prod:** user-visible strings (Dokumenty kontraktowe, Dokumentacja robót, chunk `JobFilesHub`). Nazwy funkcji (`countFilesHubItems`) są minifikowane — opcjonalne markery, nie blokują release.

---

## NIE zmieniaj bez polecenia

- `cloud-sync.ts`, `mergeJobsById`, KV keys
- Model `workerReports[]`, `jobFiles[]`, `jobAttachments[]`
- `media-separation.ts` — separacja obrazów
- Tombstone merge 20.5B.3 / 20.5A.10
- Billing sync, payroll, Version Awareness auto-reload (20.5B.7C poza zakresem)
- Semantyka ZIP/email — osobne paczki per warstwa

---

## Backlog

| ID | Opis |
|----|------|
| **20.5A.12B.1-full** | **DONE** v2.50.62 — kafle `JobAllFilesView` hub-aligned |
| **20.5A.12C** | **DONE** v2.50.61 — Worker Report PDF Export |

---

## Szybki start dla następnego agenta

1. [`CURRENT-TASK.md`](../CURRENT-TASK.md) — baseline **2.50.58**
2. Ten plik + [`RELEASE-REPORT-20.5A.12.md`](RELEASE-REPORT-20.5A.12.md)
3. [`ARCHITECTURE.md`](ARCHITECTURE.md) § 12.1.2 Files Hub
4. Przy pracy nad plikami: [`SESSION-HANDOFF-20.5A.10-GENERIC-ATTACHMENTS.md`](SESSION-HANDOFF-20.5A.10-GENERIC-ATTACHMENTS.md)
5. Przy licznikach: **zawsze** `countFilesHubItems()` — nie licz ręcznie tablic
