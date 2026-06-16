# WM-HISTORY-001 — AUDIT + PLAN

**Data:** 2026-06-16  
**Baseline:** v2.59.25 · `2b03c9d`  
**Tryb:** READ ONLY (AUDIT + PLAN) — **bez implementacji**

---

## ETAP 1 — AUDIT (READ ONLY)

### 1.1 Moduł WM Druk — architektura

| Warstwa | Plik / ścieżka | Rola |
|---------|----------------|------|
| UI admin | `src/app/WmPrintView.tsx` | Odbiory · Szablony · Ustawienia · handlery generacji |
| Router | `src/app/admin/AdminViewRouter.tsx` | Lazy `view === "wmprint"` |
| Stan App | `src/app/App.tsx` | `kw-wm-print-*` localStorage + `commitWmPrint()` |
| Sync | `src/lib/wm-print/wm-print-sync.ts` | `pushWmPrintToCloud`, tombstone merge, seed guard |
| Typy / klucze | `src/lib/wm-print/types.ts` | Szablony, job-docs, settings, deleted-ids |
| Generowanie | `src/lib/wm-print/generate-zip.ts` | **SSOT** ZIP + pojedynczy plik |
| DOCX | `src/lib/wm-print/generate-docx.ts` | Oświadczenia |
| PDF ZI | `src/lib/wm-print/generate-pdf-zi-tauron2026.ts` | Tauron 2026 + preservation |
| PDF static | `src/lib/wm-print/wm-print-pdf-static.ts` | Kopiowanie statycznych PDF |
| Legacy PDF | `src/lib/wm-print/generate-pdf.ts` | LiveCycle — **CLOSED**, martwa gałąź poza ZI |

**Zakładki UI (obecnie):** `odbiory` | `szablony` | `ustawienia` — brak Historii.

**Props WmPrintView:** `uploadedBy={adminSession?.displayName || "Administrator"}` — **brak `userId`** (trzeba rozszerzyć o sesję admina).

---

### 1.2 Punkty generacji (jedyny SSOT UI → lib)

| Akcja użytkownika | Handler UI | Funkcja lib | `outputType` |
|-------------------|------------|-------------|--------------|
| „Pobierz paczkę ZIP” | `handleGenerateZip` | `downloadWmPrintZip()` | **`zip`** — **1 wpis na kliknięcie** |
| Ikona Download przy pliku szablonu | `handleGenerateSingle` | `downloadWmPrintTemplateFileGenerated()` | **`pdf`** lub **`docx`** (z `template.type`) |

**Plik:** `generate-zip.ts` linie 156–199.

**Wewnętrznie** `buildWmPrintFilesForJob()` generuje wiele plików (DOCX, ZI pdf_form, static pdf, job_upload kopie). Te kopie `job_upload` **nie są generowane** — to wgrane PDF-y skopiowane do ZIP. **Decyzja produktowa (PLAN):** logować tylko akcję użytkownika (ZIP = 1 wpis; single = 1 wpis), nie każdy plik wewnątrz paczki.

**Mapowanie typu pojedynczego pliku:**

```text
template.type === "docx"  → docx
template.type === "pdf"   → pdf
template.type === "pdf_form" (prod: ZI) → pdf
```

**Legacy:** `generate-pdf.ts` — nie dotykać; prod ZI idzie przez `generatePdfZiTauron2026`.

---

### 1.3 Istniejące klucze KV WM Druk

W `types.ts` + `cloud-sync.ts` (`DATA_KEYS`, `BOOTSTRAP_DEFERRED_KEYS`):

- `kw-wm-print-templates`
- `kw-wm-print-job-docs`
- `kw-wm-print-settings`
- `kw-wm-print-deleted-template-ids` (aux, cap 500)
- `kw-wm-print-deleted-job-doc-ids` (aux, cap 500)

**Brak:** `kw-wm-print-history`.

Merge WM w `cloud-sync.ts` — case switch dla szablonów/settings; tombstone aux osobno w `wm-print-sync.ts`.

---

### 1.4 Wzorce audit / logów w projekcie

#### A. Operational Notes Audit — **najbliższy wzorzec**

