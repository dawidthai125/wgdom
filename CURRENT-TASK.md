# W&G DOM — bieżąca sesja / wznowienie pracy

> **Aktualizuj ten plik na końcu każdej większej sesji z agentem AI.**  
> Hasło w Cursorze: **„kontynuuj WGDOM”** → [`.cursor/rules/wgdom-stan-projektu.mdc`](.cursor/rules/wgdom-stan-projektu.mdc)

**Ostatnia aktualizacja:** 2026-06-06  
**Wersja UI na prod (`changelog-data.ts` @ `origin/main`):** **2.45.36** (bump UI przy kolejnym release funkcjonalnym)  
**Prod `origin/main` HEAD:** **`35614f0`** · tag `v2.45.38-perf-2.4a` · https://www.wgdom.fun

**★ Performance 2.x (CLOSED):** [`docs/SESSION-HANDOFF-PERFORMANCE-2.x-2026-06.md`](docs/SESSION-HANDOFF-PERFORMANCE-2.x-2026-06.md)  
**★ Performance 1.x (CLOSED):** [`docs/SESSION-HANDOFF-PERFORMANCE-2026-06.md`](docs/SESSION-HANDOFF-PERFORMANCE-2026-06.md)  
**★ Incydent Roboty / RCA:** [`docs/SESSION-HANDOFF-ROBOTY-INCIDENT-2026-06.md`](docs/SESSION-HANDOFF-ROBOTY-INCIDENT-2026-06.md)

---

## Performance 2.x — **CLOSED**

Seria Performance 2.x zamknięta na prod (`35614f0`). Brak otwartych sprintów Performance.

### Performance 2.3C (`c922b44`)

- lazy load tender document parser
- parser stack removed from startup
- synthetic runtime verification PASS
- release: **`v2.45.37-perf-2.3c`**

### Performance 2.4A (`35614f0`)

- shared-inspector chunk removed
- startup requests reduced (5 → 4)
- release: **`v2.45.38-perf-2.4a`**

### Seria — wynik końcowy (2.2C → 2.4A)

| Metryka | 2.2C (`49129f1`) | 2.4A (`35614f0`) | Delta |
|---------|------------------|------------------|-------|
| Startup JS | 2417 KB | 1119 KB | **−1298 KB (−53.7%)** |
| Startup requests | 6 | 4 | **−2** |

**Release tagi Performance 2.x (prod):** `v2.45.36-perf-2.2c` · `v2.45.37-perf-2.3c` · `v2.45.38-perf-2.4a`

---

## Skończone (prod)

| Temat | Commit / tag | Uwagi |
|-------|--------------|--------|
| Performance 1.1C + 1.2A + 1.3A+ | `a6cdb4a` | CloudLoader CORE/DEFERRED |
| Performance 2.1 (A/B/C) | `cb21391`… | dedup CC, Provider scope, pipeline cache |
| Performance 2.2C | `49129f1` | usunięto `panel-*` manualChunks → lazy panele |
| Performance 2.3C | `c922b44` | lazy parser SWZ; brak pdfjs/parser przy starcie |
| **Performance 2.4A** | **`35614f0`** | usunięto `shared-inspector`; startup 1119 KB |
| **Release 2.x final** | tag **`v2.45.38-perf-2.4a`** | seria **CLOSED** |

---

## Następne (na polecenie użytkownika)

1. **NIE** bez polecenia: nowe sprinty Performance, zmiany KV/LS/sync, 9.0.2, nowe reguły `manualChunks` bez audytu SCC.
2. Opcjonalnie (poza serią 2.x, zamrożone): `react-vendor` chunk, dynamic `JobFilePreviewModal`, bump `changelog-data.ts` przy widocznej zmianie UI.

---

## Szybki start dla **nowego** agenta

```text
1. docs/SESSION-HANDOFF-PERFORMANCE-2.x-2026-06.md  ← ★ Performance 2.x CLOSED (wyniki końcowe)
2. CURRENT-TASK.md (ten plik)
3. docs/SESSION-HANDOFF-PERFORMANCE-2026-06.md      ← 1.x CLOSED
4. docs/SESSION-HANDOFF-ROBOTY-INCIDENT-2026-06.md
5. docs/ARCHITECTURE.md § 11.5 + § 17.5
6. docs/SESSION-HANDOFF-2026-06.md                ← Faza 8–9, Roboty 2.0
```
