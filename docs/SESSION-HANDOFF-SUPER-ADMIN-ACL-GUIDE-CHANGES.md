# SESSION HANDOFF — SUPER ADMIN ACL (Instrukcja + Zmiany)

> **Status:** **CLOSED** · **prod 2.62.92** · commit **`5f212b4`** · 2026-06-29  
> **SSOT techniczny:** [`ARCHITECTURE.md`](ARCHITECTURE.md) § 5.1 (AppSettings ACL) · § 6.1 · § 15.1  
> **Test:** `npx vite-node scripts/test-admin-guide-acl.mjs` (35 PASS)

---

## 1. Cel biznesowy

Ograniczyć **Instrukcję obsługi** i **historię Zmian** (changelog) do **Super Administratora**, z opcjonalnym dostępem **Administratora** po jawnej decyzji Super Admina w ⚙ Ustawienia.

| Rola | Instrukcja (`guide`) | Zmiany (`changelog`) |
|------|----------------------|----------------------|
| **super_admin** | zawsze | zawsze |
| **admin** | gdy `instructionsForAdminEnabled` | gdy `changesForAdminEnabled` |
| **moderator** | nigdy | nigdy |
| **inspector** | nigdy | nigdy |
| **worker** | nigdy | nigdy |

**Domyślnie obie flagi = `false`** — Administrator po wdrożeniu **nie** widzi Instrukcji ani Zmian.

---

## 2. Model danych (bez nowego KV)

Pola w istniejącym `kw-app-settings` (`src/lib/app-settings.ts`):

| Pole | Default | Merge |
|------|---------|-------|
| `instructionsForAdminEnabled` | `false` | `mergeInstructionsForAdminEnabled` — remote bool wygrywa |
| `changesForAdminEnabled` | `false` | `mergeChangesForAdminEnabled` — remote bool wygrywa |

Wzorzec identyczny jak `workCatalogForAdminEnabled` i `tendersTabForStaffEnabled`.

Zapis: `saveAppSettings()` → `persistKey("kw-app-settings", …)` — sync chmura automatyczny.

---

## 3. ACL (SSOT funkcji)

Plik: `src/lib/admin-auth.ts`

```text
adminCanViewInstructions(role, settings)  — super_admin zawsze; admin gdy flaga true
adminCanViewChanges(role, settings)         — super_admin zawsze; admin gdy flaga true
```

**Nie duplikować** logiki w komponentach — zawsze wołać helpery z `appSettings` z `App.tsx`.

Referencja wzorca: `adminCanViewWorkCatalog()` (Biblioteka Robót w Przetargach).

---

## 4. Nawigacja i routing

### 4.1 Menu (`admin-nav.ts`)

- Dawna pozycja **„Zmiany/Instrukcja”** → **dwie** pozycje warunkowe:
  - `guide` — **Instrukcja** (`canViewInstructionsNav`)
  - `changelog` — **Zmiany** (`canViewChangesNav`)
- `View` union rozszerzony o `"changelog"`.

### 4.2 Router (`AdminViewRouter.tsx`)

| `view` | Komponent | Warunek |
|--------|-----------|---------|
| `guide` | `GuideView mode="instructions"` | `canViewInstructions` |
| `changelog` | `GuideView mode="changes"` | `canViewChanges` |

`GuideView` **nie** ma już wewnętrznego przełącznika tabów — tryb wynika z routingu.

### 4.3 Guard direct URL (`App.tsx`)

```text
view === "guide"     && !canViewInstructions → setView("dashboard")
view === "changelog" && !canViewChanges      → setView("dashboard")
```

### 4.4 Ustawienia (tylko Super Admin)

`AdminSettingsModal.tsx` — sekcja „Funkcje aplikacji”:

- „Instrukcja dla administratorów”
- „Zmiany dla administratorów”

Modal dostępny wyłącznie dla `super_admin` (⚙ w topbarze).

---

## 5. Kluczowe pliki

| Plik | Rola |
|------|------|
| `src/lib/app-settings.ts` | Pola + merge + `defaultAppSettings` |
| `src/lib/admin-auth.ts` | `adminCanViewInstructions` / `adminCanViewChanges` |
| `src/app/admin/admin-nav.ts` | Warunkowe pozycje menu |
| `src/app/App.tsx` | `canView*` + redirect + props do routera/nav |
| `src/app/admin/AdminViewRouter.tsx` | Bramki render + lazy `GuideView` |
| `src/app/GuideView.tsx` | `mode: "instructions" \| "changes"` |
| `src/app/AdminSettingsModal.tsx` | Checkboxy Super Admin |
| `scripts/test-admin-guide-acl.mjs` | ACL + merge + static wiring |

---

## 6. Testy i release

```bash
npx vite-node scripts/test-admin-guide-acl.mjs
npm run build
```

Commit: `feat(admin): restrict Instructions and Changes using Super Admin ACL`

Changelog UI: **2.62.92** w `src/app/changelog-data.ts`.

---

## 7. Pułapki / zakazy

| Zakaz | Powód |
|-------|-------|
| Nie scalać z powrotem `guide` + `changelog` w jedną pozycję menu | Regresja ACL — osobne flagi |
| Nie dawać moderatorowi dostępu przez flagi | Wymaganie EPIC — tylko `admin` |
| Nie tworzyć nowego klucza KV | AppSettings wystarczy |
| Nie omijać redirect w `App.tsx` | Direct URL / stary stan `view` w session |
| Nie edytować `CHANGELOG` historycznych wpisów | Tylko nowy wpis na górze |

---

## 8. Powiązane ACL AppSettings (kontekst)

| Funkcja | Helper | Flaga AppSettings | Kto poza super_admin |
|---------|--------|-------------------|----------------------|
| Przetargi (menu) | `adminCanViewTendersTab` | `tendersTabForStaffEnabled` | admin + moderator |
| Biblioteka Robót (zakładka Przetargi) | `adminCanViewWorkCatalog` | `workCatalogForAdminEnabled` | admin |
| Instrukcja | `adminCanViewInstructions` | `instructionsForAdminEnabled` | admin |
| Zmiany | `adminCanViewChanges` | `changesForAdminEnabled` | admin |

Wszystkie flagi edytowalne tylko w ⚙ Super Admin.

---

## 9. Backlog

Brak — EPIC **CLOSED**. Rozszerzenia (np. moderator, export help) tylko na nowy brief + AUDIT.
