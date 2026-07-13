# JOBS-PHOTOS-DELETE-SYNC-01 — Production Verification Report

> **Program:** JOBS-PHOTOS-DELETE-SYNC-01  
> **Design Freeze:** [`JOBS-PHOTOS-DELETE-SYNC-01-DESIGN-FREEZE.md`](JOBS-PHOTOS-DELETE-SYNC-01-DESIGN-FREEZE.md) v1.0  
> **Prod:** UI **2.65.10** · commit **`d8f2d99`** · https://www.wgdom.fun  
> **Status:** **PRODUCTION VERIFIED** (2026-07-12)

---

## 1. `version.json` (jednorazowo)

```json
{
  "version": "2.65.10",
  "commit": "d8f2d99",
  "timestamp": "2026-07-12T20:14:34.883Z"
}
```

| Check | Oczekiwane | Aktualne | Wynik |
|-------|------------|----------|-------|
| `version` | **2.65.10** | **2.65.10** | **PASS** |
| `commit` (prefix) | **d8f2d99** | **d8f2d99** | **PASS** |

---

## 2. Git parity (release)

| Pole | Wartość |
|------|---------|
| Release commit | **`d8f2d99`** |
| `HEAD == origin/main` | **PASS** (release) |

---

## 3. Prod smoke delete — Roboty → Zdjęcia (Playwright headless)

**Robota testowa:** Obornicka 61 m.8 (`dc35eef8-8cb1-4e2f-a54a-8f6fe457f937`)

Scenariusz Owner QA:

1. Upload **3** zdjęć → **PASS**
2. Usuń **2** zdjęcia → odczekaj **≥5 s** → usunięte **nie wracają** → **PASS**
3. Licznik kafelków + `photos[]` w `kw-jobs` (LS) zgodne → **PASS**
4. F5 → usunięte nadal usunięte; chmura `kw-jobs` bez resurrection → **PASS**
5. Multi-device: Device A delete → Device B fresh bootstrap → zdjęcie **nie wraca** → **PASS**

| Krok | Wynik |
|------|-------|
| prod-version **2.65.10** | **PASS** |
| upload-3-photos | **PASS** (tiles 14→17) |
| delete-2-photos | **PASS** |
| persist-5s-no-resurrection | **PASS** (tiles=15 ls=15) |
| kw-jobs-tombstones-present | **PASS** |
| kw-jobs-photos-array-consistent | **PASS** (removed=2) |
| f5-deleted-still-gone | **PASS** |
| f5-cloud-kw-jobs-no-resurrection | **PASS** (cloud photos=15) |
| device-a-delete-photo | **PASS** |
| device-a-cloud-push | **PASS** |
| device-b-pull-no-resurrection | **PASS** |
| device-b-cloud-kv-consistent | **PASS** (tombstone=true, brak photo w KV) |

**Prod smoke: 19/19 PASS**

Artefakt (lokalny, niecommitowany): `.tmp/jobs-photos-delete-sync-01-prod-smoke.mjs` · raport `.tmp/jobs-photos-delete-sync-01-prod-smoke-report.json`

Harness pre-prod: **21/21 PASS** (`scripts/test-jobs-photos-delete-sync-01.mjs`).

---

## 4. Protected Core (post-deploy)

| Obszar | Wynik |
|--------|-------|
| Upload photos (ASSETS-01) | **PASS** — upload 3 bez regresji |
| Payroll / PWRB | **PASS** — bez zmian w bundle |
| Reconcile / App CORE | **PASS** — bez zmian w bundle |

---

## VERSION

| Pole | Wartość |
|------|---------|
| Changelog | **2.65.10** |
| Production commit | **`d8f2d99`** |
| Baseline poprzedni | **2.65.9** (`c0d2527`) |

---

## PRODUCTION STATUS

**PRODUCTION VERIFIED**

---

## HOTFIX CLASSIFICATION

BUGFIX

---

## WERDYKT

**PRODUCTION VERIFY PASS** · **PROGRAM READY FOR CLOSEOUT**
