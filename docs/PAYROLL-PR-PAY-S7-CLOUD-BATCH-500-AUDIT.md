# PAYROLL — PR-PAY-S7 · Cloud Batch 500 Investigation · AUDIT

> **Status:** `AUDIT COMPLETE` · `DESIGN FREEZE DRAFT` · **IMPLEMENT: NO GO**
> **Data audytu:** 2026-07-03
> **Baseline prod:** **GREEN** · **HEAD `1b7bb73`**
> **STABILIZATION WINDOW:** ACTIVE
> **Powiązane:** PR-PAY-S2 (Deletion Tombstones) · PR-PAY-S6 (Archive Restore Eligibility Guard, `d2a3d90`) · [`docs/PAYROLL-CLOUD-RECOVERY-B6-AUDIT.md`](PAYROLL-CLOUD-RECOVERY-B6-AUDIT.md) (Edge parity)

```text
AUDIT:         COMPLETE (analiza statyczna Edge + klient)
CEL:           Przyczyna batch-set HTTP 500 podczas synchronizacji Payroll
RCA:           CONFIRMED — batch-set bez obsługi błędów; cały bundle w jednym kv.mset; statement timeout
DESIGN FREEZE: DRAFT — oczekuje akceptacji właściciela repo
IMPLEMENT:     NO GO
```

---

## 1. Root Cause

**Handler `batch-set` nie ma żadnej obsługi błędów (`try/catch`), a Edge nie ma globalnego `app.onError`. Cały bundle danych jest zapisywany jednym `upsert` przez `kv.mset`. Dowolny wyjątek Postgresa/Deno — potwierdzony w logach jako *statement timeout* na dużym payloadzie payroll (`kw-archive` + `kw-week-employees` + `kw-jobs`) — wypływa jako nieprzechwycony błąd i Hono zwraca gołe `HTTP 500 Internal Server Error` bez ciała diagnostycznego.**

Skutki:
- Zapis payroll do chmury **nie utrwala się** (mset all-or-nothing → klucze główne bez zmian).
- Klient widzi tylko `batch-set 500` (pusty `errText`) → **czerwony status synchronizacji**.
- Brak izolacji per klucz i brak retry → każdy push dużego bundla ryzykuje pełny fail.

Kod (Edge) — `supabase/functions/make-server-0afb8820/index.tsx`:

```569:697:supabase/functions/make-server-0afb8820/index.tsx
app.post("/make-server-0afb8820/batch-set", async (c) => {
  const { keys, values, ... } = await c.req.json();
  ...
  for (let i = 0; i < keys.length; i++) { ... await kv.get(...); await rotateKvBackups(...); ... }
  await kv.mset(keys, safeValues);      // pojedynczy upsert CAŁEGO bundla; brak try/catch
  try { await saveDailyFullBackup(...); } catch (e) { ... }
  return c.json({ ok: true });
});
```

`kv.mset` — `supabase/functions/make-server-0afb8820/kv_store.tsx`:

```52:58:supabase/functions/make-server-0afb8820/kv_store.tsx
export const mset = async (keys: string[], values: any[]): Promise<void> => {
  const supabase = client()
  const { error } = await supabase.from("kv_store_0afb8820").upsert(keys.map((k, i) => ({ key: k, value: values[i] })));
  if (error) { throw new Error(error.message); }   // rzuca → 500 (brak app.onError)
};
```

Klient — `src/lib/cloud-sync.ts`:

```2191:2194:src/lib/cloud-sync.ts
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`batch-set ${res.status}${errText ? `: ${errText.slice(0, 120)}` : ""}`);
  }
```

---

## 2. Evidence