| Element | Wartość |
|---------|---------|
| Plik lib | `src/lib/operational-notes-audit.ts` |
| Klucz KV | `kw-operational-notes-audit-log` (aux, poza `DATA_KEYS` głównym dla notatek) |
| Cap | **3000** wpisów |
| Semantyka | Append-only, merge by `id`, sort `at` desc |
| UI | `OperationalNotesAuditPanel.tsx` — Sheet, filtry, paginacja |
| Sync | `pushOperationalNotesToCloud` — 4 klucze notatek |

#### B. Job Activity Log — **nie nadaje się jako główne storage**

| Element | Wartość |
|---------|---------|
| Plik | `src/lib/job-activity.ts` |
| Storage | `JobActivity[]` **wewnątrz `kw-jobs`** per robota |
| Użycie | Inspektor, billing, dokumenty — **bez WM Druk** |

Rozproszone, per-job, mieszane typy zdarzeń — **odrzucamy** jako SSOT historii WM.

#### C. Tombstones WM — wzorzec cap

`wm-print-sync.ts`: `.slice(-500)` dla deleted IDs.

---

### 1.5 UI Roboty — możliwość „Historia WM Druk”

**Istniejący wzorzec:** `JobOperationalNotesPanel.tsx` w `JobsView.tsx` (~1913) — sekcja summary, filtr po `job.id`, max 8 wpisów + link do modułu.

**Koszt V1:** niski — nowy panel read-only filtrujący globalną tablicę historii po `jobId`, bez nowego KV ani mutacji `kw-jobs`.

**Werdykt audytu:** **V1 GO** (panel w summary roboty), o ile historia jest w stanie App (jak `operationalNotes`).

---

### 1.6 Istniejące testy WM Druk

~24 skrypty `scripts/test-wm-print-*.mjs` — generator/unit smoke (ZI, DOCX, ZIP, sync, completeness). **Brak** testów historii.

E2E seed (`e2e/fixtures/e2e-seed.ts`) — minimalny slot ZI; historia opcjonalnie w przyszłości.

---

### 1.7 Luki / ryzyka audytu

| # | Ryzyko | Mitigacja (PLAN) |
|---|--------|------------------|
| 1 | Brak `userId` w WmPrintView | Przekazać `adminSession` z App |
| 2 | Duplikaty wpisów przy sync multi-device | Merge by `id` (UUID v4 per wpis) |
| 3 | ZIP vs N plików w paczce | 1 wpis `zip` na akcję — zgodnie z briefem |
| 4 | Rozrost KV | Cap 1000 + tylko metadane (~150 B/wpis ≈ 150 KB) |
| 5 | Backup JSON | Dodać klucz do export/import bundle (jak aux WM) |

---

## ETAP 2 — PLAN

### 2.1 Gdzie przechowywać historię

**Rekomendacja:** osobny klucz chmury **`kw-wm-print-history`**.

- **Nie** mieszać z szablonami (`kw-wm-print-templates`)
- **Nie** mieszać z ZI / job-docs
- **Nie** zapisywać w `kw-jobs` (activity log)
- **Lib:** `src/lib/wm-print/history.ts` — wzorzec `operational-notes-audit.ts`
- **Sync:** rozszerzyć `pushWmPrintToCloud()` o 6. argument historii **lub** osobny push w `commitWmPrint` — preferowany **jeden push WM bundle** (templates + docs + settings + deleted-ids + **history**)
- **Rejestracja w sync:** dodać do `DATA_KEYS` + `BOOTSTRAP_DEFERRED_KEYS` + merge case w `cloud-sync.ts`
- **localStorage:** `useLocalStorage` w `App.tsx` jak pozostałe klucze WM

---

### 2.2 Model danych

```ts
export type WmPrintHistoryOutputType = "pdf" | "docx" | "zip";

export interface WmPrintHistoryEntry {
  id: string;              // crypto.randomUUID()
  timestamp: string;       // ISO 8601 — pole w spec; w kodzie spójnie z resztą repo można alias `at` wewnętrznie, export jako `timestamp`
  userId: string;          // adminSession.userId
  userName: string;        // adminSession.displayName
  templateId: string;      // UUID szablonu; dla ZIP: pierwszy zaznaczony lub sentinel "" + templateName "Paczka ZIP"
  templateName: string;    // np. "ZI", "Oświadczenie …", "Paczka ZIP (N dokumentów)"
  outputType: WmPrintHistoryOutputType;
  jobId: string;
  jobName: string;         // jobDisplayTitle(job) z app-domain
}
```

