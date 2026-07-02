# AUDIT HUB — Freshness Regression (AH-REG-1) · DESIGN FREEZE

> **Status:** **DESIGN FREEZE DRAFT** — czeka na akceptację właściciela repo · **IMPLEMENT: NO GO**  
> **Data freeze:** 2026-07-01 · **wersja dokumentu:** v1.0  
> **Baseline prod:** **v2.63.24** (`727e6c4`) · **STABILIZATION WINDOW:** ACTIVE  
> **Audyt źródłowy:** Audit Hub event pipeline audit (2026-07-01, READ ONLY) — **zatwierdzony**  
> **Powiązane (CLOSED):** [`SESSION-HANDOFF-AUDIT-HUB.md`](SESSION-HANDOFF-AUDIT-HUB.md) · [`ARCHITECTURE.md`](ARCHITECTURE.md) §15

---

## 0. Werdykt freeze

| Pole | Wartość |
|------|---------|
| **Bundle** | **AH-REG-1** — Audit Hub Freshness Regression |
| **Epic** | Audit Hub (poza MVP-1C) |
| **Principles** | **Brak nowych** — #001–#013 bez zmian |
| **Nowe pole KV** | **Brak** |
| **Zmiana merge/sync** | **Brak semantyki merge** — wyłącznie pull AUX po sync + odświeżenie stanu React |
| **Deploy** | **Vercel** (frontend only) |
| **IMPLEMENT** | **Zabroniony** do akceptacji tego dokumentu |

```text
AUDIT AH-REG-1:   COMPLETE
DESIGN FREEZE:    DRAFT — oczekuje akceptacji właściciela repo
IMPLEMENT:        NO GO
```

---

## 1. Goal

**Problem:** Audit Hub pokazuje wpisy `security_log` (i częściowo inne AUX) **nieaktualne** w bieżącej sesji admina — użytkownik wykonuje akcję (np. usunięcie z katalogu, logowanie, zmiana hasła), otwiera Audit Hub i **nie widzi** świeżego wpisu do czasu przełączenia karty / focus pull albo przeładowania strony.

**Cel AH-REG-1:** Przywrócić **świeżość feedu** bez rozszerzania możliwości Audit Hub — te same 7 źródeł, ta sama taksonomia zdarzeń, read-only Hub.

**Sukces biznesowy:** Super Admin widzi w Audit Hub wpisy `security_log` zapisane w tej samej sesji **natychmiast** po akcji oraz po ręcznym/auto **cloud sync** — bez konieczności odświeżania strony.

**Nie jest celem:** logowanie payroll, synców, edge ani nowych kategorii zdarzeń.

---

## 2. RCA summary

| Warstwa | As-is | Root cause |
|---------|-------|------------|
| **Zapis security** | `recordSecurityAudit` → `localStorage` + push KV | Działa poprawnie |
| **Stan React w App** | `useLocalStorage(SECURITY_AUDIT_LOG_KEY)` | Aktualizowany tylko przez `logSecurityAudit` / pull — **nie** przez bezpośrednie `recordSecurityAudit` |
| **Callery bez refresh** | `LoginScreen`, `AppInnerWithAuth`, `admin-auth.ts`, `DirectoryView` | Wołają `recordSecurityAudit` **poza** `App.logSecurityAudit` |
| **`useLocalStorage`** | `storage` event tylko cross-tab | Ten sam tab nie dostaje eventu przy zapisie z innego modułu |
| **`runCloudSync`** | pull `DATA_KEYS` + op. notes aux | **Nie** woła `pullSecurityAuditLogFromCloud` / `pullWmDrukAuditLogFromCloud` |
| **`pullFromCloudAndMerge`** | pull security + wm-druk aux | Działa — stąd wpisy „pojawiają się po focus karty” |

**Nie jest root cause AH-REG-1:** v2.63.24 RB restore banner (`727e6c4`) — **zero** zmian w `audit-hub/*`, `security-audit-log.ts`, `AuditHubView.tsx`. Payroll B3–B6 — bez zmian pipeline audytu.

