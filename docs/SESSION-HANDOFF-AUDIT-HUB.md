# SESSION HANDOFF — Audit Hub (MVP-0A → MVP-0B + P0 hotfix)

> **Status streamu:** **MVP-0 CLOSED** · **MVP-1 Security Log CLOSED** · **MVP-1B Recovery Events CLOSED**  
> **Data closeout MVP-1B:** 2026-06-24  
> **Prod baseline:** **v2.62.41** · MVP-1 **2.62.39** · Recovery Events **2.62.41**  
> **Architektura:** [`ARCHITECTURE.md`](ARCHITECTURE.md) § **15.2–15.3**  
> **SSOT projektu:** [`PROJECT-HANDOFF-CURRENT.md`](PROJECT-HANDOFF-CURRENT.md)

---

## 1. Co to jest (dla agenta — czytaj NAJPIERW)

**Audit Hub** = read-only panel Super Admina agregujący logi z **6 źródeł** w jeden timeline. MVP-0: 5 istniejących KV/pól. **MVP-1:** dodatkowe źródło `kw-security-audit-log` (append-only, read-only w Hub).

| To JEST | To NIE JEST |
|---------|-------------|
| Agregacja + filtry + deep linki do modułów źródłowych | Pełny SIEM / alerty (MVP-2) |
| Widok `audit` w menu admina (ikona Shield) | Duplikat audit UI notatek operacyjnych (P2C Sheet) |
| Read-only prezentacja + Security log (AUTH, PERMISSIONS, DATA, RECOVERY) | Logowanie auto-sync / merge (MVP-1C) |

**Kto ma dostęp:** tylko **Super Admin** (`canAccessAuditHub` → `adminIsSuperAdmin`).

**Menu:** między **Notatki operacyjne** a **Inspektor** → widok `audit`.

---

## 2. Timeline — co zrobiliśmy

| Etap | Wersja | Commit | Zakres | Status |
|------|--------|--------|--------|--------|
| **Discovery** | — | — | Audyt możliwości Audit Center; werdykt: agregacja bez KV | **CLOSED** (read-only) |
| **MVP-0A** | — | (w `b2eed93`) | `src/lib/audit-hub/*` — typy, adaptery, filtry, test adapters 47 | **CLOSED** |
| **MVP-0B** | **2.62.36** | **`b2eed93`** | `AuditHubView`, router, nav, deep linki, HelpView, test view-model 22 | **CLOSED** |
| **P0 hotfix** | **2.62.37** | **`a0d7093`** | Crash `localeCompare` — legacy `actor`/`at` undefined; fix `JobsView` photo_upload | **CLOSED** |
| **Actor fidelity** | **2.62.38** | **`8138991`** | `activityLog` zapisuje `displayName` sesji | **CLOSED** |
| **MVP-1 Security Log** | **2.62.39** | — | `kw-security-audit-log`, 6. źródło Audit Hub, hooki AUTH/PERMISSIONS/DATA | **CLOSED** |
| **MVP-1B Recovery Events** | **2.62.41** | — | RECOVERY restore + DATA import/directory_delete w `security_log` | **CLOSED** |

### Incydent prod (2.62.36)

**Objaw:** Audit Hub otwiera się → runtime crash `Cannot read properties of undefined (reading 'localeCompare')`.

**RCA:**

1. `filters.ts` — `collectAuditHubFilterOptions` sortował `a.label` gdy `item.actor` było `undefined`.
2. `adapters.ts` — `sortAuditFeed` wołał `b.at.localeCompare` gdy `at` było `undefined`.
3. **Źródło danych:** `job.activityLog[]` — wpisy `photo_upload` z `JobsView.appendJobPhotos` bez 4. argumentu `actor` w `appendJobActivity`.

**Fix 2.62.37:** `feedAt`/`feedActor` we wszystkich adapterach + bezpieczny sort + `createdByName` przy photo_upload.

---

## 3. Architektura modułu

### 3.1 Warstwy kodu (mapa plików)

