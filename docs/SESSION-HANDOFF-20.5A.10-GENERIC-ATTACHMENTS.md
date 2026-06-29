# Sprint 20.5A.10 — Generic File Attachments (handoff deweloperski)

> **Hasło:** „kontynuuj WGDOM” → [`CURRENT-TASK.md`](../CURRENT-TASK.md) · [`AGENTS.md`](../AGENTS.md) · [`PROJECT-HANDOFF.md`](PROJECT-HANDOFF.md)

---

## Stan prod (2026-06-09)

| Pole | Wartość |
|------|---------|
| **Wersja UI** | **v2.50.52** |
| **Commit** | **`e6758e5`** — `feat(jobs): generic file attachments with tombstone sync (20.5A.10)` |
| **Deploy** | GitHub **`4994803137`** — **SUCCESS** |
| **Production** | https://www.wgdom.fun · https://www.wgdom.online |
| **Poprzedni release** | 2.50.51 · `09a8284` (20.5B.3 File Consistency) |
| **CI Mobile** | run `27230293447` — **SUCCESS** |

**Status sprintu:** **CLOSED / RELEASED**

---

## Decyzja architektoniczna (audyt 20.5A.10)

**Wariant B — osobne tablice, NIE rozszerzać `jobFiles[]`.**

| Aspekt | Decyzja |
|--------|---------|
| Model | `jobAttachments[]` + `deletedJobAttachmentTombstones[]` na `Job` |
| Kontrakt | `jobFiles[]` — zlecenie, kosztorys, plan_techniczny (**bez zmian**) |
| Obrazy | Tylko tab **Zdjęcia** — JPG/PNG **zablokowane** w załącznikach ogólnych |
| Sync | Tombstone merge w `mergeJobsById` — wzorzec **20.5B.3** |
| Edge / KV | **Brak migracji**, brak zmian Edge Functions |
| Upload/delete | **Tylko admin** w `JobsView` — inspektor **nie widzi** sekcji ogólnych |

---

## Trzy warstwy plików na robocie (★ czytaj na start)

```text
┌─────────────────────────────────────────────────────────────────┐
│  jobFiles[]              — DOKUMENTY KONTRAKTOWE (20.5A.8/9)   │
│  kind: zlecenie | kosztorys | plan_techniczny                   │
│  deletedJobFileTombstones[] — spójność 20.5B.3                  │
├─────────────────────────────────────────────────────────────────┤
│  jobAttachments[]        — ZAŁĄCZNIKI OGÓLNE (20.5A.10) ★     │
│  deletedJobAttachmentTombstones[]                                 │
├─────────────────────────────────────────────────────────────────┤
│  photos[] + inspectorPhotos[] + workerReports[].sketch          │
│  — OBRAZY (tab Zdjęcia, media-separation.ts)                    │
└─────────────────────────────────────────────────────────────────┘
```

**Single source of truth separacji:** `src/lib/media-separation.ts`

- `collectJobDocuments()` → tylko `jobFiles[]` (nie `jobAttachments`)
- `collectJobImages()` → zdjęcia ekipy, inspektora, rysunki raportów
- `collectActiveJobAttachments()` → tylko `jobAttachments[]` minus tombstone

---

## Model danych

### `JobAttachment` (`src/lib/job-attachments.ts`)

```typescript
interface JobAttachment {
  id: string;
  filename: string;
  path: string;
  publicUrl: string;
  mimeType?: string;
  uploadedBy: string;
  uploadedAt: string;
  label?: string;
  category?: string;
  sizeBytes?: number;  // UI only
}
```

### `JobAttachmentTombstone`

```typescript
interface JobAttachmentTombstone {
  attachmentId: string;
  filename?: string;
  deletedAt: string;
  deletedBy?: string;
  reason?: "delete";
}
```

Pola na `Job` w `src/app/app-domain.ts`:

- `jobAttachments?: JobAttachment[]`
- `deletedJobAttachmentTombstones?: JobAttachmentTombstone[]`

---

## Kluczowe pliki

