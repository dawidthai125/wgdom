# MASTER HANDOFF — POST ZI-2026

> **★★ Wejście po zamknięciu ZI** · **Data:** 2026-06-16 · **Prod:** **2.59.25** · **PRODUCTION VERIFIED**  
> **SSOT szczegóły:** [`PROJECT-HANDOFF-CURRENT.md`](PROJECT-HANDOFF-CURRENT.md) · [`ZI-2026-HANDOFF.md`](ZI-2026-HANDOFF.md)

---

## Aktualny stan

| Pole | Wartość |
|------|---------|
| **Wersja** | **2.59.25** |
| **Prod** | https://www.wgdom.fun |
| **Status** | **PRODUCTION VERIFIED** |
| **Stream ZI** | **CLOSED** (LiveCycle) + **STABLE** (Tauron 2026) |
| **Stream WM Druk** | **COMPLETE** — ZIP · DOCX · preservation · sync |

---

## ZI LiveCycle 2021 — CLOSED

**Nie wracać do:**

- XFA · LiveCycle · overlay · flatten · ciphertext
- AP reverse engineering
- TextField2[10/9/8] · widgety 429/428/427

**Legacy UUID:** `26f02c78-871c-4d65-aeac-d0ca06bf060c` — **TOMBSTONE**

RCA historyczne: [`audit/ZI-FINAL-HANDOFF.md`](../audit/ZI-FINAL-HANDOFF.md)

---

## ZI Tauron 2026 — PRODUCTION STABLE

**Canonical UUID:** `2b22da48-46dc-42a0-8236-d42b5b5562dc`  
**SSOT:** [`ZI-2026-HANDOFF.md`](ZI-2026-HANDOFF.md)

### Mapping §4 (OKREŚLENIE OBIEKTU)

| Zmienna WGDOM | Pole PDF |
|---------------|----------|
| JOB_STREET | Pole tekstowe 99 |
| JOB_BUILDING | Pole tekstowe 111 |
| JOB_APARTMENT | Pole tekstowe 112 |

### Preservation gate (AKTYWNE)

```text
ZI.pdf użytkownika (storage WM Druk)
  → pdf.js graft (zachowanie pól użytkownika)
  → patch §4 (99 / 111 / 112)
  → wynikowy ZI
```

Dane użytkownika (§1, checkboxy, itd.) są zachowywane.

---

## WM Druk — weryfikacja prod

| Obszar | Status |
|--------|--------|
| ZIP | **PASS** |
| DOCX (Oświadczenia) | **PASS** |
| Preservation | **PASS** |
| Tombstone sync | **PASS** |
| Dedupe ZIP | **PASS** |
| pdf.js worker | **PASS** |

---

## Ostatnie wdrożenia (2.59.22–2.59.25)

| Wersja | Skrót | Commit (ref.) |
|--------|-------|-----------------|
| **2.59.22** | ZI Tauron 2026 generator + preservation | `9434787` |
| **2.59.23** | pdf.js worker hotfix (preservation graft) | `5302498` |
| **2.59.24** | Tombstone sync · duplicate ZI KV cleanup · DOCX title layout (szablony) | `65051a3` / `26a553b` |
| **2.59.25** | P0.5B housekeeping WM Druk (fonts/static modules) | `2b03c9d` |

---

## DOCX — fix tytułu Oświadczenia

**Bug:** `r.OŚWIADCZENIE...` (data + tytuł w jednym akapicie)

**Root cause:** layout szablonu DOCX — `{{DATE}}` bezpośrednio przed runem `OŚWIADCZENIE`

**Fix:** osobny akapit Word po `{{DATE}}` (4 szablony Oświadczenia w KV) — **bez zmian kodu**

Raport: [`audit/DOCX-TITLE-LAYOUT-FIX-REPORT.md`](../audit/DOCX-TITLE-LAYOUT-FIX-REPORT.md)

---

## P0.5 cleanup — DONE

| Etap | Status | Raport |
|------|--------|--------|
| **P0.5A** Docs cleanup | **DONE** | [`audit/POST-ZI-DOCS-CLEANUP-REPORT.md`](../audit/POST-ZI-DOCS-CLEANUP-REPORT.md) |
| **P0.5B** Housekeeping kodu | **DONE** | [`audit/P0.5B-HOUSEKEEPING-REPORT.md`](../audit/P0.5B-HOUSEKEEPING-REPORT.md) |

**Wydzielono:** `wm-print-pdf-fonts.ts` · `wm-print-pdf-static.ts`

**`generate-pdf.ts`** nadal zawiera legacy LiveCycle (~550 linii) — **nie ruszać** bez osobnego audytu (Medium risk).

Backlog housekeeping: [`audit/POST-ZI-CLEANUP-AUDIT.md`](../audit/POST-ZI-CLEANUP-AUDIT.md)

---

## NIE RUSZAĆ (PRODUCTION CRITICAL)

Bez bardzo dobrego powodu i nowego audytu:

- `generatePdfZiTauron2026`
- preservation gate (`zi-tauron2026-form-extract.ts`)
- `detectLegacyLiveCycleZiForm`
- tombstone sync (`wm-print-sync.ts` · `cloud-sync.ts`)
- dedupe ZIP (`generate-zip.ts`)
- pdf.js worker init

Świeżo zweryfikowane na prod (smoke + manual gate).

---

## Workflow nowej funkcji

```text
AUDIT → PLAN → IMPLEMENT → BUILD → SMOKE → COMMIT → PUSH → VERIFY DEPLOY FAST → RAPORT
```

Szczegóły: [`WORKFLOW-RELEASE-DEPLOY.md`](WORKFLOW-RELEASE-DEPLOY.md)

**Smoke WM Druk (regresja):**

```bash
npm run build
npx vite-node scripts/test-wm-print-zi-2026-smoke.mjs
npx vite-node scripts/test-wm-print-zi-2026-preservation-smoke.mjs
npx vite-node scripts/test-wm-print-zi-zip-post-cleanup.mjs
npx vite-node scripts/test-wm-print-p0-1a-docx-fix.mjs
```

---

## Otwarte tematy (backlog produktu)

| Temat | Uwagi |
|-------|-------|
| **Nowe funkcje Odbiory WM Druk** | Ustalić z użytkownikiem przed startem |
| **Audit Center / Security Log** | Backlog |
| **Hero Tone Variant B** | Backlog |
| **Command Center** | **Odłożony** — archiwum [`archive/command-center/`](archive/command-center/) |
| **Notatki P3 Export** | PDF/DOCX/Email |
| **P2-H.7** | Edge magic bytes 7z |

---

## Mapa wejścia dla programisty

```text
1. docs/MASTER-HANDOFF-POST-ZI-2026.md     ← TEN PLIK (skrót post-ZI)
2. docs/PROJECT-HANDOFF-CURRENT.md         ← baseline prod SSOT
3. docs/ZI-2026-HANDOFF.md                 ← ZI Tauron 2026 SSOT
4. CURRENT-TASK.md                         ← status sesji
5. docs/SESSION-HANDOFF-WM-PRINT-ODBIORY-DRUK.md
```

Hasło: **„kontynuuj WGDOM”** → `.cursor/rules/wgdom-stan-projektu.mdc`