**Scenariusz referencyjny (E1):**

```text
1. Admin zalogowany, Audit Hub zamknięty
2. DirectoryView.remove() → recordSecurityAudit → LS zaktualizowany
3. App.securityAuditLog (React) — STALE
4. Otwarcie Audit Hub → brak wpisu „Usunięto pracownika z katalogu”
5. Alt-tab → pullFromCloudAndMerge → wpis widoczny (false „regresja”)
```

**Scenariusz referencyjny (E2):**

```text
1. Admin A zapisuje security event → push do chmury
2. Admin B (inna karta) → runCloudSync (bez focus pull)
3. securityAuditLog state STALE do focus / reload
```

---

## 3. Current architecture (as-is)

### 3.1 Audit Hub — bez zmian w AH-REG-1

```text
buildAuditFeed() — 7 źródeł (adapters.ts)
  operational_notes | inspector_login | job_activity
  wm_print | wm_druk | delivery_package | security_log

AuditHubView — read-only, Super Admin, props z App.tsx
```

### 3.2 Ścieżki zapisu `security_log`

| Caller | Refresh App state? |
|--------|------------------|
| `App.logSecurityAudit` | **TAK** — `.then()` → read LS → `setSecurityAuditLog` |
| `AppInnerWithAuth` (login/logout) | **NIE** |
| `LoginScreen` (failed login) | **NIE** |
| `admin-auth.ts` (permissions) | **NIE** |
| `DirectoryView.remove` | **NIE** |

### 3.3 Ścieżki pull AUX

| Funkcja | `pullSecurityAuditLogFromCloud` | `pullWmDrukAuditLogFromCloud` |
|---------|--------------------------------|-------------------------------|
| `pullFromCloudAndMerge` | **TAK** | **TAK** |
| `runCloudSync` | **NIE** | **NIE** |

`recordWmDrukAudit` — ścieżka przez `App.onRecordWmDrukAudit` już odświeża stan; **poza scope** AH-R1 (chyba że pull w sync naprawia cross-device).

---

## 4. Proposed design (FREEZE)

### 4.1 AH-R1 — Centralized security audit state refresh

**FREEZE DECISION:** **Subscriber / notify w `security-audit-log.ts`** — bez zmiany call site’ów i bez nowego React Context.

```text
// security-audit-log.ts (nowe, minimalne)

SECURITY_AUDIT_LOG_CHANGED_EVENT = "wg-security-audit-log-changed"

notifySecurityAuditLogChanged(): void
  → dispatchEvent(CustomEvent) w window (browser only)

recordSecurityAudit(...):
  ... istniejący append + merge + LS + push ...
  notifySecurityAuditLogChanged()

// App.tsx

useEffect(() => {
  const refresh = () => {
    try {
      const raw = localStorage.getItem(SECURITY_AUDIT_LOG_KEY);
      setSecurityAuditLog(normalizeSecurityAuditLog(raw ? JSON.parse(raw) : []));
    } catch { /* ignore */ }
  };
  window.addEventListener(SECURITY_AUDIT_LOG_CHANGED_EVENT, refresh);
  return () => window.removeEventListener(...);
}, [setSecurityAuditLog]);
```

**Uzasadnienie:**

- **Reuse first** — jeden hook w `recordSecurityAudit` (SSOT zapisu).
- **Zero duplicate logic** — `logSecurityAudit` może **zostawić** istniejący `.then(refresh)` lub uprościć do samego `recordSecurityAudit` (notify wystarczy); IMPLEMENT wybiera mniejszy diff.
- **Bez** nowych KV, **bez** zmiany `SecurityAuditAction` / kategorii.
- **Bez** refaktoru `admin-auth` / `DirectoryView` / `LoginScreen`.

**Odrzucone w freeze:**

