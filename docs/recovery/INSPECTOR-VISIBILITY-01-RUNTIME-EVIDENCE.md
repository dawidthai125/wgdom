# INSPECTOR-VISIBILITY-01 — Runtime evidence (urządzenie inspektora)

> **Status:** **OPEN** — czekamy na dowody z urządzenia Szymona  
> **Data:** 2026-07-08  
> **Bundle:** **INSPECTOR-VISIBILITY-01**  
> **Audyt KV:** [`INSPECTOR-VISIBILITY-01-AUDIT-REPORT.md`](./INSPECTOR-VISIBILITY-01-AUDIT-REPORT.md)  
> **Root cause:** **NOT CONFIRMED** — filtr prod OK (15× `szymon`, 2× Zofia)  
> **OWNER GO:** **WITHHELD** — PLAN dopiero po runtime PASS

```text
CEL:     Potwierdzić lub obalić symptom na urządzeniu inspektora
         (session · cache · sync · licznik widocznych robót).

ZAKAZ:   Implementacja · zmiana KV · batch-set · fix kodu — do OWNER GO.
```

---

## 0. Hipotezy do weryfikacji runtime

| ID | Hipoteza | Dowód obalający | Dowód potwierdzający |
|----|----------|-----------------|----------------------|
| **H-01** | Zalogowano **inne konto** niż Szymon (`session.id !== "szymon"`) | `session.id === "szymon"` | `id` = Zofia custom lub inny |
| **H-02** | **Pusty / stary** cache `kw-jobs` na urządzeniu | `jobsAllCount >= 15` po sync | `jobsAllCount === 0` lub brak `assignedInspectorId` |
| **H-03** | **Sync fail** — brak pull z chmury | `lastSync` OK, chmura = lokalnie | `pushFailed` / fetch error / 0 jobs po refresh |
| **H-04** | Symptom = **brak 2 robót MOPS** (Zofia), nie „zero” | `visibleCount === 15`, user expects 17 | user lists Chrobrego/Wysoka |
| **H-05** | **Filtr UI** „Aktywne” ukrywa roboty | `visibleCount` na „Wszystkie” = 15 | ten sam 0 na „Wszystkie” |
| **H-06** | **Stara wersja** app na urządzeniu | `version.json` = 2.63.13+ | wersja < 2.63.13 |

**Baseline KV (server):** 17 jobs · 15× `szymon` · 2× `custom-d3918ba7-…` (Zofia).

---

## 1. Procedura owner (5–10 min)

### Krok 1 — Kontekst

1. Urządzenie / przeglądarka, na której **Szymon** widzi problem.
2. https://www.wgdom.fun → **Inspektor** → login **Szymon** (nie admin).
3. Wejdź w zakładkę **Roboty** (lista inspektora).
4. Ustaw filtr **„Wszystkie”** (nie tylko „Aktywne”).
5. **Screenshot:** pełna lista + pasek sync (chmurka) u góry.

### Krok 2 — Snippet konsoli (read-only)

1. Otwórz DevTools (F12) → **Console**.
2. Wklej **cały** blok z §2 → Enter.
3. Skopiuj **JSON** z konsoli (lub screenshot wyniku).
4. Załącz do wątku / Notion / mail.

### Krok 3 — Pull-to-refresh

1. Na liście Roboty — **ściągnij w dół** (pull-to-refresh) lub tap ikony chmury (odśwież).
2. Powtórz snippet §2.
3. Porównaj `jobsAllCount` / `visibleCount` przed i po.

### Krok 4 — Opcjonalnie export cache (bez sekretów)

W konsoli po snippecie:

```javascript
copy(JSON.stringify({
  exportedAt: new Date().toISOString(),
  session: JSON.parse(sessionStorage.getItem("wg-admin-session") || "null"),
  jobCount: JSON.parse(localStorage.getItem("kw-jobs") || "[]").length,
  byInspector: (() => {
    const jobs = JSON.parse(localStorage.getItem("kw-jobs") || "[]");
    const m = {};
    for (const j of jobs) {
      const k = (j.assignedInspectorId || "(missing)").trim();
      m[k] = (m[k] || 0) + 1;
    }
    return m;
  })(),
}, null, 2));
```

Wklej schowek do pliku `inspector-device-evidence-YYYY-MM-DD.json` — **nie commituj** do repo (dane operacyjne).

---

## 2. Snippet konsoli — SSOT pól (v2 — RCA)

**Użyj wersji z pełną diagnostyką tombstone + `assignedInspectorIds`:**

→ [`INSPECTOR-VISIBILITY-01-RCA-INVESTIGATION.md`](./INSPECTOR-VISIBILITY-01-RCA-INVESTIGATION.md) **§2**

Pola obowiązkowe w raporcie owner:

| Pole | Źródło |
|------|--------|
| `session.id` | snippet |
| `session.role` | snippet |
| `jobs.length` | snippet |
| `visibleJobs` | snippet (`visibleJobs.length`) |
| `assignedInspectorIds` | snippet |
| `tombstones.deletedIdsCount` | snippet |
| `tombstones.tombstoneHitsOnCurrentJobs` | snippet |
| `diagnosis` | snippet |

### Snippet v1 (legacy — nadal działa)

<details>
<summary>v1 — uproszczony</summary>

