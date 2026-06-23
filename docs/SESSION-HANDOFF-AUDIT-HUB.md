# SESSION HANDOFF — Audit Hub (MVP-0A → MVP-0B + P0 hotfix)

> **Status streamu:** **MVP-0 CLOSED** (0A lib · 0B UI · P0 localeCompare hotfix)  
> **Data closeout:** 2026-06-23  
> **Prod baseline:** **v2.62.37** · commit **`a0d7093`** (hotfix) · MVP-0B **`b2eed93`**  
> **Architektura:** [`ARCHITECTURE.md`](ARCHITECTURE.md) § **15.2**  
> **SSOT projektu:** [`PROJECT-HANDOFF-CURRENT.md`](PROJECT-HANDOFF-CURRENT.md)

---

## 1. Co to jest (dla agenta — czytaj NAJPIERW)

**Audit Hub** = read-only panel Super Admina agregujący **istniejące** logi z 5 źródeł w jeden timeline. **Bez nowego KV**, **bez zmian** `cloud-sync.ts` / Edge.

| To JEST | To NIE JEST |
|---------|-------------|
| Agregacja + filtry + deep linki do modułów źródłowych | Globalny security log admina (backlog MVP-1) |
| Widok `audit` w menu admina (ikona Shield) | Duplikat audit UI notatek operacyjnych (P2C Sheet) |
| Read-only prezentacja | Zapis / edycja danych źródłowych |

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
  adapters.ts        ← 5 adapterów + buildAuditFeed + sortAuditFeed + dedupe
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
  test-audit-hub-adapters.mjs    ← T1–T15 (47 PASS)
  test-audit-hub-view-model.mjs  ← filtry, KPI, deep linki, legacy P0 (32 PASS)
```

### 3.2 Przepływ danych (UI)

```text
App.tsx (props)
  operationalNotesAuditLog  ← LS kw-operational-notes-audit-log
  jobs[]                    ← kw-jobs (activityLog per job)
  wmPrintHistory            ← kw-wm-print-history
  deliveryPackagePublications ← kw-delivery-package-publications
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
| `source` | tak | jeden z 5 enumów |
| `action` / `actionLabel` | tak | |
| `summary` | tak | job_activity: `(text ?? "").trim() \|\| actionLabel` |
| `actorUserId` | opcjonalne | filtr „Osoba” dopasowuje też userId |
| `detail`, `jobId`, `jobLabel`, `noteId` | opcjonalne | |
| `deepLink` | tak | nawigacja do modułu źródłowego |
| `nativeId` | tak | id w źródle |

### 3.4 Pięć adapterów (`adapters.ts`)

| Adapter | Źródło wejścia | Pole `at` | Pole `actor` | Normalizacja źródła |
|---------|----------------|-----------|--------------|---------------------|
| `adaptOperationalNotesAudit` | `OperationalNoteAuditEntry[]` | `entry.at` | `displayName` → fallback `userId` | **brak** w Audit Hub (surowy LS) |
| `adaptInspectorLoginEvents` | `InspectorStatsEvent[]` | `event.at` | `displayName` → fallback `"Inspektor"` | **brak** (surowe KV) |
| `adaptJobActivityLog` | `jobs[].activityLog[]` | `ev.at` | `ev.actor` → fallback `"Administrator"` | **brak** |
| `adaptWmPrintHistory` | `WmPrintHistoryEntry[]` | `timestamp` | `userName` | **tak** — `normalizeWmPrintHistory()` |
| `adaptDeliveryPackagePublications` | `DeliveryPackagePublication[]` | `publishedAt` | `publishedByUserName` | **brak** w adapterze |

**P0 reguła:** każdy adapter musi zwracać `at: string` i `actor: string` — używaj `feedAt()` / `feedActor()`.

### 3.5 Źródła KV (istniejące — nie dodawać nowych dla MVP-0)

| Źródło `AuditFeedSource` | Klucz / pole | Cap | Etykieta PL |
|--------------------------|--------------|-----|-------------|
| `operational_notes` | `kw-operational-notes-audit-log` | 3000 | Notatki operacyjne |
| `inspector_login` | `kw-inspector-stats` → `events[]` | 300 | Inspektor · logowania |
| `job_activity` | `kw-jobs` → `job.activityLog[]` | 200 / robota | Roboty |
| `wm_print` | `kw-wm-print-history` | 1000 | WM Druk |
| `delivery_package` | `kw-delivery-package-publications` | 500 | Pakiety odbiorowe |

**Nie obejmuje:** logowanie admina, sync/merge, payroll, przetargi.

---

## 4. UI — `AuditHubView.tsx`

| Element | Opis |
|---------|------|
| KPI | Razem + licznik per źródło (5 kafli) |
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
npx vite-node scripts/test-audit-hub-adapters.mjs      # 47 PASS
npx vite-node scripts/test-audit-hub-view-model.mjs      # 32 PASS (w tym legacy P0)
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

---

## 8. Co robimy teraz / backlog

**Stream MVP-0 = CLOSED.** Panel jest używalny na prod po **2.62.37**.

| ID | Opis | Status |
|----|------|--------|
| **MVP-1** | Globalny security log — `kw-security-audit-log` (logowania admina, sync) | **OPEN** — tylko na polecenie |
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
```
