# TENDERS-SYNC-STORM-P0 — IMPLEMENT COMPLETE

> **Status:** **IMPLEMENT COMPLETE** · **OWNER VERIFICATION COMPLETE** (patrz [`TENDERS-SYNC-STORM-P0-OWNER-VERIFICATION.md`](TENDERS-SYNC-STORM-P0-OWNER-VERIFICATION.md))  
> **ID:** TENDERS-SYNC-STORM-P0  
> **Data:** 2026-07-23  
> **Owner GO → IMPLEMENT:** ✅  
> **Owner GO → OWNER VERIFICATION:** ✅  
> **Wejście:** [`TENDERS-SYNC-STORM-P0-ROOT-CAUSE-FIX-PLAN.md`](TENDERS-SYNC-STORM-P0-ROOT-CAUSE-FIX-PLAN.md) · [`MOPS-TENDER-REGRESSION-01-INCIDENT-TIMELINE.md`](MOPS-TENDER-REGRESSION-01-INCIDENT-TIMELINE.md)  
> **Changelog WT:** **2.65.38**  
> **Commit / push / deploy:** **NIE** (czekaj na OWNER GO → COMMIT)

```text
WORKFLOW:
  ROOT CAUSE LOCKED ✅
  → ROOT CAUSE FIX PLAN APPROVED ✅
  → OWNER GO → IMPLEMENT ✅
  → IMPLEMENT COMPLETE ✅
  → OWNER GO → OWNER VERIFICATION ✅
  → OWNER VERIFICATION COMPLETE ✅
  → RELEASE HOLD ✅ (SUPABASE-KV-522-01)
  → READY TO RESUME ⏸
  → OWNER GO → COMMIT ⛔ HOLD
```

---

## 1. Werdykt

```text
══════════════════════════════════════
IMPLEMENT COMPLETE

Sync Storm cycle broken at E-RUN deps
Partial = local only · Final cloud ≤ 1×
Generation + inflight + circuit breaker
T1–T8 PASS · build PASS
Gotowość do OWNER VERIFICATION: TAK
══════════════════════════════════════
```

| Cel | Wynik |
|-----|--------|
| Przerwać `onUpdate → builtAt → useEffect → parse → onUpdate` | **TAK** — `builtAt` poza deps E-RUN |
| Rozdzielić E-RUN / E-UI | **TAK** |
| Partial lokalny · cloud tylko final | **TAK** |
| ≤ 1 cloud write / rzeczywista zmiana (final) | **TAK** (T4/T6: **1**) |
| Bez zmian persistKey / Payroll / StorageManager / Edge / Merge / Cloud protocol | **TAK** (T8) |

---

## 2. Lista zmienionych plików

### MOD
| Plik | Zmiana |
|------|--------|
| `src/app/hooks/useTenderDossierHeavyLazy.ts` | E-RUN deps (bez `builtAt`); E-UI osobno; `persist: local\|cloud`; generation + inflight + circuit breaker (max 2); terminal `parsedAt` (G4) |
| `src/app/tenders/strategy/hooks/useTendersPipeline.ts` | `updateItem(id, patch, opts?)` — local / cloud-force / legacy |
| `src/lib/tender-pipeline/tender-pipeline-persist-coalesce.ts` | `schedule`/`flush` `{ force }`; test cloud-push stub |
| `src/app/TenderDetailPage.tsx` | Forward `opts` → `updateItem` |
| `src/app/hooks/useTenderPipelineRuntime.ts` | Typ `onUpdate` z opcjonalnym `opts` |
| `src/app/TenderDetailPanel.tsx` | Typ `onUpdate` kompatybilny z `opts` |
| `src/app/changelog-data.ts` | **2.65.38** |
| `CHANGELOG.md` | **2.65.38** |
| `scripts/test-ng11-debounce-persist.mjs` | LS mock + cloud stub (izolacja od sieci) |

### NEW
| Plik | Cel |
|------|-----|
| `scripts/test-tenders-sync-storm-p0.mjs` | T1–T8 |
| `docs/architecture/TENDERS-SYNC-STORM-P0-IMPLEMENT-REPORT.md` | ten raport |

