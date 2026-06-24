# SESSION HANDOFF — AUDIT-HUB-WM-001

> **ID:** AUDIT-HUB-WM-001 · **WM Druk → Audit Hub Integration**  
> **Data audytu:** 2026-06-24 · **Tryb:** AUDIT ONLY (bez implementacji)  
> **Werdykt:** **WM Druk nie jest zintegrowany z Audit Hub** w zakresie Pomiarów i Schematów  
> **Powiązany handoff:** [`SESSION-HANDOFF-AUDIT-HUB.md`](SESSION-HANDOFF-AUDIT-HUB.md) · raport: [`../audit/AUDIT-HUB-WM-001-REPORT.md`](../audit/AUDIT-HUB-WM-001-REPORT.md)

---

## 1. Kontekst

Użytkownik oczekuje **pełnej historii działań** w Audit Hub dla modułu WM Druk (zakładki Pomiary, Schematy, Katalog). Testy manualne (create/edit/delete RAP, create/edit schematu, eksport PDF) **nie generują widocznych wpisów**.

Ten dokument jest **SSOT dla agentów AI** — co zbadano, jak działa integracja dziś, co brakuje i jak zaimplementować P1.

---

## 2. Werdykt (jednoznaczny)

```text
WM Druk nie jest zintegrowany z Audit Hub
```

**Wyjątek (wąski):** zakładka **Odbiory** loguje eksporty szablonów PDF/DOCX i ZIP do `kw-wm-print-history` → źródło `wm_print` w Audit Hub. Publikacja pakietu inspektora → dodatkowo `delivery_package`.

**Nie obejmuje:** Pomiary (RAP), Schematy jednokreskowe, Katalog Pomiarów — **zero hooków audytowych**.

---

## 3. Jak działa Audit Hub (skrót dla agenta)

Audit Hub **nie ma własnego Event Store**. To read-only agregator 6 istniejących strumieni:

```text
buildAuditFeed()  ←  src/lib/audit-hub/adapters.ts
       ↑
  6 adapterów → AuditFeedItem[] → sort → filtry UI → AuditHubView
```

| Źródło `AuditFeedSource` | KV / pole | Co loguje |
|--------------------------|-----------|-----------|
| `operational_notes` | `kw-operational-notes-audit-log` | CRUD notatek, ACK |
| `inspector_login` | `kw-inspector-stats` → `events[]` | logowanie inspektora |
| `job_activity` | `kw-jobs` → `activityLog[]` | zdjęcia, dokumenty roboty |
| **`wm_print`** | **`kw-wm-print-history`** | **tylko Odbiory: PDF/DOCX/ZIP szablonów** |
| `delivery_package` | `kw-delivery-package-publications` | publikacja ZIP dla inspektora |
| `security_log` | `kw-security-audit-log` | AUTH, PERMISSIONS, DATA, RECOVERY |

**Security Log ≠ WM History** — dwa osobne KV, scalane dopiero w feedzie Audit Hub. WM Pomiary/Schematy **nie zapisują** do żadnego z nich.

**ACL:** Super Admin only (`canAccessAuditHub`).

**Filtry UI** (`filters.ts`): Źródło · Osoba · Szukaj — **brak** ukrywania WM po severity; brak podkategorii Pomiary/Schematy.

---

## 4. Co WM Druk loguje dziś

### 4.1 Jedyny mechanizm: `kw-wm-print-history`

| Plik | Rola |
|------|------|
| `src/lib/wm-print/history.ts` | `appendWmPrintHistory`, `buildWmPrintHistoryTemplateEntry`, `buildWmPrintHistoryZipEntry` |
| `src/app/WmPrintView.tsx` | `recordHistory()` L320–324 |

**Hooki (3 ścieżki):**

