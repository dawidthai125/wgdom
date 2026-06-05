# W&G DOM — bieżąca sesja / wznowienie pracy

> **Aktualizuj ten plik na końcu każdej większej sesji z agentem AI.**  
> Hasło w Cursorze: **„kontynuuj WGDOM”** → [`.cursor/rules/wgdom-stan-projektu.mdc`](.cursor/rules/wgdom-stan-projektu.mdc)

**Ostatnia aktualizacja:** 2026-06-05  
**Wersja UI (`changelog-data.ts`):** **2.45.35** (Performance 2.1 **CLOSED**)  
**Prod `origin/main` HEAD:** *(po push release 2.1)* — https://www.wgdom.fun

**★ Performance 1.x (CLOSED):** [`docs/SESSION-HANDOFF-PERFORMANCE-2026-06.md`](docs/SESSION-HANDOFF-PERFORMANCE-2026-06.md)  
**★ Performance 2.1 (CLOSED):** 2.1A dedup + 2.1B Provider scope + 2.1C pipeline cache + 2.1C+ hotfix — tag `v2.45.35-perf-2.1`

**★ Incydent Roboty / RCA:** [`docs/SESSION-HANDOFF-ROBOTY-INCIDENT-2026-06.md`](docs/SESSION-HANDOFF-ROBOTY-INCIDENT-2026-06.md)

---

## Skończone (prod)

| Temat | Commit / tag | Uwagi |
|-------|--------------|--------|
| Fix czarny ekran Roboty (`normalizePhone9`) | `99e08c2` | |
| Roboty 2.1B MIN | `2b71385`, `a213a65` | KPI header, layout, `JobListCardV2` |
| **Performance 1.1C + 1.2A + 1.3A+** | **`a6cdb4a`** | CloudLoader CORE/DEFERRED, CC fast path |
| **Performance 2.1A + 2.1B** | **`deb5d37`, `b27bc18`** | dedup snapshot CC; Provider tylko Pulpit + Przetargi |
| **Performance 2.1C + 2.1C+** | *(release commit)* | pipeline session cache TTL 60 s; deferred-bootstrap hydrate |
| **Release perf 2.1** | tag **`v2.45.35-perf-2.1`** | push + Vercel; UI **2.45.35** |

---

## Performance 2.1 — status

**CLOSED (MIN).** 2.1A + 2.1B + 2.1C + hotfix na prod. Nie rozpoczynaj 2.2+ bez polecenia.

Szczegóły: [`CHANGELOG.md`](CHANGELOG.md) § 2.45.35.

---

## Performance 1.x — status

**CLOSED (MIN).** Nie rozpoczynaj 1.4+ bez polecenia.

Pomiar prod (mediana): nav→pełny Dashboard **4445 ms** (−64% vs baseline 1.1B prod).

Szczegóły: [`docs/SESSION-HANDOFF-PERFORMANCE-2026-06.md`](docs/SESSION-HANDOFF-PERFORMANCE-2026-06.md).

---

## Następne (na polecenie użytkownika)

1. Smoke Vercel po release 2.1 — weryfikacja cache hit (Pulpit ↔ Przetargi, Pulpit → Roboty → Pulpit).
3. Roboty / 2.1B dalsze fazy — tylko na polecenie.
4. Performance 1.4+ — **zamrożone**.
5. **NIE** bez polecenia: zmiany KV/LS/sync, 9.0.2, dead-code delete.

---

## Working tree (lokalnie)

- **Tracked:** changelog **2.45.35** (`changelog-data.ts`, `CHANGELOG.md`) — **niecommitowane** w chwili aktualizacji docs.
- **Untracked:** skrypty RCA/diag w `scripts/` — **nie commitować** bez polecenia.

---

## Szybki start dla **nowego** agenta

```text
1. docs/SESSION-HANDOFF-PERFORMANCE-2026-06.md  ← performance CLOSED (2026-06-05)
2. CURRENT-TASK.md (ten plik)
3. docs/SESSION-HANDOFF-ROBOTY-INCIDENT-2026-06.md  ← Roboty / incydent
4. docs/SESSION-HANDOFF-2026-06.md  ← Faza 8–9, audyty
5. docs/ARCHITECTURE.md § 11.5 + § 12.1.3–12.1.4
```

**Transkrypt sesji performance + release:** `agent-transcripts/5cf13bdf-a21c-4564-8e42-68192622d416`
