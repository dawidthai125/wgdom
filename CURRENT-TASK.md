# W&G DOM — bieżąca sesja

**Ostatnia aktualizacja:** 2026-06-14 · **P0-R.1 RELEASE CLOSEOUT — Notatki Operacyjne v2.57.0**

## STATUS

| Pole | Wartość |
|------|---------|
| **Wersja docelowa (repo)** | **2.57.0** — Notatki Operacyjne P0 |
| **Production (prod)** | **2.56.10** · commit **`7acbecf`** — do czasu push + verify |
| **RELEASE GO** | **TAK** — build + testy + dokumentacja release |
| **GO COMMIT** | **TAK** — gotowe do pierwszego commita P0 (bez push w tej sesji) |
| **UX** | **GO UX** (P0-H.1: B1/B2/H1/H2) |

## SKOŃCZONE — Notatki Operacyjne P0 (v2.57.0 · pre-commit)

| Etap | Status |
|------|--------|
| Final Audit Rev #3 | GO |
| P0 Implementation Readiness | GO |
| **P0 IMPLEMENT** | **COMPLETE** |
| **P0-H.1 UX fixes** | **COMPLETE** |
| **P0-R Release prep** | **COMPLETE** (CHANGELOG · HelpView · ARCHITECTURE) |
| **P0-R.1 Closeout** | **COMPLETE** (ten plik + PROJECT-HANDOFF-CURRENT) |

### Zakres P0 (CLOSED)

- Moduł **Notatki operacyjne** (menu między Roboty a Inspektor)
- CRUD · komentarze · archiwum · przywracanie
- Powiązanie z robotą (`linkedJobId`) + panel w Roboty → Przegląd + `returnNav`
- Audit log (`kw-operational-notes-audit-log`, cap 3000)
- Cloud sync (4 klucze KV) + logical delete (tombstone)
- ACL staff (super_admin / admin / moderator); inspektor — lib only (UI P2)
- Copy: „Uwagi wewnętrzne (robota)” vs Notatki operacyjne

### Kluczowe pliki

`src/lib/operational-notes.ts` · `operational-notes-audit.ts` · `operational-notes-read-state.ts` · `OperationalNotesView.tsx` · `JobOperationalNotesPanel.tsx` · `cloud-sync.ts` · `App.tsx` · `admin-nav.ts`

### Testy

```bash
npx vite-node scripts/test-operational-notes-p0.mjs   # 24 PASS
npm run build                                        # PASS
```

## NASTĘPNE — Notatki operacyjne (tylko na polecenie)

| Etap | Zakres | Status |
|------|--------|--------|
| **P1** | ACK + Banner + Badge menu | **OPEN** |
| **P2** | Inspektor UI + Dashboard widget + Audit UI on-screen | **OPEN** |
| **P3** | PDF + DOCX + Email Export (ręczny export, bez auto-notify) | **OPEN** |

## POPRZEDNIE RELEASY (prod · bez zmian)

- **P3.6 + P1 WM** — v2.56.9–2.56.10 · [`SESSION-HANDOFF-P3-PRICING-BZP-PIPELINE.md`](docs/SESSION-HANDOFF-P3-PRICING-BZP-PIPELINE.md)
- **P2-H / UX.1 / P2-F / Dashboard V3** — CLOSED (handoffy w PROJECT-HANDOFF-CURRENT)

## BACKLOG PRODUKTOWY (Przetargi — bez zmian)

Moduł Przetargi **PRODUCTION READY**. Kolejne prace operacyjne na postępowaniach — na polecenie biznesowe.

| Priorytet | Temat |
|-----------|-------|
| P2-G.3D/E | Benchmark jakości / RMS (slot Wycena) |
| P2-F.6 | Kompletność oferty (slot Oferta) |
| P2-H.7 | Edge magic bytes 7z |
| Benchmark materiałów | HOLD |

## WZNOWIENIE (checklist agenta)

```text
1. AGENTS.md → PROJECT-HANDOFF-CURRENT.md → CURRENT-TASK.md (ten plik)
2. curl -s https://www.wgdom.fun/version.json  → 2.56.10 (do push 2.57.0)
3. Przed zmianami Notatki operacyjne: test-operational-notes-p0.mjs
4. Przed zmianami Przetargów: test-tenders-strategic-client-filters + test-tender-exclude-renovation-budowa
5. WORKFLOW-RELEASE-DEPLOY.md — workflow B (functional UI) dla v2.57.0
```

## COMMIT (następny krok — na polecenie użytkownika)

```text
feat(notatki): v2.57.0 Notatki Operacyjne P0
→ git push origin main
→ curl -s https://www.wgdom.fun/version.json  (verify FAST, oczekiwane 2.57.0)
```