**Decyzje:**

| Pole | ZIP | Single PDF/DOCX |
|------|-----|---------------|
| `templateId` | `"__zip__"` (sentinel) lub pusty string | `template.id` |
| `templateName` | `"Paczka ZIP"` (+ opcjonalnie liczba plików w `detail` — **V1 bez detail**, tylko stała etykieta) | `template.name` |
| `outputType` | `zip` | `pdf` / `docx` |

**Brak pól:** blob, URL, base64, fileName, rozmiar, zawartość.

**Funkcje lib (history.ts):**

- `normalizeWmPrintHistory(raw): WmPrintHistoryEntry[]`
- `mergeWmPrintHistory(local, cloud): WmPrintHistoryEntry[]`
- `appendWmPrintHistoryEntry(entries, draft): WmPrintHistoryEntry[]` — cap + sort desc
- `filterWmPrintHistoryForJob(entries, jobId): WmPrintHistoryEntry[]`
- `resolveWmPrintOutputType(template): "pdf" | "docx"`

**Stałe:** `WM_PRINT_HISTORY_KEY`, `WM_PRINT_HISTORY_CAP = 1000`

---

### 2.3 Gdzie rejestrować zdarzenia

**Hook point (V1):** `WmPrintView.tsx` — **po** `{ ok: true }` w handlerach, **nie** wewnątrz `generate-zip.ts` (lib bez sesji użytkownika).

```text
handleGenerateZip      → res.ok → append zip entry → onChangeHistory → onCommit(...)
handleGenerateSingle   → res.ok → append pdf/docx entry → onChangeHistory → onCommit(...)
```

**Flow App:**

```text
append → setWmPrintHistory → commitWmPrint(..., nextHistory) → pushWmPrintToCloud
```

**Nie logować:** nieudane generacje, upload szablonów, edycja ustawień, job_upload kopie w ZIP (tylko akcja ZIP).

---

### 2.4 Widoki UI

#### A. WM Druk — zakładka Historia

**Układ zakładek (zgodnie z wzorcem modułu):**

```text
Odbiory | Szablony | Historia | Ustawienia
```

Nowy typ: `Tab = "odbiory" | "szablony" | "historia" | "ustawienia"`.

**Widok Historia:**

| Kolumna | Źródło |
|---------|--------|
| Data | `timestamp` → `toLocaleString("pl-PL")` |
| Użytkownik | `userName` |
| Dokument | `templateName` |
| Typ | `outputType` uppercase (PDF / DOCX / ZIP) |
| Robota | `jobName` |

Sort: **najnowsze pierwsze** (już w normalize).

**Szczegół:** klik wiersza → prosty modal (Dialog) z tymi samymi polami — bez edycji, bez pobierania pliku.

**Komponent:** `WmPrintHistoryPanel.tsx` (nowy) — tabela + modal; props: `history`, opcjonalnie `filterJobId` dla reuse w Robotach.

#### B. Roboty — Historia WM Druk (V1)

**Panel:** `JobWmPrintHistoryPanel.tsx` — wzorzec `JobOperationalNotesPanel`.

- Lokalizacja: sekcja **summary** w `JobsView.tsx` (obok notatek operacyjnych)
- Filtr: `filterWmPrintHistoryForJob(history, job.id)`
- Max **8** wpisów + link „Otwórz WM Druk” (`onOpenWmPrint` lub istniejący nav)
- Props z App: `wmPrintHistory`, przekazane do `JobsView`

**Backlog V2 (nie V1):** osobna zakładka detailSection, filtry zaawansowane, eksport CSV.

---

### 2.5 Gotowe komponenty audit / tabel

