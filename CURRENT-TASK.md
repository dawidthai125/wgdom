# W&G DOM — bieżąca sesja

**Ostatnia aktualizacja:** 2026-06-13 · **SESSION CLOSEOUT — dokumentacja handoff**

## STATUS

| Pole | Wartość |
|------|---------|
| **Production** | **2.56.10** · commit **`7acbecf`** |
| **PRODUCTION VERIFIED** | TAK (`version.json` = 2.56.10) |
| **Poprzedni** | 2.56.9 (`d3ecbe4`) P3.6 · 2.56.8 (`66a619e`) P2-G.3C |

## SKOŃCZONE (ta sesja + poprzednie releasy)

### P3.6 — Filtry klientów strategicznych (v2.56.9 · `d3ecbe4`)
- Chipy: WM, ZZK, MOPS, TBS, Gminy, Uczelnie + liczniki
- SSOT: `tenders-strategic-client-filters.ts`
- Test: `test-tenders-strategic-client-filters.mjs` → 52 PASS

### P1 — WM false exclude przebudowa (v2.56.10 · `7acbecf`)
- `matchesTenderExcludeKeyword()` + mirror Edge
- Test: `test-tender-exclude-renovation-budowa.mjs` → 18 PASS
- Audyt: `audit-wm-exclude-120d.mjs` — 1 odzyskany aktywny WM

### P2-G.3C — Benchmark klasyfikacji prod (v2.56.8 · `66a619e`)
- UNKNOWN seed 16→0; audyt `audit-p2g3c-classification-prod.mjs`

### Audyty read-only (bez implementacji)
- KB.pl: GO WITH CONDITIONS (B2B / kuracja ręczna)
- Leroy Merlin: NO GO live
- WM/MOPS źródła: WM na BZP+Marketplanet; MOPS poza Works

## DOKUMENTACJA (ten commit)

Uzupełniono handoff dla przyszłych agentów AI:
- [`docs/SESSION-HANDOFF-P3-PRICING-BZP-PIPELINE.md`](docs/SESSION-HANDOFF-P3-PRICING-BZP-PIPELINE.md) — **★★ nowy SSOT P3+BZP**
- [`docs/PROJECT-HANDOFF-CURRENT.md`](docs/PROJECT-HANDOFF-CURRENT.md) — baseline 2.56.10
- [`AGENTS.md`](AGENTS.md) · [`PROJECT-GUIDE.md`](PROJECT-GUIDE.md) · [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- [`.cursor/rules/wgdom-stan-projektu.mdc`](.cursor/rules/wgdom-stan-projektu.mdc)

## NASTĘPNE (tylko na polecenie po AUDIT)

1. **P2-G.3D/E** — benchmark jakości / RMS (slot Wycena)
2. **P2-F.6** — kompletność oferty (slot Oferta)
3. **P2-H.7** — Edge magic bytes 7z
4. **Benchmark materiałów rynku** — HOLD (audyt KB/Leroy)
5. Kolejny sweep UNKNOWN gdy nowe kosztorysy ATH w pipeline

## WZNOWIENIE (checklist agenta)

```text
1. AGENTS.md → PROJECT-HANDOFF-CURRENT.md → SESSION-HANDOFF-P3-PRICING-BZP-PIPELINE.md
2. curl -s https://www.wgdom.fun/version.json  → 2.56.10
3. Przed zmianami Przetargów: test-tenders-strategic-client-filters + test-tender-exclude-renovation-budowa
4. Przed zmianami exclude BZP: deploy Vercel + Supabase Edge
5. WORKFLOW-RELEASE-DEPLOY.md (A/B/C)
```