```text
src/lib/audit-hub/
  types.ts           ← AuditFeedItem, AuditFeedSource, AuditHubInput, deep link types
  adapters.ts        ← 6 adapterów + buildAuditFeed + sortAuditFeed + dedupe
  filters.ts         ← filterAuditFeed, paginateAuditFeed (50), collectAuditHubFilterOptions
  acl.ts             ← canAccessAuditHub() — Super Admin only
  deeplink.ts        ← resolveAuditHubNavigation(), auditHubDeepLinkLabel()
  view-model.ts      ← buildAuditHubViewModel() — feed + KPI + filtry + strona

src/app/
  AuditHubView.tsx   ← UI: KPI, filtry, tabela, paginacja, Sheet szczegółów, fetch inspektora
  admin/admin-nav.ts ← View "audit" + menu Shield (tylko super_admin)
  admin/AdminViewRouter.tsx  ← lazy AuditHubView
  App.tsx            ← guard view audit + handleAuditHubDeepLink + pendingOperationalNotesAuditOpen
  GuideView.tsx      ← FAQ: co to jest, dostęp, deep linki

scripts/
  test-security-audit-log.mjs    ← MVP-1 append/merge/cap
  test-audit-hub-adapters.mjs    ← adapters + security_log
  test-audit-hub-view-model.mjs  ← filtry, KPI, deep linki, legacy P0
```

### 3.2 Przepływ danych (UI)

```text
App.tsx (props)
  operationalNotesAuditLog  ← LS kw-operational-notes-audit-log
  jobs[]                    ← kw-jobs (activityLog per job)
  wmPrintHistory            ← kw-wm-print-history
  deliveryPackagePublications ← kw-delivery-package-publications
  securityAuditLog          ← LS kw-security-audit-log (pull aux przy sync)
       +
AuditHubView (async)
  inspectorLoginEvents      ← syncInspectorStatsFromCloud() → kw-inspector-stats
       ↓
buildAuditHubViewModel(input, filters, page)
  → buildAuditFeed() → dedupe → sortAuditFeed
  → filterAuditFeed → paginateAuditFeed
  → collectAuditHubFilterOptions (dropdown „Osoba”)
```

**Uwaga:** `useMemo` buduje model **od razu** (również podczas „Ładowanie logów inspektora…”) — crash w lib = biały ekran przed spinnerem.

### 3.3 Model kanoniczny — `AuditFeedItem`

| Pole | Wymagane w feedzie | Uwagi |
|------|-------------------|-------|
| `id` | tak | `${source}:${nativeId}` |
| `at` | tak (string, może `""`) | **P0:** `feedAt()` — nigdy `undefined` |
| `actor` | tak (string) | **P0:** `feedActor()` — nigdy `undefined` |
| `source` | tak | jeden z 6 enumów |
| `action` / `actionLabel` | tak | |
| `summary` | tak | job_activity: `(text ?? "").trim() \|\| actionLabel` |
| `actorUserId` | opcjonalne | filtr „Osoba” dopasowuje też userId |
| `detail`, `jobId`, `jobLabel`, `noteId` | opcjonalne | |
| `deepLink` | tak | nawigacja do modułu źródłowego (`security_log` → `none`) |
| `severity` | opcjonalne | tylko `security_log` — badge w UI |
| `nativeId` | tak | id w źródle |

### 3.4 Sześć adapterów (`adapters.ts`)

| Adapter | Źródło wejścia | Pole `at` | Pole `actor` | Normalizacja źródła |
|---------|----------------|-----------|--------------|---------------------|
| `adaptOperationalNotesAudit` | `OperationalNoteAuditEntry[]` | `entry.at` | `displayName` → fallback `userId` | **brak** w Audit Hub (surowy LS) |
| `adaptInspectorLoginEvents` | `InspectorStatsEvent[]` | `event.at` | `displayName` → fallback `"Inspektor"` | **brak** (surowe KV) |
| `adaptJobActivityLog` | `jobs[].activityLog[]` | `ev.at` | `ev.actor` → fallback `"Administrator"` | **brak** |
| `adaptWmPrintHistory` | `WmPrintHistoryEntry[]` | `timestamp` | `userName` | **tak** — `normalizeWmPrintHistory()` |
| `adaptDeliveryPackagePublications` | `DeliveryPackagePublication[]` | `publishedAt` | `publishedByUserName` | **brak** w adapterze |
| `adaptSecurityAuditLog` | `SecurityAuditEntry[]` | `entry.at` | `entry.actor` | **tak** — `normalizeSecurityAuditLog()` przy merge |

