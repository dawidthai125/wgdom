# INSPECTOR-JOB-ASSIGN-001 — Przypisanie inspektora do robót · DESIGN FREEZE v1.2 FINAL

> **Status:** **IMPLEMENT COMPLETE** · RELEASE **czeka na commit/push** właściciela repo  
> **Data freeze:** 2026-07-01 · **zamknięcie:** 2026-07-01 (principles #001–#012)  
> **Baseline prod:** **v2.63.12** · commit **`ab6637f`**  
> **STABILIZATION WINDOW:** ACTIVE — epic poza maintenance; start IMPLEMENT tylko na explicit polecenie  
> **Poza zakresem:** `organizationId` → backlog **JOB-ORG-001** (po zamknięciu okna stabilizacji)  
> **Audyt widoczności:** INSPECTOR-JOB-ASSIGN-001A — wnioski włączone w #011 i #012

---

## 0. Werdykt freeze

| Pole | Wartość |
|------|---------|
| **Epic ID** | INSPECTOR-JOB-ASSIGN-001 |
| **Principles** | **#001–#012** — **FINAL**, bez dalszego rozszerzania zakresu |
| **Nowe pole `Job`** | `assignedInspectorId?: string` — **jedyne** rozszerzenie modelu w tym release |
| **`client`** | **Bez zmian** (display + `isWmClient()` do JOB-ORG-001) |
| **Domyślny inspektor w kodzie** | **Zakaz** — brak `DEFAULT_INSPECTOR_USER_ID` |
| **Stan UI inspektora** | `jobsAll` (SSOT persist/sync) + `jobsVisible` (derived, #012) |

---

## 1. Zasady wiążące (Principles #001–#012) — FINAL

### #001 — Jedno pole SSOT

`assignedInspectorId` = `AdminSession.id` (konto admin/inspektor z `admin-auth.ts`).  
**Nie** `kw-directory` · **nie** `inspectorId` na `Job` (kolizja z `session.id` w UI).

### #002 — Cardinality v1

Dokładnie **jeden** inspektor WM na robotę.

### #003 — Widoczność inspektora

Inspektor widzi robotę iff `job.assignedInspectorId === session.id`.  
Filtr w **jednym** helperze: `filterJobsForInspector(jobsAll, inspectorUserId)` → `jobsVisible` — reuse we wszystkich zakładkach `InspectorPanel` (#012).

### #004 — Widoczność admina

**Admin** i **Super Admin** widzą **wszystkie** roboty (bez filtra przypisania).

### #005 — InspectorAdminView bez filtra

Zakładka admina **Inspektor** (monitoring feed) — **bez** filtrowania po `assignedInspectorId`.

### #006 — Tworzenie roboty

Wybór inspektora **obowiązkowy**. Formularz **nie zapisuje** nowej roboty bez `assignedInspectorId`.

### #007 — Edycja roboty

Admin / Super Admin może **zmienić** `assignedInspectorId`. Zmiana → sync `kw-jobs` (+ opcjonalny `activityLog`).

### #008 — Migracja przed filtrem

Jednorazowa migracja legacy `kw-jobs`: wszystkie roboty bez pola → `assignedInspectorId = "szymon"`.  
**Kolejność:** migracja **PASS** → dopiero włączenie filtra w `InspectorPanel`.  
Wartość `"szymon"` dotyczy **wyłącznie migracji**, nie reguły produktowej.

### #009 — Brak zapisu bez inspektora (post-migracja)

Po zakończeniu migracji **żadna** robota nie może zostać zapisana bez `assignedInspectorId`.  
Dotyczy **tworzenia** i **edycji** (walidacja przed `normalizeJob` / push `kw-jobs`).

### #010 — Osierocone przypisanie (usunięty inspektor)

Jeżeli `assignedInspectorId` wskazuje użytkownika, który **nie istnieje** w systemie (`getAllAdminAccounts()` / `listInspectorUsersForLogin()`):

- formularz edycji **wyświetla komunikat**,
- **blokuje zapis**,
- **wymaga** wskazania istniejącego inspektora.

### #011 — Notatki operacyjne (podwójny warunek widoczności)

Widoczność notatek operacyjnych dla inspektora wymaga spełnienia **obu** warunków:

1. **istniejących reguł ACL** (autor inspektora lub `shareWithInspector`),
2. jeżeli notatka posiada `linkedJobId`, robota musi należeć do `jobsVisible` wynikającego z `filterJobsForInspector()`.

W przeciwnym przypadku:

- **nie** wyświetlaj notatki,
- **nie** licz jej do badge,
- **nie** generuj powiadomień,
- **nie** pozwalaj otworzyć jej przez deep link.

### #012 — `jobsVisible` jako stan pochodny

`jobsVisible` jest stanem **pochodnym** (derived state).

- Źródłem prawdy pozostaje **`jobsAll`**.
- **Persist**, **merge**, **Cloud Sync** oraz **localStorage** operują wyłącznie na `jobsAll`.
- `jobsVisible` służy **wyłącznie** do prezentacji danych w UI.

**Zakaz:** filtrowanie tablicy przed zapisem do `localStorage` / `pushKeysToCloudSafe` — aktualizacja pojedynczej roboty = merge w `jobsAll`, potem persist pełnej tablicy.

---

## 2. Sync i merge

| Element | Plik |
|---------|------|
| Typ + normalize | `app-domain.ts` |
| `mergeAssignedInspectorId()` | `job-wm.ts` (wzorzec `mergeExecutionLeadDirectoryId`) |
| `mergeJobsById` | `cloud-sync.ts` |
| Lista inspektorów (UI) | `listInspectorUsersForLogin()` |

**Fail-closed w panelu inspektora:** robota bez `assignedInspectorId` lub z cudzym ID = niewidoczna w `jobsVisible` (po migracji); `jobsAll` nadal zawiera pełny merge (#012).

| Stan | Rola |
|------|------|
| `jobsAll` | ingest cloud/LS, `persistJobs`, `updateJob`, merge |
| `jobsVisible` | `filterJobsForInspector(jobsAll, session.id)` — UI, KPI, listy, PDF, badge robót |

---

## 3. Zakazy (freeze)

- **Nie** dodawać `organizationId` w tym release.
- **Nie** zmieniać semantyki `client` / `isWmClient()`.
- **Nie** wprowadzać domyślnego inspektora w `defaultJob()` ani stałej produktowej `DEFAULT_INSPECTOR_USER_ID`.
- **Nie** filtrować `InspectorAdminView` ani Dashboard admina po przypisaniu.
- **Nie** zmieniać `RecoverableCharge.responsibleInspector` (to lider ekipy z kartoteki — osobna domena).
- **Nie** rozszerzać principles poza #001–#012 bez nowego epicu / audytu.
- **Nie** dodawać funkcjonalności poza zakresem #001–#012.

---

## 4. Pliki implementacji (plan)

| Warstwa | Plik |
|---------|------|
| Lib | `job-wm.ts` lub `inspector-job-assignment.ts` |
| Model | `app-domain.ts` |
| Sync | `cloud-sync.ts` |
| Inspektor | `InspectorPanel.tsx` (`jobsAll` / `jobsVisible`, #012) |
| Notatki operacyjne | `operational-notes.ts`, `OperationalNotesView.tsx` (#011) |
| Admin UI | `JobsView.tsx` |
| Migracja | `scripts/migrate-inspector-job-assignment.mjs` |
| Test | `scripts/smoke-test-inspector-job-assignment.mjs` |
| Docs (po IMPLEMENT) | `ARCHITECTURE.md` §7, HelpView, CHANGELOG |

---

## 5. Kolejność IMPLEMENT (po poleceniu właściciela)

```text
Faza 0  Backup kw-jobs
Faza 1  Lib: pole + merge + filter + normalize (#009 walidacja w lib)
Faza 2  Migracja batch → "szymon" dla legacy (#008)
Faza 3  JobsView: required select + walidacja #009/#010
Faza 4  InspectorPanel: jobsAll/jobsVisible (#012) + filtr (#003) + guard openJob — po Faza 2 PASS
Faza 4b Notatki operacyjne: filtr #011 (ACL + linkedJobId ⊆ jobsVisible)
Faza 5  Smoke + BUILD + raport
```

---

## 6. Zamknięcie DESIGN FREEZE

| Etap | Status |
|------|--------|
| AUDIT modelu organizacji | DONE |
| AUDIT widoczności 001A | DONE → #011, #012 |
| Principles #001–#012 | **FINAL** |
| IMPLEMENT | **COMPLETE** (v2.63.13) — commit/push na polecenie |

**Zakres projektu zamknięty.** Kolejny krok wyłącznie na polecenie właściciela repo.

---

## 7. Powiązane dokumenty

| Dokument | Rola |
|----------|------|
| [`ARCHITECTURE.md`](ARCHITECTURE.md) §7 | Panel inspektora (aktualizacja po IMPLEMENT) |
| [`STABILIZATION-WINDOW-PLAN.md`](STABILIZATION-WINDOW-PLAN.md) | Okno stabilizacji |
| **JOB-ORG-001** (backlog) | `organizationId` — po STABILIZATION WINDOW |
