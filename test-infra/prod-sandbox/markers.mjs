/**
 * TEST-HARNESS-01 H0 — entity markers (Design Freeze D6)
 * Prefix-only for MVP (Architecture Review Q2 default).
 */
export const PSB_PREFIX = "psb-";

/** @typedef {"job"|"tender"|"catalog"|"payroll_week"|"photo"|"attachment"|"other"} PsbEntityKind */

/**
 * @param {string} [kind]
 * @param {string} [suffix]
 */
export function makePsbId(kind = "entity", suffix = "") {
  const rand = Math.random().toString(36).slice(2, 10);
  const ts = Date.now().toString(36);
  const safeKind = String(kind || "entity").replace(/[^a-z0-9_-]/gi, "");
  const safeSuffix = suffix ? `-${String(suffix).replace(/[^a-z0-9_-]/gi, "")}` : "";
  return `${PSB_PREFIX}${safeKind}-${ts}-${rand}${safeSuffix}`;
}

/** @param {unknown} id */
export function isPsbId(id) {
  return typeof id === "string" && id.startsWith(PSB_PREFIX);
}

/**
 * Design Freeze §4.1 — sandbox identity without domain model changes.
 * @param {{ id?: unknown, title?: unknown, name?: unknown, meta?: { harnessSandbox?: unknown } }} entity
 */
export function isSandboxMarkedEntity(entity) {
  if (!entity || typeof entity !== "object") return false;
  if (entity.meta && entity.meta.harnessSandbox === true) return true;
  if (isPsbId(entity.id)) return true;
  if (typeof entity.title === "string" && entity.title.startsWith(PSB_PREFIX)) return true;
  if (typeof entity.name === "string" && entity.name.startsWith(PSB_PREFIX)) return true;
  return false;
}