**P0 reguła:** każdy adapter musi zwracać `at: string` i `actor: string` — używaj `feedAt()` / `feedActor()`.

### 3.5 Źródła KV

| Źródło `AuditFeedSource` | Klucz / pole | Cap | Etykieta PL |
|--------------------------|--------------|-----|-------------|
| `operational_notes` | `kw-operational-notes-audit-log` | 3000 | Notatki operacyjne |
| `inspector_login` | `kw-inspector-stats` → `events[]` | 300 | Inspektor · logowania |
| `job_activity` | `kw-jobs` → `job.activityLog[]` | 200 / robota | Roboty |
| `wm_print` | `kw-wm-print-history` | 1000 | WM Druk |
| `delivery_package` | `kw-delivery-package-publications` | 500 | Pakiety odbiorowe |
| `security_log` | `kw-security-audit-log` | 5000 | Security log |

**MVP-1 Security log — zdarzenia (append-only):**

| Kategoria | Akcje | Severity | Hooki |
|-----------|-------|----------|-------|
| AUTH | `admin_login_success`, `admin_login_failed`, `admin_logout` | info / warn / info | `LoginScreen`, `AppInnerWithAuth` |
| PERMISSIONS | `user_create`, `user_delete`, `user_role_change`, `user_password_change`, `user_password_reset` | warn / high | `admin-auth`, `AdminSettingsModal` |
| DATA | `job_delete`, `data_import_*`, `directory_delete` | high / warn | `deleteJobsByIds`, `importBackup`, `DirectoryView.remove` |
| RECOVERY | `restore_backup_started`, `restore_backup_completed`, `restore_backup_failed` | info / high | `restore*FromCloud/Local` w `App.tsx` |

**MVP-1B Recovery Events (2.62.41):** bez nowego źródła Audit Hub — wszystkie wpisy w `security_log`. Detail: `{ scope, source, backupSlot?, count?, message? }` lub `{ entryId }` — **bez payloadów backupów ani danych osobowych**.

**Sync:** AUX KEY (nie `DATA_KEYS`) — `persistKey`, `pullSecurityAuditLogFromCloud`, `recordSecurityAudit` → push pojedynczego klucza (bez pełnego `runCloudSync`).

**Nie obejmuje (MVP-1C):** auto-sync logging, sync conflict, inspector/worker login, eksport, alerty, migracja historycznego KV.

---

## 4. UI — `AuditHubView.tsx`

| Element | Opis |
|---------|------|
| KPI | Razem + licznik per źródło (6 kafli + Razem) |
| Filtry | Źródło · Osoba · Szukaj (treść, robota, akcja) |
| Tabela | Data · Źródło · Akcja · Kto · Opis — klik → Sheet |
| Paginacja | 50 wpisów / strona (`AUDIT_HUB_PAGE_SIZE`) |
| Inspektor | Osobny fetch `syncInspectorStatsFromCloud` + przycisk odśwież |
| Loading | Tylko spinner inspektora; reszta feedu z props App od razu |

---

## 5. Deep linki (`deeplink.ts` + `App.tsx`)

| `deepLink.kind` | Nawigacja | Uwagi |
|-----------------|-----------|-------|
| `operational_note` | `operationalnotes` + `noteId` + `openAudit` | `OperationalNotesView` auto-otwiera Sheet audytu |
| `inspector_view` | `inspector` | |
| `job` | `jobs` + `jobId` + `section` | sekcja z `resolveJobActivitySection` |
| `wm_print` | `wmprint` + `tab` (`historia` / `odbiory`) + opcjonalny `jobId` | |
| `none` | — | brak przycisku w Sheet |

Handler: `handleAuditHubDeepLink` w `App.tsx` · `viewReturn` z etykietą „Audit Hub”.

---

## 6. Testy (obowiązkowe przy zmianach)