### OUT (nie ruszane)
`persistKey` API · Payroll · StorageManager public API · Edge handlers · Merge LWW · Cloud protocol · new KV

---

## 3. Build / lint / typecheck

| Gate | Wynik |
|------|--------|
| `npm run build` | **PASS** (exit 0 · ~30.7s) |
| Lint (IDE `ReadLints` na zmienionych plikach) | **PASS** — 0 diagnostics |
| ESLint CLI | **N/A** — brak `eslint.config.*` w repo (ESLint 10 wymaga flat config) |
| `npx tsc --noEmit` | **PASS źródeł** — 0 błędów w `src/`; jedyny exit≠0 = pre-existing **TS5101** (`baseUrl` deprecated w tsconfig, poza zakresem P0) |

---

## 4. Wyniki T1–T8

```text
npx vite-node scripts/test-tenders-sync-storm-p0.mjs
→ 24 PASS / 0 FAIL
```

| ID | Cel | Wynik |
|----|-----|--------|
| **T1** | Po partial E-RUN nie restartuje (deps contract) | **PASS** |
| **T2** | `builtAt` ∉ E-RUN deps; partial local / final cloud | **PASS** |
| **T3** | Nowy `gateFingerprint` → świeży attempt counter | **PASS** |
| **T4** | 5× local + 1× final → **1** cloud write | **PASS** |
| **T5** | `tenderDossierHeavyParseDone` + terminal `parsedAt` | **PASS** |
| **T6** | 10× schedule → 1 write; `force` przy flag OFF | **PASS** |
| **T7** | Wiring `updateItem` / Page / inflight smoke | **PASS** |
| **T8** | Izolacja Payroll / Edge / StorageManager / persistKey | **PASS** |

Regresje towarzyszące:
- `test-tender-dossier-heavy-lifecycle.mjs` — **5 PASS**
- `test-ng11-debounce-persist.mjs` — **10 PASS**

---

## 5. Cloud writes — przed / po

| Scenariusz | Przed (Sync Storm) | Po FIX |
|------------|--------------------|--------|
| Partial heavy (kosztorys mid-flight) | **1× `persistKey` / partial** (często pełny `kw-tenders-pipeline` get+set) | **0** cloud (`persist: "local"`) |
| Final heavy (enrich done) | Kolejny natychmiastowy write (+ pętla restartów) | **≤ 1** coalesce (`persist: "cloud"` + `force`) |
| Otwarcie ciężkiego detalu (MOPS-class) | **Dziesiątki** batch-get/set (pętla effect) | **≤ 1–2** cloud (final + ewentualny bootstrap poza P0) |
| Dowód jednostkowy | — | T4: **0** po 5 local · **1** po final; T6: **1** po 10× schedule |

---

## 6. Potwierdzenie usunięcia Sync Storm

| Mechanizm | Status |
|-----------|--------|
| Cykl `builtAt` → E-RUN | **PRZERWANY** (deps E-RUN bez `builtAt` / wyniku parse) |
| Partial → cloud storm | **USUNIĘTY** (local only) |
| Cancel/re-run na samym persist | **USUNIĘTY** (stable deps + generation guard) |
| ∞ retry | **OGRANICZONY** (circuit breaker max **2** / key; G4 terminal `parsedAt`) |
| Inflight overlap | **GUARD** (`dossierInflightIds` + generation) |

**Uwaga smoke live:** platforma Supabase REST może nadal być w incydencie **SUPABASE-KV-522-01** — live MOPS na prod nie jest warunkiem tego raportu; Owner Verification = lokalny WT / sandbox gdy REST UP.

---

## 7. Smoke checklist (OWNER VERIFICATION)

- [ ] Otwarcie ciężkiego przetargu (MOPS-class) w WT
- [ ] Brak restartów parse po samym `builtAt`
- [ ] Brak pętli `useEffect` E-RUN
- [ ] Brak lawiny `batch-set`
- [ ] Brak lawiny `batch-get`
- [ ] Brak ponownego przeciążenia projektu

---

## 8. Zakazy (utrzymane)

- ❌ Commit  
- ❌ Push  
- ❌ Deploy  

---

## 9. Następny krok

```text
IMPLEMENT COMPLETE

Czekam na: OWNER GO → OWNER VERIFICATION
```
