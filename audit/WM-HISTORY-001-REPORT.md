# WM-HISTORY-001 — RAPORT KOŃCOWY

**Data:** 2026-06-16  
**Wersja:** 2.59.26  
**Baseline:** 2.59.25 · `2b03c9d`

---

## 1. Executive Summary

Zaimplementowano **historię metadanych** wygenerowanych dokumentów WM Druk (PDF / DOCX / ZIP). Administrator może odpowiedzieć na pytania: kto, kiedy, jaki dokument, dla jakiej roboty — **bez przechowywania plików**.

- Zakładka **Historia** w module WM Druk
- Panel **Historia WM Druk** w szczegółach roboty (max 8 wpisów)
- Klucz chmury **`kw-wm-print-history`** (cap **1000**)
- Wpis tylko przy **`res.ok === true`**

**Werdykt:** **GO**

---

## 2. Architektura

```text
WmPrintView (handleGenerateZip / handleGenerateSingle)
  → res.ok → appendWmPrintHistory → onChangeHistory → commitWmPrint
  → pushWmPrintToCloud (+ kw-wm-print-history)

JobsView → JobWmPrintHistoryPanel (filter by jobId, read-only)

Lib SSOT: src/lib/wm-print/history.ts
Sync: wm-print-sync.ts + cloud-sync.ts (DATA_KEYS + merge)
```

Wzorzec: **Operational Notes Audit** (append-only, merge by id, sort desc, cap).

---

## 3. Model danych

```ts
WmPrintHistoryEntry {
  id, timestamp, userId, userName,
  templateId, templateName, outputType, jobId, jobName
}
```

| Akcja | outputType | templateName |
|-------|------------|--------------|
| Pojedynczy DOCX | `docx` | `template.name` |
| Pojedynczy PDF/ZI | `pdf` | `template.name` |
| Paczka ZIP | `zip` | `Pakiet odbiorowy ZIP` (`templateId: __zip__`) |

---

## 4. Klucz chmury

| Klucz | Rola |
|-------|------|
| `kw-wm-print-history` | Tablica wpisów historii (w `DATA_KEYS` + `BOOTSTRAP_DEFERRED_KEYS`) |

Oddzielny od templates, settings, job-docs, tombstones.

---

## 5. Zmodyfikowane pliki

| Plik | Zmiana |
|------|--------|
| `src/lib/wm-print/history.ts` | **NEW** — model, append, merge, cap, filter |
| `src/lib/wm-print/wm-print-sync.ts` | push/sync history |
| `src/lib/cloud-sync.ts` | DATA_KEYS, merge case |
| `src/app/App.tsx` | stan, commitWmPrint |
| `src/app/WmPrintView.tsx` | zakładka Historia, rejestracja zdarzeń |
| `src/app/WmPrintHistoryPanel.tsx` | **NEW** — tabela + modal |
| `src/app/JobWmPrintHistoryPanel.tsx` | **NEW** — panel Roboty |
| `src/app/JobsView.tsx` | integracja panelu |
| `src/app/admin/AdminViewRouter.tsx` | props |
| `src/app/changelog-data.ts` | v2.59.26 |
| `src/app/GuideView.tsx` | FAQ Historia |
| `docs/ARCHITECTURE.md` | § 12.1.8 |
| `CHANGELOG.md` | skrót |
| `scripts/test-wm-print-history-001.mjs` | **NEW** — smoke 16 testów |
| `audit/WM-HISTORY-001-AUDIT-PLAN.md` | AUDIT + PLAN (read-only faza) |

---

## 6. Build

```bash
npm run build
```

**Wynik:** **PASS** (18.35s)

---

## 7. Testy

| Test | Wynik |
|------|-------|
| `test-wm-print-history-001.mjs` | **16/16 PASS** |
| `test-wm-print-p1.mjs` | **13/13 PASS** |
| `test-wm-print-zi-2026-smoke.mjs` | **PASS** |
| `test-wm-print-p0-seed-guard.mjs` | **11/11 PASS** |

---

## 8. Sync

- `pushWmPrintToCloud` — 6 kluczy (templates, job-docs, settings, deleted×2, **history**)
- `commitWmPrint` — opcjonalny `nextHistory`
- Merge: `mergeWmPrintHistory(local, cloud)` by id, cap 1000
- Auto-sync deps: `wmPrintHistory` w `App.tsx`

---

## 9. Ryzyka

| Ryzyko | Status |
|--------|--------|
| Rozrost KV | Mitigacja: cap 1000, ~150 KB max |
| Brak userId przed logowaniem | Fallback `unknown` + displayName |
| Multi-device duplikaty | Merge by UUID — OK |
| Stare generacje sprzed wdrożenia | Brak retroaktywnej historii — oczekiwane |

---

## 10. Werdykt

**WM-HISTORY-001: COMPLETE · GO**

Kryterium sukcesu spełnione w module WM Druk → Historia oraz w szczegółach roboty.

---

*Workflow: IMPLEMENT → BUILD → SMOKE → COMMIT → PUSH → VERIFY DEPLOY FAST*