| # | Obserwacja | Plik / linia |
|---|------------|--------------|
| **EV1** | `batch-set` bez `try/catch`; brak `app.onError` w całym Edge → każdy throw = 500 opaque | `index.tsx:569–697` |
| **EV2** | Cały bundle (do ~38 kluczy: `DATA_KEYS` 30 + 8× `*-deleted-ids`) w **jednym** `upsert` → all-or-nothing, brak izolacji per klucz | `cloud-sync.ts:2575–2594` + `kv_store.tsx:52` |
| **EV3** | `kv_store.client()` tworzy **nowy** klient Supabase na KAŻDY get/set; pętla batch-set robi ~15+ round-tripów przed `mset` → presja na pool połączeń | `kv_store.tsx:15–58` |
| **EV4** | Duże bloby payroll: `kw-archive` (wszystkie tygodnie × rostery), `kw-week-employees`, `kw-jobs` → payload rośnie z czasem → *statement timeout* / limit Edge | `index.tsx:614–648` |
| **EV5** | `errText` z 500 odczytywany, ale Hono default nie zwraca treści → komunikat klienta ubogi (`batch-set 500`) | `cloud-sync.ts:2191–2193` |
| **EV6** | `rotateKvBackups`/`rotateJobsBackups` robią `kv.set(...-prev)` **w trakcie** handlera, PRZED `mset` → gdy `mset` padnie, backupy już zrotowane = częściowa mutacja serwera | `index.tsx:495–506, 618, 641` |
| **EV7** | `runCloudSync`: **pull+apply PRZED push** — lokalny stan zmutowany zanim push padnie (partial sync + czerwony status) | `App.tsx:736–763` |
| **EV8** | `kw-week-employees-deleted-ids` (tombstony) **nie są pushowane** do chmury (brak na liście push) | `cloud-sync.ts:2576–2588` |
| **EV9** | `pushKeysToCloudSafe` NIE ustawia `replaceWeekEmployeesKeys` → Edge `forceReplaceWeekEmployees=false` → przy shrink/expansion `mergeWeekEmployeesUnion(prev,next)` | `cloud-sync.ts:2624–2627` + `index.tsx:621–634` |

---

## 3. Timeline (rekonstrukcja z kodu)

1. Urządzenie zapisuje payroll → `runCloudSync` → `pullAndMergeDataBundle` (**merge chmury do lokalnego**) → `applyAdminDataBundle` (lokalny stan już zmieniony).
2. `pushMergedDataBundleToCloud` → `pushKeysToCloud` → `POST /batch-set` z pełnym bundlem.
3. Edge: pętla `kv.get` + `rotateKvBackups` (backupy zapisane) → `kv.mset(cały bundle)`.
4. `mset` przekracza *statement timeout* → `error` → `throw` → **500** (bez ciała).
5. Klient: `res.ok===false` → `throw "batch-set 500"` → `catch` w `runCloudSync` → `setSyncStatus("error")` = **czerwony**.
6. Efekt: chmura NIE dostała skorygowanego (usuniętego) rostera; lokalnie widoczny stan po pull-merge (mogący zawierać wróconych pracowników z chmury/innego urządzenia).

---

## 4. Logical Stack Trace

> Rekonstrukcja z kodu; treść komunikatu Postgres potwierdzona w logach jako *statement timeout*.

```
POST /make-server-0afb8820/batch-set
  → app.post handler (index.tsx:569)                 [brak try/catch]
    → kv.mset(keys, safeValues) (index.tsx:691)
      → supabase.from("kv_store_0afb8820").upsert([...~38 rows]) (kv_store.tsx:54)
        → PostgREST → Postgres
          ✗ error: "canceling statement due to statement timeout"   (duży JSONB upsert payroll)
      → throw new Error(error.message) (kv_store.tsx:56)
  ↯ nieprzechwycony → Hono default → HTTP 500 (bez body)
KLIENT:
  pushKeysToCloud (cloud-sync.ts:2191) → throw "batch-set 500"
  runCloudSync catch (App.tsx:760) → setSyncStatus("error")   [czerwony status]
```

---

## 5. POTWIERDZONE vs HIPOTEZY

### ✅ POTWIERDZONE (analiza statyczna + logi)

| # | Ustalenie | Źródło |
|---|-----------|--------|
| **C1** | `batch-set` zwraca **opaque 500** (brak ciała diagnostycznego) | EV1, EV5 |
| **C2** | **Brak `app.onError`** w Edge (globalny handler błędów nie istnieje) | wyszukiwanie w `index.tsx` |
| **C3** | **Brak `try/catch`** w handlerze `batch-set` | `index.tsx:569–697` |
| **C4** | `kv.mset` = **pojedynczy `upsert`** całego bundla (all-or-nothing, bez chunków/izolacji) | `kv_store.tsx:52–58` |
| **C5** | **`statement timeout` w logach** (potwierdzenie właściciela / Postgres logs) jako przyczyna błędu `mset` | Supabase/Postgres logs |

### ❓ HIPOTEZY (wymagają reprodukcji / [LOG-CHECK])