| Plik | Rola |
|------|------|
| `src/lib/job-attachments.ts` | Typy, walidacja MIME/25MB, merge/tombstone helpers |
| `src/lib/job-attachment-upload.ts` | `uploadJobAttachment()` → `storage-upload` |
| `src/lib/job-attachments-pack.ts` | `collectJobAttachmentPackEntries`, `downloadJobAttachmentsZip` |
| `src/lib/cloud-sync.ts` | `mergeJobsById` — merge attachments + tombstones |
| `src/app/JobGenericAttachmentsSection.tsx` | UI sekcji „Załączniki ogólne” (admin) |
| `src/app/JobsView.tsx` | Montuje sekcję pod dokumentami kontraktowymi |
| `src/app/JobFilesEmailModal.tsx` | Grupy: Dokumenty kontraktowe / Załączniki ogólne |
| `src/app/JobInspectorFilesPanel.tsx` | `InspectorFileItem` + `genericAttachments` prop |
| `src/app/JobFilePreviewModal.tsx` | Preview `jobAttachment`: PDF/DOCX/XLSX |
| `scripts/smoke-test-generic-attachments-20.5a10.mjs` | Smoke T1–T20 |

**Powiązane (nie zmieniaj bez polecenia):**

| Plik | Rola |
|------|------|
| `src/lib/job-documents.ts` | `jobFiles[]`, tombstone kontraktowych |
| `src/lib/media-separation.ts` | Separacja obrazów vs dokumentów kontraktowych |
| `src/lib/job-documents-pack.ts` | **Dokumenty ZIP** — tylko `collectJobDocuments()` |
| `src/lib/job-file-upload.ts` | Upload/delete storage (reuse dla attachments) |

---

## UI — Roboty → Pliki (`JobsView`, `detailSection === "files"`)

```text
┌─ Pliki roboty ─────────────────────────────────────┐
│  [Dokumenty ZIP]                                    │
│  Upload: zlecenie | kosztorys | plan techniczny     │  ← jobFiles (bez zmian)
│  JobFileCatalogList                                 │
│  JobInspectorFilesPanel — email zaznaczonych         │  ← jobFiles + inspectorPhotos
├─ Załączniki ogólne ────────────────────────────────┤  ← 20.5A.10 ★
│  [Załączniki ZIP]                                   │
│  [Dodaj załącznik] — admin only                     │
│  Lista: nazwa · autor · data · rozmiar              │
│  Podgląd | Pobierz | Usuń                           │
└─────────────────────────────────────────────────────┘
```

**Inspektor (`InspectorPanel`):** widzi tylko `JobInspectorFilesPanel` (kontrakt + zdjęcia inspektora, read-only). **Brak** `JobGenericAttachmentsSection`.

---

## Upload / storage / delete

### Dozwolone

PDF, DOC, DOCX, XLS, XLSX, ZIP, RAR, DWG, TXT — max **25 MB**

### Zablokowane

JPG, JPEG, PNG, WEBP, GIF oraz dowolny `image/*`

### Storage (bez zmian Edge)

- Endpoint: `POST /storage-upload` (istniejący)
- Logiczny namespace: `jobs/{jobId}/attachments-{timestamp}-{safeName}`
- Helper: `buildJobAttachmentStorageFilename()`
- Delete: `deleteJobAttachmentStorage()` → best-effort `deleteJobFile(path)`

### Flow delete

1. Confirm UI
2. `void deleteJobAttachmentStorage(attachment)` — best-effort
3. `removeJobAttachmentWithTombstone(job, id, { deletedBy })`
4. `updateJob` + activity log
5. Sync przez `kw-jobs` (push standardowy)

---

## Sync / merge (`mergeJobsById`)

Wzorzec **identyczny z 20.5B.3** dla `jobFiles`:

| Helper | Rola |
|--------|------|
| `mergeJobAttachmentTombstones(a, b)` | Union po `attachmentId`, LWW po `deletedAt` |
| `filterJobAttachmentsByTombstones(attachments, tombstones)` | Usuwa martwe wpisy |
| `mergeJobAttachments(a, b, tombstones)` | Union po `id`, LWW po `uploadedAt` |

**Gdy `updatedAt` różne:** wygrywa tablica strony z nowszym `updatedAt`, tombstone z obu stron merged.  
**Gdy `updatedAt` równe:** full union + tombstone filter.

**Nie zmieniaj** bez audytu: logika `mergeJobFiles`, Payroll Guard, bootstrap merge.

---

## Email plików (`JobFilesEmailModal`)

| Grupa | Domyślnie | Źródło |
|-------|-----------|--------|
| ☑ Dokumenty kontraktowe | **włączone** | `items: InspectorFileItem[]` (zaznaczone w panelu) |
| ☐ Załączniki ogólne | wyłączone | `genericAttachments: JobAttachment[]` (wszystkie aktywne) |