| Akcja | Handler | Linia ~ |
|-------|---------|---------|
| ZIP Odbiorów | `handleGenerateZip` | 590 |
| Publikacja inspektora | `handlePublishForInspector` | 658 (+ `delivery_package`) |
| Pojedynczy PDF/DOCX szablonu | `handleGenerateSingle` | 682 |

**Ograniczenia modelu `WmPrintHistoryEntry`:**
- Wymaga `jobId` + `jobName` — **detached RAP bez roboty nie pasuje**
- `outputType`: `pdf` | `docx` | `zip` — brak typów `rap_*`, `schematic_*`
- Deep link zawsze `tab: "historia"` w adapterze (nawet ZIP z Odbiorów)

### 4.2 Adapter Audit Hub

`adaptWmPrintHistory()` w `adapters.ts` — mapuje `WmPrintHistoryEntry` → `source: "wm_print"`, etykieta PL „WM Druk”.

---

## 5. GAP — brakujące eventy (AUDIT)

### 5.1 WM Pomiary (`electrical-measurements/*`)

Grep `audit|security|recordHistory|appendJobActivity` w `src/lib/electrical-measurements/**` i panelach → **0 wyników**.

| Akcja użytkownika | Pliki UI | Status |
|-------------------|----------|--------|
| Utworzenie RAP (linked / detached / TEST) | `WmPrintView.tsx`, `ElectricalMeasurementNewDialog.tsx` | **GAP** |
| Edycja RAP | `JobElectricalMeasurementsPanel.tsx`, `MeasurementCatalogPanel.tsx` | **GAP** |
| Usunięcie RAP (single/bulk + Registry Guard) | `MeasurementCatalogPanel.tsx` → `delete-bundle.ts` | **GAP** |
| Eksport DOCX | `JobElectricalMeasurementsPanel.tsx`, `MeasurementCatalogPanel.tsx` | **GAP** |
| Eksport ZIP (katalog) | `MeasurementCatalogPanel.tsx`, `measurement-catalog-zip.ts` | **GAP** |

Dane trafiają tylko do `kw-electrical-measurements` + `kw-electrical-measurement-registry` (+ tombstones).

### 5.2 WM Schematy (`electrical-schematics/*`)

| Akcja | Plik UI | Status |
|-------|---------|--------|
| Utworzenie (szablon) | `WmPrintSchematicsPanel.tsx` | **GAP** |
| Import z pomiaru | `createFromMeasurement` | **GAP** |
| Edycja | `WmPrintSchematicEditor.tsx` → `onCommitSchematics` | **GAP** |
| Usunięcie | `handleDelete` | **GAP** |
| Eksport PDF | `handleExportPdf` → `generateSchematicPdf` | **GAP** |
| Duplikacja | `handleDuplicate` | **GAP** |

Dane tylko w `kw-electrical-schematics`.

### 5.3 UI — czy eventy są ukryte?

**NIE.** Problem nie leży w filtrach Audit Hub — wpisy po prostu **nie powstają**.

---

## 6. Wzorzec do naśladowania (P1 implementacja)

**Referencja:** Notatki operacyjne — `src/lib/operational-notes-audit.ts`

```text
append-only KV → record*() przy mutacji UI → merge w cloud-sync (AUX) → adapter Audit Hub
```

**Nie używać:**
- `security-audit-log` — semantyka AUTH/PERMISSIONS/DATA/RECOVERY, nie CRUD WM
- Rozszerzanie `kw-wm-print-history` — schema wymaga `jobId`, brak typów RAP/schemat

### 6.1 Proponowana architektura P1

