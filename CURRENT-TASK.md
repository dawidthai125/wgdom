# W&G DOM — bieżąca sesja / wznowienie pracy

> **Aktualizuj ten plik na końcu każdej większej sesji z agentem AI.**  
> Hasło w Cursorze: **„kontynuuj WGDOM”** → [`.cursor/rules/wgdom-stan-projektu.mdc`](.cursor/rules/wgdom-stan-projektu.mdc)

**Ostatnia aktualizacja:** 2026-06-09  
**Wersja UI (lokalnie):** **2.50.52** — Generic File Attachments 20.5A.10  
**Prod `origin/main`:** **`09a8284`** (2.50.51) · https://www.wgdom.fun  
**Status:** **IMPLEMENT DONE** · 20.5A.10 lokalnie · **bez commit / push / deploy**

---

## Sprint 20.5A.10 — Generic File Attachments (**LOKALNIE, bez release**)

| Pole | Wartość |
|------|---------|
| **Wersja docelowa** | **2.50.52** |
| **Zakres** | `jobAttachments[]` · tombstone sync · upload/delete · UI · email · ZIP · preview |

### Kluczowe pliki

| Plik | Rola |
|------|------|
| `src/lib/job-attachments.ts` | Model + merge/tombstone helpers |
| `src/lib/job-attachment-upload.ts` | `uploadJobAttachment()` |
| `src/lib/job-attachments-pack.ts` | ZIP załączników |
| `src/lib/cloud-sync.ts` | `mergeJobsById` — attachments |
| `src/app/JobGenericAttachmentsSection.tsx` | UI sekcji |
| `src/app/JobFilesEmailModal.tsx` | Grupy email |
| `scripts/smoke-test-generic-attachments-20.5a10.mjs` | Smoke T1–T20 |

### Następny krok

- Commit + push + Vercel deploy po akceptacji użytkownika
- Regresja manualna na prod po deploy

---

## Sprint 20.5B.3 — File Consistency Hardening (**RELEASED** na prod)

| Pole | Wartość |
|------|---------|
| **Wersja prod** | **2.50.51** |
| **Commit** | **`09a8284`** |
