# W&G DOM — bieżąca sesja / wznowienie pracy

> **Aktualizuj ten plik na końcu każdej większej sesji z agentem AI.**  
> Hasło w Cursorze: **„kontynuuj WGDOM”** → [`.cursor/rules/wgdom-stan-projektu.mdc`](.cursor/rules/wgdom-stan-projektu.mdc)

**Ostatnia aktualizacja:** 2026-06-04  
**Wersja UI:** **2.45.32** (`src/app/changelog-data.ts`) — Roboty 2.0 MIN (lokalnie, bez commit)  
**Prod `main` (HEAD):** `622bbbb` — https://www.wgdom.fun

---

## Skończone w ostatniej sesji (audyty + UX, bez nowej fazy produktowej)

| Temat | Status | Dokumentacja |
|-------|--------|----------------|
| FAZA 9.0 + 9.0.1 | CLOSED (`3c575c7`, `a57a576`) | ARCHITECTURE § 12.1.4 |
| ETAP 8.5 MIN + FULL | CLOSED (`1c7e164`, `83b193e`) | j.w. |
| UX — neutralny greeting raportu | CLOSED (`622bbbb`) | [`docs/SESSION-HANDOFF-2026-06.md`](docs/SESSION-HANDOFF-2026-06.md) §3 |
| Audyt uprawnień Przetargów | PASS | [`docs/permissions-roles-audit-2026-06.md`](docs/permissions-roles-audit-2026-06.md) |
| Audyt martwego kodu (całe repo) | Raport | [`docs/dead-code-audit-2026-06.md`](docs/dead-code-audit-2026-06.md) |
| Audyt produktowy **Roboty 2.0** | Rekomendacja MIN | [`docs/jobs-2.0-product-audit.md`](docs/jobs-2.0-product-audit.md) |

**★ Handoff dla AI:** [`docs/SESSION-HANDOFF-2026-06.md`](docs/SESSION-HANDOFF-2026-06.md) — **czytaj najpierw** po „kontynuuj WGDOM”.

---

## W trakcie / lokalnie (2026-06-04)

| Temat | Status |
|-------|--------|
| **Roboty 2.0 MIN** | Zaimplementowane lokalnie — KPI, chipy, sort, `job-list-ops.ts`, badge na karcie; **brak commit/push** |

## Następne (tylko na polecenie użytkownika)

1. Commit + deploy **2.45.32** po smoke na Vercel (lista: KPI, chipy, sort, karty BZP/ekipa).
2. Smoke manualny Fazy 8–9 na Vercel (wygrana → robota → ekipa → pracownik „Twoje kontrakty”).
3. Opcjonalnie: deprecate `tenderDashStats` w `App.tsx` (stabilizacja 7G).
4. **NIE** bez polecenia: 9.0.2, 9.1, Execution Board, Owner Language Cleanup, ETAP 5B delete legacy CC.

---

## FAZA 8 — CLOSED (skrót)

| Etap | Commit | UI |
|------|--------|-----|
| 8.0–8.4 | `d1b888e` … `88c25f8` | 2.45.22–2.45.27 |
| 8.5 MIN | `1c7e164` | 2.45.28 |
| 8.5 FULL | `83b193e` | 2.45.29 |
| 9.0 | `3c575c7` | 2.45.30 |
| 9.0.1 | `a57a576` | 2.45.31 |

```text
Tender → Win → Create Job → Baner kontraktu → Executive CTA
→ Start realizacji (8.5 MIN) → Plan ekipy (8.5 FULL) → Twoje kontrakty (9.0/9.0.1)
```

**Testy:** `test-tender-job-draft-dates-8.4.mjs`, `test-job-execution-team-8.5-full.mjs`, `test-worker-execution-team-9.0.mjs`, `test-worker-contract-card-9.0.1.mjs`

---

## Szybki start dla nowego agenta

```text
1. docs/SESSION-HANDOFF-2026-06.md     ← stan sesji 2026-06-04 ★
2. AGENTS.md
3. PROJECT-GUIDE.md (+ Known Issues)
4. docs/ARCHITECTURE.md (§ 11 sync, § 12.1.4 Faza 8–9)
5. docs/jobs-2.0-product-audit.md    ← jeśli praca nad Robotami
6. CURRENT-TASK.md (ten plik)
7. changelog-data.ts → CHANGELOG[0].version
```

---

## Wcześniejsze (referencja)

- **7G Pulpit × CC:** [`docs/tender-center-7g-executive.md`](docs/tender-center-7g-executive.md) — prod `7d49be2`
- **Sync czerwiec 2026:** [`docs/INCIDENTS-2026-06.md`](docs/INCIDENTS-2026-06.md)
- **Gałąź `audit-before-cleanup` @ `7eaf7ee`** — NIE prod · **`dist-audit/`** w `.gitignore`
