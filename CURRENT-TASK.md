# W&G DOM — bieżąca sesja / wznowienie pracy

> **Aktualizuj ten plik na końcu każdej większej sesji z agentem AI.**  
> Hasło w Cursorze: **„kontynuuj WGDOM”** → [`.cursor/rules/wgdom-stan-projektu.mdc`](.cursor/rules/wgdom-stan-projektu.mdc)

**Ostatnia aktualizacja:** 2026-06-05  
**Wersja UI (`changelog-data.ts`):** **2.45.34** (Performance 1.1C + 1.2A + 1.3A+)  
**Prod `origin/main` HEAD:** **`a6cdb4a`** — tag `v2.45.34-perf-1.3a` — https://www.wgdom.fun

**★ Performance 1.x (CLOSED):** [`docs/SESSION-HANDOFF-PERFORMANCE-2026-06.md`](docs/SESSION-HANDOFF-PERFORMANCE-2026-06.md) — **nowy agent: czytaj przy temacie wydajności / CloudLoader / CC**

**★ Incydent Roboty / RCA:** [`docs/SESSION-HANDOFF-ROBOTY-INCIDENT-2026-06.md`](docs/SESSION-HANDOFF-ROBOTY-INCIDENT-2026-06.md)

---

## Skończone (prod)

| Temat | Commit / tag | Uwagi |
|-------|--------------|--------|
| Fix czarny ekran Roboty (`normalizePhone9`) | `99e08c2` | |
| Roboty 2.1B MIN | `2b71385`, `a213a65` | KPI header, layout, `JobListCardV2` |
| **Performance 1.1C + 1.2A + 1.3A+** | **`a6cdb4a`** | CloudLoader CORE/DEFERRED, CC fast path, bez `tenderDashStats` |
| **Release perf** | **`v2.45.34-perf-1.3a`** | push + Vercel deploy OK; pomiar prod PASS |

---

## Performance 1.x — status

**CLOSED (MIN).** Nie rozpoczynaj 1.4+ bez polecenia.

Pomiar prod (mediana): nav→pełny Dashboard **4445 ms** (−64% vs baseline 1.1B prod).

Szczegóły: [`docs/SESSION-HANDOFF-PERFORMANCE-2026-06.md`](docs/SESSION-HANDOFF-PERFORMANCE-2026-06.md).

---

## Następne (na polecenie użytkownika)

1. Smoke Vercel: login admin → Pulpit → marka **W&G DOM COMMAND CENTER AI**.
2. Roboty / 2.1B dalsze fazy — tylko na polecenie.
3. Performance 1.4+ (podwójny CORE bootstrap, Dashboard lazy) — **zamrożone**.
4. **NIE** bez polecenia: zmiany KV/LS/sync, 9.0.2, dead-code delete.

---

## Working tree (lokalnie)

- **Tracked:** czysty względem `HEAD` (`a6cdb4a`), zsynchronizowany z `origin/main`.
- **Untracked:** skrypty RCA/diag w `scripts/audit-*`, `scripts/map-*`, `scripts/verify-*`, `_ephemeral-*` — **nie commitować** bez polecenia.

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