| # | Hipoteza | Jak zweryfikować |
|---|----------|------------------|
| **H1** | `mergeWeekEmployeesUnion` po stronie Edge jest źródłem **resurrection** (cofa skurczenie rostera o usuniętych) | Repro: push rostera pomniejszonego o 2 prac. **bez** `replaceWeekEmployeesKeys`; sprawdzić log `roster expansion/blocked shrink ... merging` (`index.tsx:622–633`) i stan `kw-week-employees` w KV |
| **H2** | **Brak tombstonów po stronie Edge** (`kw-week-employees-deleted-ids` nieobecne na serwerze) umożliwia powrót usuniętych przy union/richness | Sprawdzić czy klucz istnieje w KV; prześledzić, czy jakakolwiek ścieżka go pushuje (obecnie brak — EV8) |
| **H3** | Wpływ `replaceWeekEmployeesKeys`: ścieżki payroll bez tej flagi (`pushKeysToCloudSafe`, WorkerPhotoView) pozwalają Edge na union re-add | Porównać push main path (`replaceWeekEmployeesKeys=["kw-week-employees"]`, force replace) vs `pushKeysToCloudSafe` (brak flagi) |
| **H4** | Współprzyczyna 500: presja na pool połączeń (klient Supabase per operacja) lub OOM/CPU Edge na dużym payloadzie | Postgres logs: `remaining connection slots`; Edge logs: memory/CPU limit |

> **Rozróżnienie kluczowe:** przyczyna **500** (C1–C5) i przyczyna **resurrection pracowników** (H1–H3) to **dwa odrębne problemy**. 500 blokuje utrwalenie korekty; resurrection jest napędzany przez Edge union + brak tombstonów. Nie łączyć w jeden bundle.

---

## 6. Design Freeze (propozycja — NIE implementowane)

| ID | Zmiana | Plik (docelowy IMPLEMENT) | Adresuje |
|----|--------|---------------------------|----------|
| **S7-1** | `try/catch` w `batch-set` + `app.onError` → `500` z `{ ok:false, error }` (odsłonić realny `error.message`) | `index.tsx` | C1–C3 |
| **S7-2** | `kv.mset` w **chunkach** i/lub sekwencyjny zapis z izolacją per klucz + zebranie błędów (partial report zamiast pełnego 500) | `kv_store.tsx` / `index.tsx` | C4, H4 |
| **S7-3** | Reużyć jednego klienta Supabase (module-level singleton) zamiast `client()` per operacja | `kv_store.tsx` | H4 |
| **S7-4** | Klient: retry z backoff dla 5xx (idempotentny) + nie mutować lokalnego stanu przed potwierdzonym push (pull-merge read-only do udanego push) | `cloud-sync.ts` / `App.tsx` | EV7 |
| **S7-5** | (resurrection) Pushować `kw-week-employees-deleted-ids` do chmury **lub** tombstone-aware filtr w Edge; wymusić `replaceWeekEmployeesKeys` na wszystkich ścieżkach payroll | `cloud-sync.ts` + `index.tsx` | H1–H3 |

**Zasada:** S7-1…S7-4 = przyczyna 500. S7-5 = przyczyna resurrection. To **dwa osobne bundle** (One Bundle = One Goal).

**Rekomendowana kolejność:** **S7-1** (diagnostyka — natychmiast domyka [LOG-CHECK]) → **S7-5** (zatrzymać resurrection, najwyższy priorytet biznesowy) → **S7-2/S7-3/S7-4** (twardnienie zapisu).

---

## 7. Out Of Scope

| Element | Powód |
|---------|-------|
| Zmiana merge klienta (`finalizePayrollBundleMerge`) | Osobny obszar (Etap 2 CLOSED) |
| Zmiana schematu KV (`kv_store_0afb8820`) | Ryzyko migracyjne — osobna decyzja |
| Zmiana `runCloudSync` kolejności pull/push | Wchodzi dopiero w S7-4 (osobny bundle) |
| PR-PAY-S6 (Archive Restore Eligibility) | CLOSED (`d2a3d90`) — niezależne |

---

## GO / NO-GO

| Etap | Status |
|------|--------|
| **AUDIT** | **COMPLETE** |
| **[LOG-CHECK]** | częściowo **DONE** (statement timeout potwierdzony) · H1–H4 do reprodukcji |
| **DESIGN FREEZE** | **DRAFT** — oczekuje akceptacji właściciela repo |
| **IMPLEMENT** | **NO GO** — do jawnej komendy ownera |

---

*SSOT audytu PR-PAY-S7: ten plik · bez zmian kodu · commit wyłącznie dokumentacyjny.*