| Komponent | Reużycie |
|-----------|----------|
| `OperationalNotesAuditPanel.tsx` | **Częściowe** — styl tabeli/karty; **bez** Sheet/filtrów/paginacji w V1 |
| `JobOperationalNotesPanel.tsx` | **Wzorzec** panelu w Robotach |
| Shadcn `Dialog` | Modal szczegółu |
| Istniejące klasy WM (`rounded-xl border bg-card`) | Spójność wizualna |

**Nie** importować pełnego audit panelu notatek — overkill dla read-only listy ~1000 wpisów.

---

### 2.6 Limit danych (cap)

**Rekomendacja: `1000` wpisów** (`WM_PRINT_HISTORY_CAP = 1000`).

**Uzasadnienie:**

- Szacunek: 5–15 generacji/robota × 50–100 robot/sezon ≈ 250–1500 zdarzeń/sezon
- Metadane ~150 B → max ~150 KB w KV (bezpieczne)
- Tombstones WM używają 500, ale historia jest **rzadsza niż tombstone churn** a **częstsza niż audit notatek** (3000)
- 500 mogłoby obcinać historię w szczycie sezonu odbiorów; **1000** daje ~1–2 sezony bez utraty kontekstu operacyjnego
- Implementacja: po append `entries.slice(0, CAP)` po sort desc (zachowaj najnowsze)

---

### 2.7 Testy (plan implementacji)

**Nowy smoke:** `scripts/test-wm-print-history-001.mjs`

| Test | Zakres |
|------|--------|
| T1 | append PDF entry |
| T2 | append DOCX entry |
| T3 | append ZIP entry |
| T4 | sort malejąco po timestamp |
| T5 | cap 1000 — stary wpis wypada |
| T6 | merge local + cloud by id |
| T7 | `resolveWmPrintOutputType` docx/pdf |
| T8 | `filterWmPrintHistoryForJob` |

**Bez** prawdziwych PDF/DOCX/ZIP — tylko lib history.

**Regresja:** wybrane istniejące `test-wm-print-p1.mjs`, `test-wm-print-zi-2026-smoke.mjs` po implementacji.

---

### 2.8 Pliki do zmiany (implementacja — szacunek)

| Plik | Zmiana |
|------|--------|
| `src/lib/wm-print/history.ts` | **NEW** — model, normalize, merge, append, cap |
| `src/lib/wm-print/types.ts` | export typów / stała klucza (opcjonalnie) |
| `src/lib/wm-print/wm-print-sync.ts` | push/merge history |
| `src/lib/cloud-sync.ts` | DATA_KEYS, DEFERRED, merge case |
| `src/app/App.tsx` | stan, commitWmPrint rozszerzony |
| `src/app/WmPrintView.tsx` | tab Historia, hook po generacji |
| `src/app/WmPrintHistoryPanel.tsx` | **NEW** — tabela + modal |
| `src/app/JobWmPrintHistoryPanel.tsx` | **NEW** — panel Roboty |
| `src/app/JobsView.tsx` | props + render panelu |
| `src/app/admin/AdminViewRouter.tsx` | przekazanie history + session |
| `src/app/changelog-data.ts` | v2.59.26 |
| `scripts/test-wm-print-history-001.mjs` | **NEW** |
| `docs/ARCHITECTURE.md` § 12.1.8 | klucz + historia |
| HelpView | FAQ Historia WM Druk |

---

### 2.9 Kryterium sukcesu (po IMPLEMENT)

Administrator może odpowiedzieć:

1. **Kto** wygenerował? → `userName`
2. **Kiedy**? → `timestamp`
3. **Jaki dokument**? → `templateName` + `outputType`
4. **Dla jakiej roboty**? → `jobName` / `jobId`

Bez przechowywania plików.

---

## Werdykt AUDIT + PLAN

| Etap | Status |
|------|--------|
| AUDIT | **COMPLETE** |
| PLAN | **COMPLETE** — gotowy do IMPLEMENT |
| IMPLEMENT | **OCZEKUJE** na akceptację planu |

**Rekomendacja:** przejść do IMPLEMENT zgodnie z § 2.1–2.8; Roboty panel **V1 GO**; cap **1000**.

---

*Po IMPLEMENT + BUILD + SMOKE + COMMIT + PUSH + VERIFY utworzyć `audit/WM-HISTORY-001-REPORT.md` (sekcje 1–8 z briefu).*
