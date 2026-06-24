/** Etykieta liczby plików (PL) — toast upload szablonu WM Druk. */
export function wmPrintFilesAddedLabel(n: number): string {
  if (n === 1) return "1 plik";
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${n} pliki`;
  return `${n} plików`;
}

/**
 * P4 WM-PRINT-UPLOAD-TOAST — komunikat po uploadzie pliku szablonu.
 * uploadedCount = pliki w storage; added = nowe wpisy w grupie (KV metadata).
 */
export function resolveWmPrintTemplateUploadToast(
  uploadedCount: number,
  added: number,
  groupName: string,
): string | null {
  if (uploadedCount <= 0) return null;
  if (added > 0) {
    return `Dodano ${wmPrintFilesAddedLabel(added)} do grupy ${groupName}`;
  }
  if (uploadedCount === 1) {
    return `Plik został wgrany, ale nie dodano nowego wpisu do grupy ${groupName}.`;
  }
  return `Pliki zostały wgrane (${uploadedCount}), ale nie dodano nowych wpisów do grupy ${groupName}.`;
}