```bash
npx vite-node scripts/test-security-audit-log.mjs      # MVP-1
npx vite-node scripts/test-audit-hub-adapters.mjs      # adapters + security_log
npx vite-node scripts/test-audit-hub-view-model.mjs      # view-model + security_log
npm run build
```

Przy release: workflow **B** — [`WORKFLOW-RELEASE-DEPLOY.md`](WORKFLOW-RELEASE-DEPLOY.md).

**Legacy P0 (view-model):** fixture z `actor`/`at`/`text` undefined we wszystkich źródłach — model nie może rzucać.

---

## 7. Pułapki (nie powtarzać)

| Pułapka | Skutek | Prewencja |
|---------|--------|-----------|
| Sort `.localeCompare` na polu ze źródła bez guard | Crash prod | `(x ?? "").localeCompare(...)` lub `feedAt`/`feedActor` |
| Adapter kopiuje pole 1:1 bez fallback | `undefined` w feedzie | Zawsze `feedAt` / `feedActor` na wyjściu |
| `appendJobActivity(job, type, text)` bez `actor` | Legacy `photo_upload` bez aktora | Zawsze 4. argument; wzorzec: `createdByName` |
| Zakładanie że LS = znormalizowany parser | Stare wpisy KV bez `displayName`/`at` | Adaptery defensywne, nie tylko typy TS |
| Nowy KV / `cloud-sync` bez briefu | Poza zakresem MVP-0 | Tylko na polecenie (MVP-1) |
| **Zamiana importu w `cloud-sync.ts` bez grep `mergeDataKey`** | **ReferenceError** przy auto sync (2.62.39→2.62.42) | Każdy helper w `case` musi mieć `import`; patrz [`SESSION-HANDOFF-2026-06-24.md`](SESSION-HANDOFF-2026-06-24.md) §4 |

---

## 8. Co robimy teraz / backlog

**Stream MVP-0 = CLOSED.** Panel jest używalny na prod po **2.62.37**.

| ID | Opis | Status |
|----|------|--------|
| **MVP-1** | Globalny security log — `kw-security-audit-log` | **CLOSED** (2.62.39) |
| **MVP-1B** | Recovery + data protection events w security_log | **CLOSED** (2.62.41) |
| **MVP-1C** | Sync logging, eksport, alerty | **OPEN** |
| **MVP-0C** | Eksport CSV/PDF feedu | **OPEN** |
| **MVP-0D** | Retencja / archiwizacja unified feed | **OPEN** |
| **MVP-0E** | Real-time push nowych wpisów (bez pełnego przeładowania) | **OPEN** |

**Nie zmieniaj bez polecenia:** struktura 5 źródeł, ACL Super Admin, brak zapisu do KV, lazy chunk `AuditHubView`.

---

## 9. Szybkie zadania dla agenta (cheat sheet)

| Zadanie użytkownika | Gdzie szukać |
|---------------------|--------------|
| Nowe źródło logów | `types.ts` → adapter w `adapters.ts` → `buildAuditFeed` → test adapters + view-model |
| Nowy filtr | `filters.ts` + `AuditHubView` + test view-model |
| Zmiana deep linku | `deeplink.ts` + `handleAuditHubDeepLink` w `App.tsx` |
| Crash przy otwarciu | Sprawdź `sortAuditFeed` + `collectAuditHubFilterOptions` + adaptery pod `undefined` |
| Uprawnienia | `acl.ts`, `admin-nav.ts`, guard w `App.tsx` |
| Copy / help | `GuideView.tsx` sekcja Audit Hub |

**Nie skanuj całego repo** — zacznij od tego pliku + `ARCHITECTURE.md` § 15.2 + grep `audit-hub`.

---

## 10. Commity referencyjne

```text
b2eed93  feat(audit-hub): MVP-0B Super Admin panel (2.62.36)
a0d7093  fix(audit-hub): P0 localeCompare crash hotfix (2.62.37)
2b8980c  feat(audit-hub): MVP-1 Security Log (2.62.39) — ⚠️ regresja importu cloud-sync
656a00c  feat(audit-hub): MVP-1B Recovery Events (2.62.41)
d799033  fix(cloud-sync): mergeDeliveryPackagePublications import (2.62.42)
```
