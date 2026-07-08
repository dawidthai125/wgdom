# INSPECTOR-VISIBILITY-01 — RCA Investigation (runtime confirmed)

> **Status:** **RUNTIME ISSUE CONFIRMED** · **ROOT CAUSE INVESTIGATION** · **IMPLEMENT BLOCKED**  
> **Data:** 2026-07-08  
> **Symptom (owner):** Szymon Szóstak · sync **SUCCESS** · Dashboard **0 jobs**  
> **KV contradiction:** Server `filterJobsForInspector(..., "szymon")` = **15** (probe 2026-07-08)  
> **OWNER GO:** **WITHHELD**

```text
Potwierdzono: problem jest po stronie RUNTIME (urządzenie / cache / merge),
nie w server KV assignment (15× szymon jest poprawne).

Nadal brak pełnego JSON z urządzenia — werdykt RC wymaga snippet §2.
```

---

## 1. Decision tree (po runtime JSON)

```text
jobs.length === 0 ?
├─ TAK → gałąź A (dane nie załadowane / wytombstonowane)
└─ NIE → jobs.length > 0 && visibleJobs.length === 0 ?
         ├─ TAK → gałąź B (session.id ≠ assignedInspectorId)  ← PRIMARY HYPOTHESIS
         └─ NIE → gałąź C (visible > 0 — UI/filter dashboard; mało prawdopodobne przy „0 jobs”)
```

| Gałąź | Warunek | Najbardziej prawdopodobna przyczyna |
|-------|---------|-------------------------------------|
| **A** | `jobs.length === 0` | **H-TOMB-DEVICE** — `kw-jobs-deleted-ids` na urządzeniu zawiera ID aktywnych robót · lub pusty `cloudJobs` + pusty LS |
| **B** | `jobs.length > 0`, `visible === 0` | **H-ID-MISMATCH** — `session.id` nie występuje w `assignedInspectorIds` · lub wszystkie roboty mają inne `assignedInspectorId` |
| **C** | `visible > 0` | Dashboard KPI / filtr — **unlikely** przy zgłoszeniu „0 jobs” |

---

## 2. Enhanced runtime snippet (OBOWIĄZKOWY)

Wklej na urządzeniu Szymona (panel inspektora, po sync SUCCESS):

```javascript
(async () => {
  const session = JSON.parse(sessionStorage.getItem("wg-admin-session") || "null");
  const inspectorId = (session?.id || "").trim();

  let jobsRaw = [];
  try { jobsRaw = JSON.parse(localStorage.getItem("kw-jobs") || "[]"); } catch {}
  if (!Array.isArray(jobsRaw)) jobsRaw = [];

  let deletedIds = [];
  try { deletedIds = JSON.parse(localStorage.getItem("kw-jobs-deleted-ids") || "[]"); } catch {}
  if (!Array.isArray(deletedIds)) deletedIds = [];

  const jobIds = new Set(jobsRaw.map((j) => j?.id).filter(Boolean));
  const tombstoneHits = deletedIds.filter((id) => jobIds.has(id));
  const assignedSet = [...new Set(jobsRaw.map((j) => (j?.assignedInspectorId || "(missing)").trim()))];

  const visibleJobs = jobsRaw.filter(
    (j) => (j?.assignedInspectorId || "").trim() === inspectorId,
  );

  const simulateAfterTombstone = jobsRaw.filter(
    (j) => j?.id && !deletedIds.includes(j.id),
  );
  const visibleAfterTombstone = simulateAfterTombstone.filter(
    (j) => (j?.assignedInspectorId || "").trim() === inspectorId,
  );

  let appVersion = null;
  try {
    appVersion = await (await fetch("/version.json", { cache: "no-store" })).json();
  } catch (e) {
    appVersion = { error: String(e) };
  }

  const diagnosis = (() => {
    if (!session) return "NO_SESSION";
    if (session.role !== "inspector") return "NOT_INSPECTOR_ROLE";
    if (jobsRaw.length === 0) return "EMPTY_JOBS_CACHE";
    if (tombstoneHits.length === jobsRaw.length) return "ALL_JOBS_TOMBSTONED_LOCALLY";
    if (tombstoneHits.length > 0) return "PARTIAL_TOMBSTONE_COLLISION";
    if (visibleJobs.length === 0) {
      if (!assignedSet.includes(inspectorId)) return "SESSION_ID_NOT_IN_ASSIGNED_SET";
      return "FILTER_ZERO_UNKNOWN";
    }
    if (visibleJobs.length < 15) return "PARTIAL_VISIBLE_VS_KV";
    if (visibleJobs.length >= 15) return "MATCHES_OR_EXCEEDS_KV";
    return "UNKNOWN";
  })();

  const report = {
    capturedAt: new Date().toISOString(),
    session: session
      ? { id: session.id, login: session.login, displayName: session.displayName, role: session.role }
      : null,
    appVersion,
    jobs: { length: jobsRaw.length, visibleJobs: visibleJobs.length },
    assignedInspectorIds: assignedSet,
    tombstones: {
      deletedIdsCount: deletedIds.length,
      tombstoneHitsOnCurrentJobs: tombstoneHits.length,
      tombstoneHitSample: tombstoneHits.slice(0, 5),
      jobsAfterTombstoneSim: simulateAfterTombstone.length,
      visibleAfterTombstoneSim: visibleAfterTombstone.length,
    },
    diagnosis,
    kvBaseline: { expectedSzymonVisible: 15, expectedTotalJobs: 17 },
  };

  console.log("INSPECTOR-VISIBILITY-01 RCA RUNTIME");
  console.log(JSON.stringify(report, null, 2));
  return report;
})();
```