| Element | Propozycja |
|---------|------------|
| KV | `kw-wm-druk-audit-log` (cap ~3000) — jeden strumień z `module: "measurements" \| "schematics" \| "odbiory"` |
| Lib | `src/lib/wm-druk-audit.ts` — `recordWmDrukAudit({ action, actor, summary, detail?, jobId?, rapNumber?, schematicId? })` |
| Audit Hub | Nowe źródło `wm_druk` **lub** rozszerzenie `wm_print` o subkind (preferowane: **osobne źródło** czytelniejsze w UI) |
| Sync | AUX KEY jak `security-audit-log` — `pullWmDrukAuditFromCloud`, `persistKey` |
| Adapter | `adaptWmDrukAudit()` → `feedAt`/`feedActor` |
| Deep link | `{ kind: "wm_print", tab: "pomiary" \| "schematy" \| "katalog" \| "historia", jobId?, ... }` |
| Hooki UI | ~12–15 miejsc (patrz § 5) |

### 6.2 Lista zdarzeń P1 (wymagane)

**Pomiary**

| Akcja | Sugerowany `action` |
|-------|---------------------|
| RAP created | `rap_created` |
| RAP edited | `rap_edited` |
| RAP deleted | `rap_deleted` |
| DOCX exported | `docx_exported` |
| ZIP exported | `zip_exported` |

**Schematy**

| Akcja | Sugerowany `action` |
|-------|---------------------|
| Schematic created | `schematic_created` |
| Schematic edited | `schematic_edited` |
| Schematic deleted | `schematic_deleted` |
| PDF exported | `pdf_exported` |
| Import z pomiaru | `measurement_imported` |

**Opcjonalnie P1.1:** `schematic_duplicated`, `rap_test_created`, `registry_cancelled`.

### 6.3 Testy (przy implementacji)

```bash
npx vite-node scripts/test-wm-druk-audit.mjs          # nowy
npx vite-node scripts/test-audit-hub-adapters.mjs     # rozszerzyć
npx vite-node scripts/test-audit-hub-view-model.mjs   # rozszerzyć
npm run build
```

Workflow release: **B** (functional UI).

### 6.4 Szacunek

| | Wartość |
|--|---------|
| Pracochłonność | **M** |
| Ryzyko | **LOW–MEDIUM** (LOW dla append-only; MEDIUM jeśli reuse `kw-wm-print-history`) |

---

## 7. Backlog Audit Hub (kontekst)

Z [`SESSION-HANDOFF-AUDIT-HUB.md`](SESSION-HANDOFF-AUDIT-HUB.md) §8:

| ID | Status |
|----|--------|
| MVP-1C sync logging, eksport feedu | OPEN |
| **P1 WM Druk audit** (ten audyt) | **OPEN — PLANOWANY** |

---

## 8. Szybki start agenta (implementacja P1)

```text
1. Przeczytaj TEN plik + SESSION-HANDOFF-AUDIT-HUB.md
2. Wzoruj się na operational-notes-audit.ts + security-audit-log.ts (sync AUX)
3. types.ts → adapter → buildAuditFeed → AuditHubView filtr źródła
4. Hooki w WmPrintView, JobElectricalMeasurementsPanel, MeasurementCatalogPanel, WmPrintSchematicsPanel
5. Testy + CHANGELOG + HelpView + ARCHITECTURE § 15.5
```

**Nie ruszać bez briefu:** merge `kw-electrical-measurements`, renderer schematów v5, ACL Audit Hub.

---

## 9. Powiązane pliki

| Temat | Plik |
|-------|------|
| Audit Hub SSOT | `docs/SESSION-HANDOFF-AUDIT-HUB.md` |
| Adaptery | `src/lib/audit-hub/adapters.ts` |
| WM historia (Odbiory only) | `src/lib/wm-print/history.ts`, `WmPrintView.tsx` |
| Security log | `src/lib/security-audit-log.ts` |
| Pomiary EM | `docs/SESSION-HANDOFF-ELECTRICAL-MEASUREMENTS.md` |
| Schematy | `docs/SESSION-HANDOFF-ELECTRICAL-SCHEMATICS.md` |
| Architektura | `docs/ARCHITECTURE.md` § 15.2, § 15.5 |

---

*Ostatnia aktualizacja: 2026-06-24 · AUDIT CLOSED · implementacja P1 na polecenie*
