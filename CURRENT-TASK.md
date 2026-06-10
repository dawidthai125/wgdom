# W&G DOM — bieżąca sesja / wznowienie pracy

> **Aktualizuj ten plik na końcu każdej większej sesji z agentem AI.**  
> Hasło w Cursorze: **„kontynuuj WGDOM”** → [`.cursor/rules/wgdom-stan-projektu.mdc`](.cursor/rules/wgdom-stan-projektu.mdc)

**Ostatnia aktualizacja:** 2026-06-09  
**Current Version:** **2.50.58**  
**Current Baseline:** **RELEASED · STABLE**  
**Prod `origin/main` (app):** *(po push — patrz raport release)* · https://www.wgdom.fun  
**Deploy prod:** *(po deploy)*

---

## Sprint 20.5A.12 — Files Hub Consolidation (**RELEASED**)

| Pole | Wartość |
|------|---------|
| **Wersja** | **2.50.58** |
| **Zakres** | Files Hub UI (12A), unified counters (12B), 12B.1-min JobAllFilesView, PDF stub (12C) |
| **Model/sync** | **Bez zmian** — warstwa prezentacji only |

**Kluczowe pliki:** `files-hub-index.ts`, `JobFilesHub.tsx`, `JobsView.tsx`, `MediaView.tsx`, `JobAllFilesView.tsx`

**SSOT:** `countFilesHubItems()` = jobFiles + workerReports + jobAttachments

**Raport:** [`docs/RELEASE-REPORT-20.5A.12.md`](docs/RELEASE-REPORT-20.5A.12.md)

**Smoke:** `smoke-test-files-hub-20.5a12.mjs`, `smoke-prod-bundle-2.50.58.mjs`

**Backlog:** 20.5A.12B.1-full (kafle JobAllFilesView) · 20.5A.12C PDF export

---

## Sprint 20.5B.6A.4 — Worker Mobile UX (**RELEASED**)

| Pole | Wartość |
|------|---------|
| **Wersja** | **2.50.57** |
| **Commit** | **`c983b9c`** |
| **Deploy** | **`4998989024`** |

**Raport:** [`docs/RELEASE-REPORT-20.5B.6A.4.md`](docs/RELEASE-REPORT-20.5B.6A.4.md)

---

## Szybki start dla agenta

1. [`AGENTS.md`](AGENTS.md)
2. Ten plik
3. [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) § 12.1.2 Files Hub
4. [`docs/RELEASE-REPORT-20.5A.12.md`](docs/RELEASE-REPORT-20.5A.12.md)
5. [`docs/SESSION-HANDOFF-20.5B-ROBOTY-DOC-VERSION-2026-06.md`](docs/SESSION-HANDOFF-20.5B-ROBOTY-DOC-VERSION-2026-06.md)
