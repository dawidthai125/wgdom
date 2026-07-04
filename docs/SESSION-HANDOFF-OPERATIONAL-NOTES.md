# SESSION HANDOFF — Notatki operacyjne (P0 → P2C + HF)

> **Status streamu:** **COMPLETE** (P0 · P1 · P2A · P2B · P2C · HF v2.58.1)  
> **Data closeout:** 2026-06-14  
> **Prod baseline:** **v2.58.1** · commit **`1f8e2bd`**  
> **Architektura:** [`ARCHITECTURE.md`](ARCHITECTURE.md) — sekcja Notatki operacyjne (§ KV + tabela aspektów)  
> **SSOT projektu:** [`PROJECT-HANDOFF-CURRENT.md`](PROJECT-HANDOFF-CURRENT.md)

---

## 1. Co to jest (dla programisty)

**Notatki operacyjne** = osobna domena wiedzy operacyjnej firmy (procedury, ustalenia, kontekst WM).

| To JEST | To NIE JEST |
|---------|-------------|
| Globalne notatki + opcjonalnie powiązane z robotą | `job.notes` — „Uwagi wewnętrzne (robota)” |
| Komentarze, ACK, audit, share z inspektorem | `job.jobNotes[]` — WM / billing |
| 4 klucze KV dedykowane | Zapis w `kw-jobs` |

**Menu admin:** między **Roboty** a **Inspektor** → widok `operationalnotes`.

---

## 2. Timeline — co zrobiliśmy

| Faza | Wersja | Commit (przykł.) | Zakres | Status |
|------|--------|------------------|--------|--------|
| **P0** | 2.57.0 | — | Moduł admin, CRUD, komentarze, archiwum, audit log, sync 4× KV, panel w Roboty | **CLOSED** |
| **P1** | 2.57.2 | — | ACK jawne, badge menu, banner, read status Przeczytali/Nie przeczytali, `contentRev` | **CLOSED** |
| **P2B** | 2.57.4 | `60876a8` | Widget Pulpicie — KPI notatek | **CLOSED** |
| **P2C** | 2.57.5 | `b56e628` | Audit UI (Sheet, Super Admin), ACK → audit | **CLOSED** |
| **P2A** | 2.58.0 | `7c291d9` | Inspektor UI — overlay, header badge, sync w `InspectorPanel` | **CLOSED** |
| **HF** | 2.58.1 | `1f8e2bd` | Backup completeness — export/import/email/snapshot 4 kluczy | **CLOSED** |

**Seria P2 (admin + inspektor) = CLOSED.** Kolejny sensowny krok produktowy = **P3 Export** (tylko na polecenie).

---

## 3. Architektura modułu

### 3.1 Klucze chmury (SSOT backup: `OPERATIONAL_NOTES_BACKUP_KEYS`)

| Klucz | Zawartość |
|-------|-----------|
| `kw-operational-notes` | `OperationalNote[]` — też w `DATA_KEYS` |
| `kw-operational-notes-read-state` | Receipts ACK (`contentRevAtAck`) |
| `kw-operational-notes-audit-log` | Append-only audit (cap **3000**) |
| `kw-operational-notes-deleted-ids` | Tombstone logical delete |

**Sync:** `pushOperationalNotesToCloud()` · `pullOperationalNotesAuxFromCloud()` · merge LWW (`mergeOperationalNotes`, `mergeOperationalNotesReadState`, `mergeOperationalNotesAuditLog`).

**PLATFORM-SYNC-01A (v2.63.33, `a4cd5c2`, CLOSED):** usunięto race condition archiwizacji — `runCloudSync` / `pullFromCloudAndMerge` po `await pullAndMergeDataBundle` wywołują `reconcileOperationalNotesInMergedBundle()` (świeży `kw-operational-notes` z LocalStorage + `mergeOperationalNotes` przed `applyAdminDataBundle`). **ETAP B** (generation counter · telemetry · stale detection) — **ON HOLD** jako plan awaryjny. Test: `test-operational-notes-sync-race-p0.mjs` P0R-T05–T09.

### 3.2 Warstwy kodu

```text
src/lib/
  operational-notes.ts              ← model, ACL, mutacje, merge
  operational-notes-read-state.ts     ← ACK, unread count, audience
  operational-notes-audit.ts          ← audit log, cap 3000
  operational-notes-audit-filters.ts  ← P2C UI filtry (Super Admin)
  operational-notes-dashboard.ts    ← P2B KPI Pulpicie

src/app/
  OperationalNotesView.tsx            ← admin + variant="inspector"
  OperationalNotesAuditPanel.tsx    ← P2C Sheet
  OperationalNotesUnreadBanner.tsx  ← P1 banner admin
  DashboardOperationalNotesWidget.tsx
  JobOperationalNotesPanel.tsx        ← Roboty → Przegląd
  InspectorPanel.tsx                ← P2A overlay + sync + badge

src/lib/cloud-sync.ts               ← push/pull, OPERATIONAL_NOTES_BACKUP_KEYS
scripts/backup-lib.mjs              ← EMAIL_KV_KEYS (4 klucze od v2.58.1)
```

### 3.3 ACL (nie zmieniać bez polecenia)

