import type { WmPrintVariableKey } from "@/lib/wm-print/types";

/** P0-A — statyczne skany PDF: kopia bajt-w-bajt, bez modyfikacji. */
export function copyStaticPdfTemplate(templateBytes: Uint8Array): Uint8Array {
  return templateBytes.slice();
}

/** Alias statycznego PDF — brak importu w prod UI; używany w testach smoke. */
export async function generatePdfPlainFromTemplate(
  templateBytes: Uint8Array,
  _vars: Record<WmPrintVariableKey, string>,
): Promise<Uint8Array> {
  return copyStaticPdfTemplate(templateBytes);
}
