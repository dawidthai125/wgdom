# W&G DOM — bieżąca sesja / wznowienie pracy

> **Aktualizuj ten plik na końcu każdej większej sesji z agentem AI.**  
> Hasło w Cursorze: **„kontynuuj WGDOM”** → [`.cursor/rules/wgdom-stan-projektu.mdc`](.cursor/rules/wgdom-stan-projektu.mdc)

**Ostatnia aktualizacja:** 2026-06-10  
**Current Version:** **2.50.61**  
**Current Baseline:** **RELEASED · STABLE**  
**Prod `origin/main` (app):** **`1edf0f9`** · https://www.wgdom.fun · v2.50.61  
**Deploy prod:** **`5000212026`**

---

## Sprint 20.5A.12C — Worker Report PDF Export (**RELEASED**)

| Pole | Wartość |
|------|---------|
| **Wersja** | **2.50.61** |
| **Zakres** | PDF pojedynczego wpisu dokumentacji ekipy (MVP A) |
| **Model/sync** | **Bez zmian** — UI + lazy pdfMake |

**Kluczowe pliki:** `worker-report-pdf.ts`, `JobWorkerReportsPanel.tsx`, `JobFilesHub.tsx`

**UI:** Roboty → Dokumentacja · Roboty → Pliki → Dokumentacja robót → **Eksportuj PDF**

**Raport:** [`docs/RELEASE-REPORT-20.5A.12C.md`](docs/RELEASE-REPORT-20.5A.12C.md)

**Smoke:** `smoke-test-worker-report-pdf-20.5a12c.mjs`, `smoke-prod-bundle-2.50.61.mjs`

**Backlog:** 20.5A.12B.1-full (JobAllFilesView kafle) · 20.5A.12C.1 (PDF całości / Inspector)

---

## Sprint 20.5B.7D — Cross-tab Update Banner Sync (**RELEASED**)

| Pole | Wartość |
|------|---------|
| **Wersja** | **2.50.60** |
| **Commit** | **`b653782`** |

**Raport:** [`docs/RELEASE-REPORT-20.5B.7D.md`](docs/RELEASE-REPORT-20.5B.7D.md)

---

## Szybki start dla agenta

1. [`AGENTS.md`](AGENTS.md)
2. Ten plik
3. [`docs/PROJECT-HANDOFF.md`](docs/PROJECT-HANDOFF.md)
4. [`docs/SESSION-HANDOFF-20.5A.12-FILES-HUB.md`](docs/SESSION-HANDOFF-20.5A.12-FILES-HUB.md)
5. [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) § 12.1.2
6. [`docs/RELEASE-REPORT-20.5A.12C.md`](docs/RELEASE-REPORT-20.5A.12C.md)
