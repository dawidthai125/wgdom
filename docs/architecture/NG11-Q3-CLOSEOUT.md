# NG11-Q3 — Debounced Persist · CLOSEOUT

> **Program:** NG11-TENDER-PIPELINE-PERFORMANCE  
> **Slice:** **NG11-Q3**  
> **Wersja:** **2.63.96**  
> **SSOT plan:** [`NG11-Q3-DEBOUNCED-PERSIST-AUDIT-PLAN.md`](./NG11-Q3-DEBOUNCED-PERSIST-AUDIT-PLAN.md)

---

## Zakres

| Element | Status |
|---------|--------|
| LS + session cache sync na każdy patch | **DONE** |
| Cloud debounce 500 ms (coalesce) | **DONE** |
| Flush Ready / Failed | **DONE** (timing bridge) |
| Flush visibility / beforeunload / unmount | **DONE** |
| Flaga `pipelinePerfDebouncePersist` default OFF | **DONE** |
| Bulk persist flush-before-write | **DONE** |

---

## Pliki

| Plik | Rola |
|------|------|
| `tender-pipeline-persist-coalesce.ts` | schedule · flush · listeners |
| `useTendersPipeline.ts` | updateItem debounce · persist immediate |
| `app-settings.ts` | feature flag |
| `tender-pipeline-timing.ts` | Ready/Failed notify bridge (2 linie) |

---

## Boundary

**Nie dotknięto:** Payroll · `cloud-sync.ts` kernel · `App.tsx` CORE · Edge · NG10 gate · parsery · pricing runtime logic.

---

## Rollback

Super Admin → wyłącz **NG11-Q3 debounced persist** → natychmiastowy legacy `saveTendersPipeline`.

---

*NG11-Q3 closeout · 2026-07-11*
