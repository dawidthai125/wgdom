# AUDIT — Storage Backup Completeness v2.50.64

> **Tryb:** READ ONLY · **Data:** 2026-06-10  
> **Cel:** Potwierdzenie, że backup storage-full obejmuje cały Supabase Storage projektu WGDOM.

---

## WERDYKT

```text
STORAGE BACKUP COMPLETE
Kompletność: 100%
```

| Kryterium | Wynik |
|-----------|-------|
| Wszystkie buckety projektu | 1/1 = **100%** |
| Wszystkie obiekty live Storage | 140/140 = **100%** |
| Rozmiar binariów | 56 778 701 / 56 778 701 B = **100%** |
| Błędy pobrania | 0 |

---

## MAPA STORAGE

| Bucket | Liczba plików | Rozmiar | Używany przez |
|--------|---------------|---------|---------------|
| **`make-0afb8820-photos`** (public) | **140** | **54.15 MB** | Cały projekt — jedyny bucket |

**Potwierdzenie źródeł:** live API `GET /storage/v1/bucket`, Edge `PHOTOS_BUCKET`, `docs/ARCHITECTURE.md` § API, brak innych bucketów w migracjach/config.

**Struktura ścieżek:**

```text
jobs/{jobId}/{filename}
tenders/{tenderId}/{filename}
tenders/{tenderId}/external/{timestamp}-{name}
```

**Rozkład w backupie (140 obiektów):**

| Kategoria | Liczba |
|-----------|--------|
| Zdjęcia robót (before/after/progress) | 128 |
| Szkice dokumentacji (sketch) | 6 |
| Plany techniczne PDF | 4 |
| Zlecenie PDF | 2 |
| Kosztorys ATH | 1 |
| Przetargi / załączniki ogólne / paragony | 0 (brak w storage) |

---

## UŻYCIE W KODZIE

Frontend **nie** używa `supabase.storage.from()` — wszystko przez Edge Function.

| Plik | Endpoint / operacja | Cel |
|------|---------------------|-----|
| `supabase/.../index.tsx` | `PHOTOS_BUCKET` — upload/download/remove/getPublicUrl | SSOT storage |
| `src/lib/job-photo-upload.ts` | `POST /storage-upload` | Zdjęcia inspektora |
| `src/app/app-domain.ts` | `POST /storage-upload` | Zdjęcia ekipy, paragony |
| `src/lib/job-file-upload.ts` | upload + delete | Zlecenie, kosztorys, plan |
| `src/lib/job-attachment-upload.ts` | upload | Załączniki ogólne |
| `src/lib/billing-evidence-upload.ts` | upload | Dowody billing |
| `src/lib/ath-parser.ts` | `POST /kosztorys-preview` | Proxy kosztorysu |
| `supabase/.../index.tsx` | `POST /tenders-bzp-upload` | Pliki przetargów |
| `supabase/.../index.tsx` | external discover upload | `tenders/.../external/` |

---

## BACKUP COVERAGE

| Artefakt | Obiekty | Rozmiar | Błędy |
|----------|---------|---------|-------|
| `storage/storage-manifest.json` | 140 (metadane) | — | — |
| `storage-full/` (binaria) | 140 | 54.15 MB | 0 |
| `WGDOM-BACKUP-2.50.64-storage-full.zip` | 140 | 53.7 MB | 0 |

**Zgodność live vs backup:** `liveNotInBackup = 0`, `backupNotInLive = 0`.

---

## LUKI

### Brakujące buckety — **BRAK**

Jeden bucket w projekcie; backup objął 100%.

### Martwe referencje KV (nie luka backupu)

198 referencji `storagePath`/`publicUrl` w KV; 71 wskazuje na pliki **już usunięte** ze storage (orphan URLs). Nie są w live Storage — backup poprawnie ich nie zawiera.

### Orphan files w storage (13) — **objęte backupem**

13 plików w bucket bez aktualnej referencji KV (m.in. `smoke-job-*`). Są w backupie — nadmiar względem KV, nie brak.

### Podział archiwum

`WGDOM-BACKUP-2.50.64.zip` = manifest storage (bez binariów). Binaria = osobny `WGDOM-BACKUP-2.50.64-storage-full.zip`. Przy odtwarzaniu potrzebne **oba**.

---

## Kompletność wg typów plików

| Typ | W backupie | Uwagi |
|-----|------------|-------|
| Zdjęcia robót | TAK | 128 plików |
| PDF zlecenie / kosztorys / plan | TAK | jobFiles |
| Szkice dokumentacji | TAK | workerReports sketch |
| Załączniki ogólne | N/A | 0 w storage |
| Dokumenty przetargowe | N/A | 0 w storage |
| Paragony | N/A | 0 w storage |

---

*Audyt read-only · Baseline v2.50.64 · [`BACKUP-REPORT-2.50.64.md`](BACKUP-REPORT-2.50.64.md)*
