# P0-HOTFIX-002 — Notatki operacyjne · read-state race

> **Wersja:** 2.59.32  
> **Data:** 2026-06-16  
> **Audyt źródłowy:** [`P0-OPERATIONAL-NOTES-UNREAD-COUNTER-AUDIT.md`](P0-OPERATIONAL-NOTES-UNREAD-COUNTER-AUDIT.md)

---

## 1. Root Cause

W `runCloudSync()` (`App.tsx`) po `pullOperationalNotesAuxFromCloud()` stan read-state był poprawnie scalany i ustawiany w React (`setOperationalNotesReadState(aux.readState)`), ale kolejny `pushOperationalNotesToCloud()` używał **stale closure** — `operationalNotesReadState` i `operationalNotesAuditLog` sprzed pull.

Efekt: ACK zapisany lokalnie / po pull aux był **cofany** w localStorage i KV przy auto-sync → badge nieprzeczytanych wracał po ~2–7 s.

---

## 2. Fix

**FIX-001 + FIX-002** — w `runCloudSync`:

```ts
let opReadState = operationalNotesReadState;
let opAuditLog = operationalNotesAuditLog;
try {
  const aux = await pullOperationalNotesAuxFromCloud();
  opReadState = aux.readState;
  opAuditLog = aux.auditLog;
  setOperationalNotesReadState(aux.readState);
  setOperationalNotesAuditLog(aux.auditLog);
} catch { /* offline */ }
await pushOperationalNotesToCloud(..., opReadState, opAuditLog);
```

Push aux używa stanu **po pull**; przy błędzie pull — fallback do bieżącego React state.

**FIX-005** — `scripts/test-operational-notes-sync-race-p0.mjs` (11/11 PASS).

Nie wdrożono: FIX-003, FIX-004 (poza zakresem P0).

---

## 3. Build

```text
npm run build
✓ built in ~28s — PASS
```

---

## 4. Smoke

| Test | Wynik |
|------|-------|
| `test-operational-notes-sync-race-p0.mjs` | **11/11 PASS** |
| `test-operational-notes-p1.mjs` (regresja ACK) | **21/21 PASS** |

Scenariusz manualny (prod po deploy):

1. ACK wszystkich notatek → badge = 0  
2. Czekać > 7 s (suppress + auto-sync)  
3. Focus tab / visibility pull  
4. **PASS:** badge pozostaje 0  

---

## 5. Deploy Verification

| Pole | Wartość |
|------|---------|
| Commit | *(uzupełnione po push)* |
| Push | `origin/main` |
| VERIFY FAST | `curl -s https://www.wgdom.fun/version.json` → oczekiwane `"2.59.32"` |
| RELEASE GO | build + smoke PASS + commit + push |
| PRODUCTION VERIFIED | jedno sprawdzenie version.json (STALE = DEPLOY PROPAGATING) |

---

## Zmienione pliki

- `src/app/App.tsx` — FIX-001/002
- `src/app/changelog-data.ts` — v2.59.32
- `CHANGELOG.md`
- `scripts/test-operational-notes-sync-race-p0.mjs` — FIX-005