| Opcja | Powód |
|-------|--------|
| React Context `AuditLogProvider` | Większy diff, threading props |
| Wymuszenie `logSecurityAudit` wszędzie | Inwazyjne; `admin-auth` poza drzewem App |
| Polling LS w AuditHubView | Koszt / hack |

### 4.2 AH-R2 — Refresh AUX audit logs in `runCloudSync`

**FREEZE DECISION:** Po udanym merge/push w `runCloudSync`, wykonać **ten sam** pull AUX co w `pullFromCloudAndMerge` dla kluczy audytu Hub.

```text
// Wspólny helper (lokalizacja FREEZE: App.tsx private callback LUB cloud-sync.ts export)

async function refreshAuditHubAuxFromCloud(): Promise<void> {
  try {
    const securityLog = await pullSecurityAuditLogFromCloud();
    setSecurityAuditLog(securityLog);
  } catch { /* offline */ }
  try {
    const wmDrukLog = await pullWmDrukAuditLogFromCloud();
    setWmDrukAuditLog(wmDrukLog);
  } catch { /* offline */ }
}

pullFromCloudAndMerge:
  ... existing ...
  await refreshAuditHubAuxFromCloud()   // zastępuje zduplikowane try bloki

runCloudSync (w try, po pushOperationalNotesToCloud, przed setSyncStatus saved):
  await refreshAuditHubAuxFromCloud()
```

**Zakres AUX w AH-R2:** wyłącznie `kw-security-audit-log` + `kw-wm-druk-audit-log`.

**Operational notes aux** — już w `runCloudSync`; **bez zmian**.

**Semantyka merge** — `pullSecurityAuditLogFromCloud` / `pullWmDrukAuditLogFromCloud` **bez zmian** (istniejące `merge*` + cap).

### 4.3 Zachowane (explicit)

| Element | Status |
|---------|--------|
| 7 źródeł Audit Hub | **Bez zmian** |
| `SecurityAuditAction` enum | **Bez zmian** |
| `SecurityAuditCategory` (w tym SYNC, SYSTEM) | **Bez nowych writerów** |
| `AuditHubView` UI / filtry / paginacja | **Bez zmian** (opcjonalnie copy „7 źródeł” bez zmian) |
| `recordSecurityAudit` push pojedynczego klucza | **Bez zmian** |
| Edge `batch-get` / `batch-set` | **Bez zmian** |
| ACL Super Admin | **Bez zmian** |
| Read-only Hub | **Bez zmian** |

---

## 5. Scope

### 5.1 Bundle AH-REG-1 — zakres IMPLEMENT

| ID | Element | Opis |
|----|---------|------|
| **AH-R1** | `notifySecurityAuditLogChanged` + listener w `App.tsx` | §4.1 |
| **AH-R2** | `refreshAuditHubAuxFromCloud` + wire w `runCloudSync` + DRY w `pullFromCloudAndMerge` | §4.2 |
| **AH-R3** | Test `scripts/test-audit-hub-freshness-ah-reg-1.mjs` | **NOWY** — notify + structural runCloudSync |
| **AH-R4** | Docs | `CHANGELOG.md`, `changelog-data.ts`, `ARCHITECTURE.md` §15 — jedna linia każdy |

### 5.2 Pliki objęte IMPLEMENT

| Plik | Zmiana |
|------|--------|
| `src/lib/security-audit-log.ts` | `notifySecurityAuditLogChanged`, wywołanie z `recordSecurityAudit` |
| `src/app/App.tsx` | listener + `refreshAuditHubAuxFromCloud`; `runCloudSync` + DRY `pullFromCloudAndMerge` |
| `scripts/test-audit-hub-freshness-ah-reg-1.mjs` | **NOWY** |
| `CHANGELOG.md` + `src/app/changelog-data.ts` | po IMPLEMENT |
| `docs/ARCHITECTURE.md` §15 | notka AH-REG-1 |

### 5.3 Bez zmian (explicit)