```javascript
(async () => {
  const sessionRaw = sessionStorage.getItem("wg-admin-session");
  const mode = sessionStorage.getItem("wg-session-mode");
  let session = null;
  try { session = sessionRaw ? JSON.parse(sessionRaw) : null; } catch {}

  let jobs = [];
  try { jobs = JSON.parse(localStorage.getItem("kw-jobs") || "[]"); } catch {}
  if (!Array.isArray(jobs)) jobs = [];

  const inspectorId = (session?.id || "").trim();
  const visible = jobs.filter((j) => (j.assignedInspectorId || "").trim() === inspectorId);

  const byInspector = {};
  for (const j of jobs) {
    const k = (j.assignedInspectorId || "(missing)").trim();
    if (!byInspector[k]) byInspector[k] = [];
    byInspector[k].push({ id: String(j.id).slice(0, 8), address: (j.address || "").slice(0, 50) });
  }

  let appVersion = null;
  try { appVersion = await (await fetch("/version.json", { cache: "no-store" })).json(); } catch (e) { appVersion = { error: String(e) }; }

  const report = {
    capturedAt: new Date().toISOString(),
    wgSessionMode: mode,
    session: session ? { id: session.id, login: session.login, displayName: session.displayName, role: session.role } : null,
    appVersion,
    jobs: { length: jobs.length, visibleJobs: visible.length },
    assignedInspectorIds: Object.keys(byInspector),
    diagnosis: !session ? "NO_SESSION" : session.role !== "inspector" ? "NOT_INSPECTOR_ROLE"
      : jobs.length === 0 ? "EMPTY_JOBS_CACHE"
      : visible.length === 0 ? "SESSION_ID_NOT_IN_ASSIGNED_SET"
      : visible.length >= 15 ? "MATCHES_OR_EXCEEDS_KV" : "PARTIAL_VISIBLE_VS_KV",
  };
  console.log(JSON.stringify(report, null, 2));
  return report;
})();
```

</details>

---

## 3. Macierz interpretacji `diagnosis`

| `diagnosis` | Znaczenie | Następny krok |
|-------------|-----------|---------------|
| `NO_SESSION` | Brak sesji w sessionStorage | Ponowne logowanie Inspektor |
| `NOT_INSPECTOR_ROLE` | Sesja admina, nie inspektora | Wyloguj → Inspektor |
| `WRONG_INSPECTOR_ACCOUNT` | `session.id` ≠ `szymon` | Potwierdź login (np. Zofia) |
| `EMPTY_JOBS_CACHE` | `kw-jobs` puste w LS | Pull sync · sieć · screenshot chmurki |
| `FILTER_ZERO_ALL_JOBS_OTHER_INSPECTOR` | Są roboty, żadna nie ma `assignedInspectorId === session.id` | Export `byInspectorCounts` · porównaj z adminem |
| `PARTIAL_VISIBLE_VS_KV` | Widzi < 15 | Stary cache / częściowy merge |
| `MATCHES_KV_SZYMON_15` | **15 widocznych** — zgodne z KV | Symptom = **brak 2 robót Zofii** (H-04) · ops reassign lub OK |
| `MORE_THAN_KV_UNEXPECTED` | > 15 | Świeże dane lokalne niezsynchronizowane z audytem — powtórz probe KV |

---

## 4. Pola obowiązkowe w raporcie owner

| Pole | Źródło |
|------|--------|
| `session.id` | snippet |
| `session.login` / `displayName` | snippet |
| `visibleCount` | snippet |
| `jobsAllCount` | snippet |
| `byInspectorCounts` | snippet |
| `appVersion.version` | snippet |
| `diagnosis` | snippet |
| Screenshot listy Roboty | owner |
| Sync badge (zielony / czerwony / „Zapis…”) | screenshot |
| Filtr listy (Aktywne / Wszystkie) | screenshot |
| Opis symptomu słowny | owner: **0 robót** vs **brak konkretnych** |

---

## 5. Porównanie z prod KV (zespół dev)

Po otrzymaniu evidence z urządzenia:

```bash
npx vite-node scripts/audit-inspector-visibility-readonly.mjs
```

| Porównanie | Werdykt |
|------------|---------|
| Device `visibleCount` = KV `szymonVisibleCount` | **Brak buga filtra** — zamknąć jako ops/UX lub H-04 |
| Device `visibleCount` = 0, KV = 15 | **Bug sync/cache** — PLAN Fix sync diagnostics |
| Device `session.id` ≠ `szymon` | **User error / wrong account** — brak kodu |
| Device `jobsAllCount` = 0 | **Sync/network** — PLAN |

---

## 6. Workflow

```text
AUDIT (KV)           ✅ COMPLETE — 15× szymon server-side
RUNTIME CONFIRMED    ✅ 0 jobs dashboard · sync SUCCESS
RCA INVESTIGATION    ⏸ OPEN ← CURRENT (JSON §2 wymagany)
PLAN                 ⛔ WITHHELD
OWNER GO             ⛔ WITHHELD
IMPLEMENT            ⛔ BLOCKED
```

---

## 7. Następny krok

1. **Owner (Szymon):** §1 + snippet §2 + screenshot.  
2. **Dev:** porównanie z §5.  
3. Dopiero po **potwierdzonym** `diagnosis` → **PLAN** (jeśli w ogóle potrzebny).

**Zero implementacji** · **OWNER GO WITHHELD**.

---

*SSOT runtime evidence · INSPECTOR-VISIBILITY-01*
