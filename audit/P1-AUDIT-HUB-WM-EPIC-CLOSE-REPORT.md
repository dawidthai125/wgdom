# P1 Audit Hub WM — EPIC CLOSE REPORT

> **Status dokumentu:** **FINAL** · **Epic P1 Audit Hub WM = CLOSED**  
> **Data closeout:** 2026-06-26  
> **Production:** **2.62.77** · commit **`21d4a1b`** · **PRODUCTION VERIFIED**  
> **SSOT techniczny:** [`docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md) § 15.6  
> **Handoff historyczny audytu:** [`docs/SESSION-HANDOFF-AUDIT-HUB-WM-001.md`](../docs/SESSION-HANDOFF-AUDIT-HUB-WM-001.md) (**SUPERSEDED**)

---

## 1. Executive summary

Epic **P1 Audit Hub WM** integruje audyt operacji WM Druk (Pomiary, Katalog, Schematy) z read-only **Audit Hub** Super Admina. Cztery etapy release oddzielają infrastrukturę danych, hooki UI i widoczność w Hub.

| Pole | Wartość |
|------|---------|
| **Epic** | P1 Audit Hub WM (`AUDIT-HUB-WM-001`) |
| **Status epic** | **CLOSED** |
| **Źródeł w feedzie** | **7** (w tym `wm_druk`) |
| **Akcji użytkownika logowanych** | **10** (bez `schematic_edited`) |

---

## 2. Timeline etapów

| Etap | Wersja | Commit | Zakres | Status |
|------|--------|--------|--------|--------|
| **1** — infra | 2.62.74 | `b4fde0c` | `kw-wm-druk-audit-log` · sync AUX · `adaptWmDrukAudit` | **RELEASED** |
| **2** — Pomiary/Katalog | 2.62.75 | `c31e1bd` | 5 hooków: `rap_*`, `docx_exported`, `zip_exported` | **RELEASED** |
| **3** — Schematy | 2.62.76 | `36718cc` | 5 hooków: `schematic_*`, `measurement_imported`, `pdf_exported` | **RELEASED** |
| **4** — UX + docs | 2.62.77 | `21d4a1b` | filtr `wm_druk` · chip · deep link labels · Help · ARCHITECTURE | **RELEASED** |

---

## 3. Co dostarczono

### 3.1 Infrastruktura (Etap 1)

- Append-only KV `kw-wm-druk-audit-log` (cap 3000)
- `recordWmDrukAudit()` + merge by `id` + push AUX
- Adapter `adaptWmDrukAudit` → `source: wm_druk`
- 7. źródło w `buildAuditFeed()`

### 3.2 Hooki UI (Etap 2–3)

| Moduł | Akcje |
|-------|--------|
| Pomiary / Katalog | `rap_created`, `rap_edited`, `rap_deleted`, `docx_exported`, `zip_exported` |
| Schematy | `schematic_created`, `measurement_imported`, `schematic_duplicated`, `schematic_deleted`, `pdf_exported` |

### 3.3 UX Audit Hub (Etap 4)

- `wm_druk` w `AUDIT_FEED_SOURCES`
- Chip teal w tabeli
- `auditHubDeepLinkLabel` — etykiety z `WM_PRINT_TABS`
- Nagłówek „7 źródeł”
- HelpView + ARCHITECTURE § 15.6

---

## 4. Świadome wykluczenia

| Element | Powód |
|---------|--------|
| `schematic_edited` | Anti-flood — auto-save przy każdym polu edytora |
| `schematicId` w deep link | Poza zakresem P1 — nawigacja do zakładki wystarcza |
| Rozszerzenie `kw-wm-print-history` | Schema wymaga `jobId`; detached RAP nie pasuje |
| MVP-1C export feedu | Osobny backlog Audit Hub |
| Sub-filtr `module` w UI | Poza zakresem P1 |

---

## 5. Metrics

| Metryka | Wartość |
|---------|---------|
| **Etapy** | **4** (infra → Pomiary → Schematy → UX) |
| **Runtime releases** | **4** — 2.62.74 · 2.62.75 · 2.62.76 · **2.62.77** |
| **Runtime commits** | **4** — `b4fde0c` · `c31e1bd` · `36718cc` · **`21d4a1b`** |
| **Źródła Audit Hub** | **7** (`operational_notes` · `inspector_login` · `job_activity` · `wm_print` · **`wm_druk`** · `delivery_package` · `security_log`) |
| **Akcje WM Druk** | **10** (5 Pomiary/Katalog + 5 Schematy; bez `schematic_edited`) |
| **Testy PASS** | **171** — adapters 77 · view-model 49 · wm-druk-audit 24 · smoke D1 10 · smoke S1 11 |
| **Smoke PASS** | **28** — Etap 2 D1 10/10 · Etap 2 akcje 7/7 · Etap 3 S1 11/11 |

---

## 6. Macierz testów (PASS przy closeout)

| Test | Etap | Wynik |
|------|------|-------|
| `test-wm-druk-audit.mjs` | 1–3 | **24/24 PASS** |
| `test-audit-hub-adapters.mjs` (T20–T22) | 1, 4 | **77/77 PASS** |
| `test-audit-hub-view-model.mjs` | 1, 4 | **49/49 PASS** |
| `smoke-wm-druk-audit-etap2-d1.mjs` | 2 | **10/10 PASS** |
| `smoke-wm-druk-audit-etap2-actions.mjs` | 2 | **7/7 PASS** |
| `smoke-wm-druk-audit-etap3-s1.mjs` | 3 | **11/11 PASS** |
| `npm run build` | każdy release | **PASS** |

---

## 7. Dokumentacja zaktualizowana

| Plik | Rola |
|------|------|
| `docs/ARCHITECTURE.md` § 15.5–15.6 | SSOT techniczny P1 |
| `docs/SESSION-HANDOFF-AUDIT-HUB-WM-001.md` | Audyt historyczny SUPERSEDED |
| `GuideView` sekcja Audit Hub | Instrukcja użytkownika |
| `CHANGELOG` / `changelog-data.ts` | 2.62.74–2.62.77 |
| `CURRENT-TASK.md` / `PROJECT-HANDOFF-CURRENT.md` | Housekeeping post-release |

---

## 8. Lessons Learned

### 8.1 Append-only audit

Osobny strumień append-only (`kw-wm-druk-audit-log`) okazał się lepszy niż rozszerzanie istniejących KV roboty lub historii WM. Merge by `id`, cap 3000 i wzorzec `operational-notes-audit` / `security-audit-log` dały przewidywalność bez dotykania `cloud-sync` merge domen EM/schematów.

### 8.2 Rozdzielenie `wm_print` / `wm_druk`

**`wm_print`** (Odbiory — generowanie szablonów, Historia) i **`wm_druk`** (Pomiary, Schematy, Katalog — CRUD i eksporty) to różne semantyki i modele danych. Osobne źródła w feedzie + osobne etykiety w filtrze UI eliminują mylenie „generacji ZIP odbioru” z „utworzeniem RAP”.

### 8.3 Świadome pominięcie `schematic_edited`

Edytor schematu commituje przy każdej zmianie pola — hook `schematic_edited` zalałby feed. Decyzja P1.1: logować tylko dyskretne akcje użytkownika (create, import, duplicate, delete, PDF). Ewentualna sesja edycji „przy zamknięciu” to osobny brief.

### 8.4 Etapowy model release

Podział na 4 etapy (infra → Pomiary → Schematy → UX) pozwolił:
- weryfikować sync i feed przed hookami UI,
- ograniczyć blast radius każdego deployu,
- utrzymać FAST RELEASE per etap (<15 plików),
- odłożyć polish UI do momentu, gdy dane w prod są stabilne.

Każdy etap: AUDIT → PLAN → IMPLEMENT → TEST → BUILD → COMMIT → VERIFY.

---

## 9. Werdykt

```text
[x] RELEASE 2.62.77 VERIFIED (version.json · commit 21d4a1b)
[x] HOUSEKEEPING (CURRENT-TASK, PROJECT-HANDOFF-CURRENT)
[x] EPIC P1 Audit Hub WM = CLOSED
```

**Data closeout:** 2026-06-26

**Backlog P1.1 (na polecenie):** `schematic_edited` przy zamknięciu sesji edycji schematu.

---

*Epic zamknięty: 2026-06-26 · prod 2.62.77 · commit 21d4a1b*