| Warstwa | Powód |
|---------|--------|
| `src/lib/audit-hub/*` | Feed/adapters OK — problem stanu App, nie agregacji |
| `AuditHubView.tsx` | Brak zmian UI (opcjonalny przycisk „odśwież security” — **ODRZUCONE**) |
| `recordWmDrukAudit` notify | `onRecordWmDrukAudit` już refreshuje; AH-R2 pull w sync wystarczy cross-tab |
| `LoginScreen` / `admin-auth` / `DirectoryView` | AH-R1 przez notify w lib |
| Payroll save / restore / archive | **Out of scope** |
| MVP-1C sync logging | **Out of scope** |
| Edge | **Out of scope** |

---

## 6. Out of scope

| Element | Powód |
|---------|--------|
| Nowe `SecurityAuditAction` (payroll_*) | User freeze — payroll audit |
| Użycie kategorii `SYNC` / `SYSTEM` | User freeze |
| Edge-side audit KV / middleware | User freeze |
| 8. źródło Audit Hub | User freeze |
| Pull inspector stats w `runCloudSync` | Osobny fetch w `AuditHubView`; nie AUX KV |
| Zmiana cap / merge algorytmów | Ryzyko regresji MVP-1 |
| Nowe KV / Principles #014+ | Zakaz |
| `TEST-INFRA-001` Playwright | Osobny epic |

---

## 7. Test plan (pre-release)

| Suite | Oczekiwany wynik |
|-------|------------------|
| `test-audit-hub-freshness-ah-reg-1.mjs` | **PASS** — T1 notify po `recordSecurityAudit`; T2 `runCloudSync` zawiera aux pull |
| `test-security-audit-log.mjs` | **PASS** (regresja MVP-1) |
| `test-audit-hub-adapters.mjs` | **PASS** |
| `test-audit-hub-view-model.mjs` | **PASS** |
| `npm run build` | **PASS** |

### Matryca AH-R3 (propozycja)

| ID | Scenariusz | Expected |
|----|------------|----------|
| T1 | `recordSecurityAudit` → listener count / mock dispatch | event fired |
| T2 | `App.tsx` source — `runCloudSync` wywołuje `pullSecurityAuditLogFromCloud` | structural grep |
| T3 | `App.tsx` source — `runCloudSync` wywołuje `pullWmDrukAuditLogFromCloud` | structural grep |
| T4 | `pullFromCloudAndMerge` używa wspólnego helpera (brak triple duplicate) | structural |

---

## 8. Acceptance criteria

1. Po `DirectoryView.remove` wpis `directory_delete` widoczny w Audit Hub **bez** reload i **bez** alt-tab (ta sama karta).
2. Po `runCloudSync` (ręczny retry sync) stan `securityAuditLog` i `wmDrukAuditLog` zaktualizowany z chmury.
3. `pullFromCloudAndMerge` zachowuje dotychczasowe pull AUX (regresja zero).
4. Brak nowych akcji/kategorii w `security_log`.
5. 7 źródeł feedu bez zmian.
6. Testy §7 PASS + build PASS.

---

## 9. Rollback

1. Revert commit AH-REG-1 na Vercel → **v2.63.24** / `727e6c4`
2. KV bez migracji — dane audytu nietknięte

---

## 10. Release

| Pole | Wartość |
|------|---------|
| **Wersja docelowa** | **2.63.25** (patch) |
| **Deploy** | Vercel only |
| **Edge** | Not required |

---

## 11. Werdykt

| Gate | Status |
|------|--------|
| AUDIT | **COMPLETE** |
| DESIGN FREEZE | **DRAFT** — oczekuje akceptacji |
| IMPLEMENT | **NO GO** |

---

*SSOT: [`SESSION-HANDOFF-AUDIT-HUB.md`](SESSION-HANDOFF-AUDIT-HUB.md) · [`ARCHITECTURE.md`](ARCHITECTURE.md) §15*
