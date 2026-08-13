/** INGEST-01 — content hashing (browser + node). */

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (subtle && typeof subtle.digest === "function") {
    const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    const dig = await subtle.digest("SHA-256", ab);
    return [...new Uint8Array(dig)].map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  const { createHash } = await import("node:crypto");
  return createHash("sha256").update(bytes).digest("hex");
}

export function newDocumentId(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return `doc_${globalThis.crypto.randomUUID()}`;
  }
  return `doc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function newArchiveId(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return `arc_${globalThis.crypto.randomUUID()}`;
  }
  return `arc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function safeDisplayName(original: string): string {
  const base = String(original ?? "").replace(/\\/g, "/").split("/").pop() ?? "file";
  return base.replace(/[^\w.\-ąćęłńóśźżĄĆĘŁŃÓŚŹŻ ()[\]]+/gi, "_").slice(0, 180) || "file";
}