### Pola wymagane w raporcie owner

| Pole | Cel |
|------|-----|
| `session.id` | Porównanie z `assignedInspectorIds` |
| `session.role` | Potwierdzenie trybu inspektora |
| `jobs.length` | Gałąź A vs B |
| `visibleJobs` (= `visibleJobs.length`) | Symptom dashboard |
| `assignedInspectorIds` | Czy zawiera `"szymon"` |
| `diagnosis` | Automatyczna klasyfikacja |
| `tombstones.tombstoneHitsOnCurrentJobs` | H-TOMB-DEVICE |

---

## 3. Hipotezy szczegółowe

### H-ID-MISMATCH (PRIMARY — gałąź B)

**Mechanizm:** `filterJobsForInspector` — strict `===` na `AdminSession.id`.

| Sprawdzenie | Oczekiwane (Szymon builtin) |
|-------------|----------------------------|
| `session.id` | `"szymon"` |
| `assignedInspectorIds` zawiera | `"szymon"` |

**Możliwe odchylenia:**

| Odchylenie | Skutek |
|------------|--------|
| Zalogowano **Zofia** (`custom-d3918ba7-…`) | 2 roboty, nie 0 — **nie pasuje do symptom 0** |
| `session.id` poprawne, cache bez `assignedInspectorId` | `visibleJobs = 0` przy `jobs.length > 0` |
| Stary cache sprzed migracji na urządzeniu **bez** udanego merge z chmurą | jak wyżej |

**Kod:** `loadAdminSessionFromStorage()` **nadpisuje** sesję z konta po `parsed.id` — `session.id` powinno być kanoniczne. Werdykt wymaga JSON.

### H-TOMB-DEVICE (PRIMARY — gałąź A)

**Mechanizm:** `InspectorPanel.refreshFromCloud`:

```text
mergedDeleted = union(local kw-jobs-deleted-ids, cloud kw-jobs-deleted-ids)
mergeJobsById(local, cloud, mergedDeleted) → filtruje ID z tombstonów
```

| Fakt (server KV) | Wartość |
|------------------|---------|
| `deletedIds` w chmurze | 45 (historyczne) |
| Aktywne roboty po tombstone | **17** (żaden aktywny ID nie jest w tombstone) |

**Na urządzeniu** lokalna lista tombstonów może być **nadmiarowa** (union nigdy nie usuwa). Jeśli zawiera 17 aktualnych UUID → **`jobs.length === 0`** po merge → Dashboard 0 · sync SUCCESS.

**Dowód:** `tombstoneHitsOnCurrentJobs === jobs.length` lub `jobs.length === 0` + duży `deletedIdsCount`.

### H-EMPTY-NORMALIZE (gałąź A secondary)

`normalizeJobsValue` odrzuca rekordy bez `address` i `client` i ze złym `status`. Mało prawdopodobne dla wszystkich 17 na serwerze (probe ma 17).

### H-SYNC-FALSE-POSITIVE

Sync badge **SUCCESS** = `refreshFromCloud` try-block zakończony + `lastSyncedAt` ustawione. **Nie gwarantuje** `jobs.length > 0` — tylko że fetch/merge path się wykonał.

---

## 4. Server vs device — tabela sprzeczności

| Metryka | Server KV | Device (owner) | Wniosek |
|---------|-----------|----------------|---------|
| Jobs po assignment | 15× szymon | 0 visible | **Device ≠ KV** |
| Sync | N/A | SUCCESS | Merge/cache/tombstone |
| Filter bug | **Brak dowodu** | — | RC nie w filtrze server-side |

---

## 5. Proposed minimal fix (INVESTIGATION ONLY — nie implementować)

| `diagnosis` | Minimal fix (przyszły PLAN) |
|-------------|------------------------------|
| `ALL_JOBS_TOMBSTONED_LOCALLY` | Ops: wyczyść `kw-jobs-deleted-ids` na urządzeniu · pull refresh · **lub** kod: inspector nie merguje tombstonów które kasują cały aktywny zestaw |
| `SESSION_ID_NOT_IN_ASSIGNED_SET` | Ops: reassign w admin · **lub** naprawa cache (force cloud wins na `assignedInspectorId`) |
| `EMPTY_JOBS_CACHE` | Diagnostyka fetch / sieć · pull-to-refresh |
| `MATCHES_OR_EXCEEDS_KV` | Problem w UI dashboard — osobna gałąź (unlikely) |

**OWNER GO:** WITHHELD do jednego potwierdzonego `diagnosis` z §2.

---

## 6. Workflow

```text
AUDIT (KV)           ✅ COMPLETE
RUNTIME CONFIRMED    ✅ (0 jobs · sync OK)
RCA INVESTIGATION    ⏸ OPEN ← CURRENT (czeka na JSON §2)
PLAN                 ⛔ WITHHELD
OWNER GO             ⛔ WITHHELD
IMPLEMENT            ⛔ BLOCKED
```

---

## 7. Powiązane

- [`INSPECTOR-VISIBILITY-01-AUDIT-REPORT.md`](./INSPECTOR-VISIBILITY-01-AUDIT-REPORT.md)
- [`INSPECTOR-VISIBILITY-01-RUNTIME-EVIDENCE.md`](./INSPECTOR-VISIBILITY-01-RUNTIME-EVIDENCE.md)
- `scripts/audit-inspector-visibility-readonly.mjs` — probe KV

---

*RCA investigation · zero implementacji · OWNER GO WITHHELD*
