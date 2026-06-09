# W&G DOM — bieżąca sesja / wznowienie pracy

> **Aktualizuj ten plik na końcu każdej większej sesji z agentem AI.**  
> Hasło w Cursorze: **„kontynuuj WGDOM”** → [`.cursor/rules/wgdom-stan-projektu.mdc`](.cursor/rules/wgdom-stan-projektu.mdc)

**Ostatnia aktualizacja:** 2026-06-09  
**Wersja UI (lokalnie):** **2.50.51** — File Consistency Hardening 20.5B.3  
**Status:** **IMPLEMENT lokalny 20.5B.3** · **bez commit / push / deploy**

---

## Sprint 20.5B.3 — File Consistency Hardening (**IMPLEMENT lokalny**)

| Pole | Wartość |
|------|---------|
| **Wersja** | **2.50.51** |
| **Zakres** | Tombstone plików · merge-aware delete · feed R1–R4 · replace storage cleanup |

### Kluczowe pliki

| Plik | Rola |
|------|------|
| `src/lib/job-documents.ts` | `JobFileTombstone`, `mergeJobFiles`, `removeJobFileAttachmentWithTombstone` |
| `src/lib/cloud-sync.ts` | `mergeJobsById` + tombstone merge |
| `src/lib/job-activity.ts` | `parseJobFileUploadActivity`, `isJobFileUploadActivityVisible`, feed filter |
| `src/app/JobsView.tsx` | upload replace + delete z tombstone |
| `src/app/InspectorPanel.tsx` | upload replace inspektora |

### Smoke / build (lokalnie)

| Test | Wynik |
|------|-------|
| `smoke-test-job-file-consistency-20.5b3.mjs` | uruchomić |
| `repair-job-file-orphans-20.5b3.mjs` | read-only domyślnie |
| `npm run build` | uruchomić |

### Następne (po commit)

- Deploy Vercel po push `main`
- Opcjonalnie: `repair-job-file-orphans-20.5b3.mjs --apply` na prod (hiddenInspectorFeedIds)
- Weryfikacja: Okulickiego feed bez orphan upload

---

## Sprint 20.5B.2 — Inspector Admin Simplification (**RELEASED prod**)

Pełny opis w [`CHANGELOG.md`](CHANGELOG.md).
