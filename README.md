# W&G DOM

System zarządzania robotami, listą płac i inspekcją WM — **https://www.wgdom.fun**

React + Vite · Supabase · Vercel · PWA · Capacitor (Android/iOS)

---

## Dla nowych sesji AI (ChatGPT / Cursor)

**Zacznij tutaj (kolejność obowiązkowa, ≤15 min):**

| # | Dokument |
|---|----------|
| 0 | [`docs/AI/README.md`](docs/AI/README.md) — index Knowledge Base |
| 1 | [`docs/AI/AI_MEMORY.md`](docs/AI/AI_MEMORY.md) — pamięć projektu |
| 2 | [`docs/AI/AI_DECISION_TREE.md`](docs/AI/AI_DECISION_TREE.md) — drzewo decyzji |
| 3 | [`docs/AI/PAYROLL_QUICK_START.md`](docs/AI/PAYROLL_QUICK_START.md) → Guard Rails → Dependency → Playbook |
| 4 | [`docs/PAYROLL-ARCHITECTURE-SSOT.md`](docs/PAYROLL-ARCHITECTURE-SSOT.md) → Agent Guide sync |
| Handoff | [`docs/AI/PROJECT_HANDOFF.md`](docs/AI/PROJECT_HANDOFF.md) — stan zamknięcia docs / jak startować |

Potem: [`AGENTS.md`](AGENTS.md) · [`CURRENT-TASK.md`](CURRENT-TASK.md) · [`docs/AGENT-CONTINUITY-GUIDE.md`](docs/AGENT-CONTINUITY-GUIDE.md).

---

## Dla programistów

**Zacznij tutaj (obowiązkowo):**

| Dokument | Opis |
|----------|------|
| **[`AGENTS.md`](AGENTS.md)** | **START HERE** — jak pracować (workflow deweloperski) |
| **[`docs/AI/README.md`](docs/AI/README.md)** | **★ AI Knowledge Base** — Memory · Decision Tree · Guardrails |
| **[`docs/WORKFLOW-RELEASE-DEPLOY.md`](docs/WORKFLOW-RELEASE-DEPLOY.md)** | **★ Release/deploy A/B/C** + VERIFY (oficjalny) |
| **[`PROJECT-GUIDE.md`](PROJECT-GUIDE.md)** | Jak działa projekt + Known Issues |
| **[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)** | Pełna architektura, sync, API, deploy |
| **[`CHANGELOG.md`](CHANGELOG.md)** | Skrót ostatnich wersji (źródło prawdy: `src/app/changelog-data.ts`) |
| **[`CURRENT-TASK.md`](CURRENT-TASK.md)** | Wznowienie sesji — co skończone / co dalej |
| [`guidelines/ROZWOJ.md`](guidelines/ROZWOJ.md) | Skrót reguł rozwoju |
| [`docs/OPTIMIZATION.md`](docs/OPTIMIZATION.md) | Audyt wydajności Web + Mobile |
| [`docs/MOBILE-NATIVE.md`](docs/MOBILE-NATIVE.md) | Capacitor, APK, PWA |

Przy każdej zmianie aktualizuj **CHANGELOG** (`changelog-data.ts` + `CHANGELOG.md`) i — gdy dotyczy architektury — **`docs/ARCHITECTURE.md`**. Na końcu sesji — **`CURRENT-TASK.md`**.

---

## Uruchomienie

```bash
npm install
npm run dev      # http://127.0.0.1:5173
```

Zmienne: `VITE_SUPABASE_PROJECT_ID`, `VITE_SUPABASE_ANON_KEY` (`.env` lokalnie, Vercel na produkcji).

```bash
npm run build
npm run test:mobile
```

---

## Deploy

- **Frontend:** `git push origin main` → Vercel Git Integration — szczegóły: [`docs/WORKFLOW-RELEASE-DEPLOY.md`](docs/WORKFLOW-RELEASE-DEPLOY.md)
- **Supabase Edge Function:** zmiany w `supabase/functions/` → GitHub Actions  
- **PWA:** nowy wpis w `changelog-data.ts` (wersja UI) → `npm run build` generuje `dist/sw.js` z cache `wgdom-shell-{APP_VERSION}`
