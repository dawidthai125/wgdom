# W&G DOM — bieżąca sesja / wznowienie pracy

> **Aktualizuj ten plik na końcu każdej większej sesji z agentem AI.**  
> Hasło w Cursorze: **„kontynuuj WGDOM”** → [`.cursor/rules/wgdom-stan-projektu.mdc`](.cursor/rules/wgdom-stan-projektu.mdc)

**Ostatnia aktualizacja:** 2026-06-04  
**Wersja UI (`changelog-data.ts`):** **2.45.33** (Roboty 2.1A)  
**Prod `origin/main` HEAD:** **`99e08c2`** — https://www.wgdom.fun

**★ Pełny kontekst ostatniej sesji (incydent Roboty, 2.1B, RCA):** [`docs/SESSION-HANDOFF-ROBOTY-INCIDENT-2026-06.md`](docs/SESSION-HANDOFF-ROBOTY-INCIDENT-2026-06.md)

---

## Skończone (prod)

| Temat | Commit | Uwagi |
|-------|--------|--------|
| Roboty 2.0 MIN | `5b612e4` | KPI, `job-list-ops.ts` |
| Roboty 2.1A UX | `299d3f1` | `JobListPanelHeader`, layout listy |
| Hotfix `jobAddressKey` | `0c4da46` | brak `address` w job |
| **Fix czarny ekran Roboty (telefon)** | **`99e08c2`** | `normalizePhone9` + search; **push na main** |

---

## NIE w repo (utracone lokalnie)

| Temat | Status |
|-------|--------|
| **Roboty 2.1B MIN** (2.45.34) | Było zaimplementowane w czacie **bez commita** — **brak** w working tree / `main`. UI nadal **2.1A**. |

**Ponowna implementacja 2.1B:** tylko na polecenie — plan w [`docs/SESSION-HANDOFF-ROBOTY-INCIDENT-2026-06.md`](docs/SESSION-HANDOFF-ROBOTY-INCIDENT-2026-06.md) § 3.

---

## Następne (na polecenie użytkownika)

1. **Smoke Vercel** po `99e08c2`: wejście w Roboty, lista bez crashu.
2. **Roboty 2.1B MIN** — commit + changelog 2.45.34 (jeśli user chce odchudzenie nagłówka).
3. Opcjonalnie: guard w `src/lib/phone-normalize.ts` (SMS) — **nie** było w `99e08c2`.
4. **NIE** bez polecenia: zmiany KV/LS/sync, 9.0.2, dead-code delete, Roboty 2.0 MID.

---

## Working tree (lokalnie)

- **Tracked:** czysty względem `HEAD` (`99e08c2`).
- **Untracked:** skrypty RCA w `scripts/audit-*`, `scripts/map-*`, `scripts/verify-*` — **nie commitować** bez polecenia.

---

## Szybki start dla **nowego** agenta

```text
1. docs/SESSION-HANDOFF-ROBOTY-INCIDENT-2026-06.md  ← START (incydent + 2.1B)
2. CURRENT-TASK.md (ten plik)
3. docs/SESSION-HANDOFF-2026-06.md (audyty Faza 8–9, starszy kontekst)
4. docs/ARCHITECTURE.md § 12.1.4
5. Nie czytać całego App.tsx / JobsView od zera
```

**Transkrypt długiej sesji:** `agent-transcripts/1c53356b-b3ca-40ed-96c3-08aec5edc683` — tylko gdy trzeba szczegółu z czatu.