| Akcja | Super Admin | Admin | Moderator | Inspektor |
|-------|:-----------:|:-----:|:---------:|:---------:|
| create | ✓ | ✓ | ✓ | ✓ (auto share) |
| edit / archive / delete / share | ✓ | ✓ | ✓ | **✗** (lib + UI) |
| comment | ✓ | ✓ | ✓ | ✓ |
| ack | ✓ | ✓ | ✓ | ✓ |
| audit UI | ✓ | ✗ | ✗ | ✗ |

**Inspektor widzi:** własne + `shareWithInspector=true` · tylko **aktywne** (bez archiwum).

### 3.4 UI — gdzie co jest

| Rola | Wejście | Widok |
|------|---------|-------|
| **Admin staff** | Menu „Notatki operacyjne” | `OperationalNotesView` (tabs Aktywne/Archiwum, Audyt Super Admin) |
| **Admin** | Banner + badge menu | `OperationalNotesUnreadBanner` + `admin-nav` badge |
| **Admin** | Pulpit widget | `DashboardOperationalNotesWidget` |
| **Admin** | Roboty → Przegląd | `JobOperationalNotesPanel` → deep link + `returnNav` |
| **Inspektor** | Header ScrollText + badge | Overlay `OperationalNotesView variant="inspector"` |

---

## 4. Testy (regresja obowiązkowa przy zmianach)

```bash
npx vite-node scripts/test-operational-notes-p0.mjs      # 24 — rdzeń lib
npx vite-node scripts/test-operational-notes-sync-race-p0.mjs  # 38 — read-state + archive race (P0R-T01–T09)
npx vite-node scripts/test-operational-notes-p1.mjs      # 21 — ACK
npx vite-node scripts/test-operational-notes-p2b.mjs     # 21 — widget
npx vite-node scripts/test-operational-notes-p2c.mjs     # 36 — audit UI
npx vite-node scripts/test-operational-notes-p2a.mjs     # 38 — inspektor
npx vite-node scripts/test-operational-notes-hotfix-2.58.1.mjs  # 28 — backup
```

Przy release UI: `npm run build` + workflow **B** ([`WORKFLOW-RELEASE-DEPLOY.md`](WORKFLOW-RELEASE-DEPLOY.md)).

---

## 5. Co robimy teraz

**Nic w streamie Notatki operacyjne** — funkcjonalność MVP→PRO **COMPLETE**.

Operacyjny audyt (2026-06-14): **PRODUCTION READY WITH MINOR FIXES** — HF backup **CLOSED**. Opcjonalne przyszłe mikro-hotfixy (nie blokujące):

- Paginacja listy przy 100+ notatkach
- P2A.1 — panel notatek w detalu roboty **inspektora** (pominięte w P2A)
- `triggerWeeklyBackupEmail()` in-app — align z 4 kluczami (scheduled email już OK)

---

## 6. Co będziemy robić (backlog — tylko na polecenie)

### P3 — Export (OPEN)

| Etap | Zakres |
|------|--------|
| **P3.1** | PDF Export notatki / listy |
| **P3.2** | DOCX Export |
| **P3.3** | Email Export (ręczny — **bez** auto-notify) |

**Nie implementować P3 bez wyraźnego GO od właściciela produktu.**

### P2A.1 (opcjonalny)

- `JobOperationalNotesPanel` w panelu inspektora (detal roboty) — obecnie tylko header overlay.

---

## 7. Pułapki / zakazy

1. **Nie** zapisywać notatek operacyjnych do `kw-jobs`.
2. **Nie** mieszać z `job.notes` ani `job.jobNotes[]`.
3. **Nie** dawać inspektorowi edit/archive/delete/share (decyzja biznesowa P2A).
4. **Nie** dodawać 6. taba bottom nav inspektora — tylko ikona header.
5. **Nie** zmieniać merge sync / `pushOperationalNotesToCloud` bez czytania ARCHITECTURE § sync.
6. Audit UI — **tylko Super Admin** (`canAccessOperationalNotesAudit`).
7. Backup — zawsze **4 klucze** (`OPERATIONAL_NOTES_BACKUP_KEYS`).

---

## 8. Powiązanie z resztą aplikacji

```text
W&G DOM — główne moduły admin (2026-06)
├── Pulpit (Dashboard V3)
├── Lista Płac / Kadry
├── Roboty (+ Files Hub, billing, WM)
├── Notatki operacyjne     ← TEN STREAM (COMPLETE)
├── Inspektor (admin feed)
├── Do rozliczenia
├── Przetargi 3.0 (+ Wycena P3, Baza cen, UX.1 workspace)
└── Media / Kontakty / Ustawienia

Inspektor terenowy (osobny shell)
├── Roboty, dokumenty, billing read-only
└── Notatki operacyjne (P2A overlay)
```

Pełna architektura: [`ARCHITECTURE.md`](ARCHITECTURE.md) · Przetargi: [`SESSION-HANDOFF-P3-PRICING-BZP-PIPELINE.md`](SESSION-HANDOFF-P3-PRICING-BZP-PIPELINE.md).

---

## 9. Wznowienie (3 kroki)

1. [`PROJECT-HANDOFF-CURRENT.md`](PROJECT-HANDOFF-CURRENT.md) + ten plik + [`CURRENT-TASK.md`](../CURRENT-TASK.md)
2. `curl -s https://www.wgdom.fun/version.json` — oczekiwane **2.58.1+**
3. Przed kodem: uruchom testy z § 4 odpowiednie do fazy

Hasło **„kontynuuj WGDOM”** → `.cursor/rules/wgdom-stan-projektu.mdc`