- Endpoint: `POST /send-job-files-email` — **bez zmian API**
- Activity log: `Wysłano pliki inspektora na {email}` + `(+ N załączników)` gdy dołączono ogólne

---

## ZIP

| Przycisk | Helper | Zawartość |
|----------|--------|-----------|
| **Dokumenty ZIP** | `downloadJobDocumentsPack()` | `zlecenie/`, `kosztorys/`, `plan-techniczny/` |
| **Załączniki ZIP** | `downloadJobAttachmentsZip()` | `zalaczniki/plik.pdf`, … |

**Brak mieszania** między ZIP-ami.

---

## Preview (`JobFilePreviewModal`)

| Typ | Podgląd |
|-----|---------|
| PDF | iframe z `publicUrl` |
| DOCX | `extractDocxText` |
| XLSX | `parseDocumentToKosztorys` |
| DWG, ZIP, RAR | „Brak podglądu — pobierz plik.” (brak przycisku Podgląd w liście) |
| DOC, TXT | pobierz only |

`InspectorFileItem`: `{ kind: "jobAttachment"; file: JobAttachment }`

---

## Smoke / regresja

```bash
# Sprint 20.5A.10
npx vite-node scripts/smoke-test-generic-attachments-20.5a10.mjs

# Regresja (obowiązkowa przy zmianach w Roboty/pliki/sync)
npx vite-node scripts/smoke-test-media-separation-20.5a8.mjs
npx vite-node scripts/smoke-test-technical-drawing-20.5a9.mjs
npx vite-node scripts/smoke-test-inspector-admin-simplification-20.5b2.mjs
npx vite-node scripts/smoke-test-job-file-consistency-20.5b3.mjs
npm run build
```

| Smoke | Oczekiwany wynik |
|-------|------------------|
| 20.5A.10 | T1–T20 PASS |
| 20.5A.8 | 18/18 |
| 20.5A.9 | 21/21 |
| 20.5B.2 | 29/29 |
| 20.5B.3 | 31/31 |

---

## Łańcuch release Roboty/pliki (2.50.x)

| Wersja | Commit | Sprint | Skrót |
|--------|--------|--------|-------|
| **2.50.52** | **`e6758e5`** | **20.5A.10** | **Generic File Attachments** ★ |
| 2.50.51 | `09a8284` | 20.5B.3 | File Consistency — tombstone jobFiles |
| 2.50.50 | `7d055cf` | hotfix | Delete plików kontraktowych P0 |
| 2.50.49 | `54046b9` | hotfix | Ikona plan_techniczny w katalogu |
| 2.50.48 | — | 20.5B.2 | Inspector Admin simplification |
| 2.50.47 | — | 20.5A.9 | Plan techniczny PDF workflow |
| 2.50.46 | — | 20.5A.8 | Media separation |
| 2.50.45 | — | 20.5A.7 | Role visibility |
| 2.50.44 | `99295e5` | 20.5A.6 | Billing Proposal |
| 2.50.43 | `61cb33b` | 20.3B+ | CC polonizacja |

---

## NIE ZMIENIAJ bez polecenia

- `jobFiles[]` model / kinds / `applyJobFileKindUpload` / plan_techniczny workflow
- `deletedJobFileTombstones[]` + feed R1–R4 (20.5B.3)
- `media-separation.ts` — separacja obrazów vs dokumentów kontraktowych
- Billing Proposal (20.5A.6), Evidence Pack (20.5A.5), recoverable charges sync
- Edge Functions, migracje KV/storage
- Desktop scroll model (2.50.20), mobile shell, MID-B kolejki

---

## Następny backlog (tylko na polecenie)

| Opcja | Opis |
|-------|------|
| **20.5A.11** | Inspektor read-only podgląd załączników ogólnych |
| **20.3C** | Legacy CC + GuideView retro-changelog |
| **Roboty 2.0 FULL** | Pełna implementacja audytu produktowego |
| **Orphan cleanup** | Skrypt storage orphan dla `attachments-*` (jak repair 20.5B.3) |

---

## Szybki start agenta (temat pliki roboty)

```text
1. Ten plik (20.5A.10)
2. docs/ARCHITECTURE.md § 12.1.2
3. src/lib/job-attachments.ts
4. src/lib/media-separation.ts (granica dokument vs obraz)
5. src/lib/job-documents.ts (kontrakt + tombstone 20.5B.3)
6. src/app/JobsView.tsx → detailSection "files"
```

**FAQ użytkownika:** `GuideView.tsx` → „Generic File Attachments (20.5A.10)”
