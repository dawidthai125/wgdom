# 10 — Handoff Template (WGDOM)

> Kopiuj ten szablon na **koniec sesji** lub przy zmianie agenta.  
> Wypełniaj faktami (commit, wersja, dowody) — bez zgadywania.

---

```markdown
# SESSION HANDOFF — <TYTUŁ / ID>

> **Data:** YYYY-MM-DD  
> **Agent / sesja:** …  
> **Hasło Ownera:** kontynuuj WGDOM / …

---

## Status

| Pole | Wartość |
|------|---------|
| **Status** | IN PROGRESS / BLOCKED / READY FOR GO / RELEASED / CLOSED |
| **Klasa bundla** | FEATURE / CORE / DOCS / MIXED❌ |
| **STABILIZATION WINDOW** | ACTIVE / … |

---

## Production Version

| Pole | Wartość |
|------|---------|
| **Production UI** | X.Y.Z (z version.json / changelog) |
| **Commit (tip prod)** | `abcdef0` |
| **HEAD lokalny** | `abcdef0` (czy = origin/main?) |
| **Branch** | main / … |
| **Dirty WT** | TAK/NIE — skrót (nie mieszać z CORE) |

---

## Otwarte EPIC

| ID | Status | Next |
|----|--------|------|
| … | GATED / GO / IN PROGRESS | … |

---

## Otwarte bugi / findings

| Sev | ID | Opis | Status |
|-----|-----|------|--------|
| HIGH | … | … | BACKLOG / … |

---

## Ryzyka

- …
- Link: `docs/AI/07_KNOWN_RISKS.md`

---

## Co zostało zrobione

1. …
2. …
3. Artefakty: `docs/architecture/….md`

---

## Co zostało sprawdzone

| Gate | Wynik |
|------|--------|
| build | PASS/FAIL |
| relevant smoke | … |
| Owner Verification | … |
| Production Verification | version.json / smoke |
| Payroll gate B | N/A / PASS |

---

## Decyzje

| Decyzja | Obowiązuje? |
|---------|-------------|
| … | TAK/NIE |

---

## Czego NIE robić dalej

- …
- (patrz `docs/AI/08_AI_GUARDRAILS.md`)

---

## Co jest następne

1. **Natychmiast:** …  
2. **Po Owner GO:** …  
3. **Backlog:** …  

**Jawne polecenie startu:** `IMPLEMENT …` / `AUDIT …` / docs-only / STOP

---

## Linki SSOT

- Continuity: `docs/AGENT-CONTINUITY-GUIDE.md`
- Baseline: `docs/AI/09_PRODUCTION_BASELINE.md`
- Tematyczny DF/RCA/Closeout: …
```

---

## Minimalny handoff (gdy brak czasu)

```text
Status: …
Prod: UI … @ commit …
Zrobione: …
Sprawdzone: …
Następne: …
NIE: …
Dirty: …
```
