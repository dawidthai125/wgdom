# RELEASE REPORT — v2.50.52 · Sprint 20.5A.10 Generic File Attachments

**Data:** 2026-06-09  
**Status:** **RELEASED**  
**Production:** https://www.wgdom.fun

---

## Commit

| | |
|---|---|
| **SHA** | `e6758e5a84168df51199b3b8037c9a3f6b1a297c` |
| **Message** | `feat(jobs): generic file attachments with tombstone sync (20.5A.10)` |
| **Files** | 16 (+969 / −57) |

---

## Push

| | |
|---|---|
| **Branch** | `main` → `origin/main` |
| **Poprzedni prod** | `09a8284` (2.50.51) |

---

## Deploy

| | |
|---|---|
| **GitHub Deployment** | `4994803137` |
| **Status** | success |
| **CI Mobile** | `27230293447` — PASS |

---

## Pre-release smoke

| Test | Wynik |
|------|-------|
| `npm run build` | PASS |
| `smoke-test-generic-attachments-20.5a10.mjs` | T1–T20 PASS |
| `smoke-test-job-file-consistency-20.5b3.mjs` | 31/31 |
| `smoke-test-inspector-admin-simplification-20.5b2.mjs` | 29/29 |
| `smoke-test-technical-drawing-20.5a9.mjs` | 21/21 |
| `smoke-test-media-separation-20.5a8.mjs` | 18/18 |

---

## Post-deploy prod bundle

| Marker | Status |
|--------|--------|
| `2.50.52` | ✅ |
| `jobAttachments` | ✅ |
| `deletedJobAttachmentTombstones` | ✅ |
| `Załączniki ogólne` | ✅ |
| `Załączniki ZIP` | ✅ |
| `Generic File Attachments` (GuideView) | ✅ |

JobsView chunk prod: `/assets/JobsView-CCx9X9nW.js`

---

## Regression

| Sprint | PASS |
|--------|------|
| 20.5A.6 Billing Proposal | ✅ |
| 20.5A.8 Media Separation | ✅ |
| 20.5A.9 Technical Drawing | ✅ |
| 20.5B.2 Inspector Admin | ✅ |
| 20.5B.3 File Consistency | ✅ |

---

## Feature Summary

- `jobAttachments[]` + `deletedJobAttachmentTombstones[]` — osobno od `jobFiles[]`
- Roboty → Pliki → sekcja „Załączniki ogólne” (admin upload/delete)
- Email: grupy kontrakt / ogólne; activity `(+ N załączników)`
- Załączniki ZIP (`zalaczniki/`) obok Dokumenty ZIP
- Sync tombstone merge (wzorzec 20.5B.3)
- Preview: PDF, DOCX, XLSX

---

## Current Baseline

| | |
|---|---|
| **Wersja UI** | **2.50.52** |
| **Commit prod** | **`e6758e5`** |
| **Handoff** | [`SESSION-HANDOFF-20.5A.10-GENERIC-ATTACHMENTS.md`](SESSION-HANDOFF-20.5A.10-GENERIC-ATTACHMENTS.md) |

---

## Final Verdict

**RELEASE SUCCESS ✅**
